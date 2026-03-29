# Unit Sprites Generation Summary

## What was done

### 1. Scripts created/updated in scripts/generate-assets/

- **shared.ts** (already existed) -- Color palette, pixel-drawing utilities (Bresenham circle/line), canvas helpers, ManifestEntry type.
- **generate-units.ts** (new) -- Generates 5 unit walk-cycle sprite sheets + 1 shared death effect sprite sheet.

### 2. Generated PNGs in packages/web-shell/public/assets/units/

| File | Dimensions | Description |
|------|-----------|-------------|
| scout_drone.png | 128x32 (4 frames) | Mint green triangle/arrow with propeller animation |
| battle_robot.png | 128x32 (4 frames) | Blue square body with head notch, leg alternation |
| heavy_walker.png | 128x32 (4 frames) | Orange thick hexagon body, heavy bounce legs |
| stealth_drone.png | 128x32 (4 frames) | Light purple diamond with shimmer/flicker |
| titan.png | 128x32 (4 frames) | Red large octagon with rotating inner core glow |
| unit-death.png | 128x32 (4 frames) | Shared death effect: flash, scatter, explosion, smoke |

All sprites are 32x32 per frame, 4 frames horizontal strip, transparent background, pixel art style (no anti-aliasing).

### 3. Preloader.ts updated

Updated packages/phaser-game/src/scenes/Preloader.ts to:
- **preload()**: Load all 5 unit sprite sheets + death effect as Phaser spritesheets with frameWidth: 32, frameHeight: 32
- **create()**: Create walk animations ({id}-walk, frameRate 8, repeat -1) for each unit type + death animation (unit-death, frameRate 10, repeat 0)

### Asset keys

| Phaser Key | Animation Key | Type |
|-----------|--------------|------|
| unit-scout_drone | scout_drone-walk | spritesheet |
| unit-battle_robot | battle_robot-walk | spritesheet |
| unit-heavy_walker | heavy_walker-walk | spritesheet |
| unit-stealth_drone | stealth_drone-walk | spritesheet |
| unit-titan | titan-walk | spritesheet |
| unit-death | unit-death | spritesheet |

### Run command

bun run scripts/generate-assets/generate-units.ts
