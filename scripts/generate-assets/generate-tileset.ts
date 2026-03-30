import { makeCanvas, saveCanvas, hexToRgba, drawRect, setPixel, fillCircle, type ManifestEntry } from './shared';

const TILESET_COLS = 8;
const TILESET_ROWS = 3;
const TILE = 32;
const OUTPUT_PATH = 'packages/web-shell/public/assets/tileset.png';

// Medieval fantasy palette (grass/terrain focused)
const C = {
  grassLight:     '#4a7c3f',
  grassDark:      '#3d6934',
  grassHighlight: '#5a9c4f',
  grassShadow:    '#2d5228',
  dirt:           '#8b6b47',
  dirtDark:       '#7a5c3a',
  dirtHighlight:  '#a07c55',
  dirtShadow:     '#5a3d22',
  leavesLight:    '#2d5a1e',
  leavesDark:     '#1e3e14',
  leavesHighlight:'#3d7a2e',
  trunk:          '#5a3b1e',
  trunkDark:      '#3e2710',
  rockLight:      '#6b6b6b',
  rockDark:       '#555555',
  rockHighlight:  '#8a8a8a',
  flowerPink:     '#e84393',
  flowerYellow:   '#fdcb6e',
  waterDeep:      '#2980b9',
  waterShallow:   '#3498db',
  waterHighlight: '#5dade2',
  goldLight:      '#f1c40f',
  goldDark:       '#e2b714',
  spawnGreen:     '#2cb67d',
  exitRed:        '#e53170',
  bridgeWood:     '#8b6b47',
  bridgePlank:    '#a07c55',
  bridgeRail:     '#5a3b1e',
  shadow:         'rgba(0,0,0,0.25)',
  shadowDark:     'rgba(0,0,0,0.45)',
} as const;

// Draw a 2.5D depth shadow on bottom/right edges
function addDepthShadow(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  // Bottom shadow strip (2px)
  for (let x = 0; x < TILE; x++) {
    setPixel(ctx, ox + x, oy + TILE - 2, 'rgba(0,0,0,0.20)');
    setPixel(ctx, ox + x, oy + TILE - 1, 'rgba(0,0,0,0.35)');
  }
  // Right shadow strip (1px)
  for (let y = 0; y < TILE; y++) {
    setPixel(ctx, ox + TILE - 1, oy + y, 'rgba(0,0,0,0.20)');
  }
  // Top highlight (1px)
  for (let x = 1; x < TILE - 1; x++) {
    setPixel(ctx, ox + x, oy + 1, 'rgba(255,255,255,0.10)');
  }
}

// Scatter noise pixels for texture
function addGrassTexture(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number, baseColor: string): void {
  const seed = ox * 7 + oy * 13;
  for (let i = 0; i < 18; i++) {
    const nx = (seed * (i + 3) * 17) % (TILE - 2) + 1;
    const ny = (seed * (i + 7) * 11) % (TILE - 2) + 1;
    const bright = i % 3 === 0;
    setPixel(ctx, ox + nx, oy + ny, bright ? hexToRgba(C.grassHighlight, 0.4) : hexToRgba(C.grassShadow, 0.25));
  }
}

function addDirtTexture(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  const seed = ox * 11 + oy * 5;
  for (let i = 0; i < 14; i++) {
    const nx = (seed * (i + 2) * 19) % (TILE - 2) + 1;
    const ny = (seed * (i + 9) * 7) % (TILE - 2) + 1;
    const bright = i % 4 === 0;
    setPixel(ctx, ox + nx, oy + ny, bright ? hexToRgba(C.dirtHighlight, 0.5) : hexToRgba(C.dirtShadow, 0.35));
  }
}

// === Tile drawing functions ===

function drawGrassLight(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  addDepthShadow(ctx, ox, oy);
}

function drawGrassDark(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassDark);
  addGrassTexture(ctx, ox, oy, C.grassDark);
  addDepthShadow(ctx, ox, oy);
}

function drawPathH(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  // Grass side strips
  drawRect(ctx, ox, oy, TILE, 8, C.grassDark);
  drawRect(ctx, ox, oy + TILE - 8, TILE, 8, C.grassDark);
  // Dirt path center
  drawRect(ctx, ox, oy + 8, TILE, TILE - 16, C.dirt);
  addDirtTexture(ctx, ox, oy + 8);
  // Path edges (slightly darker)
  drawRect(ctx, ox, oy + 8, TILE, 1, C.dirtShadow);
  drawRect(ctx, ox, oy + TILE - 9, TILE, 1, C.dirtShadow);
  addDepthShadow(ctx, ox, oy);
}

function drawPathV(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  // Grass side strips
  drawRect(ctx, ox, oy, 8, TILE, C.grassDark);
  drawRect(ctx, ox + TILE - 8, oy, 8, TILE, C.grassDark);
  // Dirt path center
  drawRect(ctx, ox + 8, oy, TILE - 16, TILE, C.dirt);
  addDirtTexture(ctx, ox + 8, oy);
  // Path edges
  drawRect(ctx, ox + 8, oy, 1, TILE, C.dirtShadow);
  drawRect(ctx, ox + TILE - 9, oy, 1, TILE, C.dirtShadow);
  addDepthShadow(ctx, ox, oy);
}

function drawPathCorner(
  ctx: ReturnType<typeof makeCanvas>['ctx'],
  ox: number, oy: number,
  variant: 'ne' | 'nw' | 'se' | 'sw'
): void {
  // Fill all with grass
  drawRect(ctx, ox, oy, TILE, TILE, C.grassDark);

  // Dirt path region — L-shaped
  const pathW = TILE - 16; // 16px wide path center
  const pathStart = 8;

  if (variant === 'ne') {
    // Comes from west (horizontal), exits north (vertical)
    drawRect(ctx, ox, oy + pathStart, TILE, pathW, C.dirt); // horizontal strip
    drawRect(ctx, ox + pathStart, oy, pathW, pathStart, C.dirt); // vertical top
    // Grass corners
    drawRect(ctx, ox, oy, pathStart, pathStart, C.grassDark);
    drawRect(ctx, ox + pathStart + pathW, oy, pathStart, pathStart, C.grassDark);
  } else if (variant === 'nw') {
    // Comes from east, exits north
    drawRect(ctx, ox, oy + pathStart, TILE, pathW, C.dirt);
    drawRect(ctx, ox + pathStart, oy, pathW, pathStart, C.dirt);
    drawRect(ctx, ox, oy, pathStart, pathStart, C.grassDark);
    drawRect(ctx, ox + pathStart + pathW, oy, pathStart, pathStart, C.grassDark);
  } else if (variant === 'se') {
    // Comes from west, exits south
    drawRect(ctx, ox, oy + pathStart, TILE, pathW, C.dirt);
    drawRect(ctx, ox + pathStart, oy + pathStart + pathW, pathW, pathStart, C.dirt);
  } else {
    // sw: Comes from east, exits south
    drawRect(ctx, ox, oy + pathStart, TILE, pathW, C.dirt);
    drawRect(ctx, ox + pathStart, oy + pathStart + pathW, pathW, pathStart, C.dirt);
  }

  addDirtTexture(ctx, ox, oy);
  addDepthShadow(ctx, ox, oy);
}

function drawPathSpawn(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  // Base: horizontal path
  drawPathH(ctx, ox, oy);
  // Green glow circle overlay
  const cx = ox + TILE / 2, cy = oy + TILE / 2;
  for (let r = 9; r > 0; r--) {
    const alpha = 0.06 * (10 - r) / 9;
    fillCircle(ctx, cx, cy, r, hexToRgba(C.spawnGreen, alpha));
  }
  fillCircle(ctx, cx, cy, 4, hexToRgba(C.spawnGreen, 0.7));
  fillCircle(ctx, cx, cy, 2, hexToRgba(C.spawnGreen, 0.9));
  // Arrow pointing right
  for (let i = 0; i < 5; i++) {
    const arrowX = cx - 3 + i;
    const halfH = Math.round((5 - i) * 0.6);
    for (let j = -halfH; j <= halfH; j++) {
      setPixel(ctx, arrowX, cy + j, C.spawnGreen);
    }
  }
}

function drawPathExit(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  // Base: horizontal path
  drawPathH(ctx, ox, oy);
  // Red glow
  const cx = ox + TILE / 2, cy = oy + TILE / 2;
  for (let r = 9; r > 0; r--) {
    const alpha = 0.06 * (10 - r) / 9;
    fillCircle(ctx, cx, cy, r, hexToRgba(C.exitRed, alpha));
  }
  fillCircle(ctx, cx, cy, 4, hexToRgba(C.exitRed, 0.7));
  fillCircle(ctx, cx, cy, 2, hexToRgba(C.exitRed, 0.9));
  // X mark
  for (let i = -3; i <= 3; i++) {
    setPixel(ctx, cx + i, cy + i, C.exitRed);
    setPixel(ctx, cx - i, cy + i, C.exitRed);
  }
}

function drawTreeSmall(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  // Trunk
  drawRect(ctx, ox + 14, oy + 22, 4, 8, C.trunk);
  drawRect(ctx, ox + 15, oy + 22, 2, 8, C.trunkDark);
  // Canopy (triangle-ish)
  for (let row = 0; row < 12; row++) {
    const halfW = Math.round(row * 0.7) + 1;
    const shade = row < 4 ? C.leavesHighlight : (row < 9 ? C.leavesLight : C.leavesDark);
    drawRect(ctx, ox + 16 - halfW, oy + 8 + row, halfW * 2, 1, shade);
  }
  // Shadow drop
  for (let x = 12; x < 20; x++) {
    setPixel(ctx, ox + x, oy + TILE - 2, 'rgba(0,0,0,0.3)');
  }
  addDepthShadow(ctx, ox, oy);
}

function drawTreeLarge(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassDark);
  addGrassTexture(ctx, ox, oy, C.grassDark);
  // Trunk (wider)
  drawRect(ctx, ox + 12, oy + 20, 8, 10, C.trunk);
  drawRect(ctx, ox + 13, oy + 20, 4, 10, C.trunkDark);
  // Layered canopy
  for (let row = 0; row < 18; row++) {
    const halfW = Math.round(row * 0.75) + 1;
    const shade = row < 5 ? C.leavesHighlight : (row < 12 ? C.leavesLight : C.leavesDark);
    drawRect(ctx, ox + 16 - halfW, oy + 2 + row, halfW * 2, 1, shade);
  }
  // Dark underside
  for (let x = 8; x < 24; x++) {
    setPixel(ctx, ox + x, oy + 20, 'rgba(0,0,0,0.2)');
  }
  addDepthShadow(ctx, ox, oy);
}

function drawRockSmall(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  // Rock shape
  const cx = ox + 16, cy = oy + 18;
  fillCircle(ctx, cx, cy, 7, C.rockDark);
  fillCircle(ctx, cx - 1, cy - 1, 6, C.rockLight);
  // Highlight
  fillCircle(ctx, cx - 2, cy - 2, 3, hexToRgba(C.rockHighlight, 0.6));
  setPixel(ctx, cx - 2, cy - 3, C.rockHighlight);
  // Shadow at base
  for (let x = cx - 6; x <= cx + 6; x++) {
    setPixel(ctx, x, cy + 7, 'rgba(0,0,0,0.35)');
  }
  addDepthShadow(ctx, ox, oy);
}

function drawRockLarge(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassDark);
  addGrassTexture(ctx, ox, oy, C.grassDark);
  const cx = ox + 16, cy = oy + 18;
  // Two rocks clustered
  fillCircle(ctx, cx - 3, cy, 8, C.rockDark);
  fillCircle(ctx, cx - 4, cy - 1, 7, C.rockLight);
  fillCircle(ctx, cx + 4, cy + 2, 6, C.rockDark);
  fillCircle(ctx, cx + 3, cy + 1, 5, hexToRgba(C.rockLight, 0.9));
  // Highlights
  fillCircle(ctx, cx - 5, cy - 2, 3, hexToRgba(C.rockHighlight, 0.5));
  fillCircle(ctx, cx + 2, cy, 2, hexToRgba(C.rockHighlight, 0.5));
  // Shadow
  for (let x = cx - 9; x <= cx + 9; x++) {
    setPixel(ctx, x, cy + 8, 'rgba(0,0,0,0.35)');
  }
  addDepthShadow(ctx, ox, oy);
}

function drawBush(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  const cx = ox + 16, cy = oy + 20;
  // Three overlapping blobs
  fillCircle(ctx, cx - 5, cy, 6, C.leavesDark);
  fillCircle(ctx, cx - 4, cy - 1, 5, C.leavesLight);
  fillCircle(ctx, cx + 4, cy, 6, C.leavesDark);
  fillCircle(ctx, cx + 3, cy - 1, 5, C.leavesLight);
  fillCircle(ctx, cx, cy - 4, 5, C.leavesHighlight);
  // Shadow
  for (let x = cx - 8; x <= cx + 8; x++) {
    setPixel(ctx, x, cy + 6, 'rgba(0,0,0,0.25)');
  }
  addDepthShadow(ctx, ox, oy);
}

function drawFlowers(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  // Scatter flower dots
  const positions = [
    { x: 8, y: 10, c: C.flowerPink }, { x: 14, y: 16, c: C.flowerYellow },
    { x: 20, y: 10, c: C.flowerPink }, { x: 24, y: 19, c: C.flowerYellow },
    { x: 6, y: 20, c: C.flowerYellow }, { x: 18, y: 23, c: C.flowerPink },
    { x: 26, y: 13, c: C.flowerPink },
  ];
  for (const p of positions) {
    fillCircle(ctx, ox + p.x, oy + p.y, 2, p.c);
    setPixel(ctx, ox + p.x, oy + p.y, '#fff');
  }
  addDepthShadow(ctx, ox, oy);
}

function drawPlacementPoint(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  const cx = ox + 16, cy = oy + 16;
  // Outer gold ring
  for (let r = 11; r >= 9; r--) {
    fillCircle(ctx, cx, cy, r, hexToRgba(C.goldDark, 0.25 + (11 - r) * 0.1));
  }
  // Gold circle
  for (let r = 8; r >= 5; r--) {
    fillCircle(ctx, cx, cy, r, hexToRgba(C.goldLight, 0.15 * (9 - r)));
  }
  fillCircle(ctx, cx, cy, 5, hexToRgba(C.goldDark, 0.6));
  fillCircle(ctx, cx, cy, 4, hexToRgba(C.goldLight, 0.8));
  fillCircle(ctx, cx, cy, 2, '#fff');
  addDepthShadow(ctx, ox, oy);
}

function drawWater(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.waterDeep);
  // Ripple lines
  for (let row = 4; row < TILE; row += 6) {
    for (let x = 2; x < TILE - 2; x += 4) {
      setPixel(ctx, ox + x, oy + row, hexToRgba(C.waterHighlight, 0.5));
      setPixel(ctx, ox + x + 1, oy + row, hexToRgba(C.waterHighlight, 0.3));
    }
  }
  // Shallow water top highlight
  drawRect(ctx, ox, oy, TILE, 3, hexToRgba(C.waterShallow, 0.4));
  addDepthShadow(ctx, ox, oy);
}

function drawBridgeH(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  // Water sides
  drawRect(ctx, ox, oy, TILE, 8, C.waterDeep);
  drawRect(ctx, ox, oy + TILE - 8, TILE, 8, C.waterDeep);
  // Bridge planks
  drawRect(ctx, ox, oy + 8, TILE, TILE - 16, C.bridgeWood);
  for (let x = 0; x < TILE; x += 4) {
    drawRect(ctx, ox + x, oy + 8, 3, TILE - 16, C.bridgePlank);
    drawRect(ctx, ox + x + 1, oy + 9, 1, TILE - 18, hexToRgba('#fff', 0.15));
  }
  // Rails
  drawRect(ctx, ox, oy + 8, TILE, 2, C.bridgeRail);
  drawRect(ctx, ox, oy + TILE - 10, TILE, 2, C.bridgeRail);
  addDepthShadow(ctx, ox, oy);
}

function drawBridgeV(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  // Water sides
  drawRect(ctx, ox, oy, 8, TILE, C.waterDeep);
  drawRect(ctx, ox + TILE - 8, oy, 8, TILE, C.waterDeep);
  // Bridge planks
  drawRect(ctx, ox + 8, oy, TILE - 16, TILE, C.bridgeWood);
  for (let y = 0; y < TILE; y += 4) {
    drawRect(ctx, ox + 8, oy + y, TILE - 16, 3, C.bridgePlank);
    drawRect(ctx, ox + 9, oy + y + 1, TILE - 18, 1, hexToRgba('#fff', 0.15));
  }
  // Rails
  drawRect(ctx, ox + 8, oy, 2, TILE, C.bridgeRail);
  drawRect(ctx, ox + TILE - 10, oy, 2, TILE, C.bridgeRail);
  addDepthShadow(ctx, ox, oy);
}

// Edge tiles — grass meets path
function drawEdgeN(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  // Bottom half is dirt
  drawRect(ctx, ox, oy + TILE / 2, TILE, TILE / 2, C.dirt);
  addDirtTexture(ctx, ox, oy + TILE / 2);
  // Transition row with feathering
  for (let x = 0; x < TILE; x++) {
    setPixel(ctx, ox + x, oy + TILE / 2 - 1, hexToRgba(C.dirtDark, 0.5));
    setPixel(ctx, ox + x, oy + TILE / 2, hexToRgba(C.grassShadow, 0.4));
  }
  addDepthShadow(ctx, ox, oy);
}

function drawEdgeS(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  // Top half is dirt
  drawRect(ctx, ox, oy, TILE, TILE / 2, C.dirt);
  addDirtTexture(ctx, ox, oy);
  // Transition
  for (let x = 0; x < TILE; x++) {
    setPixel(ctx, ox + x, oy + TILE / 2 - 1, hexToRgba(C.grassShadow, 0.4));
    setPixel(ctx, ox + x, oy + TILE / 2, hexToRgba(C.dirtDark, 0.5));
  }
  addDepthShadow(ctx, ox, oy);
}

function drawEdgeE(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  // Left half is dirt
  drawRect(ctx, ox, oy, TILE / 2, TILE, C.dirt);
  addDirtTexture(ctx, ox, oy);
  // Transition
  for (let y = 0; y < TILE; y++) {
    setPixel(ctx, ox + TILE / 2 - 1, oy + y, hexToRgba(C.grassShadow, 0.4));
    setPixel(ctx, ox + TILE / 2, oy + y, hexToRgba(C.dirtDark, 0.5));
  }
  addDepthShadow(ctx, ox, oy);
}

function drawEdgeW(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number): void {
  drawRect(ctx, ox, oy, TILE, TILE, C.grassLight);
  addGrassTexture(ctx, ox, oy, C.grassLight);
  // Right half is dirt
  drawRect(ctx, ox, oy + 0, TILE / 2, TILE, C.grassLight);
  drawRect(ctx, ox + TILE / 2, oy, TILE / 2, TILE, C.dirt);
  addDirtTexture(ctx, ox + TILE / 2, oy);
  // Transition
  for (let y = 0; y < TILE; y++) {
    setPixel(ctx, ox + TILE / 2 - 1, oy + y, hexToRgba(C.dirtDark, 0.5));
    setPixel(ctx, ox + TILE / 2, oy + y, hexToRgba(C.grassShadow, 0.4));
  }
  addDepthShadow(ctx, ox, oy);
}

// Map index → draw function
const TILE_DRAWERS: Array<(ctx: ReturnType<typeof makeCanvas>['ctx'], ox: number, oy: number) => void> = [
  drawGrassLight,                                    // 0: grass-light
  drawGrassDark,                                     // 1: grass-dark
  drawPathH,                                         // 2: path-h
  drawPathV,                                         // 3: path-v
  (c, ox, oy) => drawPathCorner(c, ox, oy, 'ne'),   // 4: path-corner-ne
  (c, ox, oy) => drawPathCorner(c, ox, oy, 'nw'),   // 5: path-corner-nw
  (c, ox, oy) => drawPathCorner(c, ox, oy, 'se'),   // 6: path-corner-se
  (c, ox, oy) => drawPathCorner(c, ox, oy, 'sw'),   // 7: path-corner-sw
  drawPathSpawn,                                     // 8: path-spawn
  drawPathExit,                                      // 9: path-exit
  drawTreeSmall,                                     // 10: tree-small
  drawTreeLarge,                                     // 11: tree-large
  drawRockSmall,                                     // 12: rock-small
  drawRockLarge,                                     // 13: rock-large
  drawBush,                                          // 14: bush
  drawFlowers,                                       // 15: flowers
  drawPlacementPoint,                                // 16: placement-point
  drawWater,                                         // 17: water
  drawBridgeH,                                       // 18: bridge-h
  drawBridgeV,                                       // 19: bridge-v
  drawEdgeN,                                         // 20: edge-n
  drawEdgeS,                                         // 21: edge-s
  drawEdgeE,                                         // 22: edge-e
  drawEdgeW,                                         // 23: edge-w
];

export async function generateTileset(): Promise<ManifestEntry[]> {
  const totalTiles = TILESET_COLS * TILESET_ROWS; // 24
  const canvasW = TILESET_COLS * TILE; // 256
  const canvasH = TILESET_ROWS * TILE; // 96

  const { canvas, ctx } = makeCanvas(canvasW, canvasH);

  for (let idx = 0; idx < totalTiles; idx++) {
    const col = idx % TILESET_COLS;
    const row = Math.floor(idx / TILESET_COLS);
    const ox = col * TILE;
    const oy = row * TILE;
    const drawer = TILE_DRAWERS[idx];
    if (drawer) {
      drawer(ctx, ox, oy);
    }
  }

  saveCanvas(canvas, OUTPUT_PATH);

  return [{
    key: 'tileset',
    type: 'spritesheet',
    path: 'assets/tileset.png',
    frameWidth: TILE,
    frameHeight: TILE,
    frameCount: totalTiles,
  }];
}

if (import.meta.main) {
  generateTileset().then(e => console.log(JSON.stringify(e, null, 2)));
}
