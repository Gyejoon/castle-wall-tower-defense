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
  type ManifestEntry,
} from './shared';
import { mkdirSync } from 'fs';
import { ALL_TOWERS } from '../../packages/shared/src/constants/towers';
import type { TowerDef as SharedTowerDef } from '../../packages/shared/src/types/tower';

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

// 2.5D 그림자: 하단에 어두운 그림자, 상단에 하이라이트
function drawBase(ctx: any, ox: number) {
  // Shadow ellipse at bottom
  for (let dx = -8; dx <= 8; dx++) {
    const h = Math.round(2 * Math.sqrt(1 - (dx / 8) ** 2));
    for (let dy = -h; dy <= h; dy++) {
      setPixel(ctx, ox + 16 + dx, 28 + dy, hexToRgba(PALETTE.towerBase, 0.5));
    }
  }
  // Stone base
  drawRect(ctx, ox + 8, 22, 16, 6, PALETTE.stoneDark);
  drawRect(ctx, ox + 9, 22, 14, 1, PALETTE.stoneLight);
}

// 궁수 탑: 둥근 돌 탑, 화살 구멍
function drawArcherTower(ctx: any, ox: number) {
  const cx = ox + 16;
  drawBase(ctx, ox);

  // Tower body (stone cylinder, 2.5D: 좌하 어둡게, 우상 밝게)
  drawRect(ctx, cx - 6, 6, 12, 18, PALETTE.stone);
  // Left shadow strip (depth)
  drawRect(ctx, cx - 6, 6, 2, 18, PALETTE.stoneDark);
  // Right highlight strip
  drawRect(ctx, cx + 4, 6, 2, 18, PALETTE.stoneLight);
  // Bottom shadow
  drawRect(ctx, cx - 6, 22, 12, 2, PALETTE.stoneDark);

  // Battlements at top (성가퀴)
  drawRect(ctx, cx - 6, 3, 4, 4, PALETTE.stone);
  drawRect(ctx, cx - 6, 3, 4, 1, PALETTE.stoneLight);
  drawRect(ctx, cx,     3, 4, 4, PALETTE.stone);
  drawRect(ctx, cx,     3, 4, 1, PALETTE.stoneLight);

  // Arrow slit windows
  setPixel(ctx, cx - 1, 10, '#1a1208');
  setPixel(ctx, cx,     10, '#1a1208');
  setPixel(ctx, cx - 1, 11, '#1a1208');
  setPixel(ctx, cx,     11, '#1a1208');
  setPixel(ctx, cx - 1, 12, '#1a1208');
  setPixel(ctx, cx,     12, '#1a1208');

  // Small flag on top
  drawLine(ctx, cx + 2, 0, cx + 2, 3, PALETTE.wood);
  setPixel(ctx, cx + 3, 0, '#c03020');
  setPixel(ctx, cx + 4, 1, '#c03020');
  setPixel(ctx, cx + 3, 2, '#c03020');
}

// 투석기: 나무 프레임 + 바퀴
function drawCatapult(ctx: any, ox: number) {
  const cx = ox + 16;
  drawBase(ctx, ox);

  // Wheels (left + right)
  drawCircle(ctx, cx - 7, 22, 4, PALETTE.woodDark);
  fillCircle(ctx, cx - 7, 22, 3, hexToRgba(PALETTE.wood, 0.6));
  setPixel(ctx, cx - 7, 22, PALETTE.woodDark);
  drawCircle(ctx, cx + 7, 22, 4, PALETTE.woodDark);
  fillCircle(ctx, cx + 7, 22, 3, hexToRgba(PALETTE.wood, 0.6));
  setPixel(ctx, cx + 7, 22, PALETTE.woodDark);

  // Frame base
  drawRect(ctx, cx - 8, 18, 16, 4, PALETTE.wood);
  drawRect(ctx, cx - 8, 18, 16, 1, PALETTE.woodLight);

  // Arm (대각선)
  drawLine(ctx, cx - 4, 18, cx + 3, 8, PALETTE.woodDark);
  drawLine(ctx, cx - 3, 18, cx + 4, 8, PALETTE.wood);

  // Sling at top of arm
  drawRect(ctx, cx + 2, 6, 4, 3, PALETTE.woodLight);
  // Boulder in sling
  fillCircle(ctx, cx + 4, 7, 2, PALETTE.stoneDark);
  setPixel(ctx, cx + 4, 6, PALETTE.stoneLight);

  // Support struts
  drawLine(ctx, cx - 5, 18, cx - 5, 12, PALETTE.woodDark);
  drawLine(ctx, cx + 5, 18, cx + 3, 12, PALETTE.woodDark);
}

// 서리 마탑: 얼음 결정 박힌 탑
function drawFrostTower(ctx: any, ox: number) {
  const cx = ox + 16;
  drawBase(ctx, ox);

  // Tower body (stone with ice tint)
  drawRect(ctx, cx - 5, 5, 10, 18, PALETTE.stoneDark);
  drawRect(ctx, cx - 5, 5, 2, 18, hexToRgba(PALETTE.iceGlow, 0.3));
  drawRect(ctx, cx + 3, 5, 2, 18, hexToRgba(PALETTE.ice, 0.4));

  // Ice crystal spires at top
  // Center crystal
  drawLine(ctx, cx, 0, cx - 2, 6, PALETTE.ice);
  drawLine(ctx, cx, 0, cx + 2, 6, PALETTE.ice);
  drawLine(ctx, cx - 2, 6, cx + 2, 6, PALETTE.ice);
  setPixel(ctx, cx, 1, PALETTE.white);
  // Left crystal
  drawLine(ctx, cx - 4, 2, cx - 6, 7, hexToRgba(PALETTE.ice, 0.7));
  drawLine(ctx, cx - 4, 2, cx - 2, 7, hexToRgba(PALETTE.ice, 0.7));
  // Right crystal
  drawLine(ctx, cx + 4, 2, cx + 2, 7, hexToRgba(PALETTE.ice, 0.7));
  drawLine(ctx, cx + 4, 2, cx + 6, 7, hexToRgba(PALETTE.ice, 0.7));

  // Ice embedded in walls
  setPixel(ctx, cx - 2, 10, PALETTE.ice);
  setPixel(ctx, cx + 2, 14, PALETTE.ice);
  setPixel(ctx, cx - 1, 17, hexToRgba(PALETTE.ice, 0.7));

  // Blue aura glow
  addGlow(ctx, cx, 10, 7, PALETTE.iceGlow, 0.3);
}

// 성기사 제단: 황금 십자가 제단
function drawPaladinShrine(ctx: any, ox: number) {
  const cx = ox + 16;
  drawBase(ctx, ox);

  // Altar base (wide stone platform)
  drawRect(ctx, cx - 8, 18, 16, 5, PALETTE.stone);
  drawRect(ctx, cx - 8, 18, 16, 1, PALETTE.stoneLight);
  drawRect(ctx, cx - 7, 19, 14, 1, hexToRgba(PALETTE.gold, 0.3));

  // Pillar
  drawRect(ctx, cx - 3, 8, 6, 11, PALETTE.stone);
  drawRect(ctx, cx - 3, 8, 1, 11, PALETTE.stoneLight);

  // Golden cross
  // Vertical bar
  drawRect(ctx, cx - 1, 2, 3, 10, PALETTE.gold);
  drawRect(ctx, cx - 1, 2, 1, 10, hexToRgba(PALETTE.white, 0.4));
  // Horizontal bar
  drawRect(ctx, cx - 5, 5, 11, 3, PALETTE.gold);
  drawRect(ctx, cx - 5, 5, 11, 1, hexToRgba(PALETTE.white, 0.4));

  // Golden glow
  addGlow(ctx, cx, 6, 7, PALETTE.magicGold, 0.4);
  addGlow(ctx, cx, 6, 4, PALETTE.gold, 0.5);
}

// Tier 2: 별 모양 기반 + 각 tower별 특징
function drawStarTower(ctx: any, ox: number, tower: TowerAssetDef) {
  const cx = ox + 16, cy = 14;
  drawBase(ctx, ox);

  // Stone base pedestal
  drawRect(ctx, cx - 5, 20, 10, 4, PALETTE.stone);
  drawRect(ctx, cx - 5, 20, 10, 1, PALETTE.stoneLight);

  // Star shape
  drawStar(ctx, cx, cy, 9, 4, 5, tower.color);
  fillCircle(ctx, cx, cy, 5, hexToRgba(tower.color, 0.4));

  // Center glow based on type
  switch (tower.id) {
    case 'twin_laser':
      // Double arrow slits
      drawRect(ctx, cx + 6, cy - 2, 5, 2, tower.color);
      drawRect(ctx, cx + 6, cy + 1, 5, 2, tower.color);
      addGlow(ctx, cx + 10, cy, 3, tower.color, 0.5);
      break;
    case 'disruptor':
      // Ice + wood combo
      drawCircle(ctx, cx, cy, 4, PALETTE.ice);
      addGlow(ctx, cx, cy, 5, PALETTE.iceGlow, 0.5);
      break;
    case 'nova_cannon':
      // Large barrel
      drawRect(ctx, cx + 6, cy - 2, 7, 5, tower.color);
      fillCircle(ctx, cx + 12, cy, 2, hexToRgba(PALETTE.fireOrange, 0.7));
      break;
    case 'fortress':
      // Golden cross on star
      drawLine(ctx, cx, cy - 4, cx, cy + 4, PALETTE.gold);
      drawLine(ctx, cx - 4, cy, cx + 4, cy, PALETTE.gold);
      addGlow(ctx, cx, cy, 4, PALETTE.magicGold, 0.4);
      break;
    case 'stasis_field':
      // Frost ring
      drawCircle(ctx, cx, cy, 6, PALETTE.ice);
      addGlow(ctx, cx, cy, 5, PALETTE.iceGlow, 0.4);
      break;
  }
}

function drawTowerShape(ctx: any, ox: number, tower: TowerAssetDef) {
  switch (tower.shape) {
    case 'archer':   drawArcherTower(ctx, ox); break;
    case 'catapult': drawCatapult(ctx, ox);    break;
    case 'frost':    drawFrostTower(ctx, ox);  break;
    case 'paladin':  drawPaladinShrine(ctx, ox); break;
    case 'star':     drawStarTower(ctx, ox, tower); break;
  }
}

function drawFireFrame(ctx: any, ox: number, tower: TowerAssetDef, frame: number) {
  drawTowerShape(ctx, ox, tower);
  const cx = ox + 16;

  switch (tower.shape) {
    case 'archer':
      if (frame === 1) addGlow(ctx, cx, 10, 5, tower.color, 0.3);
      if (frame === 2) {
        // Arrow in flight
        drawLine(ctx, cx + 7, 11, cx + 13, 11, tower.color);
        setPixel(ctx, cx + 13, 10, tower.color);
        setPixel(ctx, cx + 13, 12, tower.color);
      }
      if (frame === 3) addGlow(ctx, cx + 12, 11, 3, tower.color, 0.2);
      break;

    case 'catapult':
      if (frame === 1) addGlow(ctx, cx + 4, 7, 4, tower.color, 0.3);
      if (frame === 2) {
        // Boulder flying
        fillCircle(ctx, cx + 12, 5, 3, PALETTE.stoneDark);
        setPixel(ctx, cx + 11, 4, PALETTE.stoneLight);
        addGlow(ctx, cx + 12, 5, 4, PALETTE.fireOrange, 0.3);
      }
      if (frame === 3) {
        // Impact
        addGlow(ctx, cx + 14, 6, 5, PALETTE.fireOrange, 0.4);
      }
      break;

    case 'frost':
      if (frame === 1) addGlow(ctx, cx, 10, 8, PALETTE.iceGlow, 0.4);
      if (frame === 2) {
        drawCircle(ctx, cx, 10, 10, hexToRgba(PALETTE.ice, 0.6));
        addGlow(ctx, cx, 10, 6, PALETTE.iceGlow, 0.5);
      }
      if (frame === 3) addGlow(ctx, cx, 10, 6, PALETTE.ice, 0.2);
      break;

    case 'paladin':
      if (frame === 1) addGlow(ctx, cx, 6, 8, PALETTE.gold, 0.4);
      if (frame === 2) {
        // Holy light burst
        drawCircle(ctx, cx, 6, 12, hexToRgba(PALETTE.gold, 0.5));
        addGlow(ctx, cx, 6, 8, PALETTE.magicGold, 0.6);
      }
      if (frame === 3) addGlow(ctx, cx, 6, 6, PALETTE.gold, 0.2);
      break;

    case 'star':
      if (frame === 1) addGlow(ctx, cx, 14, 7, tower.color, 0.3);
      if (frame === 2) {
        addGlow(ctx, cx + 10, 14, 5, PALETTE.white, 0.7);
        fillCircle(ctx, cx + 11, 14, 2, PALETTE.white);
      }
      if (frame === 3) addGlow(ctx, cx + 9, 14, 4, tower.color, 0.2);
      break;
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  for (const tower of TOWERS) {
    // Static sprite (32x32)
    {
      const { canvas, ctx } = makeCanvas(32, 32);
      drawTowerShape(ctx, 0, tower);
      saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}.png`);
      entries.push({ key: `tower-${tower.id}`, type: 'image', path: `assets/towers/${tower.id}.png` });
    }

    // Fire animation (128x32, 4 frames)
    {
      const { canvas, ctx } = makeCanvas(128, 32);
      for (let f = 0; f < 4; f++) {
        drawFireFrame(ctx, f * 32, tower, f);
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
