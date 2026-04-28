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
  drawIsoCube,
  type ManifestEntry,
} from './shared';
import { mkdirSync, existsSync } from 'fs';
import { ALL_TOWERS } from '../../packages/shared/src/constants/towers';
import type { TowerDef as SharedTowerDef } from '../../packages/shared/src/types/tower';
import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  drawArcherHQ, drawPlasmaHQ, drawPlasmaBody, drawPlasmaArm, drawEmpHQ, drawShieldHQ,
  drawTwinArcherHQ, drawDisruptorHQ, drawNovaCannonHQ, drawFortressHQ,
  drawStasisFieldHQ, drawFlameTowerHQ, drawWindSpireHQ,
  drawEarthGolemHQ, drawEarthGolemBody, drawEarthGolemArms,
  drawNovaCannonBody, drawNovaCannonBarrel,
  drawHolyShrineHQ, drawDragonNestHQ, drawArcaneSpireHQ, drawWorldTreeHQ,
  drawCelestialHQ, drawHybridAbHQ, drawHybridCdHQ, drawUltimateHQ,
  drawDivineThroneHQ,
} from './towers/pilot-draw';
import { drawGradeDecoration, type GradeVariant } from './towers/grade-decoration';

const OUTPUT_DIR = 'packages/web-shell/public/assets/towers';

export const PILOT_IDS = [
  'archer',
  'plasma',
  'emp',
  'shield',
  'twin_archer',
  'disruptor',
  'nova_cannon',
  'fortress',
  'stasis_field',
  'flame_tower',
  'wind_spire',
  'earth_golem',
  'holy_shrine',
  'dragon_nest',
  'arcane_spire',
  'world_tree',
  'celestial',
  'divine_throne',
  'hybrid_ab',
  'hybrid_cd',
  'ultimate',
] as const;
export type PilotId = (typeof PILOT_IDS)[number];
export const HQ_WIDTH = 128;
export const HQ_HEIGHT = 160;

const PILOT_DRAW: Record<PilotId, (ctx: SKRSContext2D, ox: number, oy: number) => void> = {
  archer: drawArcherHQ,
  plasma: drawPlasmaHQ,
  emp: drawEmpHQ,
  shield: drawShieldHQ,
  twin_archer: drawTwinArcherHQ,
  disruptor: drawDisruptorHQ,
  nova_cannon: drawNovaCannonHQ,
  fortress: drawFortressHQ,
  stasis_field: drawStasisFieldHQ,
  flame_tower: drawFlameTowerHQ,
  wind_spire: drawWindSpireHQ,
  earth_golem: drawEarthGolemHQ,
  holy_shrine: drawHolyShrineHQ,
  dragon_nest: drawDragonNestHQ,
  arcane_spire: drawArcaneSpireHQ,
  world_tree: drawWorldTreeHQ,
  celestial: drawCelestialHQ,
  divine_throne: drawDivineThroneHQ,
  hybrid_ab: drawHybridAbHQ,
  hybrid_cd: drawHybridCdHQ,
  ultimate: drawUltimateHQ,
};

function isPilot(id: string): id is PilotId {
  return (PILOT_IDS as readonly string[]).includes(id);
}

type GeneratedTowerShape = 'archer' | 'catapult' | 'frost' | 'paladin' | 'star';

interface TowerAssetDef {
  id: string;
  family: SharedTowerDef['family'];
  tier: SharedTowerDef['tier'];
  element: SharedTowerDef['element'];
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

const TOWERS: TowerAssetDef[] = ALL_TOWERS.map(({ id, family, tier, element, color, shape }) => ({
  id,
  family,
  tier,
  element,
  color,
  shape: mapTowerShape(shape),
}));

const REQUIRED_FILES = TOWERS.flatMap((tower) => [`${tower.id}.png`, `${tower.id}-fire.png`]);


function countOpaqueCoverage(canvas: ReturnType<typeof makeCanvas>['canvas'], width: number, height: number): number {
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) opaque++;
  }
  return opaque / (width * height);
}

function renderWithGate(
  canvas: ReturnType<typeof makeCanvas>['canvas'],
  ctx: ReturnType<typeof makeCanvas>['ctx'],
  width: number,
  height: number,
  gateLabel: string,
  drawPrimary: (drawCtx: ReturnType<typeof makeCanvas>['ctx']) => void,
  drawFallback: (drawCtx: ReturnType<typeof makeCanvas>['ctx']) => void,
): void {
  drawPrimary(ctx);
  const coverage = countOpaqueCoverage(canvas, width, height);
  if (coverage >= 0.1 && coverage <= 0.48) {
    return;
  }

  console.warn(`  [${gateLabel}] readability gate failed (${coverage.toFixed(2)}), using fallback silhouette`);
  ctx.clearRect(0, 0, width, height);
  drawFallback(ctx);
}

function assertRequiredOutputs(): void {
  const missing = REQUIRED_FILES.filter((file) => !existsSync(`${OUTPUT_DIR}/${file}`));
  if (missing.length > 0) {
    throw new Error(`[towers] missing required outputs: ${missing.join(', ')}`);
  }
}

type GeneratedCanvas = ReturnType<typeof makeCanvas>['canvas'];
type GeneratedContext = ReturnType<typeof makeCanvas>['ctx'];

const TINY_SWORDS_TONE = {
  outline: '#1d1309',
  outlineSoft: '#2f2110',
  grassDark: '#315f22',
  grassMid: '#4f8f32',
  grassLight: '#79bd4b',
  dirt: '#9b7141',
  dirtDark: '#5b3b21',
  stoneDark: '#4b4f46',
  stoneMid: '#7b816f',
  stoneLight: '#a9b092',
  frost: '#a8def0',
  gold: '#f0d060',
  purple: '#a855f7',
} as const;

function parseHexColor(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function applySolidPixelOutline(
  canvas: GeneratedCanvas,
  ctx: GeneratedContext,
  outlineColor = TINY_SWORDS_TONE.outline,
): void {
  const width = canvas.width;
  const height = canvas.height;
  const image = ctx.getImageData(0, 0, width, height);
  const source = new Uint8ClampedArray(image.data);
  const [r, g, b] = parseHexColor(outlineColor);

  const isSolid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return source[(y * width + x) * 4 + 3] >= 176;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (source[idx + 3] > 12) continue;
      const touchesSolid =
        isSolid(x - 1, y) ||
        isSolid(x + 1, y) ||
        isSolid(x, y - 1) ||
        isSolid(x, y + 1) ||
        isSolid(x - 1, y - 1) ||
        isSolid(x + 1, y - 1) ||
        isSolid(x - 1, y + 1) ||
        isSolid(x + 1, y + 1);
      if (!touchesSolid) continue;
      image.data[idx] = r;
      image.data[idx + 1] = g;
      image.data[idx + 2] = b;
      image.data[idx + 3] = 220;
    }
  }

  ctx.putImageData(image, 0, 0);
  applySubtleRimLighting(canvas, ctx);
}

function blendToward(value: number, target: number, amount: number): number {
  return Math.round(value + (target - value) * amount);
}

function applySubtleRimLighting(canvas: GeneratedCanvas, ctx: GeneratedContext): void {
  const width = canvas.width;
  const height = canvas.height;
  const image = ctx.getImageData(0, 0, width, height);
  const source = new Uint8ClampedArray(image.data);
  const light = parseHexColor('#fff2b8');
  const shadow = parseHexColor('#24160a');

  const alphaAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return source[(y * width + x) * 4 + 3];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (source[idx + 3] < 176) continue;

      const topLeftAir = alphaAt(x - 1, y - 1) < 24 || alphaAt(x, y - 1) < 24;
      const bottomRightAir = alphaAt(x + 1, y + 1) < 24 || alphaAt(x + 1, y) < 24;
      const amount = topLeftAir ? 0.22 : bottomRightAir ? 0.16 : 0;
      if (amount === 0) continue;
      const target = topLeftAir ? light : shadow;

      image.data[idx] = blendToward(source[idx], target[0], amount);
      image.data[idx + 1] = blendToward(source[idx + 1], target[1], amount);
      image.data[idx + 2] = blendToward(source[idx + 2], target[2], amount);
    }
  }

  ctx.putImageData(image, 0, 0);
}

function drawPixelGrassDiamond(
  ctx: GeneratedContext,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
): void {
  for (let dy = -hh; dy <= hh; dy++) {
    const ratio = 1 - Math.abs(dy) / hh;
    const w = Math.round(hw * ratio);
    for (let dx = -w; dx <= w; dx++) {
      const edge = Math.abs(dx) >= w - 1 || Math.abs(dy) >= hh - 1;
      const checker = (dx + dy + 128) % 7 === 0;
      const color = edge
        ? TINY_SWORDS_TONE.outlineSoft
        : checker
          ? TINY_SWORDS_TONE.grassLight
          : dy > hh * 0.32
            ? TINY_SWORDS_TONE.grassDark
            : TINY_SWORDS_TONE.grassMid;
      setPixel(ctx, cx + dx, cy + dy, color);
    }
  }

  for (let d = 1; d <= 5; d++) {
    for (let row = 0; row <= hh; row++) {
      const ratio = 1 - row / hh;
      const w = Math.round(hw * ratio);
      for (let dx = -w; dx < 0; dx++) setPixel(ctx, cx + dx, cy + row + d, TINY_SWORDS_TONE.dirtDark);
      for (let dx = 0; dx <= w; dx++) setPixel(ctx, cx + dx, cy + row + d, TINY_SWORDS_TONE.dirt);
    }
  }
}

function drawGrassTuft(ctx: GeneratedContext, x: number, y: number): void {
  drawLine(ctx, x, y, x - 2, y - 4, TINY_SWORDS_TONE.grassLight);
  drawLine(ctx, x + 1, y, x + 1, y - 5, TINY_SWORDS_TONE.grassLight);
  drawLine(ctx, x + 2, y, x + 4, y - 3, TINY_SWORDS_TONE.grassDark);
}

function drawPebble(ctx: GeneratedContext, x: number, y: number, color = TINY_SWORDS_TONE.stoneMid): void {
  drawRect(ctx, x - 2, y - 1, 4, 3, TINY_SWORDS_TONE.outlineSoft);
  drawRect(ctx, x - 1, y - 2, 3, 1, color);
  drawRect(ctx, x - 1, y, 3, 2, TINY_SWORDS_TONE.stoneDark);
  setPixel(ctx, x, y - 1, TINY_SWORDS_TONE.stoneLight);
}

function drawTowerGroundDressing(ctx: GeneratedContext, tower: TowerAssetDef): void {
  const cx = HQ_WIDTH / 2;
  const cy = 136;
  const lift = tower.tier >= 5 ? -3 : 0;
  drawIsoShadow(ctx, cx, cy + 9 + lift, 34, 10, 0.28);
  drawPixelGrassDiamond(ctx, cx, cy + lift, tower.tier >= 5 ? 34 : 30, tower.tier >= 5 ? 12 : 10);

  drawGrassTuft(ctx, cx - 30, cy + 6 + lift);
  drawGrassTuft(ctx, cx + 26, cy + 5 + lift);
  drawPebble(ctx, cx - 22, cy + 12 + lift);
  drawPebble(ctx, cx + 22, cy + 10 + lift, TINY_SWORDS_TONE.stoneLight);

  if (tower.family === 'siege') {
    drawPebble(ctx, cx - 34, cy + lift, TINY_SWORDS_TONE.stoneDark);
    drawPebble(ctx, cx + 33, cy + 1 + lift, TINY_SWORDS_TONE.stoneMid);
  } else if (tower.family === 'frost') {
    drawLine(ctx, cx - 31, cy + 4 + lift, cx - 35, cy - 5 + lift, TINY_SWORDS_TONE.frost);
    drawLine(ctx, cx + 31, cy + 4 + lift, cx + 35, cy - 4 + lift, TINY_SWORDS_TONE.frost);
    setPixel(ctx, cx - 34, cy - 3 + lift, '#ffffff');
  } else if (tower.family === 'stun') {
    setPixel(ctx, cx - 30, cy + lift, TINY_SWORDS_TONE.gold);
    setPixel(ctx, cx + 30, cy + 1 + lift, TINY_SWORDS_TONE.gold);
    addGlow(ctx, cx, cy - 2 + lift, 7, TINY_SWORDS_TONE.gold, 0.08);
  } else if (tower.family === 'hybrid') {
    drawStar(ctx, cx - 32, cy - 2 + lift, 4, 2, 4, TINY_SWORDS_TONE.purple);
    drawStar(ctx, cx + 32, cy - 1 + lift, 4, 2, 4, tower.color);
  } else if (tower.family === 'ultimate') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      setPixel(ctx, Math.round(cx + 32 * Math.cos(a)), Math.round(cy + lift + 8 * Math.sin(a)), '#ffffff');
    }
    addGlow(ctx, cx, cy - 4 + lift, 10, TINY_SWORDS_TONE.gold, 0.12);
  }
}

function drawTowerBaseLayer(ctx: GeneratedContext, tower: TowerAssetDef): void {
  drawTowerGroundDressing(ctx, tower);
}

function drawFamilyAccentProps(ctx: GeneratedContext, tower: TowerAssetDef): void {
  const cx = HQ_WIDTH / 2;
  const baseY = 132;
  switch (tower.family) {
    case 'archer': {
      // Arrow bundle and a tiny red pennant echo the Tiny Swords encampment tone.
      for (let i = 0; i < 3; i++) {
        drawLine(ctx, cx - 30 + i * 3, baseY - 2, cx - 24 + i * 3, baseY - 20, PALETTE.woodDark);
        setPixel(ctx, cx - 24 + i * 3, baseY - 21, PALETTE.stoneLight);
      }
      drawLine(ctx, cx + 28, baseY + 1, cx + 28, baseY - 20, PALETTE.woodDark);
      drawRect(ctx, cx + 29, baseY - 19, 8, 3, PALETTE.fireRed);
      drawRect(ctx, cx + 29, baseY - 16, 5, 2, PALETTE.fireRed);
      break;
    }
    case 'siege': {
      drawPebble(ctx, cx - 32, baseY - 5, TINY_SWORDS_TONE.stoneDark);
      drawPebble(ctx, cx + 31, baseY - 4, TINY_SWORDS_TONE.stoneMid);
      drawLine(ctx, cx - 26, baseY + 1, cx - 12, baseY - 10, PALETTE.woodDark);
      drawLine(ctx, cx - 25, baseY + 2, cx - 11, baseY - 9, PALETTE.woodLight);
      drawRect(ctx, cx + 24, baseY - 9, 10, 3, PALETTE.wood);
      drawRect(ctx, cx + 27, baseY - 12, 4, 8, PALETTE.woodDark);
      break;
    }
    case 'frost': {
      drawLine(ctx, cx - 28, baseY, cx - 34, baseY - 18, PALETTE.ice);
      drawLine(ctx, cx - 28, baseY, cx - 22, baseY - 14, PALETTE.iceGlow);
      drawLine(ctx, cx + 28, baseY - 1, cx + 34, baseY - 16, PALETTE.ice);
      drawLine(ctx, cx + 28, baseY - 1, cx + 22, baseY - 12, PALETTE.iceGlow);
      setPixel(ctx, cx - 31, baseY - 15, '#ffffff');
      setPixel(ctx, cx + 31, baseY - 13, '#ffffff');
      break;
    }
    case 'stun': {
      for (const x of [cx - 31, cx + 31]) {
        drawRect(ctx, x, baseY - 10, 2, 8, PALETTE.woodLight);
        setPixel(ctx, x, baseY - 11, '#f5b23b');
        setPixel(ctx, x + 1, baseY - 12, '#ffe27a');
      }
      drawCircle(ctx, cx, baseY - 7, 18, hexToRgba(PALETTE.gold, 0.32));
      break;
    }
    case 'hybrid': {
      drawStar(ctx, cx - 32, baseY - 14, 5, 2, 5, '#a855f7');
      drawStar(ctx, cx + 32, baseY - 12, 5, 2, 5, tower.color);
      addGlow(ctx, cx, baseY - 20, 8, tower.color, 0.08);
      break;
    }
    case 'ultimate': {
      drawCircle(ctx, cx, baseY - 18, 28, hexToRgba('#f0d060', 0.4));
      drawCircle(ctx, cx, baseY - 18, 20, hexToRgba('#a855f7', 0.25));
      addGlow(ctx, cx, baseY - 18, 12, '#f0d060', 0.12);
      break;
    }
  }
}

// Stone base: isometric diamond platform with shadow
function drawBase(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  const baseY = 64;

  // Shadow ellipse below base
  drawIsoShadow(ctx, cx, baseY + 6, 20, 7, 0.42);

  // Stone base as small isometric diamond (24px wide, 5px half-height)
  const hw = 13;
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

  // Main tower body as iso cube: center top at (cx, 38), hw=11, height=24
  drawIsoCube(ctx, cx, 38, 11, 24,
    PALETTE.stoneLight, PALETTE.stoneDark, PALETTE.stone);

  // Battlement notches on top — chunky top that reads from far away.
  drawIsoCube(ctx, cx - 8, 29, 5, 5,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawIsoCube(ctx, cx + 8, 29, 5, 5,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawLine(ctx, cx - 5, 26, cx + 5, 26, PALETTE.stoneLight);

  // Arrow slit (front face of cube = right face, around y=50)
  drawRect(ctx, cx + 1, 49, 4, 4, '#1a1208');
  drawRect(ctx, cx - 3, 46, 2, 7, '#1a1208');

  // Small flag pole on top
  drawLine(ctx, cx + 4, 22, cx + 4, 30, PALETTE.wood);
  drawRect(ctx, cx + 5, 22, 5, 3, '#c03020');
  setPixel(ctx, cx + 9, 23, '#c03020');
}

function drawArcherTowerFallback(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);
  drawIsoCube(ctx, cx, 40, 10, 20, PALETTE.stoneLight, PALETTE.stoneDark, PALETTE.stone);
  drawRect(ctx, cx - 2, 25, 4, 28, PALETTE.stone);
  drawRect(ctx, cx - 9, 33, 18, 4, PALETTE.stoneDark);
  drawRect(ctx, cx + 1, 49, 4, 4, '#1a1208');
}

// 투석기: wooden frame on wheels — iso rendering
function drawCatapult(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Wheel left — small iso circle suggestion at base level
  fillCircle(ctx, cx - 11, 62, 5, PALETTE.woodDark);
  fillCircle(ctx, cx - 11, 62, 4, hexToRgba(PALETTE.wood, 0.7));
  setPixel(ctx, cx - 10, 62, PALETTE.woodDark);
  // Wheel right
  fillCircle(ctx, cx + 11, 62, 5, PALETTE.woodDark);
  fillCircle(ctx, cx + 11, 62, 4, hexToRgba(PALETTE.wood, 0.7));
  setPixel(ctx, cx + 10, 62, PALETTE.woodDark);

  // Wooden frame body as iso cube (shorter, wider)
  drawIsoCube(ctx, cx, 48, 13, 12,
    PALETTE.wood, PALETTE.woodDark, hexToRgba(PALETTE.wood, 0.8));

  // Arm (diagonal from frame top-left toward upper-right)
  drawLine(ctx, cx - 7, 46, cx + 9, 28, PALETTE.woodDark);
  drawLine(ctx, cx - 6, 46, cx + 10, 28, PALETTE.wood);

  // Sling cup at top of arm
  drawRect(ctx, cx + 7, 26, 6, 5, PALETTE.woodLight);
  // Boulder in sling
  fillCircle(ctx, cx + 10, 29, 4, PALETTE.stoneDark);
  setPixel(ctx, cx + 9, 27, PALETTE.stoneLight);

  // Support strut
  drawLine(ctx, cx - 5, 48, cx - 5, 38, PALETTE.woodDark);
  drawLine(ctx, cx + 5, 48, cx + 7, 38, PALETTE.woodDark);
}

function drawCatapultFallback(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);
  drawIsoCube(ctx, cx, 49, 12, 10, PALETTE.wood, PALETTE.woodDark, hexToRgba(PALETTE.wood, 0.8));
  drawLine(ctx, cx - 5, 46, cx + 8, 31, PALETTE.wood);
  drawRect(ctx, cx + 7, 27, 5, 4, PALETTE.woodLight);
  fillCircle(ctx, cx + 10, 29, 3, PALETTE.stoneDark);
}

// 서리 마탑: ice-tinted stone tower with crystal spires
function drawFrostTower(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Tower body iso cube with ice tint
  drawIsoCube(ctx, cx, 40, 10, 20,
    PALETTE.stoneDark, PALETTE.stoneDark, PALETTE.stone);
  drawIsoCube(ctx, cx, 38, 10, 22,
    hexToRgba(PALETTE.ice, 0.46), PALETTE.stoneDark, hexToRgba(PALETTE.iceGlow, 0.42));
  // Ice overlay on right face
  for (let y = 42; y <= 60; y++) {
    for (let x = cx; x <= cx + 9; x++) {
      setPixel(ctx, x, y, hexToRgba(PALETTE.iceGlow, 0.25));
    }
  }

  // Center ice crystal spire
  drawLine(ctx, cx, 16, cx - 4, 29, PALETTE.ice);
  drawLine(ctx, cx, 16, cx + 4, 29, PALETTE.ice);
  drawLine(ctx, cx - 4, 29, cx + 4, 29, PALETTE.ice);
  setPixel(ctx, cx, 19, PALETTE.white);
  setPixel(ctx, cx, 20, PALETTE.white);

  // Side crystals (left)
  drawLine(ctx, cx - 7, 22, cx - 11, 31, hexToRgba(PALETTE.ice, 0.7));
  drawLine(ctx, cx - 7, 22, cx - 3, 30, hexToRgba(PALETTE.ice, 0.7));
  // Side crystals (right)
  drawLine(ctx, cx + 7, 22, cx + 3, 30, hexToRgba(PALETTE.ice, 0.7));
  drawLine(ctx, cx + 7, 22, cx + 11, 31, hexToRgba(PALETTE.ice, 0.7));

  // Ice shards embedded in right face
  setPixel(ctx, cx + 3, 46, PALETTE.ice);
  setPixel(ctx, cx + 5, 50, PALETTE.ice);
  setPixel(ctx, cx + 2, 54, hexToRgba(PALETTE.ice, 0.7));

  // Blue aura
  addGlow(ctx, cx, 40, 10, PALETTE.iceGlow, 0.25);
}

function drawFrostTowerFallback(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);
  drawIsoCube(ctx, cx, 40, 9, 19, PALETTE.stoneDark, PALETTE.stoneDark, PALETTE.stone);
  drawLine(ctx, cx, 18, cx - 3, 29, PALETTE.ice);
  drawLine(ctx, cx, 18, cx + 3, 29, PALETTE.ice);
  drawCircle(ctx, cx, 36, 7, PALETTE.ice);
}

// 성기사 제단: golden cross on stone altar — iso
function drawPaladinShrine(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Wide altar base as flat iso platform
  drawIsoCube(ctx, cx, 54, 15, 6,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  // Gold trim on top face edge
  for (let dx = -14; dx <= 14; dx++) {
    setPixel(ctx, cx + dx, 52, hexToRgba(PALETTE.gold, 0.4));
  }

  // Pillar cube in center
  drawIsoCube(ctx, cx, 40, 6, 13,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);

  // Golden cross — vertical bar
  drawRect(ctx, cx - 2, 21, 4, 19, PALETTE.gold);
  drawRect(ctx, cx - 2, 22, 1, 18, hexToRgba(PALETTE.white, 0.4));
  // Horizontal bar
  drawRect(ctx, cx - 9, 26, 18, 4, PALETTE.gold);
  drawRect(ctx, cx - 8, 26, 16, 1, hexToRgba(PALETTE.white, 0.4));

  // Golden glow
  addGlow(ctx, cx, 30, 10, PALETTE.magicGold, 0.35);
  addGlow(ctx, cx, 30, 5, PALETTE.gold, 0.5);
}

function drawPaladinShrineFallback(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);
  drawIsoCube(ctx, cx, 54, 14, 5, PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawRect(ctx, cx - 2, 22, 4, 18, PALETTE.gold);
  drawRect(ctx, cx - 8, 26, 16, 4, PALETTE.gold);
}

// Tier 2+: star-shaped tower with variant details — iso cube base
function drawStarTower(ctx: SKRSContext2D, ox: number, tower: TowerAssetDef) {
  const cx = ox + 32;
  const cy = 34;
  drawBase(ctx, ox);

  // Stone base pedestal iso cube
  drawIsoCube(ctx, cx, 54, 9, 7,
    PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);

  // Star shape centered at cy
  drawStar(ctx, cx, cy, 13, 6, 5, tower.color);
  fillCircle(ctx, cx, cy, 7, hexToRgba(tower.color, 0.4));

  // Variant-specific center details
  switch (tower.id) {
    case 'twin_archer':
      // Double arrow slits (forward-facing on right side)
      drawRect(ctx, cx + 8, cy - 3, 7, 2, tower.color);
      drawRect(ctx, cx + 8, cy + 2, 7, 2, tower.color);
      addGlow(ctx, cx + 14, cy, 4, tower.color, 0.5);
      break;
    case 'disruptor':
      // Ice ring
      drawCircle(ctx, cx, cy, 6, PALETTE.ice);
      addGlow(ctx, cx, cy, 6, PALETTE.iceGlow, 0.5);
      break;
    case 'nova_cannon':
      // Large barrel
      drawRect(ctx, cx + 8, cy - 3, 10, 6, tower.color);
      fillCircle(ctx, cx + 17, cy, 4, hexToRgba(PALETTE.fireOrange, 0.7));
      break;
    case 'fortress':
      // Golden cross on star
      drawLine(ctx, cx, cy - 6, cx, cy + 6, PALETTE.gold);
      drawLine(ctx, cx - 6, cy, cx + 6, cy, PALETTE.gold);
      addGlow(ctx, cx, cy, 5, PALETTE.magicGold, 0.4);
      break;
    case 'stasis_field':
      // Frost ring
      drawCircle(ctx, cx, cy, 9, PALETTE.ice);
      addGlow(ctx, cx, cy, 6, PALETTE.iceGlow, 0.4);
      break;
  }
}

function drawStarTowerFallback(ctx: SKRSContext2D, ox: number, tower: TowerAssetDef) {
  const cx = ox + 32;
  const cy = 34;
  drawBase(ctx, ox);
  drawIsoCube(ctx, cx, 54, 8, 6, PALETTE.stone, PALETTE.stoneDark, PALETTE.stoneLight);
  drawStar(ctx, cx, cy, 11, 5, 5, tower.color);
  fillCircle(ctx, cx, cy, 5, hexToRgba(tower.color, 0.4));
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

const FIRE_FRAME_COUNT = 8;

// Catapult body WITHOUT arm — arm is drawn separately per fire frame
function drawCatapultBody(ctx: SKRSContext2D, ox: number) {
  const cx = ox + 32;
  drawBase(ctx, ox);

  // Wheels
  fillCircle(ctx, cx - 11, 62, 5, PALETTE.woodDark);
  fillCircle(ctx, cx - 11, 62, 4, hexToRgba(PALETTE.wood, 0.7));
  setPixel(ctx, cx - 10, 62, PALETTE.woodDark);
  fillCircle(ctx, cx + 11, 62, 5, PALETTE.woodDark);
  fillCircle(ctx, cx + 11, 62, 4, hexToRgba(PALETTE.wood, 0.7));
  setPixel(ctx, cx + 10, 62, PALETTE.woodDark);

  // Frame body
  drawIsoCube(ctx, cx, 48, 13, 12,
    PALETTE.wood, PALETTE.woodDark, hexToRgba(PALETTE.wood, 0.8));

  // Support struts
  drawLine(ctx, cx - 5, 48, cx - 5, 38, PALETTE.woodDark);
  drawLine(ctx, cx + 5, 48, cx + 7, 38, PALETTE.woodDark);
}

// Catapult arm at a given angle (0=loaded/back, 1=fully flung forward)
function drawCatapultArm(ctx: SKRSContext2D, ox: number, swing: number, showBoulder: boolean) {
  const cx = ox + 32;
  const pivotX = cx;
  const pivotY = 46;
  const armLen = 28; // longer arm for more visible swing

  // Arm angle: loaded=pointing right-down (-30°), flung=pointing left-up (150°)
  // Full ~180° sweep for maximum visual drama
  const angleStart = -0.5; // ~-30° (arm resting right, boulder low)
  const angleEnd = 2.4;    // ~140° (arm flung far left-up)
  const angle = angleStart + (angleEnd - angleStart) * swing;

  const tipX = Math.round(pivotX + armLen * Math.cos(angle));
  const tipY = Math.round(pivotY - armLen * Math.sin(angle));

  // Pivot bolt
  fillCircle(ctx, pivotX, pivotY, 2, PALETTE.woodDark);

  // Arm shaft (3px thick for visibility)
  drawLine(ctx, pivotX, pivotY, tipX, tipY, PALETTE.woodDark);
  drawLine(ctx, pivotX + 1, pivotY, tipX + 1, tipY, PALETTE.wood);
  drawLine(ctx, pivotX, pivotY + 1, tipX, tipY + 1, PALETTE.woodDark);

  // Sling cup at tip
  drawRect(ctx, tipX - 3, tipY - 3, 6, 5, PALETTE.woodLight);
  drawRect(ctx, tipX - 2, tipY - 2, 4, 3, PALETTE.wood);

  // Boulder in sling (only when loaded)
  if (showBoulder) {
    fillCircle(ctx, tipX, tipY, 4, PALETTE.stoneDark);
    fillCircle(ctx, tipX - 1, tipY - 1, 2, PALETTE.stoneLight);
  }
}

function drawCatapultFireFrame(ctx: SKRSContext2D, ox: number, _tower: TowerAssetDef, frame: number) {
  const cx = ox + 32;

  // Draw body (no arm — arm drawn separately with animation)
  drawCatapultBody(ctx, ox);

  // Arm swing timeline — exaggerated for drama:
  // 0: loaded, arm pointing right-down (boulder low)
  // 1: tensioning, pulling back slightly more
  // 2: SNAP! rapid release halfway
  // 3: fully flung — arm pointing up-left
  // 4: overshoot bounce
  // 5: settling back
  // 6: returning to rest
  // 7: back to loaded position
  const swingTable = [0.0, 0.05, 0.6, 1.0, 0.9, 0.4, 0.15, 0.0];
  const swing = swingTable[frame] ?? 0;
  const showBoulder = frame <= 1;

  drawCatapultArm(ctx, ox, swing, showBoulder);

  // Recoil shake on release (frames 2-3) — whole body shudders
  if (frame === 2 || frame === 3) {
    // Dust cloud at base from impact
    for (let i = 0; i < 8; i++) {
      const px = cx - 12 + i * 3;
      const py = 65 + (i % 3);
      setPixel(ctx, px, py, hexToRgba(PALETTE.dirtPath, 0.5));
      setPixel(ctx, px + 1, py + 1, hexToRgba(PALETTE.dirtPath, 0.3));
    }
    // Motion lines near pivot for speed feel
    drawLine(ctx, cx - 4, 42, cx - 8, 38, hexToRgba(PALETTE.wood, 0.3));
    drawLine(ctx, cx + 2, 40, cx + 6, 36, hexToRgba(PALETTE.wood, 0.3));
  }

  // Boulder in flight (after release)
  if (frame >= 3 && frame <= 5) {
    const bProgress = (frame - 2) / 3; // 0.33 → 1.0
    const bx = cx + 10 + bProgress * 15;
    const by = 24 - Math.sin(bProgress * Math.PI) * 18; // arc up then down
    fillCircle(ctx, Math.round(bx), Math.round(by), 4, PALETTE.stoneDark);
    setPixel(ctx, Math.round(bx) - 1, Math.round(by) - 2, PALETTE.stoneLight);
    // Trail
    if (bProgress > 0.3) {
      const pt = bProgress - 0.15;
      const tx = cx + 10 + pt * 15;
      const ty = 24 - Math.sin(pt * Math.PI) * 18;
      setPixel(ctx, Math.round(tx), Math.round(ty), hexToRgba(PALETTE.dirtPath, 0.3));
    }
  }

  // Impact explosion (frame 6)
  if (frame === 6) {
    addGlow(ctx, cx + 24, 22, 8, PALETTE.fireOrange, 0.4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = 5 + (i % 3);
      setPixel(ctx, Math.round(cx + 24 + d * Math.cos(a)), Math.round(22 + d * Math.sin(a)), PALETTE.fireOrange);
    }
    // Debris
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      setPixel(ctx, Math.round(cx + 24 + 7 * Math.cos(a)), Math.round(22 + 7 * Math.sin(a)), PALETTE.stoneDark);
    }
  }

  // Settling dust (frame 7)
  if (frame === 7) {
    addGlow(ctx, cx + 24, 24, 4, PALETTE.dirtPath, 0.15);
  }
}

function drawFireFrame(ctx: SKRSContext2D, ox: number, tower: TowerAssetDef, frame: number, skipBase = false) {
  // Catapult gets custom body rendering with animated arm
  if (tower.shape === 'catapult') {
    drawCatapultFireFrame(ctx, ox, tower, frame);
    return;
  }

  if (!skipBase) {
    drawTowerShape(ctx, ox, tower);
  }
  const cx = ox + 32;
  const t = frame / (FIRE_FRAME_COUNT - 1); // 0..1

  switch (tower.shape) {
    case 'archer': {
      // 0: idle → 1: bow draw → 2: release flash → 3-5: arrow flies → 6: impact glow → 7: settle
      const bowX = cx - 4;
      const bowY = 38;

      if (frame >= 1 && frame <= 2) {
        // Bow body (curved line)
        drawLine(ctx, bowX, bowY - 8, bowX, bowY + 8, PALETTE.wood);
        drawLine(ctx, bowX - 1, bowY - 6, bowX - 1, bowY + 6, PALETTE.woodDark);
        // Bowstring
        const pullBack = frame === 1 ? 4 : 0;
        drawLine(ctx, bowX, bowY - 8, bowX + pullBack + 2, bowY, hexToRgba(PALETTE.white, 0.6));
        drawLine(ctx, bowX, bowY + 8, bowX + pullBack + 2, bowY, hexToRgba(PALETTE.white, 0.6));
        // Arrow nocked (frame 1 only)
        if (frame === 1) {
          drawLine(ctx, bowX + 2, bowY, bowX + 12, bowY, PALETTE.wood);
          setPixel(ctx, bowX + 12, bowY - 1, PALETTE.stoneLight);
          setPixel(ctx, bowX + 12, bowY + 1, PALETTE.stoneLight);
        }
      }
      if (frame === 2) {
        addGlow(ctx, bowX + 6, bowY, 6, tower.color, 0.5);
      }
      if (frame >= 3 && frame <= 5) {
        const dist = (frame - 2) * 7;
        drawLine(ctx, cx + dist, bowY, cx + dist + 6, bowY, tower.color);
        setPixel(ctx, cx + dist + 6, bowY - 1, PALETTE.stoneLight);
        setPixel(ctx, cx + dist + 6, bowY + 1, PALETTE.stoneLight);
        if (frame === 3) addGlow(ctx, cx + dist, bowY, 3, tower.color, 0.3);
      }
      if (frame === 6) addGlow(ctx, cx + 28, bowY, 5, tower.color, 0.2);
      // frame 7: settle back to idle
      break;
    }

    case 'catapult':
      break; // handled by drawCatapultFireFrame

    case 'frost': {
      // 0-1: charge → 2-3: crystal glow expand → 4-5: frost wave → 6-7: fade
      const glowR = frame <= 3 ? 6 + frame * 2 : 14 - (frame - 3) * 2;
      const glowA = frame <= 3 ? 0.1 + frame * 0.12 : 0.5 - (frame - 3) * 0.1;
      addGlow(ctx, cx, 40, Math.max(4, glowR), PALETTE.iceGlow, Math.max(0.05, glowA));
      if (frame >= 2 && frame <= 4) {
        drawCircle(ctx, cx, 40, 10 + frame, hexToRgba(PALETTE.ice, 0.4));
      }
      if (frame === 3) {
        // Ice shards burst
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const d = 12;
          setPixel(ctx, Math.round(cx + d * Math.cos(a)), Math.round(40 + d * Math.sin(a)), PALETTE.white);
        }
      }
      break;
    }

    case 'paladin': {
      // 0-1: golden charge → 2-3: holy burst → 4-5: light rays → 6-7: fade
      if (frame >= 1 && frame <= 2) addGlow(ctx, cx, 30, 8 + frame * 3, PALETTE.gold, 0.2 + frame * 0.1);
      if (frame === 3) {
        drawCircle(ctx, cx, 30, 16, hexToRgba(PALETTE.gold, 0.5));
        addGlow(ctx, cx, 30, 12, PALETTE.magicGold, 0.6);
        // Light rays
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          drawLine(ctx, cx, 30, Math.round(cx + 18 * Math.cos(a)), Math.round(30 + 18 * Math.sin(a)), hexToRgba(PALETTE.gold, 0.3));
        }
      }
      if (frame >= 4 && frame <= 5) {
        addGlow(ctx, cx, 30, 14 - (frame - 3) * 2, PALETTE.gold, 0.4 - (frame - 3) * 0.08);
      }
      if (frame >= 6) addGlow(ctx, cx, 30, 6, PALETTE.gold, 0.1);
      break;
    }

    case 'star': {
      // 0-1: charge → 2: muzzle flash → 3-5: projectile fly → 6-7: settle
      if (frame === 1) addGlow(ctx, cx, 34, 9, tower.color, 0.3);
      else if (frame === 2) {
        addGlow(ctx, cx + 6, 34, 8, PALETTE.white, 0.7);
        fillCircle(ctx, cx + 8, 34, 3, PALETTE.white);
      }
      else if (frame >= 3 && frame <= 5) {
        const dist = (frame - 2) * 6;
        fillCircle(ctx, cx + dist + 6, 34, 2, tower.color);
        addGlow(ctx, cx + dist + 6, 34, 4, tower.color, 0.4 - (frame - 3) * 0.1);
      }
      else if (frame === 6) addGlow(ctx, cx + 24, 34, 4, tower.color, 0.15);
      break;
    }
  }
}

/**
 * Simplified fire effects for pilot towers.
 * Archer: arrow only (no bow/bowstring), flame_tower: fireball only.
 * Other shapes fall back to the standard drawFireFrame effects.
 */
function drawPilotFireEffect(ctx: SKRSContext2D, ox: number, tower: TowerAssetDef, frame: number): void {
  const cx = ox + 32;

  if (tower.id === 'archer') {
    // Brief muzzle flash only — no projectile
    if (frame === 2 || frame === 3) {
      setPixel(ctx, cx + 6, 38, PALETTE.gold);
      setPixel(ctx, cx + 7, 37, hexToRgba(PALETTE.gold, 0.5));
      setPixel(ctx, cx + 7, 39, hexToRgba(PALETTE.gold, 0.5));
    }
    return;
  }

  if (tower.id === 'flame_tower') {
    // Muzzle glow only — runtime handles actual projectile via arc system
    if (frame === 2 || frame === 3) {
      setPixel(ctx, cx + 4, 34, '#f5b23b');
      setPixel(ctx, cx + 5, 33, hexToRgba('#c54120', 0.6));
      setPixel(ctx, cx + 5, 35, hexToRgba('#c54120', 0.6));
    }
    return;
  }

  if (tower.id === 'wind_spire') {
    // Windmill hub pulse — no bow/arrow (shape maps to 'archer' by default)
    const hubY = 20;
    if (frame === 1) addGlow(ctx, cx, hubY, 5, tower.color, 0.3);
    else if (frame === 2 || frame === 3) {
      addGlow(ctx, cx, hubY, 8, tower.color, 0.5);
      setPixel(ctx, cx, hubY, PALETTE.white);
    } else if (frame === 4) addGlow(ctx, cx, hubY, 6, tower.color, 0.25);
    return;
  }

  if (tower.id === 'plasma') {
    // Catapult with arm swing — DON'T use HQ base (it includes static arm).
    // Instead we skip the pre-rendered base and draw body+arm per frame.
    // Clear the pre-rendered HQ base for this frame
    ctx.clearRect(ox, 0, 64, 80);

    // Draw body (no arm) scaled to 64×80
    const { canvas: bodyTmp, ctx: bodyCtx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
    drawTowerBaseLayer(bodyCtx, tower);
    drawPlasmaBody(bodyCtx, 0, 0);
    drawFamilyAccentProps(bodyCtx, tower);
    applySolidPixelOutline(bodyTmp, bodyCtx);
    ctx.drawImage(bodyTmp, 0, 0, HQ_WIDTH, HQ_HEIGHT, ox, 0, 64, 80);

    // Arm swing timeline (same as legacy catapult)
    const swingTable = [0.0, 0.05, 0.6, 1.0, 0.9, 0.4, 0.15, 0.0];
    const swing = swingTable[frame] ?? 0;
    const showBoulder = frame <= 1;

    // Draw arm at 64×80 scale
    const { canvas: armTmp, ctx: armCtx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
    drawPlasmaArm(armCtx, 0, 0, swing, showBoulder);
    ctx.drawImage(armTmp, 0, 0, HQ_WIDTH, HQ_HEIGHT, ox, 0, 64, 80);

    // No projectile in spritesheet — runtime arc system handles it
    return;
  }

  if (tower.id === 'earth_golem') {
    // Golem throws rock — clear pre-rendered base (has static arms),
    // redraw body + arms at correct pose per frame
    ctx.clearRect(ox, 0, 64, 80);

    // Draw body (no arms) scaled to 64×80
    const { canvas: gBodyTmp, ctx: gBodyCtx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
    drawTowerBaseLayer(gBodyCtx, tower);
    drawEarthGolemBody(gBodyCtx, 0, 0);
    drawFamilyAccentProps(gBodyCtx, tower);
    applySolidPixelOutline(gBodyTmp, gBodyCtx);
    ctx.drawImage(gBodyTmp, 0, 0, HQ_WIDTH, HQ_HEIGHT, ox, 0, 64, 80);

    // Arms pose per frame
    //  0-1: idle arms at sides
    //  2-3: arms raised overhead with boulder
    //  4:   arms thrown forward (boulder released)
    //  5-7: arms returning to idle
    const { canvas: gArmTmp, ctx: gArmCtx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
    let pose: 0 | 1 | 2 = 0;
    let showBoulder = false;
    if (frame >= 2 && frame <= 3) { pose = 1; showBoulder = true; }
    else if (frame === 4) { pose = 2; }
    drawEarthGolemArms(gArmCtx, 0, 0, pose, showBoulder);
    ctx.drawImage(gArmTmp, 0, 0, HQ_WIDTH, HQ_HEIGHT, ox, 0, 64, 80);

    // No projectile in spritesheet — runtime arc system handles it
    return;
  }

  if (tower.id === 'hybrid_ab') {
    if (frame === 1) addGlow(ctx, cx + 8, 36, 6, '#a855f7', 0.25);
    if (frame === 2 || frame === 3) {
      addGlow(ctx, cx + 18, 36, 8, '#f0d060', 0.38);
      fillCircle(ctx, cx + 18, 36, 2, '#ffffff');
      setPixel(ctx, cx + 22, 35, '#a855f7');
      setPixel(ctx, cx + 23, 37, '#f0d060');
    }
    if (frame === 4) drawLine(ctx, cx + 12, 36, cx + 28, 32, hexToRgba('#a855f7', 0.55));
    return;
  }

  if (tower.id === 'hybrid_cd') {
    if (frame >= 1 && frame <= 4) {
      const r = 5 + frame * 2;
      addGlow(ctx, cx, 39, r, '#5bc8e8', 0.18 + frame * 0.04);
      drawCircle(ctx, cx, 39, r, hexToRgba('#f0d060', 0.32));
    }
    if (frame === 3) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        setPixel(ctx, Math.round(cx + 14 * Math.cos(a)), Math.round(39 + 6 * Math.sin(a)), '#ffffff');
      }
    }
    return;
  }

  if (tower.id === 'ultimate') {
    if (frame >= 1 && frame <= 5) {
      const radius = 6 + frame * 3;
      addGlow(ctx, cx, 38, radius, '#f0d060', 0.18);
      drawCircle(ctx, cx, 38, radius, hexToRgba(frame % 2 === 0 ? '#a855f7' : '#5bc8e8', 0.42));
    }
    if (frame === 3) {
      drawLine(ctx, cx, 24, cx, 52, hexToRgba('#ffffff', 0.7));
      drawLine(ctx, cx - 14, 38, cx + 14, 38, hexToRgba('#f0d060', 0.6));
      fillCircle(ctx, cx, 38, 3, '#ffffff');
    }
    return;
  }

  // All other pilot towers: use standard fire effects (skipBase)
  drawFireFrame(ctx, ox, tower, frame, true);
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  for (const tower of TOWERS) {
    const drawFn = PILOT_DRAW[tower.id as PilotId];
    if (drawFn) {
      const gradeCtx = {
        cx: 64,
        topY: 36,
        width: 44,
        height: 96,
        accentColor: tower.color,
      };

      // Normal (base HQ sprite)
      {
        const { canvas, ctx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
        drawTowerBaseLayer(ctx, tower);
        if (tower.id === 'nova_cannon') {
          // Body only — barrel is a separate rotating sprite
          drawNovaCannonBody(ctx, 0, 0);
        } else {
          drawFn(ctx, 0, 0);
        }
        drawFamilyAccentProps(ctx, tower);
        applySolidPixelOutline(canvas, ctx);
        saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}.png`);
        entries.push({ key: `tower-${tower.id}`, type: 'image', path: `assets/towers/${tower.id}.png` });
      }

      // Nova cannon barrel — separate 32×16 sprite for runtime rotation
      if (tower.id === 'nova_cannon') {
        const { canvas, ctx } = makeCanvas(32, 16);
        drawNovaCannonBarrel(ctx, 0, 0);
        applySolidPixelOutline(canvas, ctx);
        saveCanvas(canvas, `${OUTPUT_DIR}/nova_cannon-barrel.png`);
        entries.push({ key: 'tower-nova_cannon-barrel', type: 'image', path: 'assets/towers/nova_cannon-barrel.png' });
      }

      // Grade variants: rare / unique / epic
      // Nova cannon: use body-only draw so the runtime rotating barrel is the
      // only barrel visible (drawFn = drawNovaCannonHQ bakes a fixed barrel).
      const drawBody = tower.id === 'nova_cannon' ? drawNovaCannonBody : drawFn;
      for (const grade of ['rare', 'unique', 'epic'] as GradeVariant[]) {
        const { canvas, ctx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
        drawTowerBaseLayer(ctx, tower);
        drawBody(ctx, 0, 0);
        drawFamilyAccentProps(ctx, tower);
        applySolidPixelOutline(canvas, ctx);
        drawGradeDecoration(ctx, grade, gradeCtx);
        saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}-${grade}.png`);
        entries.push({
          key: `tower-${tower.id}-${grade}`,
          type: 'image',
          path: `assets/towers/${tower.id}-${grade}.png`,
        });
      }

      // Fire spritesheets — base + grade variants at 64×80.
      // drawFireFrame's fire effects are calibrated for 64×80 coords, so we
      // render the HQ tower into a temp 128×160 canvas, scale it down to 64×80
      // per frame, then (for rare/unique/epic) draw the grade decoration at
      // native 64×80 coordinates so the gems stay crisp at game resolution.
      const fireGrades: GradeVariant[] = ['normal', 'rare', 'unique', 'epic'];
      // Fire-scale grade context (native 64×80 coordinates, proportional to HQ)
      const fireGradeCtx = {
        cx: 32,
        topY: 18,
        width: 22,
        height: 48,
        accentColor: tower.color,
      };
      for (const fireGrade of fireGrades) {
        const fireW = 64 * FIRE_FRAME_COUNT;
        const { canvas, ctx } = makeCanvas(fireW, 80);
        // Pre-render HQ tower once, reuse for all frames.
        // Grade variants use body-only draw for nova_cannon so the runtime
        // rotating barrel stays visible through the fire animation.
        const { canvas: hqTmp, ctx: hqCtx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
        const hqDraw =
          tower.id === 'nova_cannon' && fireGrade !== 'normal'
            ? drawNovaCannonBody
            : drawFn;
        drawTowerBaseLayer(hqCtx, tower);
        hqDraw(hqCtx, 0, 0);
        drawFamilyAccentProps(hqCtx, tower);
        applySolidPixelOutline(hqTmp, hqCtx);
        for (let f = 0; f < FIRE_FRAME_COUNT; f++) {
          // Draw HQ tower scaled down to 64×80
          ctx.drawImage(hqTmp, 0, 0, HQ_WIDTH, HQ_HEIGHT, f * 64, 0, 64, 80);
          // Overlay simplified fire effects for pilot towers. Some towers
          // (plasma, earth_golem) call clearRect on the frame to redraw body
          // with arm pose — we apply grade decoration AFTER so it survives.
          drawPilotFireEffect(ctx, f * 64, tower, f);
          // Apply grade decoration at fire scale (skip for normal)
          if (fireGrade !== 'normal') {
            const frameGradeCtx = {
              ...fireGradeCtx,
              cx: fireGradeCtx.cx + f * 64,
            };
            drawGradeDecoration(ctx, fireGrade, frameGradeCtx);
          }
        }
        applySolidPixelOutline(canvas, ctx);
        const suffix = fireGrade === 'normal' ? '' : `-${fireGrade}`;
        saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}${suffix}-fire.png`);
        entries.push({
          key: `tower-${tower.id}${suffix}-fire`,
          type: 'spritesheet',
          path: `assets/towers/${tower.id}${suffix}-fire.png`,
          frameWidth: 64,
          frameHeight: 80,
          frameCount: FIRE_FRAME_COUNT,
        });
      }
    }
  }

  assertRequiredOutputs();

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
