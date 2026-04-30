from __future__ import annotations

from pathlib import Path
from typing import Callable, Literal

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "assets-source" / "monsters"
UNIT_DIR = ROOT / "packages" / "web-shell" / "public" / "assets" / "units"
PREVIEW_DIR = SOURCE_DIR / "previews"

FRAME = 64
SCALE = 4
WALK_FRAMES = 8
IDLE_FRAMES = 6
DEATH_FRAMES = 6
GROUND_Y = 56
WALK_STEP = [-2, -1, 0, 1, 2, 1, 0, -1]
SOLDIER_STEP = [-1, 0, 1, 0, -1, 0, 1, 0]
WALK_BOB = [0, -1, -1, 0, 0, -1, -1, 0]

Color = tuple[int, int, int, int]
State = Literal["walk", "idle", "death", "boss"]

OUTLINE: Color = (41, 35, 32, 255)
SHADOW: Color = (0, 0, 0, 70)
WHITE: Color = (245, 236, 203, 255)
GOLD: Color = (211, 168, 72, 255)
STEEL: Color = (154, 166, 169, 255)
STEEL_HI: Color = (214, 220, 211, 255)
WOOD: Color = (126, 82, 48, 255)
LEATHER: Color = (99, 61, 38, 255)
DUST: Color = (171, 139, 82, 180)


def rgba(hex_color: str) -> Color:
    h = hex_color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def sc(value: int | float) -> int:
    return round(value * SCALE)


def pt(point: tuple[int | float, int | float]) -> tuple[int, int]:
    return (sc(point[0]), sc(point[1]))


def box(
    x1: int | float,
    y1: int | float,
    x2: int | float,
    y2: int | float,
) -> tuple[int, int, int, int]:
    return (sc(x1), sc(y1), sc(x2), sc(y2))


def canvas() -> Image.Image:
    return Image.new("RGBA", (FRAME * SCALE, FRAME * SCALE), (0, 0, 0, 0))


def finish(image: Image.Image) -> Image.Image:
    return image.resize((FRAME, FRAME), Image.Resampling.LANCZOS)


def ellipse(
    draw: ImageDraw.ImageDraw,
    bounds: tuple[int, int, int, int],
    fill: Color,
    outline: Color = OUTLINE,
    width: int = 2,
) -> None:
    draw.ellipse(bounds, fill=outline)
    inset = sc(width)
    draw.ellipse(
        (
            bounds[0] + inset,
            bounds[1] + inset,
            bounds[2] - inset,
            bounds[3] - inset,
        ),
        fill=fill,
    )


def rect(
    draw: ImageDraw.ImageDraw,
    bounds: tuple[int, int, int, int],
    fill: Color,
    outline: Color = OUTLINE,
    width: int = 2,
    radius: int = 0,
) -> None:
    inset = sc(width)
    if radius:
        draw.rounded_rectangle(bounds, radius=sc(radius), fill=outline)
        draw.rounded_rectangle(
            (
                bounds[0] + inset,
                bounds[1] + inset,
                bounds[2] - inset,
                bounds[3] - inset,
            ),
            radius=max(0, sc(radius - width)),
            fill=fill,
        )
        return
    draw.rectangle(bounds, fill=outline)
    draw.rectangle(
        (
            bounds[0] + inset,
            bounds[1] + inset,
            bounds[2] - inset,
            bounds[3] - inset,
        ),
        fill=fill,
    )


def poly(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int | float, int | float]],
    fill: Color,
    outline: Color = OUTLINE,
    width: int = 2,
) -> None:
    scaled = [pt(point) for point in points]
    draw.polygon(scaled, fill=fill)
    draw.line(scaled + [scaled[0]], fill=outline, width=sc(width), joint="curve")


def line(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int | float, int | float]],
    fill: Color,
    width: int = 2,
    outline: Color = OUTLINE,
) -> None:
    scaled = [pt(point) for point in points]
    draw.line(scaled, fill=outline, width=sc(width + 2), joint="curve")
    draw.line(scaled, fill=fill, width=sc(width), joint="curve")


def dot(draw: ImageDraw.ImageDraw, x: int, y: int, fill: Color, size: int = 2) -> None:
    draw.rectangle(box(x, y, x + size, y + size), fill=fill)


def flat_rect(draw: ImageDraw.ImageDraw, x1: int, y1: int, x2: int, y2: int, fill: Color) -> None:
    draw.rectangle(box(x1, y1, x2, y2), fill=fill)


def flat_ellipse(draw: ImageDraw.ImageDraw, x1: int, y1: int, x2: int, y2: int, fill: Color) -> None:
    draw.ellipse(box(x1, y1, x2, y2), fill=fill)


def flat_poly(draw: ImageDraw.ImageDraw, points: list[tuple[int | float, int | float]], fill: Color) -> None:
    draw.polygon([pt(point) for point in points], fill=fill)


def shade(color: Color, amount: int) -> Color:
    return (
        max(0, min(255, color[0] + amount)),
        max(0, min(255, color[1] + amount)),
        max(0, min(255, color[2] + amount)),
        color[3],
    )


def shadow(draw: ImageDraw.ImageDraw, cx: int = 32, width: int = 26, y: int = GROUND_Y + 2) -> None:
    draw.ellipse(box(cx - width / 2, y - 2, cx + width / 2, y + 3), fill=SHADOW)


def draw_sword(draw: ImageDraw.ImageDraw, x: int, y: int, flip: int = 1) -> None:
    line(draw, [(x, y), (x + 8 * flip, y - 12)], STEEL_HI, 2)
    line(draw, [(x + 1 * flip, y - 2), (x + 7 * flip, y - 11)], WHITE, 1, outline=STEEL)
    rect(draw, box(x - 3, y - 1, x + 3, y + 2), GOLD, width=1)


def draw_axe(draw: ImageDraw.ImageDraw, x: int, y: int, flip: int = 1) -> None:
    line(draw, [(x, y + 12), (x + 4 * flip, y - 9)], WOOD, 3)
    poly(
        draw,
        [
            (x + 2 * flip, y - 13),
            (x + 13 * flip, y - 9),
            (x + 9 * flip, y),
            (x + 1 * flip, y - 4),
        ],
        STEEL_HI,
    )
    line(draw, [(x + 5 * flip, y - 10), (x + 10 * flip, y - 8)], WHITE, 1, outline=STEEL)


def draw_staff(draw: ImageDraw.ImageDraw, x: int, y: int, orb: Color) -> None:
    line(draw, [(x, y + 16), (x + 2, y - 14)], WOOD, 3)
    ellipse(draw, box(x - 4, y - 18, x + 8, y - 6), orb, width=1)
    dot(draw, x + 1, y - 15, WHITE, 1)
    dot(draw, x + 5, y - 11, shade(orb, 45), 1)


def draw_feet(draw: ImageDraw.ImageDraw, cx: int, y: int, step: int, color: Color, wide: int = 6) -> None:
    rect(draw, box(cx - wide - step, y - 2, cx - 2 - step, y + 2), color, width=1, radius=1)
    rect(draw, box(cx + 2 + step, y - 2, cx + wide + step, y + 2), color, width=1, radius=1)


def draw_humanoid(
    draw: ImageDraw.ImageDraw,
    cx: int,
    y: int,
    step: int,
    skin: Color,
    cloth: Color,
    accent: Color,
    *,
    head: tuple[int, int] = (15, 13),
    body: tuple[int, int] = (18, 20),
    hood: bool = False,
    helmet: bool = False,
    feet_y: int | None = None,
) -> None:
    draw_feet(draw, cx, feet_y if feet_y is not None else y + 39, step, accent)
    rect(draw, box(cx - body[0] / 2, y + 17, cx + body[0] / 2, y + 36), cloth, radius=4)
    flat_rect(draw, round(cx - body[0] / 2 + 2), y + 20, round(cx - body[0] / 2 + 5), y + 34, shade(cloth, -28))
    flat_rect(draw, round(cx + body[0] / 2 - 5), y + 20, round(cx + body[0] / 2 - 3), y + 32, shade(cloth, 24))
    rect(draw, box(cx - body[0] / 2 + 2, y + 23, cx + body[0] / 2 - 2, y + 29), accent, width=1)
    flat_rect(draw, cx - 3, y + 25, cx + 1, y + 28, GOLD)
    ellipse(draw, box(cx - 13, y + 20, cx - 5, y + 33), cloth)
    ellipse(draw, box(cx + 5, y + 20, cx + 13, y + 33), cloth)
    if hood:
        poly(draw, [(cx - 12, y + 18), (cx, y + 3), (cx + 12, y + 18), (cx + 8, y + 26), (cx - 8, y + 26)], cloth)
        rect(draw, box(cx - 6, y + 15, cx + 6, y + 23), rgba("#221d26"), width=1, radius=2)
    else:
        ellipse(draw, box(cx - head[0] / 2, y + 5, cx + head[0] / 2, y + 5 + head[1]), skin)
        flat_ellipse(draw, round(cx - head[0] / 2 + 3), y + 7, cx + 1, y + 11, shade(skin, 24))
        flat_ellipse(draw, cx + 2, y + 12, round(cx + head[0] / 2 - 2), y + 17, shade(skin, -24))
        if helmet:
            rect(draw, box(cx - head[0] / 2 - 1, y + 5, cx + head[0] / 2 + 1, y + 11), STEEL, width=1, radius=2)
            flat_rect(draw, cx - 5, y + 7, cx + 5, y + 8, STEEL_HI)
    dot(draw, cx - 4, y + 12 if not hood else y + 17, WHITE, 1)
    dot(draw, cx + 3, y + 12 if not hood else y + 17, WHITE, 1)


def goblin(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    step = WALK_STEP[frame % WALK_FRAMES]
    cx, y = 31, 12
    shadow(draw, cx, 21)
    body_y = y + WALK_BOB[frame % WALK_FRAMES]
    draw_humanoid(draw, cx, body_y, step, rgba("#78a34b"), rgba("#8b673a"), rgba("#4f6d35"), head=(13, 11), body=(15, 17), feet_y=y + 39)
    poly(draw, [(cx - 7, body_y + 14), (cx - 16, body_y + 10), (cx - 8, body_y + 19)], rgba("#78a34b"))
    poly(draw, [(cx + 7, body_y + 14), (cx + 16, body_y + 10), (cx + 8, body_y + 19)], rgba("#78a34b"))
    poly(draw, [(cx - 8, body_y + 9), (cx - 1, body_y), (cx + 8, body_y + 9)], rgba("#a98245"))
    rect(draw, box(cx - 16, body_y + 23, cx - 10, body_y + 33), rgba("#5b3e28"), width=1, radius=2)
    dot(draw, cx - 14, body_y + 25, rgba("#d1b061"), 1)
    dot(draw, cx - 2, body_y + 17, rgba("#efe4b0"), 1)
    dot(draw, cx + 3, body_y + 17, rgba("#efe4b0"), 1)
    draw_sword(draw, cx + 12, body_y + 31)


def orc(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    step = SOLDIER_STEP[frame % WALK_FRAMES]
    cx, y = 31, 8
    shadow(draw, cx, 27)
    body_y = y + WALK_BOB[frame % WALK_FRAMES]
    draw_humanoid(draw, cx, body_y, step, rgba("#6f8f3e"), rgba("#89513b"), rgba("#3f4a32"), head=(17, 14), body=(22, 22), helmet=True, feet_y=y + 39)
    rect(draw, box(cx - 12, body_y + 18, cx + 12, body_y + 23), rgba("#6f6b5d"), width=1, radius=2)
    flat_rect(draw, cx - 9, body_y + 20, cx + 10, body_y + 22, STEEL_HI)
    dot(draw, cx - 6, body_y + 25, rgba("#c79a52"), 1)
    dot(draw, cx + 5, body_y + 25, rgba("#c79a52"), 1)
    poly(draw, [(cx - 11, body_y + 9), (cx - 18, body_y + 3), (cx - 13, body_y + 14)], rgba("#d0c083"))
    poly(draw, [(cx + 11, body_y + 9), (cx + 18, body_y + 3), (cx + 13, body_y + 14)], rgba("#d0c083"))
    draw_axe(draw, cx + 14, body_y + 27)


def troll(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    cx, y = 32, 8
    shadow(draw, cx, 31)
    draw_feet(draw, cx, y + 42, 0, rgba("#626d68"), 8)
    rect(draw, box(cx - 18, y + 19, cx + 18, y + 40), rgba("#78867f"), radius=6)
    ellipse(draw, box(cx - 15, y + 6, cx + 15, y + 24), rgba("#8f9b92"))
    ellipse(draw, box(cx - 25, y + 22, cx - 13, y + 36), rgba("#6b7770"))
    ellipse(draw, box(cx + 13, y + 22, cx + 25, y + 36), rgba("#6b7770"))
    flat_ellipse(draw, cx - 10, y + 10, cx + 9, y + 15, rgba("#a8b3ab"))
    flat_rect(draw, cx - 13, y + 28, cx - 4, y + 31, rgba("#53615c"))
    flat_rect(draw, cx + 4, y + 31, cx + 13, y + 34, rgba("#53615c"))
    line(draw, [(cx + 14, y + 37), (cx + 24, y + 24)], WOOD, 5)
    dot(draw, cx - 5, y + 14, rgba("#f3d36c"), 1)
    dot(draw, cx + 4, y + 14, rgba("#f3d36c"), 1)
    dot(draw, cx - 9, y + 25, rgba("#a7b0aa"), 3)
    dot(draw, cx + 10, y + 37, rgba("#a7b0aa"), 2)


def assassin(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    step = WALK_STEP[frame % WALK_FRAMES]
    cx, y = 32, 9
    shadow(draw, cx, 21)
    body_y = y + WALK_BOB[frame % WALK_FRAMES]
    draw_humanoid(draw, cx, body_y, step, rgba("#41364d"), rgba("#332743"), rgba("#6f4c8d"), head=(13, 12), body=(16, 21), hood=True, feet_y=y + 39)
    dot(draw, cx - 4, body_y + 17, rgba("#d284ff"), 1)
    dot(draw, cx + 4, body_y + 17, rgba("#d284ff"), 1)
    flat_poly(draw, [(cx - 8, body_y + 26), (cx, body_y + 34), (cx + 8, body_y + 26), (cx + 4, body_y + 40), (cx - 4, body_y + 40)], rgba("#251d32"))
    line(draw, [(cx - 8, body_y + 24), (cx - 2, body_y + 31), (cx + 7, body_y + 24)], rgba("#8d5cc8"), 1)
    draw_sword(draw, cx - 12, body_y + 31, -1)
    draw_sword(draw, cx + 12, body_y + 31, 1)


def imp(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    cx, y = 32, 11
    flicker = [0, -1, -2, -1, 0, -1, -2, -1][frame % WALK_FRAMES]
    shadow(draw, cx, 20)
    draw_feet(draw, cx, y + 38, frame % 3 - 1, rgba("#8f2c20"), 5)
    poly(
        draw,
        [
            (cx - 14, y + 31),
            (cx - 8, y + 12 + flicker),
            (cx, y + 2 + flicker),
            (cx + 9, y + 12 + flicker),
            (cx + 14, y + 31),
            (cx + 6, y + 40),
            (cx - 7, y + 40),
        ],
        rgba("#d74e22"),
    )
    poly(draw, [(cx - 7, y + 22), (cx, y + 8 + flicker), (cx + 7, y + 22), (cx + 4, y + 34), (cx - 4, y + 34)], rgba("#ffbd49"))
    poly(draw, [(cx - 9, y + 14 + flicker), (cx - 14, y + 5 + flicker), (cx - 6, y + 9 + flicker)], rgba("#f0d083"))
    poly(draw, [(cx + 8, y + 14 + flicker), (cx + 14, y + 5 + flicker), (cx + 6, y + 9 + flicker)], rgba("#f0d083"))
    flat_poly(draw, [(cx - 4, y + 31), (cx, y + 20), (cx + 4, y + 31), (cx, y + 36)], rgba("#ffe079"))
    dot(draw, cx - 4, y + 20, rgba("#fff088"), 1)
    dot(draw, cx + 3, y + 20, rgba("#fff088"), 1)


def lava_golem(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    cx, y = 32, 7
    shadow(draw, cx, 31)
    draw_feet(draw, cx, y + 43, 0, rgba("#443934"), 8)
    rect(draw, box(cx - 18, y + 20, cx + 18, y + 42), rgba("#58463e"), radius=5)
    ellipse(draw, box(cx - 14, y + 7, cx + 14, y + 25), rgba("#66524a"))
    ellipse(draw, box(cx - 26, y + 23, cx - 14, y + 38), rgba("#503f39"))
    ellipse(draw, box(cx + 14, y + 23, cx + 26, y + 38), rgba("#503f39"))
    flat_rect(draw, cx - 12, y + 23, cx + 11, y + 26, rgba("#746058"))
    flat_rect(draw, cx - 15, y + 34, cx - 4, y + 37, rgba("#40332f"))
    flat_rect(draw, cx + 3, y + 28, cx + 15, y + 31, rgba("#40332f"))
    for x, yy, size in ((cx - 5, y + 15, 2), (cx + 5, y + 15, 2), (cx - 8, y + 29, 2), (cx + 7, y + 34, 3)):
        dot(draw, x, yy, rgba("#ff8a2d"), size)
    line(draw, [(cx - 10, y + 25), (cx - 1, y + 31), (cx + 10, y + 26)], rgba("#d94a24"), 1)


def mage(draw: ImageDraw.ImageDraw, frame: int, state: State, corrupt: bool = False) -> None:
    cx, y = 31, 8
    robe = rgba("#5b438e") if not corrupt else rgba("#30233f")
    accent = rgba("#35c8d0") if not corrupt else rgba("#9f4bd0")
    shadow(draw, cx, 24)
    draw_feet(draw, cx, y + 42, 0, accent, 5)
    poly(draw, [(cx - 15, y + 20), (cx + 15, y + 20), (cx + 12, y + 43), (cx - 12, y + 43)], robe)
    poly(draw, [(cx - 11, y + 18), (cx, y + 4), (cx + 11, y + 18), (cx + 7, y + 26), (cx - 7, y + 26)], robe)
    rect(draw, box(cx - 5, y + 16, cx + 5, y + 23), rgba("#d6b178") if not corrupt else rgba("#8f70a4"), width=1, radius=2)
    line(draw, [(cx - 10, y + 24), (cx, y + 30), (cx + 10, y + 24)], accent, 1)
    dot(draw, cx - 8, y + 35, accent, 1)
    dot(draw, cx + 7, y + 35, accent, 1)
    dot(draw, cx - 4, y + 18, WHITE, 1)
    dot(draw, cx + 3, y + 18, WHITE, 1)
    rect(draw, box(cx - 2, y + 28, cx + 2, y + 42), accent, width=1)
    draw_staff(draw, cx + 16, y + 31, accent)
    if corrupt:
        poly(draw, [(cx - 8, y + 12), (cx - 16, y + 2), (cx - 6, y + 8)], rgba("#5f3271"))
        poly(draw, [(cx + 8, y + 12), (cx + 16, y + 2), (cx + 6, y + 8)], rgba("#5f3271"))


def shield_guard(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    step = SOLDIER_STEP[frame % WALK_FRAMES]
    cx, y = 31, 8
    shadow(draw, cx, 28)
    body_y = y + WALK_BOB[frame % WALK_FRAMES]
    draw_humanoid(draw, cx, body_y, step, rgba("#c79b67"), rgba("#2e5d72"), rgba("#5fd0db"), head=(14, 12), body=(19, 21), helmet=True, feet_y=y + 39)
    poly(draw, [(cx - 23, body_y + 23), (cx - 11, body_y + 19), (cx - 8, body_y + 32), (cx - 17, body_y + 43), (cx - 25, body_y + 33)], rgba("#536775"))
    poly(draw, [(cx - 20, body_y + 25), (cx - 12, body_y + 23), (cx - 11, body_y + 31), (cx - 17, body_y + 38), (cx - 22, body_y + 32)], rgba("#83a0ad"), width=1)
    line(draw, [(cx - 20, body_y + 32), (cx - 13, body_y + 28)], rgba("#30414d"), 1)
    dot(draw, cx - 18, body_y + 28, rgba("#83e9f3"), 3)
    draw_sword(draw, cx + 14, body_y + 30)


def warlord(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    step = SOLDIER_STEP[frame % WALK_FRAMES]
    cx, y = 31, 5
    shadow(draw, cx, 32)
    body_y = y + WALK_BOB[frame % WALK_FRAMES]
    draw_humanoid(draw, cx, body_y, step, rgba("#66883b"), rgba("#8b3f32"), rgba("#40352c"), head=(19, 15), body=(25, 25), helmet=True, feet_y=y + 39)
    rect(draw, box(cx - 10, body_y + 6, cx + 10, body_y + 10), GOLD, width=1, radius=2)
    dot(draw, cx - 5, body_y + 1, GOLD, 2)
    dot(draw, cx + 4, body_y + 1, GOLD, 2)
    dot(draw, cx, body_y + 1, rgba("#ffe6a2"), 2)
    rect(draw, box(cx - 13, body_y + 20, cx + 13, body_y + 25), rgba("#533329"), width=1, radius=2)
    dot(draw, cx - 8, body_y + 23, GOLD, 1)
    dot(draw, cx + 7, body_y + 23, GOLD, 1)
    draw_axe(draw, cx + 16, body_y + 29)
    poly(draw, [(cx - 19, body_y + 22), (cx - 28, body_y + 27), (cx - 23, body_y + 39), (cx - 15, body_y + 35)], rgba("#734040"))


def forge_master(draw: ImageDraw.ImageDraw, frame: int, state: State) -> None:
    step = SOLDIER_STEP[frame % WALK_FRAMES]
    cx, y = 31, 10
    shadow(draw, cx, 27)
    body_y = y + WALK_BOB[frame % WALK_FRAMES]
    draw_humanoid(draw, cx, body_y, step, rgba("#b9784b"), rgba("#65422e"), rgba("#c75c2e"), head=(15, 12), body=(21, 20), helmet=True, feet_y=y + 39)
    rect(draw, box(cx - 10, body_y + 25, cx + 10, body_y + 38), rgba("#7e4a2d"), width=1, radius=2)
    flat_rect(draw, cx - 8, body_y + 28, cx + 8, body_y + 31, rgba("#b66a36"))
    dot(draw, cx - 5, body_y + 35, rgba("#ffb154"), 1)
    dot(draw, cx + 5, body_y + 35, rgba("#ffb154"), 1)
    line(draw, [(cx + 14, body_y + 42), (cx + 20, body_y + 21)], WOOD, 3)
    rect(draw, box(cx + 14, body_y + 15, cx + 28, body_y + 23), STEEL_HI, width=1, radius=2)
    dot(draw, cx - 3, body_y + 33, rgba("#ff9a3d"), 2)


def dragon(draw: ImageDraw.ImageDraw, frame: int, state: State, boss: bool = False, rage: bool = False) -> None:
    cx, y = 31, 12 if not boss else 8
    bob = [0, -1, -2, -1, 0, 1, 0, -1][frame % WALK_FRAMES]
    body = rgba("#9f352d") if not rage else rgba("#c64228")
    belly = rgba("#d79048") if not rage else rgba("#ffb23d")
    wing = rgba("#6f3032") if not rage else rgba("#923431")
    shadow(draw, cx, 31 if boss else 26)
    poly(draw, [(cx - 22, y + 25 + bob), (cx - 7, y + 15 + bob), (cx - 3, y + 34 + bob), (cx - 18, y + 37 + bob)], wing)
    poly(draw, [(cx + 1, y + 23 + bob), (cx + 16, y + 12 + bob), (cx + 13, y + 35 + bob), (cx + 2, y + 34 + bob)], wing)
    line(draw, [(cx - 17, y + 26 + bob), (cx - 8, y + 20 + bob)], shade(wing, 35), 1)
    line(draw, [(cx + 5, y + 25 + bob), (cx + 14, y + 18 + bob)], shade(wing, 35), 1)
    ellipse(draw, box(cx - 13, y + 22 + bob, cx + 13, y + 43 + bob), body)
    ellipse(draw, box(cx + 8, y + 14 + bob, cx + 25, y + 29 + bob), body)
    flat_ellipse(draw, cx - 8, y + 25 + bob, cx + 7, y + 31 + bob, shade(body, 25))
    dot(draw, cx - 2, y + 19 + bob, rgba("#e8d58b"), 2)
    dot(draw, cx - 8, y + 21 + bob, rgba("#e8d58b"), 1)
    poly(draw, [(cx + 21, y + 18 + bob), (cx + 31, y + 15 + bob), (cx + 24, y + 24 + bob)], body)
    line(draw, [(cx - 10, y + 36 + bob), (cx - 25, y + 43 + bob), (cx - 30, y + 38 + bob)], body, 4)
    draw_feet(draw, cx, y + 48 + bob, 0, body, 6)
    rect(draw, box(cx - 4, y + 29 + bob, cx + 7, y + 39 + bob), belly, width=1, radius=3)
    poly(draw, [(cx + 15, y + 14 + bob), (cx + 16, y + 6 + bob), (cx + 19, y + 14 + bob)], rgba("#e8d58b"))
    poly(draw, [(cx - 6, y + 18 + bob), (cx - 3, y + 10 + bob), (cx, y + 19 + bob)], rgba("#e8d58b"))
    poly(draw, [(cx + 2, y + 18 + bob), (cx + 6, y + 10 + bob), (cx + 8, y + 19 + bob)], rgba("#e8d58b"))
    dot(draw, cx + 17, y + 20 + bob, rgba("#ffe17a"), 1)


DRAWERS: dict[str, Callable[[ImageDraw.ImageDraw, int, State], None]] = {
    "goblin": goblin,
    "orc": orc,
    "troll": troll,
    "assassin": assassin,
    "imp": imp,
    "lava_golem": lava_golem,
    "mage": mage,
    "shield_guard": shield_guard,
    "warlord": warlord,
    "forge_master": forge_master,
    "corrupt_mage": lambda draw, frame, state: mage(draw, frame, state, True),
    "dragon": dragon,
}

UNIT_SPECS = [
    ("scout_drone", "goblin"),
    ("battle_robot", "orc"),
    ("heavy_walker", "troll"),
    ("stealth_drone", "assassin"),
    ("flame_imp", "imp"),
    ("lava_golem", "lava_golem"),
    ("arcane_mage", "mage"),
    ("mana_shield", "shield_guard"),
    ("orc_warlord", "warlord"),
    ("forge_master", "forge_master"),
    ("corrupted_archmage", "corrupt_mage"),
    ("dragon", "dragon"),
]

BOSS_SPECS = [("dragon-boss", False), ("dragon-boss-rage", True)]


def draw_live_canvas(kind: str, frame: int, state: State, *, rage: bool = False) -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    if kind == "dragon_boss":
        dragon(draw, frame, state, boss=True, rage=rage)
    else:
        DRAWERS[kind](draw, frame, state)
    return image


def alpha_scaled(image: Image.Image, alpha: float) -> Image.Image:
    result = image.copy()
    result.putalpha(result.getchannel("A").point(lambda value: round(value * alpha)))
    return result


def draw_hit_spark(draw: ImageDraw.ImageDraw, cx: int, cy: int, frame: int, color: Color = rgba("#ffdf7a")) -> None:
    spread = 6 + frame * 2
    line(draw, [(cx - spread, cy - 2), (cx - 2, cy - 1)], color, 1)
    line(draw, [(cx + 2, cy - 2), (cx + spread, cy - 4)], color, 1)
    line(draw, [(cx - 1, cy - spread), (cx + 1, cy - 3)], color, 1)
    dot(draw, cx + spread // 2, cy + 2, rgba("#ffffff"), 1)


def draw_debris(draw: ImageDraw.ImageDraw, kind: str, frame: int, ground: int) -> None:
    base_colors = {
        "goblin": [rgba("#6f8e42"), rgba("#8b673a"), GOLD],
        "orc": [rgba("#6f8f3e"), rgba("#89513b"), STEEL],
        "troll": [rgba("#78867f"), rgba("#53615c"), rgba("#a7b0aa")],
        "assassin": [rgba("#332743"), rgba("#6f4c8d"), rgba("#221d26")],
        "imp": [rgba("#d74e22"), rgba("#ffbd49"), rgba("#8f2c20")],
        "lava_golem": [rgba("#58463e"), rgba("#ff8a2d"), rgba("#40332f")],
        "mage": [rgba("#5b438e"), rgba("#35c8d0"), rgba("#d6b178")],
        "shield_guard": [rgba("#536775"), rgba("#83e9f3"), STEEL],
        "warlord": [rgba("#8b3f32"), GOLD, rgba("#66883b")],
        "forge_master": [rgba("#65422e"), rgba("#c75c2e"), STEEL_HI],
        "corrupt_mage": [rgba("#30233f"), rgba("#9f4bd0"), rgba("#5f3271")],
        "dragon": [rgba("#9f352d"), rgba("#d79048"), rgba("#6f3032")],
        "dragon_boss": [rgba("#9f352d"), rgba("#d79048"), rgba("#6f3032")],
    }
    colors = base_colors.get(kind, [rgba("#6b5140"), rgba("#8c6a45"), rgba("#b89558")])
    offsets = (-17, -10, -4, 4, 11, 17)
    scatter = frame - 3
    for index, dx in enumerate(offsets):
        drift = dx + (scatter * (index - 2))
        y = ground - (index % 3) - scatter
        if index % 2:
            rect(draw, box(32 + drift, y, 36 + drift, y + 4), colors[index % len(colors)], width=1, radius=1)
        else:
            poly(draw, [(32 + drift, y + 4), (35 + drift, y - 1), (39 + drift, y + 3), (36 + drift, y + 6)], colors[index % len(colors)], width=1)
    for dx, dy in ((-12, 2), (-4, -1), (7, 1), (15, -2)):
        flat_ellipse(draw, 32 + dx, ground + dy, 42 + dx, ground + dy + 3, DUST)
    if kind in {"imp", "lava_golem"}:
        dot(draw, 30, ground - 5, rgba("#ff8a2d"), 2)
        dot(draw, 38, ground - 2, rgba("#ffd06a"), 1)


def draw_death_frame(kind: str, frame: int, *, rage: bool = False) -> Image.Image:
    progress = frame / max(1, DEATH_FRAMES - 1)
    image = canvas()
    draw = ImageDraw.Draw(image)
    ground = round(GROUND_Y - 3 + progress * 4)
    shadow(draw, 32, max(12, round(30 - progress * 13)), ground + 2)

    if frame <= 1:
        live = draw_live_canvas(kind, frame, "walk", rage=rage)
        image.alpha_composite(live)
        draw_hit_spark(draw, 36, 24, frame)
        return finish(image)

    if frame == 2:
        live = draw_live_canvas(kind, 2, "walk", rage=rage).rotate(-16, resample=Image.Resampling.BICUBIC, center=(sc(32), sc(48)))
        image.alpha_composite(live)
        draw_hit_spark(draw, 40, 30, frame, rgba("#eec273"))
        flat_ellipse(draw, 23, 51, 43, 56, DUST)
        return finish(image)

    if frame == 3:
        live = draw_live_canvas(kind, 3, "walk", rage=rage).rotate(-72, resample=Image.Resampling.BICUBIC, center=(sc(33), sc(50)))
        image.alpha_composite(alpha_scaled(live, 0.95))
        flat_ellipse(draw, 17, 50, 48, 57, DUST)
        draw_debris(draw, kind, frame, ground)
        return finish(image)

    draw_debris(draw, kind, frame, ground)
    if frame == 4:
        live = draw_live_canvas(kind, 4, "walk", rage=rage).rotate(-88, resample=Image.Resampling.BICUBIC, center=(sc(33), sc(52)))
        image.alpha_composite(alpha_scaled(live, 0.38))
    return finish(image)


def draw_frame(kind: str, frame: int, state: State, *, rage: bool = False) -> Image.Image:
    if state == "death":
        return draw_death_frame(kind, frame, rage=rage)
    return finish(draw_live_canvas(kind, frame, state, rage=rage))


def pack(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME, 0))
    return sheet


def write_png_and_webp(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    image.save(path.with_suffix(".webp"), "WEBP", lossless=True, method=6)


def build_unit(unit_id: str, kind: str) -> Image.Image:
    walk = [draw_frame(kind, index, "walk") for index in range(WALK_FRAMES)]
    idle = [draw_frame(kind, index, "idle") for index in range(IDLE_FRAMES)]
    death = [draw_frame(kind, index, "death") for index in range(DEATH_FRAMES)]
    write_png_and_webp(UNIT_DIR / f"{unit_id}.png", pack(walk))
    write_png_and_webp(UNIT_DIR / f"{unit_id}_idle.png", pack(idle))
    write_png_and_webp(UNIT_DIR / f"{unit_id}_death.png", pack(death))
    return idle[0]


def build_boss(unit_id: str, rage: bool) -> Image.Image:
    frames = [draw_frame("dragon_boss", index, "boss", rage=rage) for index in range(WALK_FRAMES)]
    write_png_and_webp(UNIT_DIR / f"{unit_id}.png", pack(frames))
    return frames[0]


def main() -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    preview = [build_unit(unit_id, kind) for unit_id, kind in UNIT_SPECS]
    boss_preview = [build_boss(unit_id, rage) for unit_id, rage in BOSS_SPECS]
    write_png_and_webp(PREVIEW_DIR / "unit-lineup-preview.png", pack(preview))
    write_png_and_webp(PREVIEW_DIR / "boss-lineup-preview.png", pack(boss_preview))
    write_png_and_webp(PREVIEW_DIR / "walk-cycle-preview.png", pack([draw_frame("goblin", index, "walk") for index in range(WALK_FRAMES)]))
    print("Wrote reference-style 64x64 sprite sheets")


if __name__ == "__main__":
    main()
