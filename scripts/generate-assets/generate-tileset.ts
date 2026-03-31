/**
 * 2.5D 픽셀 아트 타일셋 생성 — Tiled 호환 스프라이트시트
 *
 * 타일 ID 배치 (20열 x 행):
 *  0: grass_light    1: grass_dark     2: dirt           3: dirt_dark      4: stone_floor
 *  5: stone_dark_fl  6: water          7: water_edge     8: bridge_h       9: bridge_v
 * 10: tree_small     11: tree_large    12: rock_small    13: rock_large    14: bush
 * 15: flower         16: stairs_up     17: stairs_down   18: wall_h        19: wall_v
 * 20: gate           21: fence_h       22: fence_v       23: torch         24: flag
 * 25: signpost       26: spawn_cave    27: exit_gate     28: placement_pt  29: placement_occ
 * 30: grass_path_l   31: grass_path_r  32: path_corner   33: cliff_edge    34: waterfall
 */
import { makeCanvas, saveCanvas, PALETTE, TILE_SIZE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/tiles';
export const TILESET_COLS = 10;
export const TILE = TILE_SIZE; // 32
const COLS = TILESET_COLS;

// 2.5D helper: 하단 어둡게, 상단 밝게 음영 그라데이션
function shade25D(ctx: any, ox: number, oy: number, baseColor: string, darkColor: string, lightColor: string) {
  // Bottom 1/3 darker
  drawRect(ctx, ox, oy + TILE * 0.66, TILE, TILE * 0.34, darkColor);
  // Top highlight strip
  drawRect(ctx, ox, oy, TILE, 2, hexToRgba(lightColor, 0.3));
}

// Tile drawing functions
function drawGrassLight(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  // Grass texture
  for (let i = 0; i < 12; i++) {
    const x = ox + ((i * 7 + 3) % 30);
    const y = oy + ((i * 11 + 5) % 30);
    setPixel(ctx, x, y, hexToRgba(PALETTE.edgeHighlight, 0.4));
  }
  shade25D(ctx, ox, oy, PALETTE.gridLight, hexToRgba(PALETTE.gridDark, 0.2), PALETTE.edgeHighlight);
}

function drawGrassDark(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark);
  for (let i = 0; i < 10; i++) {
    const x = ox + ((i * 9 + 2) % 30);
    const y = oy + ((i * 13 + 7) % 30);
    setPixel(ctx, x, y, hexToRgba(PALETTE.gridLine, 0.3));
  }
  shade25D(ctx, ox, oy, PALETTE.gridDark, hexToRgba('#3a6a18', 0.3), PALETTE.gridLight);
}

function drawDirt(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.dirtPath);
  // Pebbles
  const pebbles = [[4,8],[12,5],[22,14],[8,22],[18,26],[26,9]];
  for (const [px, py] of pebbles) {
    setPixel(ctx, ox + px, oy + py, PALETTE.stoneDark);
  }
  shade25D(ctx, ox, oy, PALETTE.dirtPath, hexToRgba(PALETTE.dirtDark, 0.3), PALETTE.woodLight);
}

function drawDirtDark(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.dirtDark);
  shade25D(ctx, ox, oy, PALETTE.dirtDark, hexToRgba('#5a4a20', 0.3), PALETTE.dirtPath);
}

function drawStoneFloor(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.stone);
  // Stone block lines
  drawLine(ctx, ox, oy + 16, ox + 32, oy + 16, hexToRgba(PALETTE.stoneDark, 0.3));
  drawLine(ctx, ox + 16, oy, ox + 16, oy + 16, hexToRgba(PALETTE.stoneDark, 0.3));
  drawLine(ctx, ox + 8, oy + 16, ox + 8, oy + 32, hexToRgba(PALETTE.stoneDark, 0.3));
  drawLine(ctx, ox + 24, oy + 16, ox + 24, oy + 32, hexToRgba(PALETTE.stoneDark, 0.3));
  shade25D(ctx, ox, oy, PALETTE.stone, hexToRgba(PALETTE.stoneDark, 0.2), PALETTE.stoneLight);
}

function drawStoneDarkFloor(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.stoneDark);
  shade25D(ctx, ox, oy, PALETTE.stoneDark, hexToRgba('#3a3a3a', 0.3), PALETTE.stone);
}

function drawWater(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, '#2060a0');
  // Wave highlights
  drawLine(ctx, ox + 4, oy + 8, ox + 12, oy + 8, hexToRgba('#40a0e0', 0.5));
  drawLine(ctx, ox + 18, oy + 16, ox + 28, oy + 16, hexToRgba('#40a0e0', 0.5));
  drawLine(ctx, ox + 8, oy + 24, ox + 20, oy + 24, hexToRgba('#40a0e0', 0.4));
}

function drawWaterEdge(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, 16, PALETTE.dirtPath);
  drawRect(ctx, ox, oy + 16, TILE, 16, '#2060a0');
  drawLine(ctx, ox, oy + 16, ox + 32, oy + 16, hexToRgba('#40a0e0', 0.6));
}

function drawBridgeH(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, '#2060a0');
  // Bridge planks
  drawRect(ctx, ox, oy + 8, TILE, 16, PALETTE.wood);
  drawRect(ctx, ox, oy + 8, TILE, 2, PALETTE.woodLight);
  drawRect(ctx, ox, oy + 22, TILE, 2, PALETTE.woodDark);
  // Railing
  for (let x = 0; x < 32; x += 8) {
    drawRect(ctx, ox + x, oy + 6, 2, 4, PALETTE.woodDark);
    drawRect(ctx, ox + x, oy + 24, 2, 4, PALETTE.woodDark);
  }
}

function drawBridgeV(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, '#2060a0');
  drawRect(ctx, ox + 8, oy, 16, TILE, PALETTE.wood);
  drawRect(ctx, ox + 8, oy, 2, TILE, PALETTE.woodLight);
  drawRect(ctx, ox + 22, oy, 2, TILE, PALETTE.woodDark);
  for (let y = 0; y < 32; y += 8) {
    drawRect(ctx, ox + 6, oy + y, 4, 2, PALETTE.woodDark);
    drawRect(ctx, ox + 24, oy + y, 4, 2, PALETTE.woodDark);
  }
}

function drawTreeSmall(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark); // bg
  // Trunk
  drawRect(ctx, ox + 14, oy + 18, 4, 10, PALETTE.woodDark);
  drawRect(ctx, ox + 14, oy + 18, 1, 10, PALETTE.wood);
  // Canopy (circle, 2.5D: darker bottom)
  fillCircle(ctx, ox + 16, oy + 14, 8, '#2d6a2d');
  fillCircle(ctx, ox + 16, oy + 12, 6, '#3a8a3a');
  setPixel(ctx, ox + 14, oy + 10, hexToRgba(PALETTE.edgeHighlight, 0.5));
  // Shadow on ground
  for (let dx = -6; dx <= 6; dx++) {
    setPixel(ctx, ox + 16 + dx, oy + 28, hexToRgba('#000000', 0.15));
  }
}

function drawTreeLarge(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark);
  // Thick trunk
  drawRect(ctx, ox + 12, oy + 16, 8, 14, PALETTE.woodDark);
  drawRect(ctx, ox + 12, oy + 16, 2, 14, PALETTE.wood);
  // Large canopy
  fillCircle(ctx, ox + 16, oy + 10, 12, '#2d6a2d');
  fillCircle(ctx, ox + 16, oy + 8, 9, '#3a8a3a');
  fillCircle(ctx, ox + 14, oy + 6, 5, '#4a9a4a');
}

function drawRockSmall(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight); // bg
  fillCircle(ctx, ox + 16, oy + 20, 6, PALETTE.stoneDark);
  fillCircle(ctx, ox + 16, oy + 18, 5, PALETTE.stone);
  setPixel(ctx, ox + 14, oy + 16, PALETTE.stoneLight);
}

function drawRockLarge(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  // Two overlapping rocks
  fillCircle(ctx, ox + 12, oy + 20, 8, PALETTE.stoneDark);
  fillCircle(ctx, ox + 12, oy + 18, 7, PALETTE.stone);
  fillCircle(ctx, ox + 22, oy + 22, 5, PALETTE.stoneDark);
  fillCircle(ctx, ox + 22, oy + 20, 4, PALETTE.stone);
  setPixel(ctx, ox + 10, oy + 14, PALETTE.stoneLight);
}

function drawBush(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  fillCircle(ctx, ox + 16, oy + 22, 7, '#2d6a2d');
  fillCircle(ctx, ox + 16, oy + 20, 5, '#3a8a3a');
  // Berries
  setPixel(ctx, ox + 12, oy + 20, '#c03020');
  setPixel(ctx, ox + 20, oy + 18, '#c03020');
}

function drawFlower(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  // Stem
  drawLine(ctx, ox + 16, oy + 28, ox + 16, oy + 18, '#3a8a3a');
  // Petals
  const petalColor = '#e060a0';
  setPixel(ctx, ox + 16, oy + 16, '#ffe040');
  setPixel(ctx, ox + 14, oy + 16, petalColor);
  setPixel(ctx, ox + 18, oy + 16, petalColor);
  setPixel(ctx, ox + 16, oy + 14, petalColor);
  setPixel(ctx, ox + 16, oy + 18, petalColor);
}

function drawStairsUp(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.stoneDark);
  // 4 steps going up (bottom to top)
  for (let i = 0; i < 4; i++) {
    const stepY = oy + 24 - i * 8;
    const brightness = 0.6 + i * 0.1;
    drawRect(ctx, ox + 2, stepY, 28, 6, hexToRgba(PALETTE.stone, brightness));
    drawRect(ctx, ox + 2, stepY, 28, 1, hexToRgba(PALETTE.stoneLight, brightness));
    drawRect(ctx, ox + 2, stepY + 5, 28, 1, hexToRgba(PALETTE.stoneDark, 0.5));
  }
}

function drawStairsDown(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.stoneDark);
  for (let i = 0; i < 4; i++) {
    const stepY = oy + i * 8;
    const brightness = 0.9 - i * 0.1;
    drawRect(ctx, ox + 2, stepY, 28, 6, hexToRgba(PALETTE.stone, brightness));
    drawRect(ctx, ox + 2, stepY, 28, 1, hexToRgba(PALETTE.stoneLight, brightness));
    drawRect(ctx, ox + 2, stepY + 5, 28, 1, hexToRgba(PALETTE.stoneDark, 0.5));
  }
}

function drawWallH(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark);
  // Stone wall (horizontal)
  drawRect(ctx, ox, oy + 8, TILE, 16, PALETTE.stone);
  drawRect(ctx, ox, oy + 8, TILE, 2, PALETTE.stoneLight);
  drawRect(ctx, ox, oy + 22, TILE, 2, PALETTE.stoneDark);
  // Battlements
  for (let bx = 0; bx < 32; bx += 10) {
    drawRect(ctx, ox + bx, oy + 4, 6, 6, PALETTE.stone);
    drawRect(ctx, ox + bx, oy + 4, 6, 1, PALETTE.stoneLight);
  }
}

function drawWallV(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark);
  drawRect(ctx, ox + 8, oy, 16, TILE, PALETTE.stone);
  drawRect(ctx, ox + 8, oy, 2, TILE, PALETTE.stoneLight);
  drawRect(ctx, ox + 22, oy, 2, TILE, PALETTE.stoneDark);
}

function drawGate(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.stone);
  drawRect(ctx, ox, oy, TILE, 2, PALETTE.stoneLight);
  // Gate opening
  drawRect(ctx, ox + 8, oy + 8, 16, 24, '#1a1208');
  // Arch top
  for (let a = 180; a <= 360; a += 20) {
    const rad = (a * Math.PI) / 180;
    setPixel(ctx, ox + 16 + Math.round(8 * Math.cos(rad)), oy + 8 + Math.round(6 * Math.sin(rad)), PALETTE.stoneDark);
  }
  // Portcullis bars
  for (let x = 10; x <= 22; x += 3) {
    drawLine(ctx, ox + x, oy + 10, ox + x, oy + 30, hexToRgba(PALETTE.stoneDark, 0.4));
  }
}

function drawFenceH(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  drawLine(ctx, ox, oy + 16, ox + 32, oy + 16, PALETTE.wood);
  for (let x = 0; x < 32; x += 8) {
    drawRect(ctx, ox + x + 3, oy + 10, 2, 14, PALETTE.woodDark);
  }
}

function drawFenceV(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  drawLine(ctx, ox + 16, oy, ox + 16, oy + 32, PALETTE.wood);
  for (let y = 0; y < 32; y += 8) {
    drawRect(ctx, ox + 10, oy + y + 3, 14, 2, PALETTE.woodDark);
  }
}

function drawTorch(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark);
  // Pole
  drawRect(ctx, ox + 15, oy + 12, 2, 16, PALETTE.woodDark);
  // Flame
  setPixel(ctx, ox + 15, oy + 10, PALETTE.fireOrange);
  setPixel(ctx, ox + 16, oy + 10, PALETTE.fireOrange);
  setPixel(ctx, ox + 15, oy + 9, PALETTE.gold);
  setPixel(ctx, ox + 16, oy + 9, PALETTE.gold);
  setPixel(ctx, ox + 16, oy + 8, hexToRgba(PALETTE.gold, 0.6));
  addGlow(ctx, ox + 16, oy + 10, 5, PALETTE.fireOrange, 0.2);
}

function drawFlag(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark);
  // Pole
  drawRect(ctx, ox + 15, oy + 4, 2, 24, PALETTE.woodDark);
  // Flag cloth
  drawRect(ctx, ox + 17, oy + 4, 10, 8, '#c03020');
  drawRect(ctx, ox + 17, oy + 4, 10, 2, '#e04030');
  // Flag tip
  setPixel(ctx, ox + 26, oy + 8, '#c03020');
}

function drawSignpost(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  drawRect(ctx, ox + 15, oy + 12, 2, 16, PALETTE.woodDark);
  drawRect(ctx, ox + 8, oy + 10, 16, 6, PALETTE.wood);
  drawRect(ctx, ox + 8, oy + 10, 16, 1, PALETTE.woodLight);
}

function drawSpawnCave(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, '#1a1208');
  // Stone arch
  drawRect(ctx, ox + 2, oy + 10, 4, 22, PALETTE.stoneDark);
  drawRect(ctx, ox + 26, oy + 10, 4, 22, PALETTE.stoneDark);
  for (let a = 180; a <= 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    setPixel(ctx, ox + 16 + Math.round(13 * Math.cos(rad)), oy + 10 + Math.round(8 * Math.sin(rad)), PALETTE.stone);
  }
  // Torches
  setPixel(ctx, ox + 5, oy + 12, PALETTE.fireOrange);
  setPixel(ctx, ox + 5, oy + 11, PALETTE.gold);
  setPixel(ctx, ox + 27, oy + 12, PALETTE.fireOrange);
  setPixel(ctx, ox + 27, oy + 11, PALETTE.gold);
  addGlow(ctx, ox + 16, oy + 18, 8, PALETTE.fireOrange, 0.12);
}

function drawExitGate(ctx: any, ox: number, oy: number) {
  // Castle gate (exit)
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.stone);
  drawRect(ctx, ox, oy, TILE, 2, PALETTE.stoneLight);
  // Battlements
  for (let bx = 0; bx < 32; bx += 8) {
    drawRect(ctx, ox + bx, oy - 2, 5, 4, PALETTE.stone);
  }
  // Gate
  drawRect(ctx, ox + 8, oy + 6, 16, 26, '#1a1208');
  // Flag
  drawLine(ctx, ox + 16, oy - 4, ox + 16, oy + 2, PALETTE.wood);
  setPixel(ctx, ox + 17, oy - 4, '#c03020');
  setPixel(ctx, ox + 18, oy - 3, '#c03020');
  addGlow(ctx, ox + 16, oy + 16, 6, PALETTE.gold, 0.15);
}

function drawPlacementPoint(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  // Golden circle marker
  drawCircle(ctx, ox + 16, oy + 16, 10, hexToRgba(PALETTE.gold, 0.6));
  drawCircle(ctx, ox + 16, oy + 16, 9, hexToRgba(PALETTE.gold, 0.3));
  fillCircle(ctx, ox + 16, oy + 16, 6, hexToRgba(PALETTE.gold, 0.1));
  // Center dot
  fillCircle(ctx, ox + 16, oy + 16, 2, hexToRgba(PALETTE.gold, 0.4));
}

function drawPlacementOccupied(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridDark);
  // Faded circle (occupied)
  drawCircle(ctx, ox + 16, oy + 16, 10, hexToRgba(PALETTE.stoneDark, 0.3));
}

function drawGrassPathL(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  drawRect(ctx, ox, oy, 16, TILE, PALETTE.dirtPath);
  // Transition
  for (let y = 0; y < 32; y += 3) {
    setPixel(ctx, ox + 16 + (y % 2), oy + y, hexToRgba(PALETTE.dirtPath, 0.5));
  }
}

function drawGrassPathR(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  drawRect(ctx, ox + 16, oy, 16, TILE, PALETTE.dirtPath);
  for (let y = 0; y < 32; y += 3) {
    setPixel(ctx, ox + 15 - (y % 2), oy + y, hexToRgba(PALETTE.dirtPath, 0.5));
  }
}

function drawPathCorner(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.gridLight);
  drawRect(ctx, ox, oy, 16, 16, PALETTE.dirtPath);
  drawRect(ctx, ox, oy + 16, 16, 16, PALETTE.dirtPath);
  drawRect(ctx, ox + 16, oy, 16, 16, PALETTE.dirtPath);
}

function drawCliffEdge(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, 20, PALETTE.gridDark);
  drawRect(ctx, ox, oy + 20, TILE, 12, PALETTE.stoneDark);
  drawLine(ctx, ox, oy + 20, ox + 32, oy + 20, PALETTE.stone);
  drawLine(ctx, ox, oy + 21, ox + 32, oy + 21, PALETTE.stoneDark);
}

function drawWaterfall(ctx: any, ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.stoneDark);
  // Water falling
  drawRect(ctx, ox + 10, oy, 12, TILE, '#2060a0');
  drawLine(ctx, ox + 13, oy + 4, ox + 13, oy + 28, hexToRgba('#40a0e0', 0.6));
  drawLine(ctx, ox + 18, oy + 8, ox + 18, oy + 30, hexToRgba('#40a0e0', 0.5));
  // Splash at bottom
  fillCircle(ctx, ox + 16, oy + 30, 3, hexToRgba('#80c0e0', 0.4));
}

// All tiles in order
const TILE_DRAWERS: Array<(ctx: any, ox: number, oy: number) => void> = [
  drawGrassLight, drawGrassDark, drawDirt, drawDirtDark, drawStoneFloor,       // 0-4
  drawStoneDarkFloor, drawWater, drawWaterEdge, drawBridgeH, drawBridgeV,      // 5-9
  drawTreeSmall, drawTreeLarge, drawRockSmall, drawRockLarge, drawBush,        // 10-14
  drawFlower, drawStairsUp, drawStairsDown, drawWallH, drawWallV,             // 15-19
  drawGate, drawFenceH, drawFenceV, drawTorch, drawFlag,                      // 20-24
  drawSignpost, drawSpawnCave, drawExitGate, drawPlacementPoint, drawPlacementOccupied, // 25-29
  drawGrassPathL, drawGrassPathR, drawPathCorner, drawCliffEdge, drawWaterfall, // 30-34
];

export const TILESET_ROWS = Math.ceil(TILE_DRAWERS.length / TILESET_COLS);

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  const rows = Math.ceil(TILE_DRAWERS.length / COLS);
  const { canvas, ctx } = makeCanvas(COLS * TILE, rows * TILE);

  for (let i = 0; i < TILE_DRAWERS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    TILE_DRAWERS[i](ctx, col * TILE, row * TILE);
  }

  saveCanvas(canvas, `${OUTPUT_DIR}/tileset.png`);
  entries.push({
    key: 'tileset',
    type: 'image',
    path: 'assets/tiles/tileset.png',
  });

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
