from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "assets-source" / "monsters"
UNIT_DIR = ROOT / "packages" / "web-shell" / "public" / "assets" / "units"
PREVIEW_DIR = SOURCE_DIR / "previews"

SOURCE_ATLAS = SOURCE_DIR / "imagegen-monster-atlas-v20260430-detail.png"

FRAME = 64
WALK_FRAMES = 8
IDLE_FRAMES = 6
DEATH_FRAMES = 6

Color = tuple[int, int, int, int]
Motion = Literal["quick", "soldier", "heavy", "robe", "flame", "dragon"]

OUTLINE: Color = (34, 29, 27, 255)
SHADOW: Color = (0, 0, 0, 78)
DUST: Color = (170, 135, 80, 150)
SPARK: Color = (255, 221, 116, 255)


@dataclass(frozen=True)
class UnitSpec:
    unit_id: str
    col: int
    row: int
    max_w: int
    max_h: int
    feet_y: int
    motion: Motion
    boss_scale: bool = False


UNIT_SPECS = [
    UnitSpec("scout_drone", 0, 0, 45, 51, 57, "quick"),
    UnitSpec("battle_robot", 1, 0, 50, 54, 57, "soldier"),
    UnitSpec("heavy_walker", 2, 0, 59, 54, 58, "heavy"),
    UnitSpec("stealth_drone", 3, 0, 49, 53, 57, "quick"),
    UnitSpec("flame_imp", 0, 1, 47, 52, 57, "flame"),
    UnitSpec("lava_golem", 1, 1, 58, 55, 58, "heavy"),
    UnitSpec("arcane_mage", 2, 1, 48, 55, 58, "robe"),
    UnitSpec("mana_shield", 3, 1, 54, 56, 58, "soldier"),
    UnitSpec("orc_warlord", 0, 2, 58, 58, 59, "heavy", True),
    UnitSpec("forge_master", 1, 2, 53, 57, 58, "soldier"),
    UnitSpec("corrupted_archmage", 2, 2, 52, 58, 59, "robe", True),
    UnitSpec("dragon", 3, 2, 59, 54, 57, "dragon", True),
]

RAGE_TINT = Image.new("RGBA", (FRAME, FRAME), (255, 78, 22, 78))


def rgba(hex_color: str, alpha: int = 255) -> Color:
    h = hex_color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


def is_key_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a == 0:
        return True
    return r > 155 and b > 145 and g < 125 and (r + b - 2 * g) > 235


def remove_connected_key(image: Image.Image) -> Image.Image:
    result = image.convert("RGBA")
    pixels = result.load()
    width, height = result.size
    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()

    for x in range(width):
        for y in (0, height - 1):
            if is_key_pixel(pixels[x, y]):
                queue.append((x, y))
                visited.add((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if (x, y) not in visited and is_key_pixel(pixels[x, y]):
                queue.append((x, y))
                visited.add((x, y))

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height or (nx, ny) in visited:
                continue
            if is_key_pixel(pixels[nx, ny]):
                visited.add((nx, ny))
                queue.append((nx, ny))

    alpha = result.getchannel("A")
    alpha = alpha.point(lambda value: 0 if value < 35 else 255)
    result.putalpha(alpha)
    return keep_components(remove_source_shadow(result))


def remove_source_shadow(image: Image.Image) -> Image.Image:
    """Drop imagegen cast shadows while preserving dark outlines near colored pixels."""
    rgba = image.convert("RGBA")
    seed = Image.new("L", rgba.size, 0)
    seed_pixels: list[int] = []
    raw = rgba.tobytes()
    for r, g, b, a in zip(raw[0::4], raw[1::4], raw[2::4], raw[3::4], strict=True):
        if a == 0:
            seed_pixels.append(0)
            continue
        luma = (r * 299 + g * 587 + b * 114) // 1000
        chroma = max(r, g, b) - min(r, g, b)
        seed_pixels.append(255 if luma > 54 or chroma > 38 else 0)
    seed.putdata(seed_pixels)
    keep = seed.filter(ImageFilter.MaxFilter(5))
    alpha = rgba.getchannel("A")
    rgba.putalpha(ImageChops.multiply(alpha, keep))
    return rgba


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


def keep_components(image: Image.Image) -> Image.Image:
    pixels = image.load()
    visited: set[tuple[int, int]] = set()
    parts: list[tuple[int, int, int, tuple[int, int, int, int], list[tuple[int, int]]]] = []
    for y in range(image.height):
        for x in range(image.width):
            if (x, y) in visited or pixels[x, y][3] == 0:
                continue
            queue = deque([(x, y)])
            visited.add((x, y))
            points: list[tuple[int, int]] = []
            luma_sum = 0
            chroma_sum = 0
            left = right = x
            top = bottom = y
            while queue:
                px, py = queue.popleft()
                points.append((px, py))
                r, g, b, _ = pixels[px, py]
                luma_sum += (r * 299 + g * 587 + b * 114) // 1000
                chroma_sum += max(r, g, b) - min(r, g, b)
                left, right = min(left, px), max(right, px)
                top, bottom = min(top, py), max(bottom, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if nx < 0 or ny < 0 or nx >= image.width or ny >= image.height:
                        continue
                    if (nx, ny) in visited or pixels[nx, ny][3] == 0:
                        continue
                    visited.add((nx, ny))
                    queue.append((nx, ny))
            area = len(points)
            parts.append((area, luma_sum // area, chroma_sum // area, (left, top, right, bottom), points))

    if not parts:
        return image

    largest = max(parts, key=lambda part: part[0])
    largest_area, _, _, (left, top, right, bottom), _ = largest
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    keep: set[tuple[int, int]] = set()
    for area, avg_luma, avg_chroma, (part_left, part_top, part_right, part_bottom), points in parts:
        part_center_x = (part_left + part_right) / 2
        part_center_y = (part_top + part_bottom) / 2
        near_main = abs(part_center_x - center_x) < max(80, (right - left) * 0.9) and abs(part_center_y - center_y) < max(80, (bottom - top) * 0.9)
        visible_detail = avg_luma > 48 or avg_chroma > 36
        if area == largest_area or (visible_detail and area > max(42, largest_area * 0.006) and near_main):
            keep.update(points)

    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    out = result.load()
    for x, y in keep:
        out[x, y] = pixels[x, y]
    return crop_alpha(result, 3)


def add_outline(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    outer = alpha.filter(ImageFilter.MaxFilter(5))
    inner = alpha.filter(ImageFilter.MaxFilter(3))
    border = ImageChops.subtract(outer, alpha)
    soft = ImageChops.subtract(inner, alpha)

    outline = Image.new("RGBA", image.size, OUTLINE)
    outline.putalpha(border.point(lambda value: 235 if value > 0 else 0))
    dark_edge = Image.new("RGBA", image.size, (12, 10, 9, 255))
    dark_edge.putalpha(soft.point(lambda value: 100 if value > 0 else 0))

    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.alpha_composite(outline)
    result.alpha_composite(dark_edge)
    result.alpha_composite(image)
    return result


def fit_to_frame(source: Image.Image, spec: UnitSpec) -> Image.Image:
    cutout = crop_alpha(source, 8)
    scale = min(spec.max_w / cutout.width, spec.max_h / cutout.height)
    size = (max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale)))
    sprite = cutout.resize(size, Image.Resampling.LANCZOS)
    sprite = sprite.filter(ImageFilter.UnsharpMask(radius=0.7, percent=135, threshold=2))
    sprite = add_outline(sprite)

    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    x = (FRAME - sprite.width) // 2
    y = spec.feet_y - sprite.height
    frame.alpha_composite(sprite, (x, y))
    return frame


def load_unit_base(atlas: Image.Image, spec: UnitSpec) -> Image.Image:
    cell_w = atlas.width / 4
    cell_h = atlas.height / 3
    pad_x = round(cell_w * 0.02)
    pad_y = round(cell_h * 0.02)
    left = round(spec.col * cell_w) + pad_x
    top = round(spec.row * cell_h) + pad_y
    right = round((spec.col + 1) * cell_w) - pad_x
    bottom = round((spec.row + 1) * cell_h) - pad_y
    cell = atlas.crop((left, top, right, bottom))
    return fit_to_frame(remove_connected_key(cell), spec)


def draw_shadow(draw: ImageDraw.ImageDraw, width: int, y: int, alpha: int = 78) -> None:
    draw.ellipse((32 - width // 2, y - 2, 32 + width // 2, y + 3), fill=(0, 0, 0, alpha))


def shifted(image: Image.Image, dx: int = 0, dy: int = 0, alpha: float = 1.0) -> Image.Image:
    result = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    source = image
    if alpha != 1.0:
        source = image.copy()
        source.putalpha(source.getchannel("A").point(lambda value: round(value * alpha)))
    result.alpha_composite(source, (dx, dy))
    return result


def split_layers(base: Image.Image, motion: Motion) -> tuple[Image.Image, Image.Image]:
    left, top, right, bottom = alpha_bbox(base)
    ratio = 0.68 if motion in {"quick", "soldier"} else 0.72
    split_y = round(top + (bottom - top) * ratio)
    upper = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    lower = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    upper.alpha_composite(base.crop((0, 0, FRAME, split_y)), (0, 0))
    lower.alpha_composite(base.crop((0, split_y, FRAME, FRAME)), (0, split_y))
    return upper, lower


def motion_values(motion: Motion, frame: int) -> tuple[int, int, int, int, int]:
    quick_step = [-2, -1, 0, 1, 2, 1, 0, -1]
    heavy_step = [-1, 0, 1, 0, -1, 0, 1, 0]
    bob = [0, -1, -2, -1, 0, 1, 0, -1]
    robe_sway = [0, -1, -1, 0, 0, 1, 1, 0]
    dragon_bob = [0, -1, -2, -1, 0, 0, 1, 0]
    if motion == "quick":
        return quick_step[frame], bob[frame], quick_step[(frame + 2) % WALK_FRAMES] // 2, 22, 57
    if motion == "heavy":
        return heavy_step[frame], bob[frame] // 2, 0, 30, 58
    if motion == "robe":
        return robe_sway[frame], bob[frame] // 2, robe_sway[(frame + 3) % WALK_FRAMES], 23, 58
    if motion == "flame":
        return quick_step[frame] // 2, [-1, -2, -1, 0, -1, -2, -1, 0][frame], 0, 22, 57
    if motion == "dragon":
        return [-1, -1, 0, 1, 1, 0, -1, 0][frame], dragon_bob[frame], 0, 30, 58
    return heavy_step[frame], bob[frame] // 2, 0, 24, 57


def make_walk_frame(base: Image.Image, spec: UnitSpec, frame: int) -> Image.Image:
    upper, lower = split_layers(base, spec.motion)
    body_dx, body_dy, lower_dx, shadow_w, shadow_y = motion_values(spec.motion, frame)
    result = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    draw = ImageDraw.Draw(result)
    draw_shadow(draw, shadow_w, shadow_y)
    result.alpha_composite(shifted(lower, lower_dx, 0))
    result.alpha_composite(shifted(upper, body_dx, body_dy))
    if spec.motion == "flame" and frame % 2 == 0:
        draw.point((31, 15), fill=(255, 227, 91, 255))
        draw.point((35, 18), fill=(255, 146, 44, 255))
    return result


def make_idle_frame(base: Image.Image, spec: UnitSpec, frame: int) -> Image.Image:
    dy = [0, -1, -1, 0, 1, 0][frame]
    dx = [0, 0, 1, 0, 0, -1][frame] if spec.motion in {"robe", "dragon"} else 0
    result = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    draw = ImageDraw.Draw(result)
    draw_shadow(draw, 25 if not spec.boss_scale else 31, 58)
    result.alpha_composite(shifted(base, dx, dy))
    return result


def draw_hit_spark(draw: ImageDraw.ImageDraw, cx: int, cy: int, frame: int) -> None:
    spread = 7 + frame * 3
    draw.line((cx - spread, cy, cx - 2, cy - 1), fill=SPARK, width=1)
    draw.line((cx + 1, cy - 2, cx + spread, cy - 4), fill=SPARK, width=1)
    draw.line((cx, cy - spread, cx + 1, cy - 3), fill=(255, 248, 198, 255), width=1)


def draw_debris(draw: ImageDraw.ImageDraw, spec: UnitSpec, frame: int) -> None:
    colors = {
        "quick": [rgba("#322434"), rgba("#7e5030"), rgba("#d0b16d")],
        "soldier": [rgba("#53606a"), rgba("#a06a3d"), rgba("#d0b16d")],
        "heavy": [rgba("#5d5a50"), rgba("#8f6d41"), rgba("#c7b17a")],
        "robe": [rgba("#3d2a5a"), rgba("#8b62b8"), rgba("#d0b16d")],
        "flame": [rgba("#d44824"), rgba("#ffad33"), rgba("#6f281f")],
        "dragon": [rgba("#9f352d"), rgba("#d79048"), rgba("#6f3032")],
    }[spec.motion]
    scatter = max(0, frame - 3)
    offsets = (-18, -10, -3, 5, 12, 19)
    for index, dx in enumerate(offsets):
        x = 32 + dx + scatter * (index - 2)
        y = spec.feet_y - 2 - (index % 3) - scatter
        if index % 2:
            draw.rounded_rectangle((x, y, x + 5, y + 4), radius=1, fill=OUTLINE)
            draw.rounded_rectangle((x + 1, y + 1, x + 4, y + 3), radius=1, fill=colors[index % len(colors)])
        else:
            draw.polygon([(x, y + 4), (x + 4, y), (x + 8, y + 4), (x + 4, y + 7)], fill=OUTLINE)
            draw.polygon([(x + 2, y + 4), (x + 4, y + 2), (x + 6, y + 4), (x + 4, y + 5)], fill=colors[index % len(colors)])
    for dx in (-14, -4, 8, 16):
        draw.ellipse((32 + dx, spec.feet_y + 1, 42 + dx, spec.feet_y + 4), fill=DUST)


def make_death_frame(base: Image.Image, spec: UnitSpec, frame: int) -> Image.Image:
    result = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    draw = ImageDraw.Draw(result)
    draw_shadow(draw, max(14, 30 - frame * 3), spec.feet_y + 1)
    if frame <= 1:
        result.alpha_composite(shifted(base, 0, 0))
        draw_hit_spark(draw, 37, 25, frame)
        return result
    if frame == 2:
        falling = base.rotate(-18, resample=Image.Resampling.BICUBIC, center=(32, spec.feet_y - 8))
        result.alpha_composite(falling)
        draw_hit_spark(draw, 41, 29, frame)
        return result
    if frame == 3:
        falling = base.rotate(-68, resample=Image.Resampling.BICUBIC, center=(33, spec.feet_y - 5))
        result.alpha_composite(falling)
        draw_debris(draw, spec, frame)
        return result
    if frame == 4:
        falling = base.rotate(-88, resample=Image.Resampling.BICUBIC, center=(33, spec.feet_y - 3))
        falling.putalpha(falling.getchannel("A").point(lambda value: round(value * 0.42)))
        result.alpha_composite(falling)
    draw_debris(draw, spec, frame)
    return result


def rage_variant(image: Image.Image) -> Image.Image:
    result = image.copy()
    result.alpha_composite(RAGE_TINT)
    glow = Image.new("RGBA", (FRAME, FRAME), (255, 112, 28, 0))
    alpha = image.getchannel("A").filter(ImageFilter.GaussianBlur(1.4)).point(lambda value: min(95, value // 2))
    glow.putalpha(alpha)
    out = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    out.alpha_composite(glow)
    out.alpha_composite(result)
    return out


def pack(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME, 0))
    return sheet


def write_png_and_webp(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    image.save(path.with_suffix(".webp"), "WEBP", lossless=True, method=6)


def build_unit(base: Image.Image, spec: UnitSpec) -> Image.Image:
    walk = [make_walk_frame(base, spec, index) for index in range(WALK_FRAMES)]
    idle = [make_idle_frame(base, spec, index) for index in range(IDLE_FRAMES)]
    death = [make_death_frame(base, spec, index) for index in range(DEATH_FRAMES)]
    write_png_and_webp(UNIT_DIR / f"{spec.unit_id}.png", pack(walk))
    write_png_and_webp(UNIT_DIR / f"{spec.unit_id}_idle.png", pack(idle))
    write_png_and_webp(UNIT_DIR / f"{spec.unit_id}_death.png", pack(death))
    return idle[0]


def build_boss(dragon_base: Image.Image, rage: bool) -> Image.Image:
    spec = UnitSpec("dragon-boss-rage" if rage else "dragon-boss", 3, 2, 60, 55, 58, "dragon", True)
    base = rage_variant(dragon_base) if rage else dragon_base
    frames = [make_walk_frame(base, spec, index) for index in range(WALK_FRAMES)]
    write_png_and_webp(UNIT_DIR / f"{spec.unit_id}.png", pack(frames))
    return frames[0]


def main() -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    atlas = Image.open(SOURCE_ATLAS).convert("RGBA")
    bases = {spec.unit_id: load_unit_base(atlas, spec) for spec in UNIT_SPECS}
    preview = [build_unit(bases[spec.unit_id], spec) for spec in UNIT_SPECS]
    dragon = bases["dragon"]
    boss_preview = [build_boss(dragon, False), build_boss(dragon, True)]
    write_png_and_webp(PREVIEW_DIR / "unit-lineup-preview.png", pack(preview))
    write_png_and_webp(PREVIEW_DIR / "boss-lineup-preview.png", pack(boss_preview))
    scout = next(spec for spec in UNIT_SPECS if spec.unit_id == "scout_drone")
    write_png_and_webp(PREVIEW_DIR / "walk-cycle-preview.png", pack([make_walk_frame(bases["scout_drone"], scout, index) for index in range(WALK_FRAMES)]))
    print("Wrote imagegen-sourced 64x64 sprite sheets")


if __name__ == "__main__":
    main()
