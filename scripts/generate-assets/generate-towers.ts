import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, drawStar, addGlow, type ManifestEntry } from './shared';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/towers';

interface TowerDef {
  id: string;
  color: string;
  shape: 'diamond' | 'hexagon' | 'circle' | 'shield' | 'star';
  tier: 1 | 2;
}

const TOWERS: TowerDef[] = [
  { id: 'laser', color: PALETTE.laser, shape: 'diamond', tier: 1 },
  { id: 'plasma', color: PALETTE.plasma, shape: 'hexagon', tier: 1 },
  { id: 'emp', color: PALETTE.emp, shape: 'circle', tier: 1 },
  { id: 'shield', color: PALETTE.shield, shape: 'shield', tier: 1 },
  { id: 'twin_laser', color: PALETTE.laser, shape: 'star', tier: 2 },
  { id: 'disruptor', color: PALETTE.emp, shape: 'star', tier: 2 },
  { id: 'nova_cannon', color: PALETTE.plasma, shape: 'star', tier: 2 },
  { id: 'fortress', color: PALETTE.shield, shape: 'star', tier: 2 },
  { id: 'stasis_field', color: PALETTE.stasis, shape: 'star', tier: 2 },
];

function drawTowerBase(ctx: SKRSContext2D, ox: number, cy: number) {
  // Dark platform circle at bottom
  fillCircle(ctx, ox + 16, cy + 26, 10, PALETTE.towerBase);
  drawCircle(ctx, ox + 16, cy + 26, 10, hexToRgba('#333344', 0.5));
}

function drawTowerShape(ctx: SKRSContext2D, ox: number, oy: number, tower: TowerDef) {
  const cx = ox + 16;
  const cy = oy + 14;

  switch (tower.shape) {
    case 'diamond':
      // Diamond crystal
      drawLine(ctx, cx, cy - 7, cx + 6, cy, tower.color);
      drawLine(ctx, cx + 6, cy, cx, cy + 7, tower.color);
      drawLine(ctx, cx, cy + 7, cx - 6, cy, tower.color);
      drawLine(ctx, cx - 6, cy, cx, cy - 7, tower.color);
      // Fill inner
      for (let dy = -6; dy <= 6; dy++) {
        const w = 6 - Math.abs(dy);
        for (let dx = -w + 1; dx < w; dx++) {
          setPixel(ctx, cx + dx, cy + dy, hexToRgba(tower.color, 0.6));
        }
      }
      // Barrel pointing right
      drawRect(ctx, ox + 22, cy - 1, 6, 3, tower.color);
      break;

    case 'hexagon':
      drawPolygon(ctx, cx, cy, 8, 6, tower.color, 0);
      // Fill inner area
      fillCircle(ctx, cx, cy, 5, hexToRgba(tower.color, 0.4));
      // Wide barrel
      drawRect(ctx, ox + 22, cy - 2, 6, 5, tower.color);
      addGlow(ctx, ox + 27, cy, 3, tower.color, 0.5);
      break;

    case 'circle':
      // Sphere
      drawCircle(ctx, cx, cy, 8, tower.color);
      fillCircle(ctx, cx, cy, 6, hexToRgba(tower.color, 0.3));
      // Electric arcs
      drawLine(ctx, cx - 3, cy - 6, cx + 2, cy - 9, tower.color);
      drawLine(ctx, cx + 2, cy - 9, cx + 4, cy - 7, tower.color);
      // Antenna on top
      drawLine(ctx, cx, cy - 8, cx, cy - 12, tower.color);
      setPixel(ctx, cx, cy - 12, PALETTE.white);
      break;

    case 'shield':
      // Shield shape
      drawLine(ctx, cx - 7, cy - 6, cx + 7, cy - 6, tower.color);
      drawLine(ctx, cx - 7, cy - 6, cx - 7, cy + 2, tower.color);
      drawLine(ctx, cx + 7, cy - 6, cx + 7, cy + 2, tower.color);
      drawLine(ctx, cx - 7, cy + 2, cx, cy + 8, tower.color);
      drawLine(ctx, cx + 7, cy + 2, cx, cy + 8, tower.color);
      fillCircle(ctx, cx, cy, 4, hexToRgba(tower.color, 0.3));
      // Cyan ring around base
      drawCircle(ctx, cx, oy + 26, 11, hexToRgba(tower.color, 0.5));
      break;

    case 'star':
      drawStar(ctx, cx, cy, 9, 5, 5, tower.color);
      fillCircle(ctx, cx, cy, 4, hexToRgba(tower.color, 0.5));
      // Small barrel for tier 2
      if (tower.id === 'twin_laser') {
        drawRect(ctx, ox + 22, cy - 3, 5, 2, tower.color);
        drawRect(ctx, ox + 22, cy + 1, 5, 2, tower.color);
      } else if (tower.id !== 'stasis_field' && tower.id !== 'fortress') {
        drawRect(ctx, ox + 23, cy - 1, 5, 3, tower.color);
      }
      break;
  }
}

function drawFireFrame(ctx: SKRSContext2D, ox: number, oy: number, tower: TowerDef, frame: number) {
  const cx = ox + 16;
  const cy = oy + 14;

  drawTowerBase(ctx, ox, oy);
  drawTowerShape(ctx, ox, oy, tower);

  if (tower.id === 'shield') {
    // Shield uses pulse animation
    switch (frame) {
      case 1:
        drawCircle(ctx, cx, cy, 6, hexToRgba(tower.color, 0.7));
        break;
      case 2:
        drawCircle(ctx, cx, cy, 10, tower.color);
        drawCircle(ctx, cx, cy, 9, hexToRgba(tower.color, 0.5));
        break;
      case 3:
        drawCircle(ctx, cx, cy, 12, hexToRgba(tower.color, 0.3));
        break;
    }
  } else {
    switch (frame) {
      case 1:
        // Charge - glow intensifies
        addGlow(ctx, cx, cy, 8, tower.color, 0.4);
        break;
      case 2:
        // Fire - white flash at barrel
        addGlow(ctx, ox + 27, cy, 5, PALETTE.white, 0.8);
        fillCircle(ctx, ox + 28, cy, 2, PALETTE.white);
        break;
      case 3:
        // Cooldown - residual glow
        addGlow(ctx, ox + 25, cy, 4, tower.color, 0.3);
        break;
    }
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  for (const tower of TOWERS) {
    // Static sprite (32x32)
    {
      const { canvas, ctx } = makeCanvas(32, 32);
      drawTowerBase(ctx, 0, 0);
      drawTowerShape(ctx, 0, 0, tower);
      saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}.png`);
      entries.push({ key: `tower-${tower.id}`, type: 'image', path: `assets/towers/${tower.id}.png` });
    }

    // Fire animation (128x32, 4 frames)
    {
      const { canvas, ctx } = makeCanvas(128, 32);
      for (let f = 0; f < 4; f++) {
        drawFireFrame(ctx, f * 32, 0, tower, f);
      }
      saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}-fire.png`);
      entries.push({
        key: `tower-${tower.id}-fire`,
        type: 'spritesheet',
        path: `assets/towers/${tower.id}-fire.png`,
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 4,
      });
    }
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
