import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/vfx';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // explosion-sm.png (128x32, 4 frames at 32x32)
  {
    const { canvas, ctx } = makeCanvas(128, 32);

    // Frame 0: White-hot center, orange ring
    let ox = 0, cx = 16, cy = 16;
    fillCircle(ctx, ox + cx, cy, 4, PALETTE.white);
    drawCircle(ctx, ox + cx, cy, 7, '#ff8c42');
    drawCircle(ctx, ox + cx, cy, 8, '#ff8c42');

    // Frame 1: Orange expanding, red edges
    ox = 32;
    fillCircle(ctx, ox + cx, cy, 6, '#ff8c42');
    fillCircle(ctx, ox + cx, cy, 3, hexToRgba(PALETTE.white, 0.7));
    drawCircle(ctx, ox + cx, cy, 9, PALETTE.pink);
    drawCircle(ctx, ox + cx, cy, 10, hexToRgba(PALETTE.pink, 0.5));

    // Frame 2: Red/dark orange, smoke beginning
    ox = 64;
    fillCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.pink, 0.6));
    fillCircle(ctx, ox + cx, cy, 5, hexToRgba('#ff8c42', 0.5));
    drawCircle(ctx, ox + cx, cy, 11, hexToRgba(PALETTE.gray, 0.4));

    // Frame 3: Gray smoke wisps fading
    ox = 96;
    fillCircle(ctx, ox + cx, cy, 6, hexToRgba(PALETTE.gray, 0.3));
    fillCircle(ctx, ox + cx, cy, 3, hexToRgba(PALETTE.gray, 0.2));
    setPixel(ctx, ox + cx - 4, cy - 5, hexToRgba(PALETTE.gray, 0.2));
    setPixel(ctx, ox + cx + 5, cy - 3, hexToRgba(PALETTE.gray, 0.15));

    saveCanvas(canvas, `${OUTPUT_DIR}/explosion-sm.png`);
    entries.push({
      key: 'vfx-explosion-sm',
      type: 'spritesheet',
      path: 'assets/vfx/explosion-sm.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
  }

  // explosion-lg.png (256x64, 4 frames at 64x64)
  {
    const { canvas, ctx } = makeCanvas(256, 64);

    // Frame 0: White-hot center, orange ring
    let ox = 0, cx = 32, cy = 32;
    fillCircle(ctx, ox + cx, cy, 8, PALETTE.white);
    addGlow(ctx, ox + cx, cy, 12, '#ff8c42', 0.6);
    drawCircle(ctx, ox + cx, cy, 15, '#ff8c42');
    drawCircle(ctx, ox + cx, cy, 16, '#ff8c42');
    // Shockwave ring
    drawCircle(ctx, ox + cx, cy, 20, hexToRgba(PALETTE.white, 0.4));

    // Frame 1: Orange expanding, red edges
    ox = 64;
    fillCircle(ctx, ox + cx, cy, 14, '#ff8c42');
    fillCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.white, 0.6));
    drawCircle(ctx, ox + cx, cy, 20, PALETTE.pink);
    drawCircle(ctx, ox + cx, cy, 22, hexToRgba(PALETTE.pink, 0.4));
    drawCircle(ctx, ox + cx, cy, 25, hexToRgba(PALETTE.white, 0.2));

    // Frame 2: Red/dark orange, smoke beginning
    ox = 128;
    fillCircle(ctx, ox + cx, cy, 18, hexToRgba(PALETTE.pink, 0.5));
    fillCircle(ctx, ox + cx, cy, 12, hexToRgba('#ff8c42', 0.4));
    drawCircle(ctx, ox + cx, cy, 24, hexToRgba(PALETTE.gray, 0.3));

    // Frame 3: Gray smoke wisps fading
    ox = 192;
    fillCircle(ctx, ox + cx, cy, 14, hexToRgba(PALETTE.gray, 0.25));
    fillCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.gray, 0.15));
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 10 + (i * 17 % 8);
      setPixel(ctx, Math.round(ox + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), hexToRgba(PALETTE.gray, 0.15));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/explosion-lg.png`);
    entries.push({
      key: 'vfx-explosion-lg',
      type: 'spritesheet',
      path: 'assets/vfx/explosion-lg.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 4,
    });
  }

  // shield-bubble.png (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    // Translucent cyan circle, 24px diameter (r=12)
    fillCircle(ctx, cx, cy, 12, hexToRgba(PALETTE.cyan, 0.2));
    // 80% opacity outline
    drawCircle(ctx, cx, cy, 12, hexToRgba(PALETTE.cyan, 0.8));
    // 1px bright white highlight arc (top-left quadrant)
    for (let a = 200; a < 280; a += 5) {
      const rad = (a * Math.PI) / 180;
      const px = Math.round(cx + 11 * Math.cos(rad));
      const py = Math.round(cy + 11 * Math.sin(rad));
      setPixel(ctx, px, py, hexToRgba(PALETTE.white, 0.7));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/shield-bubble.png`);
    entries.push({ key: 'vfx-shield-bubble', type: 'image', path: 'assets/vfx/shield-bubble.png' });
  }

  // spawn-portal.png (128x32, 4 frames at 32x32)
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    const cy = 16;

    // Frame 0: Small green dot at center
    let ox = 0, cx = 16;
    fillCircle(ctx, ox + cx, cy, 2, PALETTE.green);
    setPixel(ctx, ox + cx, cy, PALETTE.white);

    // Frame 1: Swirling ring forming
    ox = 32;
    drawCircle(ctx, ox + cx, cy, 6, PALETTE.green);
    fillCircle(ctx, ox + cx, cy, 2, hexToRgba(PALETTE.green, 0.5));
    // Swirl hints
    setPixel(ctx, ox + cx + 5, cy - 3, hexToRgba(PALETTE.white, 0.5));
    setPixel(ctx, ox + cx - 5, cy + 3, hexToRgba(PALETTE.white, 0.5));

    // Frame 2: Full portal ring, particle sparks
    ox = 64;
    drawCircle(ctx, ox + cx, cy, 10, PALETTE.green);
    drawCircle(ctx, ox + cx, cy, 9, hexToRgba(PALETTE.green, 0.6));
    addGlow(ctx, ox + cx, cy, 6, PALETTE.green, 0.3);
    // Sparks
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      setPixel(ctx, Math.round(ox + cx + 11 * Math.cos(angle)), Math.round(cy + 11 * Math.sin(angle)), PALETTE.white);
    }

    // Frame 3: Portal active, subtle rotation hint
    ox = 96;
    drawCircle(ctx, ox + cx, cy, 10, PALETTE.green);
    drawCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.green, 0.4));
    addGlow(ctx, ox + cx, cy, 7, PALETTE.green, 0.4);
    // Rotation hint - brighter arc on one side
    for (let a = 0; a < 90; a += 5) {
      const rad = (a * Math.PI) / 180;
      setPixel(ctx, Math.round(ox + cx + 10 * Math.cos(rad)), Math.round(cy + 10 * Math.sin(rad)), hexToRgba(PALETTE.white, 0.5));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-portal.png`);
    entries.push({
      key: 'vfx-spawn-portal',
      type: 'spritesheet',
      path: 'assets/vfx/spawn-portal.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
