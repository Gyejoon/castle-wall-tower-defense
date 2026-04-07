/**
 * Generate pixel art icons for stage select UI.
 * - icon-energy: lightning bolt (replaces ⚡ emoji)
 * - icon-sword: crossed sword (replaces ⚔ emoji)
 */
import { makeCanvas, saveCanvas, setPixel, drawRect, PALETTE } from './shared';

const OUT = 'packages/web-shell/public/assets/ui';
const SIZE = 16; // small inline icon

function drawEnergyIcon() {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);

  // Lightning bolt shape (pixel art, gold palette)
  const bolt = [
    //  x, y
    [8, 1], [9, 1],
    [7, 2], [8, 2],
    [6, 3], [7, 3],
    [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
    [8, 5], [9, 5],
    [7, 6], [8, 6],
    [6, 7], [7, 7],
    [5, 8], [6, 8],
    [4, 9], [5, 9],
    [5, 10], [6, 10],
    [6, 11], [7, 11],
    [7, 12], [8, 12],
    [6, 13],
  ];

  // Shadow
  for (const [x, y] of bolt) {
    setPixel(ctx, x + 1, y + 1, PALETTE.shadow);
  }

  // Main bolt (gold)
  for (const [x, y] of bolt) {
    setPixel(ctx, x, y, PALETTE.gold);
  }

  // Highlight (top-left pixels brighter)
  setPixel(ctx, 8, 1, '#ffe89a');
  setPixel(ctx, 7, 2, '#ffe89a');

  saveCanvas(canvas, `${OUT}/icon-energy.png`);
}

function drawSwordIcon() {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);

  // Single sword pointing up-right (pixel art)
  // Blade
  const blade = [
    [10, 2], [11, 2],
    [9, 3], [10, 3],
    [8, 4], [9, 4],
    [7, 5], [8, 5],
    [6, 6], [7, 6],
    [5, 7], [6, 7],
  ];

  // Guard (cross-piece)
  const guard = [
    [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8],
  ];

  // Grip
  const grip = [
    [4, 9], [5, 9],
    [3, 10], [4, 10],
    [2, 11], [3, 11],
  ];

  // Pommel
  const pommel = [
    [1, 12], [2, 12],
  ];

  // Shadow layer
  for (const pixels of [blade, guard, grip, pommel]) {
    for (const [x, y] of pixels) {
      setPixel(ctx, x + 1, y + 1, PALETTE.shadow);
    }
  }

  // Blade — bright steel
  for (const [x, y] of blade) {
    setPixel(ctx, x, y, PALETTE.stoneLight);
  }
  // Blade highlight
  setPixel(ctx, 10, 2, PALETTE.white);
  setPixel(ctx, 11, 2, PALETTE.white);

  // Guard — gold
  for (const [x, y] of guard) {
    setPixel(ctx, x, y, PALETTE.gold);
  }

  // Grip — wood
  for (const [x, y] of grip) {
    setPixel(ctx, x, y, PALETTE.wood);
  }

  // Pommel — gold
  for (const [x, y] of pommel) {
    setPixel(ctx, x, y, PALETTE.gold);
  }

  saveCanvas(canvas, `${OUT}/icon-sword.png`);
}

function drawArrowLeftIcon() {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);

  // Left-pointing arrow (pixel art)
  const arrow = [
    [7, 4],
    [6, 5], [7, 5],
    [5, 6], [6, 6], [7, 6],
    [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7], [11, 7],
    [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8],
    [5, 9], [6, 9], [7, 9],
    [6, 10], [7, 10],
    [7, 11],
  ];

  for (const [x, y] of arrow) {
    setPixel(ctx, x + 1, y + 1, PALETTE.shadow);
  }
  for (const [x, y] of arrow) {
    setPixel(ctx, x, y, PALETTE.laser); // accent gold-brown
  }
  // Highlight
  setPixel(ctx, 4, 7, PALETTE.gold);
  setPixel(ctx, 4, 8, PALETTE.gold);

  saveCanvas(canvas, `${OUT}/icon-arrow-left.png`);
}

function drawEditIcon() {
  const { canvas, ctx } = makeCanvas(SIZE, SIZE);

  // Pencil icon (pixel art)
  // Pencil tip
  const tip = [
    [3, 12], [4, 12],
    [4, 11], [5, 11],
  ];
  // Pencil body
  const body = [
    [5, 10], [6, 10],
    [6, 9], [7, 9],
    [7, 8], [8, 8],
    [8, 7], [9, 7],
    [9, 6], [10, 6],
    [10, 5], [11, 5],
  ];
  // Eraser
  const eraser = [
    [11, 4], [12, 4],
    [12, 3], [13, 3],
  ];

  for (const pixels of [tip, body, eraser]) {
    for (const [x, y] of pixels) {
      setPixel(ctx, x + 1, y + 1, PALETTE.shadow);
    }
  }

  for (const [x, y] of tip) setPixel(ctx, x, y, PALETTE.gold);
  for (const [x, y] of body) setPixel(ctx, x, y, PALETTE.wood);
  for (const [x, y] of eraser) setPixel(ctx, x, y, PALETTE.stoneLight);

  // Highlight
  setPixel(ctx, 3, 12, '#ffe89a');

  saveCanvas(canvas, `${OUT}/icon-edit.png`);
}

console.log('Generating stage select icons...');
drawEnergyIcon();
drawSwordIcon();
drawArrowLeftIcon();
drawEditIcon();
console.log('Done.');
