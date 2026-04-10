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
  drawArcherHQ, drawPlasmaHQ, drawEmpHQ, drawShieldHQ,
  drawTwinArcherHQ, drawDisruptorHQ, drawNovaCannonHQ, drawFortressHQ,
  drawStasisFieldHQ, drawFlameTowerHQ, drawWindSpireHQ, drawEarthGolemHQ,
  drawHolyShrineHQ, drawDragonNestHQ, drawArcaneSpireHQ, drawWorldTreeHQ,
  drawCelestialHQ, drawDivineThroneHQ,
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
};

function isPilot(id: string): id is PilotId {
  return (PILOT_IDS as readonly string[]).includes(id);
}

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
    // Fireball flight — no charge animation
    const fireY = 34;
    if (frame >= 1 && frame <= 5) {
      const dist = (frame - 1) * 6;
      // Fireball core
      drawRect(ctx, cx + dist + 2, fireY - 2, 4, 4, '#f5b23b');
      drawRect(ctx, cx + dist + 3, fireY - 1, 2, 2, '#ffe27a');
      // Flame trail
      if (dist > 0) {
        drawRect(ctx, cx + dist - 2, fireY - 1, 3, 2, '#c54120');
        setPixel(ctx, cx + dist - 3, fireY, hexToRgba('#c54120', 0.5));
      }
    }
    if (frame === 6) {
      // Impact burst
      fillCircle(ctx, cx + 30, fireY, 3, '#c54120');
      setPixel(ctx, cx + 28, fireY - 2, '#f5b23b');
      setPixel(ctx, cx + 32, fireY + 2, '#f5b23b');
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
        drawFn(ctx, 0, 0);
        saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}.png`);
        entries.push({ key: `tower-${tower.id}`, type: 'image', path: `assets/towers/${tower.id}.png` });
      }

      // Grade variants: rare / unique / epic
      for (const grade of ['rare', 'unique', 'epic'] as GradeVariant[]) {
        const { canvas, ctx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
        drawFn(ctx, 0, 0);
        drawGradeDecoration(ctx, grade, gradeCtx);
        saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}-${grade}.png`);
        entries.push({
          key: `tower-${tower.id}-${grade}`,
          type: 'image',
          path: `assets/towers/${tower.id}-${grade}.png`,
        });
      }

      // Fire spritesheet at 64×80 with HQ tower scaled down as base.
      // drawFireFrame's fire effects are calibrated for 64×80 coords,
      // so we render the HQ tower into a temp 128×160 canvas, scale it
      // down to 64×80 as the base, then overlay fire effects only.
      {
        const fireW = 64 * FIRE_FRAME_COUNT;
        const { canvas, ctx } = makeCanvas(fireW, 80);
        // Pre-render HQ tower once, reuse for all frames
        const { canvas: hqTmp, ctx: hqCtx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
        drawFn(hqCtx, 0, 0);
        for (let f = 0; f < FIRE_FRAME_COUNT; f++) {
          // Draw HQ tower scaled down to 64×80
          ctx.drawImage(hqTmp, 0, 0, HQ_WIDTH, HQ_HEIGHT, f * 64, 0, 64, 80);
          // Overlay simplified fire effects for pilot towers
          drawPilotFireEffect(ctx, f * 64, tower, f);
        }
        saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}-fire.png`);
        entries.push({
          key: `tower-${tower.id}-fire`,
          type: 'spritesheet',
          path: `assets/towers/${tower.id}-fire.png`,
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
