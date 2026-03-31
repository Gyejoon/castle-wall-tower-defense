import {
  makeCanvas,
  saveCanvas,
  PALETTE,
  hexToRgba,
  drawRect,
  fillCircle,
  drawCircle,
  setPixel,
  drawLine,
  drawStar,
  addGlow,
  ISO_TILE_W,
  ISO_TILE_H,
  drawIsoShadow,
  type ManifestEntry,
} from './shared';
import { mkdirSync } from 'fs';
import { ALL_TOWERS } from '../../packages/shared/src/constants/towers';
import type { TowerDef as SharedTowerDef } from '../../packages/shared/src/types/tower';
import type { SKRSContext2D } from '@napi-rs/canvas';

const OUTPUT_DIR = 'packages/web-shell/public/assets/towers';

type GeneratedTowerShape = 'archer' | 'catapult' | 'frost' | 'paladin' | 'star';

interface TowerAssetDef {
  id: string;
  color: string;
  shape: GeneratedTowerShape;
}

function mapTowerShape(shape: SharedTowerDef['shape']): GeneratedTowerShape {
  switch (shape) {
    case 'diamond':
      return 'archer';
    case 'hexagon':
      return 'catapult';
    case 'circle':
      return 'frost';
    case 'shield':
      return 'paladin';
    case 'star':
      return 'star';
  }
}

const TOWERS: TowerAssetDef[] = ALL_TOWERS.map(({ id, color, shape }) => ({
  id,
  color,
  shape: mapTowerShape(shape),
}));

// Draw an isometric cube: top diamond + left face (dark) + right face (medium)
function drawIsoCube(
  ctx: SKRSContext2D,
  cx: number, cy: number,  // center of cube top diamond
  hw: number,              // half-width of top diamond
  height: number,          // cube height in pixels
  topColor: string, leftColor: string, rightColor: string,
): void {
  const hh = Math.round(hw / 2); // iso 2:1 ratio

  // Top face (diamond)
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const w = Math.round(hw * ratio);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, cy + dy, topColor);
    }
  }

  // Left face
  for (let h = 1; h <= height; h++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = -w; dx < 0; dx++) {
        setPixel(ctx, cx + dx, cy + row + h, leftColor);
      }
    }
  }

  // Right face
  for (let h = 1; h <= height; h++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = 0; dx <= w; dx++) {
        setPixel(ctx, cx + dx, cy + row + h, rightColor);
      }
    }
  }
}

// Stone base: isometric diamond platform with shadow
function drawBase(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  const baseY = 64;

  // Shadow ellipse below base
  drawIsoShadow(ctx, cx, baseY + 6, 18, 6, 0.4);

  // Stone base as small isometric diamond (24px wide, 5px half-height)
  const hw = 12;
  const hh = 5;
  // Top face
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const w = Math.round(hw * ratio);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(ctx, cx + dx, baseY + dy, PALETTE.stoneLight);
    }
  }
  // Left depth (dark)
  for (let d = 1; d <= 4; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = -w; dx < 0; dx++) {
        setPixel(ctx, cx + dx, baseY + row + d, PALETTE.stoneDark);
      }
    }
  }
  // Right depth (lighter)
  for (let d = 1; d <= 4; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = 0; dx <= w; dx++) {
        setPixel(ctx, cx + dx, baseY + row + d, PALETTE.stone);
      }
    }
  }
}

// 궁수 탑: 3-face stone cube with battlements and arrow slits
function drawArcherTower(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Main tower body as iso cube: center top at (cx, 38), hw=10, height=22
  drawIsoCube(ctx, cx, 38, 10, 22,
    PALETTE.stoneLight, PALETTE.stoneDark, PALETTE.stone);

  // Battlement notches on top — carve two gaps in the top diamond
  // Draw merlons as small iso cubes on top
  drawIsoCube(ctx, cx - 7, 30, 4, 4,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawIsoCube(ctx, cx + 7, 30, 4, 4,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);

  // Arrow slit (front face of cube = right face, around y=50)
  setPixel(ctx, cx + 2, 50, '#1a1208');
  setPixel(ctx, cx + 3, 50, '#1a1208');
  setPixel(ctx, cx + 2, 51, '#1a1208');
  setPixel(ctx, cx + 3, 51, '#1a1208');
  setPixel(ctx, cx + 2, 52, '#1a1208');
  setPixel(ctx, cx + 3, 52, '#1a1208');

  // Small flag pole on top
  drawLine(ctx, cx + 4, 22, cx + 4, 30, PALETTE.wood);
  setPixel(ctx, cx + 5, 22, '#c03020');
  setPixel(ctx, cx + 6, 23, '#c03020');
  setPixel(ctx, cx + 5, 24, '#c03020');
}

// 투석기: wooden frame on wheels — iso rendering
function drawCatapult(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Wheel left — small iso circle suggestion at base level
  fillCircle(ctx, cx - 10, 62, 4, PALETTE.woodDark);
  fillCircle(ctx, cx - 10, 62, 3, hexToRgba(PALETTE.wood, 0.7));
  setPixel(ctx, cx - 10, 62, PALETTE.woodDark);
  // Wheel right
  fillCircle(ctx, cx + 10, 62, 4, PALETTE.woodDark);
  fillCircle(ctx, cx + 10, 62, 3, hexToRgba(PALETTE.wood, 0.7));
  setPixel(ctx, cx + 10, 62, PALETTE.woodDark);

  // Wooden frame body as iso cube (shorter, wider)
  drawIsoCube(ctx, cx, 48, 12, 12,
    PALETTE.wood, PALETTE.woodDark, hexToRgba(PALETTE.wood, 0.8));

  // Arm (diagonal from frame top-left toward upper-right)
  drawLine(ctx, cx - 6, 46, cx + 8, 30, PALETTE.woodDark);
  drawLine(ctx, cx - 5, 46, cx + 9, 30, PALETTE.wood);

  // Sling cup at top of arm
  drawRect(ctx, cx + 6, 27, 5, 4, PALETTE.woodLight);
  // Boulder in sling
  fillCircle(ctx, cx + 8, 29, 3, PALETTE.stoneDark);
  setPixel(ctx, cx + 7, 27, PALETTE.stoneLight);

  // Support strut
  drawLine(ctx, cx - 4, 48, cx - 4, 38, PALETTE.woodDark);
  drawLine(ctx, cx + 4, 48, cx + 6, 38, PALETTE.woodDark);
}

// 서리 마탑: ice-tinted stone tower with crystal spires
function drawFrostTower(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Tower body iso cube with ice tint
  drawIsoCube(ctx, cx, 38, 9, 22,
    hexToRgba(PALETTE.ice, 0.5), PALETTE.stoneDark, hexToRgba(PALETTE.iceGlow, 0.4));
  // Stone underlayer
  drawIsoCube(ctx, cx, 38, 9, 22,
    'rgba(0,0,0,0)', PALETTE.stoneDark, PALETTE.stoneDark);
  // Re-draw top with ice tint
  drawIsoCube(ctx, cx, 38, 9, 0,
    hexToRgba(PALETTE.ice, 0.6), '', '');

  // Proper stone body first
  drawIsoCube(ctx, cx, 40, 9, 20,
    PALETTE.stoneDark, PALETTE.stoneDark, PALETTE.stone);
  // Ice overlay on right face
  for (let y = 42; y <= 60; y++) {
    for (let x = cx; x <= cx + 9; x++) {
      setPixel(ctx, x, y, hexToRgba(PALETTE.iceGlow, 0.25));
    }
  }

  // Center ice crystal spire
  drawLine(ctx, cx, 18, cx - 3, 30, PALETTE.ice);
  drawLine(ctx, cx, 18, cx + 3, 30, PALETTE.ice);
  drawLine(ctx, cx - 3, 30, cx + 3, 30, PALETTE.ice);
  setPixel(ctx, cx, 19, PALETTE.white);
  setPixel(ctx, cx, 20, PALETTE.white);

  // Side crystals (left)
  drawLine(ctx, cx - 6, 22, cx - 9, 30, hexToRgba(PALETTE.ice, 0.7));
  drawLine(ctx, cx - 6, 22, cx - 3, 30, hexToRgba(PALETTE.ice, 0.7));
  // Side crystals (right)
  drawLine(ctx, cx + 6, 22, cx + 3, 30, hexToRgba(PALETTE.ice, 0.7));
  drawLine(ctx, cx + 6, 22, cx + 9, 30, hexToRgba(PALETTE.ice, 0.7));

  // Ice shards embedded in right face
  setPixel(ctx, cx + 3, 46, PALETTE.ice);
  setPixel(ctx, cx + 5, 50, PALETTE.ice);
  setPixel(ctx, cx + 2, 54, hexToRgba(PALETTE.ice, 0.7));

  // Blue aura
  addGlow(ctx, cx, 40, 10, PALETTE.iceGlow, 0.25);
}

// 성기사 제단: golden cross on stone altar — iso
function drawPaladinShrine(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Wide altar base as flat iso platform
  drawIsoCube(ctx, cx, 54, 14, 6,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  // Gold trim on top face edge
  for (let dx = -13; dx <= 13; dx++) {
    setPixel(ctx, cx + dx, 52, hexToRgba(PALETTE.gold, 0.4));
  }

  // Pillar cube in center
  drawIsoCube(ctx, cx, 40, 5, 12,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);

  // Golden cross — vertical bar
  drawRect(ctx, cx - 2, 22, 4, 18, PALETTE.gold);
  drawRect(ctx, cx - 2, 22, 1, 18, hexToRgba(PALETTE.white, 0.4));
  // Horizontal bar
  drawRect(ctx, cx - 8, 26, 16, 4, PALETTE.gold);
  drawRect(ctx, cx - 8, 26, 16, 1, hexToRgba(PALETTE.white, 0.4));

  // Golden glow
  addGlow(ctx, cx, 30, 10, PALETTE.magicGold, 0.35);
  addGlow(ctx, cx, 30, 5, PALETTE.gold, 0.5);
}

// Tier 2+: star-shaped tower with variant details — iso cube base
function drawStarTower(ctx: SKRSContext2D, ox: number, tower: TowerAssetDef) {
  const cx = ox + 32;
  const cy = 34;
  drawBase(ctx, ox);

  // Stone base pedestal iso cube
  drawIsoCube(ctx, cx, 54, 8, 6,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);

  // Star shape centered at cy
  drawStar(ctx, cx, cy, 12, 5, 5, tower.color);
  fillCircle(ctx, cx, cy, 6, hexToRgba(tower.color, 0.4));

  // Variant-specific center details
  switch (tower.id) {
    case 'twin_laser':
      // Double arrow slits (forward-facing on right side)
      drawRect(ctx, cx + 8, cy - 3, 6, 2, tower.color);
      drawRect(ctx, cx + 8, cy + 2, 6, 2, tower.color);
      addGlow(ctx, cx + 13, cy, 4, tower.color, 0.5);
      break;
    case 'disruptor':
      // Ice ring
      drawCircle(ctx, cx, cy, 5, PALETTE.ice);
      addGlow(ctx, cx, cy, 6, PALETTE.iceGlow, 0.5);
      break;
    case 'nova_cannon':
      // Large barrel
      drawRect(ctx, cx + 8, cy - 3, 9, 6, tower.color);
      fillCircle(ctx, cx + 16, cy, 3, hexToRgba(PALETTE.fireOrange, 0.7));
      break;
    case 'fortress':
      // Golden cross on star
      drawLine(ctx, cx, cy - 6, cx, cy + 6, PALETTE.gold);
      drawLine(ctx, cx - 6, cy, cx + 6, cy, PALETTE.gold);
      addGlow(ctx, cx, cy, 5, PALETTE.magicGold, 0.4);
      break;
    case 'stasis_field':
      // Frost ring
      drawCircle(ctx, cx, cy, 8, PALETTE.ice);
      addGlow(ctx, cx, cy, 6, PALETTE.iceGlow, 0.4);
      break;
  }
}

function drawTowerShape(ctx: SKRSContext2D, ox: number, tower: TowerAssetDef) {
  switch (tower.shape) {
    case 'archer':   drawArcherTower(ctx, ox); break;
    case 'catapult': drawCatapult(ctx, ox);    break;
    case 'frost':    drawFrostTower(ctx, ox);  break;
    case 'paladin':  drawPaladinShrine(ctx, ox); break;
    case 'star':     drawStarTower(ctx, ox, tower); break;
  }
}

function drawFireFrame(ctx: SKRSContext2D, ox: number, tower: TowerAssetDef, frame: number) {
  drawTowerShape(ctx, ox, tower);
  const cx = ox + 32;

  switch (tower.shape) {
    case 'archer':
      if (frame === 1) addGlow(ctx, cx, 40, 6, tower.color, 0.3);
      if (frame === 2) {
        // Arrow in flight (exits right side of frame)
        drawLine(ctx, cx + 10, 44, cx + 20, 44, tower.color);
        setPixel(ctx, cx + 20, 43, tower.color);
        setPixel(ctx, cx + 20, 45, tower.color);
      }
      if (frame === 3) addGlow(ctx, cx + 18, 44, 4, tower.color, 0.2);
      break;

    case 'catapult':
      if (frame === 1) addGlow(ctx, cx + 8, 29, 5, tower.color, 0.3);
      if (frame === 2) {
        // Boulder flying up and right
        fillCircle(ctx, cx + 18, 20, 4, PALETTE.stoneDark);
        setPixel(ctx, cx + 17, 18, PALETTE.stoneLight);
        addGlow(ctx, cx + 18, 20, 5, PALETTE.fireOrange, 0.3);
      }
      if (frame === 3) {
        // Impact
        addGlow(ctx, cx + 20, 22, 6, PALETTE.fireOrange, 0.4);
      }
      break;

    case 'frost':
      if (frame === 1) addGlow(ctx, cx, 40, 10, PALETTE.iceGlow, 0.4);
      if (frame === 2) {
        drawCircle(ctx, cx, 40, 14, hexToRgba(PALETTE.ice, 0.6));
        addGlow(ctx, cx, 40, 8, PALETTE.iceGlow, 0.5);
      }
      if (frame === 3) addGlow(ctx, cx, 40, 8, PALETTE.ice, 0.2);
      break;

    case 'paladin':
      if (frame === 1) addGlow(ctx, cx, 30, 10, PALETTE.gold, 0.4);
      if (frame === 2) {
        // Holy light burst
        drawCircle(ctx, cx, 30, 16, hexToRgba(PALETTE.gold, 0.5));
        addGlow(ctx, cx, 30, 10, PALETTE.magicGold, 0.6);
      }
      if (frame === 3) addGlow(ctx, cx, 30, 8, PALETTE.gold, 0.2);
      break;

    case 'star':
      if (frame === 1) addGlow(ctx, cx, 34, 9, tower.color, 0.3);
      if (frame === 2) {
        addGlow(ctx, cx + 14, 34, 6, PALETTE.white, 0.7);
        fillCircle(ctx, cx + 15, 34, 3, PALETTE.white);
      }
      if (frame === 3) addGlow(ctx, cx + 12, 34, 5, tower.color, 0.2);
      break;
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  for (const tower of TOWERS) {
    // Static sprite (64x80)
    {
      const { canvas, ctx } = makeCanvas(64, 80);
      drawTowerShape(ctx, 0, tower);
      saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}.png`);
      entries.push({ key: `tower-${tower.id}`, type: 'image', path: `assets/towers/${tower.id}.png` });
    }

    // Fire animation (256x80, 4 frames of 64x80)
    {
      const { canvas, ctx } = makeCanvas(256, 80);
      for (let f = 0; f < 4; f++) {
        drawFireFrame(ctx, f * 64, tower, f);
      }
      saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}-fire.png`);
      entries.push({
        key: `tower-${tower.id}-fire`,
        type: 'spritesheet',
        path: `assets/towers/${tower.id}-fire.png`,
        frameWidth: 64,
        frameHeight: 80,
        frameCount: 4,
      });
    }
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
