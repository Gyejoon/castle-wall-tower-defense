import { afterAll, describe, test, expect } from 'bun:test';
import mapJson from '../../../packages/web-shell/public/assets/maps/forest-gate.json';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  nearestNeighborResize,
  applyPaletteMapping,
  assembleSpritesheetFromFrames,
  composeRuntimeTileset,
} from '../ai-post-process';
import { TILESET_COLS, TILESET_ROWS } from '../generate-tileset';

const tempRoot = mkdtempSync(join(tmpdir(), 'ai-post-process-'));

afterAll(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

describe('nearestNeighborResize', () => {
  test('downscales 4x4 to 2x2 using nearest neighbor', () => {
    const src = createCanvas(4, 4);
    const ctx = src.getContext('2d');

    // Top-left quadrant red, rest green
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 2, 2);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(2, 0, 2, 2);
    ctx.fillRect(0, 2, 4, 2);

    const { canvas, ctx: resizedCtx } = nearestNeighborResize(ctx, 4, 4, 2, 2);

    expect(canvas.width).toBe(2);
    expect(canvas.height).toBe(2);

    const data = resizedCtx.getImageData(0, 0, 2, 2).data;
    // Top-left should be red
    expect(data[0]).toBe(255); // R
    expect(data[1]).toBe(0);   // G
    expect(data[2]).toBe(0);   // B
    // Top-right should be green
    expect(data[4]).toBe(0);
    expect(data[5]).toBeGreaterThan(200);
  });

  test('preserves dimensions when source equals target', () => {
    const src = createCanvas(32, 32);
    const ctx = src.getContext('2d');
    ctx.fillStyle = '#aabbcc';
    ctx.fillRect(0, 0, 32, 32);

    const { canvas } = nearestNeighborResize(ctx, 32, 32, 32, 32);
    expect(canvas.width).toBe(32);
    expect(canvas.height).toBe(32);
  });
});

describe('applyPaletteMapping', () => {
  test('maps colors to nearest palette color', () => {
    const canvas = createCanvas(2, 2);
    const ctx = canvas.getContext('2d');

    // Fill with a color close to gridDark (#5a8a30)
    ctx.fillStyle = '#5b8b31';
    ctx.fillRect(0, 0, 2, 2);

    applyPaletteMapping(ctx, 2, 2, false);

    const data = ctx.getImageData(0, 0, 2, 2).data;
    // Should be mapped to gridDark (#5a8a30) = rgb(90,138,48)
    expect(data[0]).toBe(0x5a);
    expect(data[1]).toBe(0x8a);
    expect(data[2]).toBe(0x30);
    expect(data[3]).toBe(255);
  });

  test('preserves transparent pixels', () => {
    const canvas = createCanvas(2, 2);
    const ctx = canvas.getContext('2d');
    // Canvas is transparent by default

    applyPaletteMapping(ctx, 2, 2, false);

    const data = ctx.getImageData(0, 0, 2, 2).data;
    expect(data[3]).toBe(0); // alpha should remain 0
  });

  test('applies Floyd-Steinberg dithering when enabled', () => {
    const canvas = createCanvas(4, 4);
    const ctx = canvas.getContext('2d');

    // Fill with a color between two palette entries
    ctx.fillStyle = '#6b9a3c';
    ctx.fillRect(0, 0, 4, 4);

    applyPaletteMapping(ctx, 4, 4, true);

    const data = ctx.getImageData(0, 0, 4, 4).data;
    // All pixels should be valid (opaque, palette colors)
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i + 3]).toBe(255);
    }
  });
});

describe('assembleSpritesheetFromFrames', () => {
  test('assembles 4 frames into horizontal strip', () => {
    const frames = [];
    for (let i = 0; i < 4; i++) {
      const frame = createCanvas(32, 32);
      const ctx = frame.getContext('2d');
      ctx.fillStyle = `rgb(${i * 60}, 0, 0)`;
      ctx.fillRect(0, 0, 32, 32);
      frames.push(frame);
    }

    const sheet = assembleSpritesheetFromFrames(frames, 32, 32);

    expect(sheet.width).toBe(128); // 4 * 32
    expect(sheet.height).toBe(32);

    const ctx = sheet.getContext('2d');
    const data = ctx.getImageData(0, 0, 128, 32).data;

    // First pixel of frame 0 should be rgb(0,0,0)
    expect(data[0]).toBe(0);
    // First pixel of frame 1 (at x=32) should be rgb(60,0,0)
    const frame1Idx = (0 * 128 + 32) * 4;
    expect(data[frame1Idx]).toBe(60);
  });

  test('handles single frame', () => {
    const frame = createCanvas(16, 16);
    const ctx = frame.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 16, 16);

    const sheet = assembleSpritesheetFromFrames([frame], 16, 16);
    expect(sheet.width).toBe(16);
    expect(sheet.height).toBe(16);
  });
});

describe('composeRuntimeTileset', () => {
  test('writes a runtime tileset that matches the existing Tiled map dimensions', async () => {
    const tilePaths = {
      gridFloor: join(tempRoot, 'grid-floor.png'),
      path: join(tempRoot, 'path-tile.png'),
      spawn: join(tempRoot, 'spawn-tile.png'),
      exit: join(tempRoot, 'exit-tile.png'),
    };

    const gridFloor = createCanvas(32, 32);
    const gridFloorCtx = gridFloor.getContext('2d');
    gridFloorCtx.fillStyle = '#112233';
    gridFloorCtx.fillRect(0, 0, 32, 32);
    writeFileSync(tilePaths.gridFloor, gridFloor.toBuffer('image/png'));

    const solidTile = (color: string) => {
      const canvas = createCanvas(32, 32);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 32, 32);
      return canvas;
    };

    writeFileSync(tilePaths.path, solidTile('#778899').toBuffer('image/png'));
    writeFileSync(tilePaths.spawn, solidTile('#aa5500').toBuffer('image/png'));
    writeFileSync(tilePaths.exit, solidTile('#00aa55').toBuffer('image/png'));

    const outputPath = join(tempRoot, 'tileset.png');
    await composeRuntimeTileset(tilePaths, outputPath);

    expect(existsSync(outputPath)).toBe(true);

    const output = await loadImage(outputPath);
    expect(output.width).toBe(TILESET_COLS * 32);
    expect(output.height).toBe(TILESET_ROWS * 32);

    const canvas = createCanvas(output.width, output.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(output, 0, 0);

    const firstGrass = ctx.getImageData(0, 0, 1, 1).data;
    expect(Array.from(firstGrass.slice(0, 3))).toEqual([0x11, 0x22, 0x33]);

    const secondGrass = ctx.getImageData(32, 0, 1, 1).data;
    expect(Array.from(secondGrass.slice(0, 3))).toEqual([0x11, 0x22, 0x33]);

    const spawnTile = ctx.getImageData((26 % TILESET_COLS) * 32, Math.floor(26 / TILESET_COLS) * 32, 1, 1).data;
    expect(Array.from(spawnTile.slice(0, 3))).toEqual([0xaa, 0x55, 0x00]);

    const exitTile = ctx.getImageData((27 % TILESET_COLS) * 32, Math.floor(27 / TILESET_COLS) * 32, 1, 1).data;
    expect(Array.from(exitTile.slice(0, 3))).toEqual([0x00, 0xaa, 0x55]);
  });

  test('fills every non-empty map gid with a non-transparent tile', async () => {
    const tilePaths = {
      gridFloor: join(tempRoot, 'coverage-grid-floor.png'),
      path: join(tempRoot, 'coverage-path-tile.png'),
      spawn: join(tempRoot, 'coverage-spawn-tile.png'),
      exit: join(tempRoot, 'coverage-exit-tile.png'),
    };

    const solidTile = (color: string) => {
      const canvas = createCanvas(32, 32);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 32, 32);
      return canvas;
    };

    writeFileSync(tilePaths.gridFloor, solidTile('#112233').toBuffer('image/png'));
    writeFileSync(tilePaths.path, solidTile('#445566').toBuffer('image/png'));
    writeFileSync(tilePaths.spawn, solidTile('#778899').toBuffer('image/png'));
    writeFileSync(tilePaths.exit, solidTile('#aabbcc').toBuffer('image/png'));

    const outputPath = join(tempRoot, 'coverage-tileset.png');
    await composeRuntimeTileset(tilePaths, outputPath);

    const output = await loadImage(outputPath);
    const canvas = createCanvas(output.width, output.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(output, 0, 0);

    const usedGids = new Set<number>();
    for (const layer of mapJson.layers) {
      if (layer.type !== 'tilelayer') continue;
      for (const gid of layer.data) {
        if (gid > 0) usedGids.add(gid);
      }
    }

    for (const gid of usedGids) {
      const index = gid - 1;
      const x = (index % mapJson.tilesets[0].columns) * mapJson.tilewidth;
      const y = Math.floor(index / mapJson.tilesets[0].columns) * mapJson.tileheight;
      const alpha = ctx.getImageData(x, y, 1, 1).data[3];
      expect(alpha).toBeGreaterThan(0);
    }
  });
});
