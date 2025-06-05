import math
import os
from PIL import Image

"""
this script creates levels of 1024x1024 px tiles, from 0 to 6,
centered on (0, 0), so that at level 0, the map fits into a
single tile, and at level 5, the map scale is 1 px/m.
"""

maps = [
    ("dupzor", 51, 0.558, (9037, 6693)),
    ("rickrick", 2, 2.5, (5000, 7500)),
]
tile_size = 1024
level_bounds = (
    (-16384, -16384),
    (16384, 16384)
)

for map_name, map_version, map_scale, map_zero in maps:

    map_image = Image.open(f"maps/{map_name},{map_version}.png").convert("RGBA")
    map_mppx = 1 / map_scale
    map_size = map_image.size
    map_bounds = (
        (-map_zero[0] / map_scale, (map_zero[1] - map_size[1]) / map_scale),
        ((map_size[0] - map_zero[0]) / map_scale, map_zero[1] / map_scale)
    )
    print(f"{map_name=} {map_scale=} {map_mppx=} {map_size=} {map_bounds=}")

    for z in range(7):
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
                filename = f"tiles/{map_name},{map_version}/{z}/{z},{y},{x}.jpg"
                if os.path.exists(filename):
                    continue
                if map_name == "dupzor":
                    tile_image = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 1))
                else:
                    tile_image = Image.open(f"tiles/{maps[0][0]},{maps[0][1]}/{z}/{z},{y},{x}.jpg").convert("RGBA")
                cropped = image.crop(crop)
                tile_image.paste(cropped, (0, 0), cropped)
                tile_image = tile_image.convert("RGB")
                print(f"writing {filename}")
                os.makedirs(os.path.dirname(filename), exist_ok=True)
                tile_image.save(filename)
