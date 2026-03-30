import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/projectiles';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // laser-beam.png (32x8) — 화살
  {
    const { canvas, ctx } = makeCanvas(32, 8);
    // Arrow shaft (wood brown)
    drawRect(ctx, 4, 3, 22, 2, PALETTE.wood);
    drawRect(ctx, 4, 3, 22, 1, PALETTE.woodLight);
    // Arrowhead (metal)
    drawLine(ctx, 26, 4, 31, 4, PALETTE.stoneLight);
    setPixel(ctx, 30, 3, PALETTE.stoneLight);
    setPixel(ctx, 30, 5, PALETTE.stoneLight);
    setPixel(ctx, 31, 4, PALETTE.white);
    // Fletching (feathers)
    setPixel(ctx, 5, 1, '#c03020');
    setPixel(ctx, 6, 2, '#c03020');
    setPixel(ctx, 5, 6, '#c03020');
    setPixel(ctx, 6, 5, '#c03020');
    setPixel(ctx, 3, 1, hexToRgba('#c03020', 0.6));
    setPixel(ctx, 3, 6, hexToRgba('#c03020', 0.6));
    saveCanvas(canvas, `${OUTPUT_DIR}/laser-beam.png`);
    entries.push({ key: 'projectile-laser-beam', type: 'image', path: 'assets/projectiles/laser-beam.png' });
  }

  // plasma-bolt.png (16x16) — 둥근 돌 투사체
  {
    const { canvas, ctx } = makeCanvas(16, 16);
    const cx = 8, cy = 8;
    fillCircle(ctx, cx, cy, 5, PALETTE.stoneDark);
    fillCircle(ctx, cx, cy, 4, PALETTE.stone);
    // Top-left highlight
    setPixel(ctx, cx - 2, cy - 2, PALETTE.stoneLight);
    setPixel(ctx, cx - 1, cy - 3, PALETTE.stoneLight);
    // Bottom shadow
    fillCircle(ctx, cx + 1, cy + 1, 3, hexToRgba(PALETTE.stoneDark, 0.3));
    saveCanvas(canvas, `${OUTPUT_DIR}/plasma-bolt.png`);
    entries.push({ key: 'projectile-plasma-bolt', type: 'image', path: 'assets/projectiles/plasma-bolt.png' });
  }

  // emp-pulse.png (32x32) — 얼음 결정 파동
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    // Ice ring
    drawCircle(ctx, cx, cy, 12, PALETTE.iceGlow);
    drawCircle(ctx, cx, cy, 11, PALETTE.ice);
    // Inner frost glow
    addGlow(ctx, cx, cy, 10, PALETTE.iceGlow, 0.25);
    // Ice crystal sparkles
    setPixel(ctx, cx, cy - 12, PALETTE.white);
    setPixel(ctx, cx + 8, cy - 8, PALETTE.white);
    setPixel(ctx, cx - 8, cy + 8, PALETTE.white);
    saveCanvas(canvas, `${OUTPUT_DIR}/emp-pulse.png`);
    entries.push({ key: 'projectile-emp-pulse', type: 'image', path: 'assets/projectiles/emp-pulse.png' });
  }

  // hit-flash.png (64x16, 4 frames at 16x16) — 황금 빛 임팩트
  {
    const { canvas, ctx } = makeCanvas(64, 16);
    const cy = 8;

    // Frame 0: Golden cross/star burst
    let ox = 0;
    drawLine(ctx, ox + 8, cy - 5, ox + 8, cy + 5, PALETTE.gold);
    drawLine(ctx, ox + 3, cy, ox + 13, cy, PALETTE.gold);
    drawLine(ctx, ox + 5, cy - 3, ox + 11, cy + 3, PALETTE.gold);
    drawLine(ctx, ox + 11, cy - 3, ox + 5, cy + 3, PALETTE.gold);
    setPixel(ctx, ox + 8, cy, PALETTE.white);

    // Frame 1: Expanding golden ring
    ox = 16;
    drawCircle(ctx, ox + 8, cy, 5, PALETTE.gold);
    setPixel(ctx, ox + 8, cy, hexToRgba(PALETTE.gold, 0.5));

    // Frame 2: Fading ring + sparks
    ox = 32;
    drawCircle(ctx, ox + 8, cy, 6, hexToRgba(PALETTE.gold, 0.5));
    setPixel(ctx, ox + 2, cy - 4, hexToRgba(PALETTE.gold, 0.4));
    setPixel(ctx, ox + 14, cy + 3, hexToRgba(PALETTE.gold, 0.4));

    // Frame 3: Faint sparks
    ox = 48;
    setPixel(ctx, ox + 3, cy - 3, hexToRgba(PALETTE.gold, 0.25));
    setPixel(ctx, ox + 12, cy + 2, hexToRgba(PALETTE.gold, 0.25));
    setPixel(ctx, ox + 6, cy + 5, hexToRgba(PALETTE.gold, 0.15));

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
