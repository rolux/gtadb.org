import os
import sys
from PIL import Image

"""
given the original map image, this script creates 6 levels
of 1024x1024 px tiles, so that level 5 has a scale of 1 px/m
"""

filename = sys.argv[1]

image = Image.open(filename)
map_zero = (9037, 6693)
map_scale = 0.558
map_mppx = 1 / map_scale
tile_size = 1024
min_x, max_x = -16000, 4000
min_y, max_y = -8000, 12000
map_left = int(round(map_zero[0] + min_x * map_scale))
map_top = int(round(map_zero[1] - max_y * map_scale))
print(f"{map_left=} {map_top=}") # 109, -3

map_size = ( # (11160, 11160)
    int(round((max_x - min_x) * map_scale)),
    int(round((max_y - min_y) * map_scale))
)

filename = "map_20x20.png"
if not os.path.exists(filename):
    map_image = Image.new("RGB", map_size)
    map_image.paste(image, (-map_left, -map_top))
    map_image.save(filename)
else:
    map_image = Image.open(filename)

for z in range(1, 7):
    n = 2 ** z
    mppx = 2 ** (5 - z)
    image_size = (
        int(round(map_size[0] * map_mppx / mppx)),
        int(round(map_size[1] * map_mppx / mppx))
    )
    image = map_image.resize(image_size, Image.LANCZOS)
    level_size = (n * tile_size, n * tile_size)
    offset = (
        (image_size[0] - level_size[0]) // 2,
        (image_size[1] - level_size[1]) // 2
    )
    print(f"{z=}, {n=}, {mppx=}, {image_size=}, {level_size=} {offset=}")
    for y in range(n):
        for x in range(n):
            filename = f"tiles/{z}/{z},{y},{x}.png"
            if os.path.exists(filename):
                continue
            crop = (
                offset[0] + x * tile_size,
                offset[1] + y * tile_size,
                offset[0] + (x + 1) * tile_size,
                offset[1] + (y + 1) * tile_size,
            )
            if crop[0] > image_size[0] or crop[1] > image_size[1] or crop[2] < 0 or crop[3] < 0:
                continue
            tile_image = Image.new("RGB", (tile_size, tile_size))
            cropped = image.crop(crop)
            tile_image.paste(cropped)
            print(filename)
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            tile_image.save(filename)
