from __future__ import annotations

from collections import deque
from math import pi, sin
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "assets-source" / "monsters"
UNIT_DIR = ROOT / "packages" / "web-shell" / "public" / "assets" / "units"
PREVIEW_DIR = SOURCE_DIR / "previews"

MONSTER_SOURCE = SOURCE_DIR / "imagegen-monster-lineup-v20260430.png"
DRAGON_SOURCE = SOURCE_DIR / "imagegen-dragon-lineup-v20260430.png"

FRAME = (64, 64)
WALK_FRAMES = 8
IDLE_FRAMES = 6
DEATH_FRAMES = 6

MONSTER_SPECS: list[dict[str, Any]] = [
    {"id": "scout_drone", "row": 0, "col": 0, "max_w": 34, "max_h": 42, "feet": 55, "gait": "quick"},
    {"id": "battle_robot", "row": 0, "col": 1, "max_w": 42, "max_h": 47, "feet": 56, "gait": "soldier"},
    {"id": "heavy_walker", "row": 0, "col": 2, "max_w": 48, "max_h": 48, "feet": 56, "gait": "heavy"},
    {
        "id": "stealth_drone",
        "row": 0,
        "col": 3,
        "max_w": 40,
        "max_h": 47,
        "feet": 56,
        "gait": "quick",
        "aggressive_key": True,
    },
    {
        "id": "flame_imp",
        "row": 1,
        "col": 0,
        "max_w": 36,
        "max_h": 42,
        "feet": 55,
        "gait": "flame",
        "aggressive_key": True,
    },
    {
        "id": "lava_golem",
        "row": 1,
        "col": 1,
        "max_w": 47,
        "max_h": 48,
        "feet": 56,
        "gait": "heavy",
        "aggressive_key": True,
    },
    {
        "id": "arcane_mage",
        "row": 1,
        "col": 2,
        "max_w": 38,
        "max_h": 47,
        "feet": 56,
        "gait": "robe",
        "aggressive_key": True,
    },
    {
        "id": "mana_shield",
        "row": 1,
        "col": 3,
        "max_w": 45,
        "max_h": 48,
        "feet": 56,
        "gait": "shield",
        "aggressive_key": True,
    },
    {"id": "orc_warlord", "row": 2, "col": 0, "max_w": 50, "max_h": 51, "feet": 57, "gait": "heavy"},
    {
        "id": "forge_master",
        "row": 2,
        "col": 1,
        "max_w": 44,
        "max_h": 48,
        "feet": 56,
        "gait": "soldier",
        "trim_left": 0.24,
        "aggressive_key": True,
    },
    {
        "id": "corrupted_archmage",
        "row": 2,
        "col": 2,
        "max_w": 45,
        "max_h": 50,
        "feet": 57,
        "gait": "robe",
        "trim_left": 0.22,
        "trim_right": 0.1,
        "aggressive_key": True,
    },
]

DRAGON_SPECS: list[dict[str, Any]] = [
    {"id": "dragon", "col": 0, "max_w": 48, "max_h": 43, "feet": 55, "gait": "dragon"},
    {"id": "dragon-boss", "col": 0, "max_w": 56, "max_h": 51, "feet": 56, "boss_only": True},
    {"id": "dragon-boss-rage", "col": 1, "max_w": 56, "max_h": 51, "feet": 56, "boss_only": True},
]


def is_key_pixel(r: int, g: int, b: int, aggressive: bool) -> bool:
    strong_green = g > 105 and g > r * 1.35 and g > b * 1.35
    neon_green = g > 145 and (g - max(r, b)) > 45
    soft_green = aggressive and g > 80 and (g - max(r, b)) > 22
    return strong_green or neon_green or soft_green


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    return bbox if bbox else (0, 0, image.width, image.height)


def crop_alpha(image: Image.Image, pad: int = 0) -> Image.Image:
    left, top, right, bottom = alpha_bbox(image)
    return image.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(image.width, right + pad),
            min(image.height, bottom + pad),
        ),
    )


def chroma_cutout(source: Image.Image, box: tuple[int, int, int, int], aggressive_key: bool = False) -> Image.Image:
    image = source.crop(box).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if is_key_pixel(r, g, b, aggressive_key):
                pixels[x, y] = (r, g, b, 0)
            elif a > 0 and g > r * 1.15 and g > b * 1.15 and g > 85:
                pixels[x, y] = (r, min(g, max(r, b)), b, a)
    return keep_components(crop_alpha(image, 4))


def keep_components(image: Image.Image) -> Image.Image:
    pixels = image.load()
    visited: set[tuple[int, int]] = set()
    parts: list[tuple[int, tuple[int, int, int, int], list[tuple[int, int]]]] = []
    for y in range(image.height):
        for x in range(image.width):
            if (x, y) in visited or pixels[x, y][3] == 0:
                continue
            queue = deque([(x, y)])
            visited.add((x, y))
            points: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                px, py = queue.popleft()
                points.append((px, py))
                min_x, max_x = min(min_x, px), max(max_x, px)
                min_y, max_y = min(min_y, py), max(max_y, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if nx < 0 or ny < 0 or nx >= image.width or ny >= image.height:
                        continue
                    if (nx, ny) in visited or pixels[nx, ny][3] == 0:
                        continue
                    visited.add((nx, ny))
                    queue.append((nx, ny))
            parts.append((len(points), (min_x, min_y, max_x, max_y), points))
    if not parts:
        return image

    largest = max(parts, key=lambda part: part[0])
    largest_area, (left, top, right, bottom), _ = largest
    center_x, center_y = (left + right) / 2, (top + bottom) / 2
    keep: set[tuple[int, int]] = set()
    for area, (part_left, part_top, part_right, part_bottom), points in parts:
        part_center_x = (part_left + part_right) / 2
        part_center_y = (part_top + part_bottom) / 2
        close = abs(part_center_x - center_x) < max(28, (right - left) * 0.55) and abs(part_center_y - center_y) < max(28, (bottom - top) * 0.55)
        if area == largest_area or (area > max(16, largest_area * 0.004) and close):
            keep.update(points)

    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    out = result.load()
    for x, y in keep:
        out[x, y] = pixels[x, y]
    return crop_alpha(result, 3)


def trim_cutout(cutout: Image.Image, trim_left: float = 0, trim_right: float = 0) -> Image.Image:
    if trim_left <= 0 and trim_right <= 0:
        return cutout
    left = round(cutout.width * trim_left)
    right = round(cutout.width * (1 - trim_right))
    return keep_components(cutout.crop((left, 0, right, cutout.height)))


def pixel_finish(image: Image.Image, colors: int = 22) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = ImageOps.autocontrast(image.convert("RGB"), cutoff=1)
    paletted = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    paletted.putalpha(alpha.point(lambda value: 255 if value > 74 else 0))
    return paletted


def add_outline(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(3))
    border = ImageChops.subtract(expanded, alpha)
    outline = Image.new("RGBA", image.size, (27, 20, 22, 255))
    outline.putalpha(border.point(lambda value: 230 if value > 0 else 0))
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.alpha_composite(outline)
    result.alpha_composite(image)
    return result


def fit_to_frame(cutout: Image.Image, max_w: int, max_h: int, feet: int) -> Image.Image:
    scale = min(max_w / cutout.width, max_h / cutout.height)
    size = (max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale)))
    source = cutout.convert("RGBA").resize(size, Image.Resampling.LANCZOS)
    source = add_outline(crop_alpha(pixel_finish(source), 2))
    frame = Image.new("RGBA", FRAME, (0, 0, 0, 0))
    frame.alpha_composite(source, ((FRAME[0] - source.width) // 2, feet - source.height))
    return frame


def split_layer(base: Image.Image, top_ratio: float) -> tuple[Image.Image, Image.Image]:
    _, top, _, bottom = alpha_bbox(base)
    split_y = round(top + (bottom - top) * top_ratio)
    upper = Image.new("RGBA", FRAME, (0, 0, 0, 0))
    lower = Image.new("RGBA", FRAME, (0, 0, 0, 0))
    upper.alpha_composite(base.crop((0, 0, FRAME[0], split_y)), (0, 0))
    lower.alpha_composite(base.crop((0, split_y, FRAME[0], FRAME[1])), (0, split_y))
    return upper, lower


def offset_image(image: Image.Image, dx: int, dy: int) -> Image.Image:
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.alpha_composite(image, (dx, dy))
    return result


def shadow_frame(base: Image.Image, scale: float = 1.0) -> Image.Image:
    frame = Image.new("RGBA", FRAME, (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    left, _, right, _ = alpha_bbox(base)
    center_x = (left + right) // 2
    width = max(15, round((right - left) * 0.65 * scale))
    draw.ellipse((center_x - width // 2, 55, center_x + width // 2, 60), fill=(0, 0, 0, 75))
    return frame


def make_motion_frame(base: Image.Image, index: int, mode: str, count: int) -> Image.Image:
	phase = (index / count) * pi * 2
	if mode == "idle":
		bob = [0, -1, -1, 0, 1, 0][index % IDLE_FRAMES]
		frame = shadow_frame(base, 0.95)
		frame.alpha_composite(offset_image(base, 0, bob))
		return frame

	# Keep the imagegen silhouette intact. Splitting the cutout into body parts
	# reads as tearing once the 64px sheet is displayed at 32px in Phaser.
	bob_cycles = {
		"quick": [0, -1, -1, 0, 0, -1, -1, 0],
		"soldier": [0, 0, -1, 0, 0, 0, -1, 0],
		"heavy": [0, 0, -1, 0, 0, 0, -1, 0],
		"shield": [0, 0, -1, 0, 0, 0, -1, 0],
		"robe": [0, -1, -1, 0, 0, -1, -1, 0],
		"flame": [-1, -2, -1, 0, -1, -2, -1, 0],
		"dragon": [0, -1, -2, -1, 0, 1, 0, -1],
	}
	sway_cycles = {
		"quick": [0, 0, 1, 0, 0, 0, -1, 0],
		"soldier": [0, 0, 1, 0, 0, 0, -1, 0],
		"heavy": [0, 0, 0, 0, 0, 0, 0, 0],
		"shield": [0, 0, 0, 0, 0, 0, 0, 0],
		"robe": [0, 0, 1, 0, 0, 0, -1, 0],
		"flame": [0, 1, 0, -1, 0, 1, 0, -1],
		"dragon": [0, 1, 1, 0, 0, -1, -1, 0],
	}
	bob = bob_cycles.get(mode, bob_cycles["soldier"])[index % WALK_FRAMES]
	sway = sway_cycles.get(mode, sway_cycles["soldier"])[index % WALK_FRAMES]

	frame = shadow_frame(base, 1.05 if mode == "heavy" else 0.98)
	if mode != "dragon":
		draw = ImageDraw.Draw(frame)
		left, _, right, bottom = alpha_bbox(base)
		center_x = (left + right) // 2
		foot_y = min(59, bottom + 1)
		stride = 3 if mode in {"quick", "flame"} else 2
		left_foot = center_x - max(4, (right - left) // 5)
		right_foot = center_x + max(4, (right - left) // 5)
		if index % 4 in (0, 1):
			draw.rectangle((left_foot - stride, foot_y, left_foot + 2, foot_y + 1), fill=(20, 14, 12, 120))
		else:
			draw.rectangle((right_foot - 2, foot_y, right_foot + stride, foot_y + 1), fill=(20, 14, 12, 120))
	frame.alpha_composite(offset_image(base, sway, bob))
	return frame


def make_death_frames(base: Image.Image) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(DEATH_FRAMES):
        progress = index / (DEATH_FRAMES - 1)
        frame = Image.new("RGBA", FRAME, (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        if index < 3:
            squashed = base.resize((FRAME[0], max(1, round(FRAME[1] * (1 - progress * 0.42)))), Image.Resampling.NEAREST)
            frame.alpha_composite(squashed, (round(progress * 2), round(progress * 22)))
        else:
            left, _, right, _ = alpha_bbox(base)
            center_x = (left + right) // 2
            for n, dx in enumerate((-14, -7, 0, 9, 16)):
                color = (96 + n * 18, 70 + n * 10, 48 + n * 6, 180)
                draw.rectangle((center_x + dx, 50 - n % 3, center_x + dx + 4, 54), fill=color)
        frames.append(frame)
    return frames


def pack_frames(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (FRAME[0] * len(frames), FRAME[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME[0], 0))
    return sheet


def write_png_and_webp(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    image.save(path.with_suffix(".webp"), "WEBP", lossless=True, method=6)


def build_unit(unit_id: str, base: Image.Image, gait: str) -> Image.Image:
    walk = [make_motion_frame(base, index, gait, WALK_FRAMES) for index in range(WALK_FRAMES)]
    idle = [make_motion_frame(base, index, "idle", IDLE_FRAMES) for index in range(IDLE_FRAMES)]
    death = make_death_frames(base)
    write_png_and_webp(UNIT_DIR / f"{unit_id}.png", pack_frames(walk))
    write_png_and_webp(UNIT_DIR / f"{unit_id}_idle.png", pack_frames(idle))
    write_png_and_webp(UNIT_DIR / f"{unit_id}_death.png", pack_frames(death))
    return idle[0]


def build_boss(boss_id: str, base: Image.Image) -> Image.Image:
    frames = [make_motion_frame(base, index, "dragon", WALK_FRAMES) for index in range(WALK_FRAMES)]
    write_png_and_webp(UNIT_DIR / f"{boss_id}.png", pack_frames(frames))
    return frames[0]


def main() -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    monster_source = Image.open(MONSTER_SOURCE)
    cell_w = monster_source.width // 4
    cell_h = monster_source.height // 3
    preview: list[Image.Image] = []

    for spec in MONSTER_SPECS:
        left = spec["col"] * cell_w
        top = spec["row"] * cell_h
        right = monster_source.width if spec["col"] == 3 else left + cell_w
        bottom = monster_source.height if spec["row"] == 2 else top + cell_h
        cutout = chroma_cutout(monster_source, (left, top, right, bottom), bool(spec.get("aggressive_key")))
        cutout = trim_cutout(cutout, float(spec.get("trim_left", 0)), float(spec.get("trim_right", 0)))
        base = fit_to_frame(cutout, spec["max_w"], spec["max_h"], spec["feet"])
        preview.append(build_unit(spec["id"], base, spec["gait"]))

    dragon_source = Image.open(DRAGON_SOURCE)
    dragon_cell_w = dragon_source.width // 2
    boss_preview: list[Image.Image] = []
    for spec in DRAGON_SPECS:
        left = spec["col"] * dragon_cell_w
        right = dragon_source.width if spec["col"] == 1 else left + dragon_cell_w
        cutout = chroma_cutout(dragon_source, (left, 0, right, dragon_source.height), True)
        base = fit_to_frame(cutout, spec["max_w"], spec["max_h"], spec["feet"])
        if spec.get("boss_only"):
            boss_preview.append(build_boss(spec["id"], base))
        else:
            preview.append(build_unit(spec["id"], base, spec["gait"]))

    write_png_and_webp(PREVIEW_DIR / "unit-lineup-preview.png", pack_frames(preview))
    write_png_and_webp(PREVIEW_DIR / "boss-lineup-preview.png", pack_frames(boss_preview))
    walk_preview = [make_motion_frame(preview[0], index, "quick", WALK_FRAMES) for index in range(WALK_FRAMES)]
    write_png_and_webp(PREVIEW_DIR / "walk-cycle-preview.png", pack_frames(walk_preview))
    print("Wrote imagegen-sourced 64x64 unit sheets")


if __name__ == "__main__":
    main()
