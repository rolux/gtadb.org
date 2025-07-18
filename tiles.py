import math
import os
from PIL import Image


"""
This script creates 7 levels of 1024x1024 px tiles, from 0 to 6,
centered on (0, 0), so that at level 0, the entire map fits into
a single tile, and at level 5, the map scale is exactly 1 px/m.

It also allows to render overlays without duplicating any tiles.
"""


aiwe_scale = 0.68
aiwe_pixel = (290, 306)
aiwe_point = (-6420.1, 3062.3)
aiwe_zero = (
    aiwe_pixel[0] - aiwe_point[0] * aiwe_scale,
    aiwe_pixel[1] + aiwe_point[1] * aiwe_scale,
)
print(f"{aiwe_zero=}")

maps = [
    ("dupzor", 51, 0.558, (9037, 6693)),
    ("yanis", 6, 0.558, (9037, 6693)),
]
overlays = [
    ("aiwe", 1, aiwe_scale, aiwe_zero),
    ("martipk", 5, 0.558, (2232, -2232)),
    ("rickrick", 2, 2.5, (5000, 7500)),
    ("vlad", 1, 1.674, (3000 * 1.674, -3000 * 1.674)),
]
overlays_string  = ",".join([
    f"{name},{version}" for name, version, scale, zero in overlays
])
tile_size = 1024
level_bounds = (
    (-16384, -16384),
    (16384, 16384)
)
max_z = 6


def render_tiles(
    map_name, map_version, map_scale, map_zero,
    base_map_name=None, base_map_version=None
):

    map_image = Image.open(f"maps/{map_name},{map_version}.png").convert("RGBA")
    map_mppx = 1 / map_scale
    map_size = map_image.size
    map_bounds = (
        (-map_zero[0] / map_scale, (map_zero[1] - map_size[1]) / map_scale),
        ((map_size[0] - map_zero[0]) / map_scale, map_zero[1] / map_scale)
    )
    print(f"{map_name=} {map_scale=} {map_mppx=} {map_size=} {map_bounds=}")

    tile_ranges = {}
    for z in range(max_z + 1):
        tile_ranges[z] = [[float("inf"), float("inf")], [float("-inf"), float("-inf")]]
        n = 2 ** (z + 10 - int(math.log2(tile_size)))
        mppx = 32768 / (n * tile_size)
        scale = 1 / mppx
        level_size = (n * tile_size, n * tile_size)
        image_size = (
            int(round(map_size[0] / map_scale * scale)),
            int(round(map_size[1] / map_scale * scale))
        )
        image = map_image.resize(image_size, Image.LANCZOS)
        offset = (
            int(round((map_bounds[0][0] - level_bounds[0][0]) * scale)),
            int(round((level_bounds[1][1] - map_bounds[1][1]) * scale))
        )
        print(f"{map_name=} {z=}, {n=}, {mppx=}, {scale=} {image_size=}, {level_size=} {offset=}")
        for y in range(n):
            for x in range(n):
                crop = (
                    x * tile_size - offset[0],
                    y * tile_size - offset[1],
                    (x + 1) * tile_size - offset[0],
                    (y + 1) * tile_size - offset[1],
                )
                if crop[0] > image_size[0] or crop[1] > image_size[1] or crop[2] <= 0 or crop[3] <= 0:
                    continue
                tile_ranges[z] = [[
                    min(tile_ranges[z][0][0], x),
                    min(tile_ranges[z][0][1], y),
                ], [
                    max(tile_ranges[z][1][0], x),
                    max(tile_ranges[z][1][1], y),
                ]]
                filename = f"tiles/{map_name},{map_version}/{z}/{z},{y},{x}.png"
                if os.path.exists(filename):
                    continue
                if base_map_name:
                    base_filename = f"tiles/{base_map_name},{base_map_version},{overlays_string}/{z}/{z},{y},{x}.png"
                    if not os.path.exists(base_filename):
                        base_filename =  f"tiles/{base_map_name},{base_map_version}/{z}/{z},{y},{x}.png"
                    tile_image = Image.open(base_filename).convert("RGBA")
                else:
                    tile_image = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 255))
                cropped = image.crop(crop)
                tile_image.paste(cropped, (0, 0), cropped)
                tile_image = tile_image.convert("RGB")
                print(f"writing {filename}")
                os.makedirs(os.path.dirname(filename), exist_ok=True)
                tile_image.save(filename)
        if base_map_name:
            src_dirname = f"tiles/{map_name},{map_version}/{z}"
            dst_dirname = f"tiles/{base_map_name},{base_map_version},{overlays_string}/{z}"
            for y in range(tile_ranges[z][0][1], tile_ranges[z][1][1] + 1):
                for x in range(tile_ranges[z][0][0], tile_ranges[z][1][0] + 1):
                    if x in (tile_ranges[z][0][0], tile_ranges[z][1][0]) \
                            or y in (tile_ranges[z][0][1], tile_ranges[z][1][1]):
                        src_filename = f"{src_dirname}/{z},{y},{x}.png"
                        dst_filename = f"{dst_dirname}/{z},{y},{x}.png"
                        os.makedirs(os.path.dirname(dst_filename), exist_ok=True)
                        print(f"moving {src_filename} to {dst_filename}")
                        os.rename(src_filename, dst_filename)
            if not [f for f in os.listdir(src_dirname)]:
                os.rmdir(src_dirname)

    return tile_ranges


tile_ranges = {}

for map_name, map_version, map_scale, map_zero in maps:
    tile_ranges[map_name] = render_tiles(map_name, map_version, map_scale, map_zero)

for map_name, map_version, map_scale, map_zero in overlays:
    for base_map_name, base_map_version, base_map_scale, base_map_zero in maps:
        tile_ranges[map_name] = render_tiles(
            map_name, map_version, map_scale, map_zero, base_map_name, base_map_version
        )

for path, dirnames, filenames in os.walk("tiles"):
    for src_filename in [f"{path}/{filename}" for filename in filenames]:
        if src_filename.endswith(".png"):
            dst_filename = src_filename.replace(".png", ".jpg")
            print(f"encoding {src_filename} as {dst_filename}")
            Image.open(src_filename).save(dst_filename)
            # os.remove(src_filename)

print(f"{tile_ranges=}")