---
name: generate-assets
description: Generate pixel art game assets (tiles, towers, units, projectiles, UI, VFX) for the Grid Line Defense PvP game using @napi-rs/canvas scripts. Use this skill whenever the user asks to generate assets, create sprites, make pixel art, generate tower/unit/tile sprites, create game graphics, or anything related to producing visual or audio assets for this project. Also trigger when the user says "generate-assets" or asks to update/regenerate existing sprites.
---

# Generate Assets

Procedurally generate pixel art PNG sprite sheets for Grid Line Defense PvP using `@napi-rs/canvas` and Bun.

## Prerequisites

```bash
bun add -d @napi-rs/canvas
```

## Output Structure

All assets go to `packages/web-shell/public/assets/`:

```
assets/
├── tiles/          # Grid floor, spawn/exit markers
├── towers/         # 9 tower types (static + fire animations)
├── units/          # 5 unit types (walk cycles) + death effect
├── projectiles/    # Beam, bolt, pulse, impact
├── vfx/            # Explosions, shield bubble, spawn portal
├── ui/             # Tower/unit icons, HP bar, cursor
└── asset-manifest.json
```

## Script Structure

All generation scripts live in `scripts/generate-assets/` at project root:

```
scripts/generate-assets/
├── shared.ts           # Palette, canvas utils, pixel-drawing helpers
├── generate-tiles.ts
├── generate-towers.ts
├── generate-units.ts
├── generate-projectiles.ts
├── generate-vfx.ts
├── generate-ui.ts
└── generate-all.ts     # Orchestrator
```

### shared.ts Pattern

Every script imports from `shared.ts`. It must export:

```typescript
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// === Color Palette (strict - only use these) ===
export const PALETTE = {
  dark:       '#1a1a2e',
  darkAlt:    '#16161a',
  gridDark:   '#12121e',
  gridLight:  '#161625',
  gridLine:   '#1e1e30',
  purple:     '#7f5af0',
  green:      '#2cb67d',
  pink:       '#e53170',
  gold:       '#e2b714',
  cyan:       '#00ccff',
  white:      '#fffffe',
  gray:       '#94a1b2',
  // Tower colors
  archer:     '#c8a04a',
  plasma:     '#8b4513',
  emp:        '#5bc8e8',
  shield:     '#f4d03f',
  stasis:     '#94a1b2',
  // Unit colors
  scoutDrone:    '#72f1b8',
  battleRobot:   '#5b8cff',
  heavyWalker:   '#ff8c42',
  stealthDrone:  '#b388ff',
  dragon:        '#c04020',
} as const;

export const TILE_SIZE = 32;

// === Utilities ===
export function makeCanvas(w: number, h: number): { canvas: Canvas; ctx: SKRSContext2D } { ... }
export function saveCanvas(canvas: Canvas, path: string): void { ... }
export function hexToRgba(hex: string, alpha?: number): string { ... }

// === Pixel Drawing (no anti-aliasing) ===
// IMPORTANT: Always set ctx.imageSmoothingEnabled = false
export function setPixel(ctx: SKRSContext2D, x: number, y: number, color: string): void { ... }
export function drawRect(ctx: SKRSContext2D, x, y, w, h, color): void { ... }
export function drawCircle(ctx: SKRSContext2D, cx, cy, r, color): void { ... }  // Bresenham
export function drawLine(ctx: SKRSContext2D, x1, y1, x2, y2, color): void { ... }  // Bresenham
export function fillCircle(ctx: SKRSContext2D, cx, cy, r, color): void { ... }
export function drawPolygon(ctx: SKRSContext2D, cx, cy, radius, sides, color, rotation?): void { ... }
export function drawStar(ctx: SKRSContext2D, cx, cy, outerR, innerR, points, color): void { ... }
export function addGlow(ctx: SKRSContext2D, cx, cy, radius, color, alpha): void { ... }

// === Manifest ===
export interface ManifestEntry {
  key: string;
  type: 'image' | 'spritesheet';
  path: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}
```

The pixel-drawing functions should use integer coordinates and 1x1 `fillRect` calls (not `arc` or `lineTo`) to maintain the pixel art aesthetic. Bresenham's algorithm for circles and lines.

### Generator Pattern

Each generator follows this pattern:

```typescript
import { makeCanvas, saveCanvas, PALETTE, TILE_SIZE, type ManifestEntry } from './shared';

const OUTPUT_DIR = 'packages/web-shell/public/assets/<category>';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // Generate each asset...
  // For sprite sheets: canvas width = frameWidth * frameCount

  return entries;
}

// Run standalone
if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
```

### Orchestrator (generate-all.ts)

Runs all generators and writes `asset-manifest.json`:

```typescript
const allEntries = [
  ...await generateTiles(),
  ...await generateTowers(),
  ...await generateUnits(),
  ...await generateProjectiles(),
  ...await generateVfx(),
  ...await generateUi(),
];
writeFileSync('packages/web-shell/public/assets/asset-manifest.json',
  JSON.stringify({ generated: new Date().toISOString(), assets: allEntries }, null, 2));
```

Run: `bun run scripts/generate-assets/generate-all.ts`

## Sprite Conventions

1. **All sprites fit the 32px grid** (32x32 per frame)
2. **Sprite sheets are horizontal strips**: width = frameWidth * frameCount, height = frameHeight
3. **Transparent backgrounds** (PNG alpha channel)
4. **Pixel art**: no anti-aliasing, hard edges, `ctx.imageSmoothingEnabled = false`
5. **4 frames** for animations (walk, fire, explosion)
6. Scripts are **idempotent** — re-running overwrites cleanly

## Asset Manifest Format

```json
{
  "generated": "2026-03-28T...",
  "assets": [
    { "key": "tower-archer", "type": "image", "path": "assets/towers/archer.png" },
    { "key": "tower-archer-fire", "type": "spritesheet", "path": "assets/towers/archer-fire.png",
      "frameWidth": 64, "frameHeight": 80, "frameCount": 8 }
  ]
}
```

## Phaser Preloader Integration

After generating assets, update `packages/phaser-game/src/scenes/Preloader.ts`:

```typescript
preload() {
  // For type === 'image':
  this.load.image(key, path);
  // For type === 'spritesheet':
  this.load.spritesheet(key, path, { frameWidth, frameHeight });
}

create() {
  // Create animations for sprite sheets
  this.anims.create({
    key: 'scout_drone-walk',
    frames: this.anims.generateFrameNumbers('unit-scout_drone', { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1,
  });
  this.scene.start('Game');
}
```

## Detailed Asset Specs

Read `references/asset-specs.md` for the full specification of every asset including exact dimensions, frame counts, visual descriptions, and color assignments per tower/unit type.

Read `references/color-palette.md` for the complete color palette with hex values and usage rules.

## Workflow Summary

1. Ensure `@napi-rs/canvas` is installed
2. Write/update scripts in `scripts/generate-assets/`
3. Run `bun run scripts/generate-assets/generate-all.ts` (or individual generators)
4. Verify PNGs are in `packages/web-shell/public/assets/`
5. If requested, update Preloader.ts with load calls + animation definitions
