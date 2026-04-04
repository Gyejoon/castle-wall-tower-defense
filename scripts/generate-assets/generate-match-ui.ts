/**
 * @deprecated Batch 0 — PVP match UI. Will be replaced by generate-result-ui.ts in Batch 1.
 * PVE에서 재사용 가능한 에셋: victory-confetti
 * 폐기 대상: match-draw, ghost-avatar, stat-icons, pressure-attack-effect, ghost-spawn
 */
import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // match-victory.png (128x64) — Victory banner with gold glow
  {
    const { canvas, ctx } = makeCanvas(128, 64);
    // Dark background
    drawRect(ctx, 0, 0, 128, 64, PALETTE.dark);
    // Gold border
    drawRect(ctx, 0, 0, 128, 2, PALETTE.gold);
    drawRect(ctx, 0, 62, 128, 2, PALETTE.gold);
    drawRect(ctx, 0, 0, 2, 64, PALETTE.gold);
    drawRect(ctx, 126, 0, 2, 64, PALETTE.gold);
    // Gold glow at center
    addGlow(ctx, 64, 32, 24, PALETTE.gold, 0.3);
    // "V" shape as victory symbol
    const vc = 64, vy = 32;
    drawLine(ctx, vc - 16, vy - 12, vc, vy + 8, PALETTE.gold);
    drawLine(ctx, vc + 16, vy - 12, vc, vy + 8, PALETTE.gold);
    drawLine(ctx, vc - 15, vy - 12, vc + 1, vy + 8, PALETTE.gold);
    drawLine(ctx, vc + 15, vy - 12, vc - 1, vy + 8, PALETTE.gold);
    // Star above the V
    fillCircle(ctx, vc, vy - 16, 3, PALETTE.gold);
    setPixel(ctx, vc, vy - 20, PALETTE.white);

    saveCanvas(canvas, `${OUTPUT_DIR}/match-victory.png`);
    entries.push({ key: 'ui-match-victory', type: 'image', path: 'assets/ui/match-victory.png' });
  }

  // match-defeat.png (128x64) — Defeat banner, subdued pink/red
  {
    const { canvas, ctx } = makeCanvas(128, 64);
    drawRect(ctx, 0, 0, 128, 64, PALETTE.dark);
    // Subdued pink border
    drawRect(ctx, 0, 0, 128, 2, hexToRgba(PALETTE.pink, 0.6));
    drawRect(ctx, 0, 62, 128, 2, hexToRgba(PALETTE.pink, 0.6));
    drawRect(ctx, 0, 0, 2, 64, hexToRgba(PALETTE.pink, 0.6));
    drawRect(ctx, 126, 0, 2, 64, hexToRgba(PALETTE.pink, 0.6));
    // X mark as defeat symbol
    const dc = 64, dy = 32;
    drawLine(ctx, dc - 12, dy - 12, dc + 12, dy + 12, PALETTE.pink);
    drawLine(ctx, dc + 12, dy - 12, dc - 12, dy + 12, PALETTE.pink);
    drawLine(ctx, dc - 11, dy - 12, dc + 13, dy + 12, PALETTE.pink);
    drawLine(ctx, dc + 13, dy - 12, dc - 11, dy + 12, PALETTE.pink);

    saveCanvas(canvas, `${OUTPUT_DIR}/match-defeat.png`);
    entries.push({ key: 'ui-match-defeat', type: 'image', path: 'assets/ui/match-defeat.png' });
  }

  // match-draw.png (128x64) — Draw banner, gray
  {
    const { canvas, ctx } = makeCanvas(128, 64);
    drawRect(ctx, 0, 0, 128, 64, PALETTE.dark);
    // Gray border
    drawRect(ctx, 0, 0, 128, 2, PALETTE.gray);
    drawRect(ctx, 0, 62, 128, 2, PALETTE.gray);
    drawRect(ctx, 0, 0, 2, 64, PALETTE.gray);
    drawRect(ctx, 126, 0, 2, 64, PALETTE.gray);
    // Equals sign as draw symbol
    const ec = 64, ey = 32;
    drawRect(ctx, ec - 12, ey - 5, 24, 3, PALETTE.gray);
    drawRect(ctx, ec - 12, ey + 3, 24, 3, PALETTE.gray);

    saveCanvas(canvas, `${OUTPUT_DIR}/match-draw.png`);
    entries.push({ key: 'ui-match-draw', type: 'image', path: 'assets/ui/match-draw.png' });
  }

  // ghost-avatar.png (32x32) — Ghost shape
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 14;
    const color = hexToRgba(PALETTE.white, 0.9);

    // Rounded top (head)
    fillCircle(ctx, cx, cy, 9, color);
    // Body rectangle
    drawRect(ctx, cx - 9, cy, 19, 10, color);
    // Wavy bottom edge
    for (let x = cx - 9; x <= cx + 9; x++) {
      const wave = Math.sin((x - (cx - 9)) * Math.PI / 6) * 3;
      const bottomY = cy + 10 + Math.round(wave);
      // Fill from body to wave
      for (let y = cy + 10; y <= bottomY; y++) {
        setPixel(ctx, x, y, color);
      }
      // Clear below wave for transparency
      for (let y = bottomY + 1; y < 32; y++) {
        setPixel(ctx, x, y, 'rgba(0,0,0,0)');
      }
    }
    // Clear below the wavy part that should be transparent
    for (let x = cx - 9; x <= cx + 9; x++) {
      const wave = Math.sin((x - (cx - 9)) * Math.PI / 6) * 3;
      const bottomY = cy + 10 + Math.round(wave);
      for (let y = Math.min(bottomY, cy + 10); y < cy + 10; y++) {
        // Already filled by drawRect, keep it
      }
    }

    // Eyes
    fillCircle(ctx, cx - 4, cy - 1, 2, PALETTE.dark);
    fillCircle(ctx, cx + 4, cy - 1, 2, PALETTE.dark);
    // Mouth
    setPixel(ctx, cx - 2, cy + 3, PALETTE.dark);
    setPixel(ctx, cx + 2, cy + 3, PALETTE.dark);
    setPixel(ctx, cx - 1, cy + 4, PALETTE.dark);
    setPixel(ctx, cx, cy + 4, PALETTE.dark);
    setPixel(ctx, cx + 1, cy + 4, PALETTE.dark);

    saveCanvas(canvas, `${OUTPUT_DIR}/ghost-avatar.png`);
    entries.push({ key: 'ui-ghost-avatar', type: 'image', path: 'assets/ui/ghost-avatar.png' });
  }

  // stat-icons.png (96x16) — 3 stat icons (16x16 each): wave, gold, pressure
  {
    const { canvas, ctx } = makeCanvas(96, 16);

    // Icon 1: Wave/lightning bolt (0-15)
    {
      const ox = 0;
      const color = PALETTE.cyan;
      drawLine(ctx, ox + 9, 2, ox + 6, 7, color);
      drawLine(ctx, ox + 6, 7, ox + 10, 7, color);
      drawLine(ctx, ox + 10, 7, ox + 7, 13, color);
      // Thicken
      drawLine(ctx, ox + 10, 2, ox + 7, 7, color);
      drawLine(ctx, ox + 11, 7, ox + 8, 13, color);
    }

    // Icon 2: Gold/coin circle (16-31)
    {
      const ox = 16;
      const cx = ox + 8, cy = 8;
      fillCircle(ctx, cx, cy, 5, PALETTE.gold);
      drawCircle(ctx, cx, cy, 5, PALETTE.gold);
      setPixel(ctx, cx, cy - 2, PALETTE.dark);
      setPixel(ctx, cx, cy, PALETTE.dark);
      setPixel(ctx, cx, cy + 2, PALETTE.dark);
    }

    // Icon 3: Pressure/arrow (32-47)
    {
      const ox = 32;
      const cx = ox + 8, cy = 8;
      const color = PALETTE.pink;
      // Upward arrow
      drawLine(ctx, cx, 2, cx - 4, 7, color);
      drawLine(ctx, cx, 2, cx + 4, 7, color);
      drawRect(ctx, cx - 1, 7, 3, 7, color);
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/stat-icons.png`);
    entries.push({
      key: 'ui-stat-icons',
      type: 'spritesheet',
      path: 'assets/ui/stat-icons.png',
      frameWidth: 16,
      frameHeight: 16,
      // Note: only 3 icons but strip is 96 wide (6 slots), explicitly 3 used frames
      frameCount: 3,
    });
  }

  // pressure-attack-effect.png (128x32, 4-frame spritesheet) — Pink expanding burst
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    const cy = 16;

    // Frame 0: Small pink dot
    fillCircle(ctx, 16, cy, 3, PALETTE.pink);
    setPixel(ctx, 16, cy, PALETTE.white);

    // Frame 1: Expanding ring
    fillCircle(ctx, 48, cy, 5, hexToRgba(PALETTE.pink, 0.6));
    drawCircle(ctx, 48, cy, 7, PALETTE.pink);

    // Frame 2: Larger burst
    drawCircle(ctx, 80, cy, 10, PALETTE.pink);
    drawCircle(ctx, 80, cy, 8, hexToRgba(PALETTE.pink, 0.5));
    fillCircle(ctx, 80, cy, 4, hexToRgba(PALETTE.pink, 0.3));
    // Spark particles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      setPixel(ctx, Math.round(80 + 12 * Math.cos(angle)), Math.round(cy + 12 * Math.sin(angle)), PALETTE.white);
    }

    // Frame 3: Fading ring
    drawCircle(ctx, 112, cy, 13, hexToRgba(PALETTE.pink, 0.3));
    drawCircle(ctx, 112, cy, 11, hexToRgba(PALETTE.pink, 0.15));

    saveCanvas(canvas, `${OUTPUT_DIR}/pressure-attack-effect.png`);
    entries.push({
      key: 'ui-pressure-attack-effect',
      type: 'spritesheet',
      path: 'assets/ui/pressure-attack-effect.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
  }

  // ghost-spawn.png (128x32, 4-frame spritesheet) — White/transparent swirl
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    const cy = 16;

    // Frame 0: Tiny white dot
    fillCircle(ctx, 16, cy, 2, hexToRgba(PALETTE.white, 0.7));

    // Frame 1: Small swirl ring forming
    drawCircle(ctx, 48, cy, 5, hexToRgba(PALETTE.white, 0.6));
    setPixel(ctx, 48 + 4, cy - 3, hexToRgba(PALETTE.white, 0.8));
    setPixel(ctx, 48 - 4, cy + 3, hexToRgba(PALETTE.white, 0.8));

    // Frame 2: Full swirl with rotation hint
    drawCircle(ctx, 80, cy, 9, hexToRgba(PALETTE.white, 0.5));
    drawCircle(ctx, 80, cy, 7, hexToRgba(PALETTE.white, 0.3));
    addGlow(ctx, 80, cy, 5, PALETTE.white, 0.2);
    // Swirl arc highlights
    for (let a = 0; a < 120; a += 8) {
      const rad = (a * Math.PI) / 180;
      setPixel(ctx, Math.round(80 + 8 * Math.cos(rad)), Math.round(cy + 8 * Math.sin(rad)), hexToRgba(PALETTE.white, 0.9));
    }

    // Frame 3: Dissipating
    drawCircle(ctx, 112, cy, 11, hexToRgba(PALETTE.white, 0.25));
    drawCircle(ctx, 112, cy, 8, hexToRgba(PALETTE.white, 0.15));
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const dist = 6 + (i * 13 % 5);
      setPixel(ctx, Math.round(112 + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), hexToRgba(PALETTE.white, 0.2));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/ghost-spawn.png`);
    entries.push({
      key: 'ui-ghost-spawn',
      type: 'spritesheet',
      path: 'assets/ui/ghost-spawn.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
  }

  // victory-confetti.png (128x64, 4-frame spritesheet) — Colorful dots, each frame 32x64
  {
    const { canvas, ctx } = makeCanvas(128, 64);
    const confettiColors = [PALETTE.gold, PALETTE.cyan, PALETTE.pink, PALETTE.green, PALETTE.purple, PALETTE.white];

    // Seed-based pseudo-random for deterministic output
    let seed = 42;
    function nextRand(): number {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return seed / 0x7fffffff;
    }

    for (let frame = 0; frame < 4; frame++) {
      const ox = frame * 32;
      const particleCount = 18 + frame * 4;
      for (let i = 0; i < particleCount; i++) {
        const px = ox + Math.round(nextRand() * 30) + 1;
        const py = Math.round(nextRand() * 58) + 3;
        const colorIdx = Math.floor(nextRand() * confettiColors.length);
        const color = confettiColors[colorIdx];
        // Some particles are 1px, some are 2px
        if (nextRand() > 0.5) {
          setPixel(ctx, px, py, color);
        } else {
          drawRect(ctx, px, py, 2, 2, color);
        }
      }
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/victory-confetti.png`);
    entries.push({
      key: 'ui-victory-confetti',
      type: 'spritesheet',
      path: 'assets/ui/victory-confetti.png',
      frameWidth: 32,
      frameHeight: 64,
      frameCount: 4,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
