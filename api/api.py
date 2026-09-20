from array import array
from io import BytesIO
import json
import math
import re

from flask import Flask, jsonify, request, send_file
from flask.json.provider import DefaultJSONProvider
from PIL import Image


DATA_DIR = "data"
GTA_VERSIONS = [4, 5, 6]

ADMINISTRATIVE_AREAS = {}
gta = 6
with open(f"{DATA_DIR}/{gta}/administrative_areas.json") as f:
    ADMINISTRATIVE_AREAS[gta] = json.load(f)
ELEVATION_CONFIG = {
    4: {
        "width": 540,
        "height": 360,
        "scale_xy": 0.1,
        "scale_z": 152.1501888179339,
        "zero_x": 240,
        "zero_y": 239,
        "offset": -41.10032245323038,
    },
    5: {
        "width": 930,
        "height": 1300,
        "scale_xy": 0.1,
        "scale_z": 52.11294342920029,
        "zero_x": 410,
        "zero_y": 839,
        "offset": -462.2172786903457,
    },
    6: {
        "width": 1536,
        "height": 1748,
        "scale_xy": 0.083188297074,
        "scale_z": 92.466616,
        "zero_x": 1108.532445611,
        "zero_y": 938.090772693,
        "offset": -303.1033271360121,
    },
}
ELEVATION_DATA = {}
for gta in GTA_VERSIONS:
    data = array("H")
    with open(f"{DATA_DIR}/{gta}/elevation.bin", "rb") as f:
        data.frombytes(f.read())
    ELEVATION_DATA[gta] = data
LANDMARKS_DATA = {}
for gta in GTA_VERSIONS:
    with open(f"../map/data/{gta}/landmarks.json") as f:
        LANDMARKS_DATA[gta] = json.load(f)
PHOTO_URL = "https://raw.githubusercontent.com/rolux/gtadb.org/main/map/photos/{}/{},{}.jpg"
REGIONS_DATA = {}
gta = 6
with open(f"{DATA_DIR}/{gta}/regions.json") as f:
    REGIONS_DATA[gta] = json.load(f)
    keys = ["name", "municipality", "county", "state"]
    for i, region in enumerate(REGIONS_DATA[gta]):
        parts = [region[key] for key in keys if region[key]]
        parts = list(dict.fromkeys(parts))
        REGIONS_DATA[gta][i]["address"] = ", ".join(parts)
with open(f"{DATA_DIR}/street_types.json") as f:
    STREET_TYPES = json.load(f)
with open(f"{DATA_DIR}/tags.json") as f:
    TAGS = json.load(f)
TILE_BACKGROUND = {
    4: (255, 234, 215),
    5: (13, 43, 79),
    6: (44, 103, 164),
}
TILE_SIZE = 256
TILES_PATH = {
    4: "../maps/tiles/4/elevation",
    5: "../maps/tiles/5/satellite",
    6: "../maps/tiles/6/yanis,16",
}
ZERO_RESULTS = {"results": [], "status": "ZERO_RESULTS"}


def format_address(gta, address, x, y):
    if gta != 6:
        return address
    if address in ["Gulf of Leonida", "Leonida Straits", "Atlantic Ocean"]:
        return address
    if address.endswith(", Leonida"):
        return f"{address[:-9]}, LE, USA"
    region = get_region(gta, x, y)
    county = region["county"]
    if address.endswith(f", {county}"):
        return f"{address}, LE, USA"
    return f"{address}, {county}, LE, USA"

def format_coordinates(coordinates, decimals):
    if not coordinates:
        return
    return [round(v, decimals) for v in coordinates]

def geocode_address(gta, address, max_results=10):
    query = address.strip().casefold()
    results = []
    for id, data in LANDMARKS_DATA[gta].items():
        landmark = parse_landmark(id, data)
        if query not in landmark["ig_address"].casefold():
            continue
        location = landmark["ig_coordinates"]
        if not location:
            continue
        formatted = format_address(gta, landmark["ig_address"], *location)
        results.append({
            "address_components": get_address_components(gta, formatted),
            "formatted_address": formatted,
            "geometry": {
                "bounds": get_bounds([location]),
                "location": location,
            },
            "gtadb_id": id
        })
        if len(results) == max_results:
            break
    if not results:
        return ZERO_RESULTS
    return jsonify({
        "results": results,
        "status": "OK"
    })

def geocode_xy(gta, x, y):
    landmark = get_landmark(gta, x, y)
    if not landmark and gta != 6:
        return ZERO_RESULTS
    if landmark:
        gtadb_id = landmark["id"]
        location = landmark["ig_coordinates"]
        bounds = get_bounds([location])
        address = format_address(gta, landmark["ig_address"], *location)
    else:
        region = get_region(gta, x, y)
        if not region:
            return ZERO_RESULTS
        gtadb_id = "S0"
        location = get_center(region["points"])
        bounds = get_bounds(region["points"])
        address = format_address(gta, region["address"], *location)
    address_components = get_address_components(gta, address)
    return jsonify({
        "results": [
            {
                "address_components": address_components,
                "formatted_address": address,
                "geometry": {
                    "bounds": bounds,
                    "location": location
                },
                "gtadb_id": gtadb_id
            }
        ],
        "status": "OK",
    })

def get_address_components(gta, address):
    if gta != 6:
        return None
    areas = ADMINISTRATIVE_AREAS[gta]
    counties = list(areas["USA"]["Leonida"].keys())
    cities = [city for county in counties for city in areas["USA"]["Leonida"][county]]
    districts = [
        district for district in areas["USA"]["Leonida"]["Vice-Dale County"]["Vice Beach"]
    ] + [
        district for district in areas["USA"]["Leonida"]["Vice-Dale County"]["Vice City"]
    ]
    names = address.split(", ")
    components = []
    for name in names:
        if name == "USA":
            components.append(("United States of America", "USA", ["country", "political"]))
        elif name in ("LE", "Leonida"):
            components.append(("Leonida", "LE", ["administrative_area_level_1", "political"]))
        elif name in counties:
            components.append( (name, name, ["administrative_area_level_2", "political"]))
        elif name in cities:
            components.append((name, name, ["locality", "political"]))
        elif name in districts:
            components.append((name, name, ["neighborhood", "political"]))
        elif street_type := next((x for x in STREET_TYPES if name.endswith(f" {x}")), None):
            components.append((name[:-len(street_type)] + STREET_TYPES[street_type], name, ["route"]))
        elif re.match(r"(?:^|\s)Bridge|Tunnel", name):
            components.append((name, name, ["route"]))
        elif region := next((x for x in REGIONS_DATA[gta] if x["name"] == name), None):
            components.append((name, name, "natural_feature" if name in [
                "Atlantic Ocean", "Lake Leonida", "Leonida Straits", "Gulf of Leonida"
            ] else ["colloquial area"]))
        else:
            components.append((name, name, ["establishment", "point of interest"]))
    return [{
        "long_name": component[0],
        "short_name": component[1],
        "types": component[2]
    } for component in components]

# FIXME: UNUSED
def get_area(points):
    return abs(sum(
        x1 * y2 - x2 * y1
        for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1])
    )) / 2

def get_bounds(points, d=100):
    if len(points) == 1:
        xs, ys = (points[0][0] - d, points[0][0] + d), (points[0][1] - d, points[0][1] + d)
    else:
        xs, ys = zip(*points)
    return {
        "southwest": (float(min(xs)), float(min(ys))),
        "northeast": (float(max(xs)), float(max(ys))),
    }

def get_center(points):
    xs, ys = zip(*points)
    n = len(points)
    return (sum(xs) / n, sum(ys) / n)

def get_elevation(gta, x, y):
    def get_value(x, y):
        return data[y * width + x]
    config = ELEVATION_CONFIG[gta]
    data = ELEVATION_DATA[gta]
    width, height = config["width"], config["height"]
    px = config["zero_x"] + x * config["scale_xy"]
    py = config["zero_y"] - y * config["scale_xy"]
    if px < 0 or px > width - 1 or py < 0 or py > height - 1:
        return None
    x0, y0 = int(px), int(py)
    x1, y1 = min(x0 + 1, width - 1), min(y0 + 1, height - 1)
    tx, ty = px - x0, py - y0
    top = get_value(x0, y0) * (1 - tx) + get_value(x1, y0) * tx
    bottom = get_value(x0, y1) * (1 - tx) + get_value(x1, y1) * tx
    value = top * (1 - ty) + bottom * ty
    if value == 0:
        return None
    return round(value / config["scale_z"] + config["offset"], 3)

def get_float(key):
    value = request.args.get(key, type=float)
    if value is None:
        raise ValueError(f"Missing or invalid parameter: {key}")
    return value

def get_int(key):
    value = request.args.get(key, type=int)
    if value is None:
        raise ValueError(f"Missing or invalid parameter: {key}")
    return value

def get_landmark(gta, x, y, max_d=100):
    best_id, best_d = None, float("inf")
    for id, landmark in LANDMARKS_DATA[gta].items():
        if landmark[0][:3] == "?, ": continue
        ig_coordinates = landmark[1]
        if not ig_coordinates: continue
        lx, ly = ig_coordinates
        dx, dy = lx - x, ly - y
        d = (dx ** 2 + dy ** 2) ** 0.5
        if d <= max_d and d < best_d:
            best_id = id
            best_d = d
    if not best_id:
        return None
    landmark = parse_landmark(best_id, LANDMARKS_DATA[gta][best_id])
    return {
        "id": landmark["id"],
        "ig_address": landmark["ig_address"],
        "ig_coordinates": landmark["ig_coordinates"],
        "distance": round(best_d, 3),
    }

def get_region(gta, x, y):
    for region in REGIONS_DATA[gta]:
        if is_in_polygon(x, y, region["points"]):
            return region

def has_l_tag(landmark):
    return any(re.match(r"^L\d+$", tag) for tag in landmark["tags"])

def is_in_polygon(x, y, points):
    is_inside = False
    prev_x, prev_y = points[-1]
    for curr_x, curr_y in points:
        crosses_y = (curr_y > y) != (prev_y > y)
        if crosses_y:
            interregion_x = (
                (prev_x - curr_x)
                * (y - curr_y)
                / (prev_y - curr_y)
                + curr_x
            )
            if x < interregion_x:
                is_inside = not is_inside
        prev_x, prev_y = curr_x, curr_y
    return is_inside

def parse_landmark(id, data):
    return {
        "id": id,
        "ig_address": data[0],
        "ig_coordinates": data[1],
        "ig_photo": data[2],
        "rl_address": data[3],
        "rl_coordinates": data[4],
        "rl_photo": data[5],
        "tags": data[6],
        "color": data[7],
        "edited": data[8]
    }


class JSONProvider(DefaultJSONProvider):
    def dumps(self, obj, **kwargs):
        kwargs["indent"] = 4
        return super().dumps(obj, **kwargs)

app = Flask(__name__)
app.json = JSONProvider(app)


@app.route("/elevation", methods=["GET"])
def elevation():
    gta = get_int("gta")
    if gta not in GTA_VERSIONS:
        raise ValueError(f"Unknown game version: {gta}")
    x, y = get_float("x"), get_float("y")
    result = get_elevation(gta, x, y)
    if result is None:
        return ZERO_RESULTS
    return jsonify({
        "results": [
            {
                "location": [x, y],
                "elevation": result,
            }
        ],
        "status": "OK",
    })

@app.route("/geocode", methods=["GET"])
def geocode():
    gta = get_int("gta")
    if gta not in GTA_VERSIONS:
        raise ValueError(f"Unknown game version: {gta}")
    address = request.args.get("address")
    has_x, has_y = "x" in request.args, "y" in request.args

    if address is not None:
        if has_x or has_y:
            raise ValueError("Expected either address or x and y, got both")
        if not address.strip():
            raise ValueError("Empty address")
        return geocode_address(gta, address)

    if not has_x or not has_y:
        raise ValueError("Expected either address or x and y, got none")
    x, y = get_float("x"), get_float("y")
    return geocode_xy(gta, x, y)


@app.route("/landmarks", methods=["GET"])
def landmarks():
    gta = get_int("gta")
    if gta not in GTA_VERSIONS:
        raise ValueError(f"Unknown game version: {gta}")
    id = request.args.get("id")
    if not id:
        results = []
        for id, data in LANDMARKS_DATA[gta].items():
            landmark = parse_landmark(id, data)
            results.append({
                "id": id,
                "ig_coordinates": format_coordinates(landmark["ig_coordinates"], 3),
                "types": [tag for tag in landmark["tags"] if tag in TAGS],
            })
        return jsonify({
            "results": results,
            "status": "OK"
        })
    if id not in LANDMARKS_DATA[gta]:
        raise ValueError(f"ID not found: {id}")
    landmark = parse_landmark(id, LANDMARKS_DATA[gta][id])
    x, y = landmark["ig_coordinates"]
    has_ig_photo = landmark["ig_photo"] and not has_l_tag(landmark)
    return jsonify({
        "results": [
            {
                "ig_address": format_address(gta, landmark["ig_address"], x, y),
                "ig_coordinates": format_coordinates(landmark["ig_coordinates"], 3),
                "ig_photo": PHOTO_URL.format(gta, id, "ig") if has_ig_photo else None,
                "rl_address": landmark["rl_address"],
                "rl_coordinates": format_coordinates(landmark["rl_coordinates"], 7),
                "rl_photo": PHOTO_URL.format(gta, id, "rl") if landmark["rl_photo"] else None,
                "types": [tag for tag in landmark["tags"] if tag in TAGS],
            }
        ],
        "status": "OK",
    })


@app.route("/staticmap", methods=["GET"])
def staticmap():
    gta = get_int("gta")
    if gta not in GTA_VERSIONS:
        raise ValueError(f"Unknown game version: {gta}")

    x, y = get_float("x"), get_float("y")
    w, h = get_int("w"), get_int("h")
    scale = get_float("scale")
    if x < -11000 or x > 4000 or y < -9000 or y > 11000:
        raise ValueError("Coordinates out of bounds")
    if w < 1 or w > 3840 or h < 1 or h > 2160:
        raise ValueError("Invalid image size")
    if scale < 0.001 or scale > 1:
        raise ValueError("Scale must be between 0.001 and 1.0")

    z = math.log2(scale * 32)
    tile_z = max(0, math.ceil(z))
    tile_scale = 2 ** (tile_z - 5)
    image_scale = 2 ** (tile_z - z)
    center_x = (x + 16384) * tile_scale
    center_y = (16384 - y) * tile_scale
    left = center_x - w * image_scale / 2
    top = center_y - h * image_scale / 2
    top_left_tile_x = int(left // TILE_SIZE)
    top_left_tile_y = int(top // TILE_SIZE)
    offset_x = top_left_tile_x * TILE_SIZE - left
    offset_y = top_left_tile_y * TILE_SIZE - top
    tiles_w = math.ceil((w * image_scale - offset_x) / TILE_SIZE)
    tiles_h = math.ceil((h * image_scale - offset_y) / TILE_SIZE)
    image_size = (tiles_w * TILE_SIZE, tiles_h * TILE_SIZE)
    image = Image.new("RGB", image_size, TILE_BACKGROUND[gta])

    for y in range(tiles_h):
        for x in range(tiles_w):
            tile_x = top_left_tile_x + x
            tile_y = top_left_tile_y + y
            filename = f"{TILES_PATH[gta]}/{tile_z}/{tile_z},{tile_y},{tile_x}.jpg"
            try:
                with Image.open(filename) as tile:
                    xy = (x * TILE_SIZE, y * TILE_SIZE)
                    image.paste(tile.convert("RGB"), xy)
            except FileNotFoundError:
                pass

    resize = (
        math.ceil(image_size[0] / image_scale),
        math.ceil(image_size[1] / image_scale),
    )
    image = image.resize(resize, Image.LANCZOS)
    crop_x = round(-offset_x / image_scale)
    crop_y = round(-offset_y / image_scale)
    crop = (crop_x, crop_y, crop_x + w, crop_y + h)
    image = image.crop(crop)

    output = BytesIO()
    image.save(output, "JPEG", quality=90)
    output.seek(0)
    return send_file(output, mimetype="image/jpeg")

@app.errorhandler(ValueError)
def errorhandler(error):
    return jsonify({
        "results": [],
        "status": "INVALID_REQUEST",
        "error_message": str(error),
    }), 400
