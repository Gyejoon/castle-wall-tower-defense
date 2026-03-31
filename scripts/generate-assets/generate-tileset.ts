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
 * 35: mossy_stone    36: mud           37: sand          38: fern          39: mushroom
 * 40: vine           41: shallow_water 42: reed          43: mossy_rock    44: ruins
 * 45: ancient_pillar 46: fallen_leaves
 */
import { makeCanvas, saveCanvas, PALETTE, TILE_SIZE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, drawPolygon, type ManifestEntry } from './shared';
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

// --- Nature background tiles (index 35-46) — Kingdom Rush style ---

// Helper: draw a lush rounded canopy blob (Kingdom Rush tree style)
function drawCanopyBlob(ctx: ReturnType<typeof makeCanvas>['ctx'], cx: number, cy: number, r: number, shadow: boolean = true) {
  // Shadow layer (darker, offset down)
  if (shadow) {
    fillCircle(ctx, cx, cy + 2, r, PALETTE.foliageDark);
  }
  // Main body
  fillCircle(ctx, cx, cy, r, PALETTE.foliageMid);
  // Light layer (upper portion)
  fillCircle(ctx, cx - 1, cy - 2, r - 2, PALETTE.foliageLight);
  // Highlight spot
  if (r >= 4) {
    fillCircle(ctx, cx - 2, cy - 3, Math.max(1, r - 4), PALETTE.foliageBright);
    setPixel(ctx, cx - 2, cy - r + 2, PALETTE.foliageTop);
  }
}

// Helper: fill tile with rich grass texture
function fillRichGrass(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.grassRich);
  // Organic texture: scattered highlight/shadow pixels
  const spots = [
    [3,2],[7,5],[12,1],[18,4],[24,2],[29,6],
    [2,10],[8,12],[15,9],[21,11],[27,13],
    [5,18],[10,16],[17,19],[23,17],[28,20],
    [3,24],[9,26],[14,23],[20,25],[26,28],[30,22],
  ];
  for (const [sx, sy] of spots) {
    setPixel(ctx, ox + sx, oy + sy, PALETTE.grassHighlight);
    setPixel(ctx, ox + sx + 1, oy + sy + 1, PALETTE.grassShadow);
  }
}

function drawMossyStone(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  fillRichGrass(ctx, ox, oy);
  // Mossy stone slab emerging from grass
  fillCircle(ctx, ox + 16, oy + 18, 10, PALETTE.stoneDark);
  fillCircle(ctx, ox + 16, oy + 16, 9, PALETTE.stone);
  fillCircle(ctx, ox + 14, oy + 14, 5, PALETTE.stoneLight);
  // Thick moss coverage
  const mossPx = [
    [8,14],[9,13],[10,12],[11,12],[12,11],[13,11],[14,11],[15,10],
    [7,16],[8,15],[9,15],[10,14],[20,12],[21,13],[22,14],
    [10,20],[11,21],[12,20],[13,21],[18,20],[19,21],[20,20],
    [16,10],[17,10],[18,11],
  ];
  for (const [mx, my] of mossPx) {
    setPixel(ctx, ox + mx, oy + my, PALETTE.foliageMid);
    setPixel(ctx, ox + mx + 1, oy + my, PALETTE.foliageLight);
  }
}

function drawMud(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.dirtDark);
  // Wet mud texture
  for (let i = 0; i < 20; i++) {
    const px = (i * 7 + 3) % 30 + 1;
    const py = (i * 11 + 5) % 30 + 1;
    setPixel(ctx, ox + px, oy + py, hexToRgba('#5a4a30', 0.5));
  }
  // Puddles
  fillCircle(ctx, ox + 10, oy + 12, 4, hexToRgba('#3a4a50', 0.5));
  fillCircle(ctx, ox + 24, oy + 22, 3, hexToRgba('#3a4a50', 0.4));
  // Puddle highlights
  setPixel(ctx, ox + 8, oy + 10, hexToRgba('#7ab0c0', 0.4));
  setPixel(ctx, ox + 22, oy + 20, hexToRgba('#7ab0c0', 0.3));
  // Grass tufts at edges
  setPixel(ctx, ox + 2, oy + 2, PALETTE.grassRich);
  setPixel(ctx, ox + 3, oy + 1, PALETTE.grassRich);
  setPixel(ctx, ox + 28, oy + 30, PALETTE.grassRich);
  setPixel(ctx, ox + 29, oy + 29, PALETTE.grassRich);
}

function drawSand(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.sand);
  // Wind ripple curves
  drawLine(ctx, ox + 2, oy + 8, ox + 16, oy + 7, hexToRgba(PALETTE.sandDark, 0.35));
  drawLine(ctx, ox + 8, oy + 16, ox + 24, oy + 15, hexToRgba(PALETTE.sandDark, 0.3));
  drawLine(ctx, ox + 4, oy + 24, ox + 20, oy + 23, hexToRgba(PALETTE.sandDark, 0.25));
  // Pebbles
  setPixel(ctx, ox + 20, oy + 10, PALETTE.stoneDark);
  setPixel(ctx, ox + 21, oy + 10, PALETTE.stone);
  setPixel(ctx, ox + 8, oy + 20, PALETTE.stoneDark);
  // Grass-sand border tufts
  setPixel(ctx, ox + 1, oy + 1, PALETTE.grassRich);
  setPixel(ctx, ox + 2, oy + 0, PALETTE.grassRich);
  setPixel(ctx, ox + 30, oy + 30, PALETTE.grassRich);
}

function drawFern(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  fillRichGrass(ctx, ox, oy);
  // Lush fern clusters (Kingdom Rush style — dense, overlapping)
  const ferns: Array<[number, number, number]> = [[10, 24, 7], [22, 20, 6], [14, 12, 5], [6, 16, 4]];
  for (const [fx, fy, size] of ferns) {
    // Central stem
    drawLine(ctx, ox + fx, oy + fy, ox + fx, oy + fy - size, PALETTE.foliageMid);
    // Fan-shaped leaflets
    for (let i = 1; i <= Math.floor(size / 2); i++) {
      const ly = fy - i * 2;
      setPixel(ctx, ox + fx - i, oy + ly, PALETTE.foliageLight);
      setPixel(ctx, ox + fx + i, oy + ly, PALETTE.foliageLight);
      setPixel(ctx, ox + fx - i - 1, oy + ly + 1, PALETTE.foliageMid);
      setPixel(ctx, ox + fx + i + 1, oy + ly + 1, PALETTE.foliageMid);
    }
    // Bright tip
    setPixel(ctx, ox + fx, oy + fy - size, PALETTE.foliageBright);
  }
}

function drawMushroom(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  fillRichGrass(ctx, ox, oy);
  // Mushroom cluster (Kingdom Rush style — plump, colorful)
  const shrooms: Array<{ x: number; y: number; capR: number; stemH: number; color: string }> = [
    { x: 10, y: 24, capR: 5, stemH: 6, color: '#c83030' },
    { x: 22, y: 22, capR: 4, stemH: 5, color: '#d04838' },
    { x: 16, y: 28, capR: 3, stemH: 4, color: '#b82828' },
  ];
  for (const s of shrooms) {
    // Stem
    drawRect(ctx, ox + s.x - 1, oy + s.y - s.stemH, 3, s.stemH, '#e8dcc8');
    drawRect(ctx, ox + s.x - 1, oy + s.y - s.stemH, 1, s.stemH, '#d0c4a8');
    // Cap
    for (let dy = -s.capR; dy <= 0; dy++) {
      const halfW = Math.round(s.capR * Math.sqrt(1 - (dy * dy) / (s.capR * s.capR)));
      for (let dx = -halfW; dx <= halfW; dx++) {
        setPixel(ctx, ox + s.x + dx, oy + s.y - s.stemH + dy, s.color);
      }
    }
    // Cap highlight
    fillCircle(ctx, ox + s.x - 1, oy + s.y - s.stemH - Math.floor(s.capR / 2), 1, '#e06050');
    // White spots
    setPixel(ctx, ox + s.x - 2, oy + s.y - s.stemH - s.capR + 2, '#f0e8e0');
    setPixel(ctx, ox + s.x + 1, oy + s.y - s.stemH - Math.floor(s.capR / 2), '#f0e8e0');
  }
  addGlow(ctx, ox + 15, oy + 26, 5, PALETTE.mushGlow, 0.1);
}

function drawVine(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  fillRichGrass(ctx, ox, oy);
  // Thick curvy vines with leaves (Kingdom Rush style)
  const vineColor = PALETTE.foliageDark;
  // Main vine paths
  drawLine(ctx, ox + 2, oy + 4, ox + 14, oy + 16, vineColor);
  drawLine(ctx, ox + 3, oy + 4, ox + 15, oy + 16, vineColor);
  drawLine(ctx, ox + 14, oy + 16, ox + 8, oy + 28, vineColor);
  drawLine(ctx, ox + 15, oy + 16, ox + 9, oy + 28, vineColor);
  drawLine(ctx, ox + 18, oy + 2, ox + 28, oy + 20, vineColor);
  drawLine(ctx, ox + 19, oy + 2, ox + 29, oy + 20, vineColor);
  // Leaves along vines
  const leafPositions: Array<[number, number]> = [
    [6, 8], [10, 12], [12, 20], [10, 26],
    [22, 6], [26, 14], [28, 18],
  ];
  for (const [lx, ly] of leafPositions) {
    fillCircle(ctx, ox + lx, oy + ly, 2, PALETTE.foliageLight);
    setPixel(ctx, ox + lx - 1, oy + ly - 1, PALETTE.foliageBright);
  }
}

function drawShallowWater(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  // Dirt/grass base
  drawRect(ctx, ox, oy, TILE, TILE, PALETTE.dirtPath);
  fillCircle(ctx, ox + 4, oy + 4, 3, PALETTE.grassRich);
  fillCircle(ctx, ox + 28, oy + 28, 3, PALETTE.grassRich);
  // Water overlay
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      setPixel(ctx, ox + px, oy + py, hexToRgba('#2070b0', 0.4));
    }
  }
  // Ripples
  drawLine(ctx, ox + 4, oy + 10, ox + 16, oy + 9, hexToRgba('#70c8e8', 0.4));
  drawLine(ctx, ox + 14, oy + 20, ox + 28, oy + 19, hexToRgba('#70c8e8', 0.35));
  // Pebbles visible through water
  setPixel(ctx, ox + 10, oy + 16, hexToRgba(PALETTE.stoneDark, 0.5));
  setPixel(ctx, ox + 20, oy + 24, hexToRgba(PALETTE.stoneDark, 0.4));
}

function drawReed(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  // Muddy bank top, water bottom
  drawRect(ctx, ox, oy, TILE, 14, PALETTE.dirtDark);
  drawRect(ctx, ox, oy + 14, TILE, 18, '#2070b0');
  drawLine(ctx, ox, oy + 14, ox + 32, oy + 14, hexToRgba('#50b0d0', 0.5));
  // Lush reed clusters (Kingdom Rush style)
  const reedsX = [3, 8, 14, 20, 26];
  for (const rx of reedsX) {
    // Thick stem
    drawLine(ctx, ox + rx, oy + 6, ox + rx, oy + 22, PALETTE.foliageMid);
    drawLine(ctx, ox + rx + 1, oy + 7, ox + rx + 1, oy + 22, PALETTE.foliageDark);
    // Bushy top tuft
    fillCircle(ctx, ox + rx, oy + 5, 2, PALETTE.foliageLight);
    setPixel(ctx, ox + rx, oy + 3, PALETTE.foliageBright);
  }
  // Water ripples
  drawLine(ctx, ox + 6, oy + 26, ox + 24, oy + 26, hexToRgba('#50b0d0', 0.35));
}

function drawMossyRock(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  fillRichGrass(ctx, ox, oy);
  // Large rock with lush moss
  fillCircle(ctx, ox + 16, oy + 20, 11, PALETTE.stoneDark);
  fillCircle(ctx, ox + 16, oy + 18, 10, PALETTE.stone);
  fillCircle(ctx, ox + 14, oy + 15, 6, PALETTE.stoneLight);
  // Thick moss canopy on top of rock
  fillCircle(ctx, ox + 12, oy + 12, 5, PALETTE.foliageDark);
  fillCircle(ctx, ox + 12, oy + 11, 4, PALETTE.foliageMid);
  fillCircle(ctx, ox + 11, oy + 10, 3, PALETTE.foliageLight);
  setPixel(ctx, ox + 10, oy + 8, PALETTE.foliageBright);
  // Small grass tufts around base
  setPixel(ctx, ox + 6, oy + 26, PALETTE.foliageLight);
  setPixel(ctx, ox + 7, oy + 25, PALETTE.foliageMid);
  setPixel(ctx, ox + 26, oy + 26, PALETTE.foliageLight);
  setPixel(ctx, ox + 25, oy + 25, PALETTE.foliageMid);
}

function drawRuins(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  fillRichGrass(ctx, ox, oy);
  // Stone ruins overgrown with vegetation
  drawRect(ctx, ox + 2, oy + 4, 7, 18, PALETTE.stone);
  drawRect(ctx, ox + 2, oy + 16, 20, 6, PALETTE.stone);
  drawRect(ctx, ox + 2, oy + 4, 7, 2, PALETTE.stoneLight);
  drawRect(ctx, ox + 2, oy + 20, 20, 2, PALETTE.stoneDark);
  // Broken edges
  setPixel(ctx, ox + 5, oy + 4, PALETTE.grassRich);
  setPixel(ctx, ox + 8, oy + 6, PALETTE.grassRich);
  setPixel(ctx, ox + 20, oy + 16, PALETTE.grassRich);
  // Rubble
  fillCircle(ctx, ox + 24, oy + 10, 2, PALETTE.stoneDark);
  fillCircle(ctx, ox + 26, oy + 8, 1, PALETTE.stone);
  // Vines growing over ruins
  drawLine(ctx, ox + 4, oy + 8, ox + 6, oy + 14, PALETTE.foliageMid);
  fillCircle(ctx, ox + 5, oy + 10, 2, PALETTE.foliageLight);
  fillCircle(ctx, ox + 14, oy + 18, 2, PALETTE.foliageMid);
  setPixel(ctx, ox + 13, oy + 17, PALETTE.foliageBright);
}

function drawAncientPillar(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  fillRichGrass(ctx, ox, oy);
  // Stone pillar base
  drawRect(ctx, ox + 9, oy + 24, 14, 5, PALETTE.stoneDark);
  drawRect(ctx, ox + 9, oy + 24, 14, 2, PALETTE.stone);
  // Pillar shaft
  drawRect(ctx, ox + 11, oy + 6, 10, 18, PALETTE.stone);
  drawRect(ctx, ox + 11, oy + 6, 3, 18, PALETTE.stoneLight);
  drawRect(ctx, ox + 18, oy + 6, 3, 18, PALETTE.stoneDark);
  // Broken top
  setPixel(ctx, ox + 12, oy + 5, PALETTE.stone);
  setPixel(ctx, ox + 14, oy + 4, PALETTE.stoneLight);
  setPixel(ctx, ox + 16, oy + 5, PALETTE.stone);
  setPixel(ctx, ox + 19, oy + 7, PALETTE.grassRich);
  // Rune glow
  setPixel(ctx, ox + 15, oy + 12, hexToRgba(PALETTE.magicGold, 0.7));
  setPixel(ctx, ox + 15, oy + 15, hexToRgba(PALETTE.magicGold, 0.6));
  setPixel(ctx, ox + 15, oy + 18, hexToRgba(PALETTE.magicGold, 0.5));
  addGlow(ctx, ox + 15, oy + 15, 3, PALETTE.magicGold, 0.12);
  // Vine wrapping pillar
  drawLine(ctx, ox + 12, oy + 20, ox + 14, oy + 14, PALETTE.foliageMid);
  drawLine(ctx, ox + 18, oy + 16, ox + 16, oy + 10, PALETTE.foliageMid);
  setPixel(ctx, ox + 13, oy + 16, PALETTE.foliageLight);
  setPixel(ctx, ox + 17, oy + 12, PALETTE.foliageLight);
}

function drawFallenLeaves(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) {
  // Autumn grass (Kingdom Rush autumn area feel)
  drawRect(ctx, ox, oy, TILE, TILE, '#5a7a28');
  // Dense leaf scatter (brown, orange, red, yellow)
  const leaves: Array<[number, number, string]> = [
    [3,3,PALETTE.leafBrown],[7,2,PALETTE.leafOrange],[12,5,'#c04030'],[18,3,'#d0a020'],
    [24,4,PALETTE.leafBrown],[29,2,PALETTE.leafOrange],
    [2,9,PALETTE.leafOrange],[8,11,'#c04030'],[14,8,PALETTE.leafBrown],[20,10,'#d0a020'],
    [26,12,PALETTE.leafOrange],[30,9,PALETTE.leafBrown],
    [4,16,'#c04030'],[10,18,PALETTE.leafBrown],[16,15,PALETTE.leafOrange],[22,17,'#d0a020'],
    [28,16,PALETTE.leafBrown],
    [3,22,PALETTE.leafOrange],[9,24,'#c04030'],[15,21,PALETTE.leafBrown],[21,23,PALETTE.leafOrange],
    [27,25,'#d0a020'],
    [5,28,PALETTE.leafBrown],[12,30,PALETTE.leafOrange],[19,28,'#c04030'],[26,30,'#d0a020'],
  ];
  for (const [lx, ly, color] of leaves) {
    setPixel(ctx, ox + lx, oy + ly, color);
    setPixel(ctx, ox + lx + 1, oy + ly, hexToRgba(color, 0.7));
    setPixel(ctx, ox + lx, oy + ly + 1, hexToRgba(color, 0.5));
  }
}

// All tiles in order
const TILE_DRAWERS: Array<(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) => void> = [
  drawGrassLight, drawGrassDark, drawDirt, drawDirtDark, drawStoneFloor,       // 0-4
  drawStoneDarkFloor, drawWater, drawWaterEdge, drawBridgeH, drawBridgeV,      // 5-9
  drawTreeSmall, drawTreeLarge, drawRockSmall, drawRockLarge, drawBush,        // 10-14
  drawFlower, drawStairsUp, drawStairsDown, drawWallH, drawWallV,             // 15-19
  drawGate, drawFenceH, drawFenceV, drawTorch, drawFlag,                      // 20-24
  drawSignpost, drawSpawnCave, drawExitGate, drawPlacementPoint, drawPlacementOccupied, // 25-29
  drawGrassPathL, drawGrassPathR, drawPathCorner, drawCliffEdge, drawWaterfall, // 30-34
  drawMossyStone, drawMud, drawSand, drawFern, drawMushroom,                  // 35-39
  drawVine, drawShallowWater, drawReed, drawMossyRock, drawRuins,             // 40-44
  drawAncientPillar, drawFallenLeaves,                                         // 45-46
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
