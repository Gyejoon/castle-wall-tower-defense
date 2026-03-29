import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/projectiles';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // laser-beam.png (32x8)
  {
    const { canvas, ctx } = makeCanvas(32, 8);
    // Gold beam body
    drawRect(ctx, 0, 2, 32, 4, PALETTE.gold);
    // White core line
    drawRect(ctx, 0, 3, 32, 2, PALETTE.white);
    // Lighter gold glow edges
    drawRect(ctx, 0, 1, 32, 1, hexToRgba(PALETTE.gold, 0.4));
    drawRect(ctx, 0, 6, 32, 1, hexToRgba(PALETTE.gold, 0.4));
    drawRect(ctx, 0, 0, 32, 1, hexToRgba(PALETTE.gold, 0.15));
    drawRect(ctx, 0, 7, 32, 1, hexToRgba(PALETTE.gold, 0.15));
    saveCanvas(canvas, `${OUTPUT_DIR}/laser-beam.png`);
    entries.push({ key: 'projectile-laser-beam', type: 'image', path: 'assets/projectiles/laser-beam.png' });
  }

  // plasma-bolt.png (16x16)
  {
    const { canvas, ctx } = makeCanvas(16, 16);
    const cx = 8, cy = 8;
    // Soft radial glow halo
    addGlow(ctx, cx, cy, 7, PALETTE.green, 0.5);
    // Green energy ball
    fillCircle(ctx, cx, cy, 4, PALETTE.green);
    fillCircle(ctx, cx, cy, 2, hexToRgba(PALETTE.white, 0.7));
    // White center pixel
    setPixel(ctx, cx, cy, PALETTE.white);
    saveCanvas(canvas, `${OUTPUT_DIR}/plasma-bolt.png`);
    entries.push({ key: 'projectile-plasma-bolt', type: 'image', path: 'assets/projectiles/plasma-bolt.png' });
  }

  // emp-pulse.png (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    // Purple ring, 2px thick, 12px radius
    drawCircle(ctx, cx, cy, 12, PALETTE.purple);
    drawCircle(ctx, cx, cy, 11, PALETTE.purple);
    // Slight inner glow
    addGlow(ctx, cx, cy, 10, PALETTE.purple, 0.2);
    saveCanvas(canvas, `${OUTPUT_DIR}/emp-pulse.png`);
    entries.push({ key: 'projectile-emp-pulse', type: 'image', path: 'assets/projectiles/emp-pulse.png' });
  }

  // hit-flash.png (64x16, 4 frames at 16x16)
  {
    const { canvas, ctx } = makeCanvas(64, 16);
    const cy = 8;

    // Frame 0: White cross/star burst
    let ox = 0;
    drawLine(ctx, ox + 8, cy - 5, ox + 8, cy + 5, PALETTE.white);
    drawLine(ctx, ox + 3, cy, ox + 13, cy, PALETTE.white);
    drawLine(ctx, ox + 5, cy - 3, ox + 11, cy + 3, PALETTE.white);
    drawLine(ctx, ox + 11, cy - 3, ox + 5, cy + 3, PALETTE.white);

    // Frame 1: Expanding ring
    ox = 16;
    drawCircle(ctx, ox + 8, cy, 5, PALETTE.white);

    // Frame 2: Ring + fading sparks
    ox = 32;
    drawCircle(ctx, ox + 8, cy, 6, hexToRgba(PALETTE.white, 0.7));
    setPixel(ctx, ox + 2, cy - 4, hexToRgba(PALETTE.white, 0.5));
    setPixel(ctx, ox + 14, cy + 3, hexToRgba(PALETTE.white, 0.5));
    setPixel(ctx, ox + 4, cy + 5, hexToRgba(PALETTE.white, 0.4));

    // Frame 3: Sparse sparks
    ox = 48;
    setPixel(ctx, ox + 3, cy - 3, hexToRgba(PALETTE.white, 0.3));
    setPixel(ctx, ox + 12, cy + 2, hexToRgba(PALETTE.white, 0.3));
    setPixel(ctx, ox + 6, cy + 5, hexToRgba(PALETTE.white, 0.2));
    setPixel(ctx, ox + 10, cy - 4, hexToRgba(PALETTE.white, 0.2));

    saveCanvas(canvas, `${OUTPUT_DIR}/hit-flash.png`);
    entries.push({
      key: 'projectile-hit-flash',
      type: 'spritesheet',
      path: 'assets/projectiles/hit-flash.png',
      frameWidth: 16,
      frameHeight: 16,
      frameCount: 4,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
