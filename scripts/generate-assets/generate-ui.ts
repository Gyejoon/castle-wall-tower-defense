import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, drawStar, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // tower-icons.png (128x32, 4 icons at 32x32)
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    const towerDefs = [
      { color: PALETTE.laser, shape: 'diamond' as const },
      { color: PALETTE.plasma, shape: 'hexagon' as const },
      { color: PALETTE.emp, shape: 'circle' as const },
      { color: PALETTE.shield, shape: 'shield' as const },
    ];

    towerDefs.forEach((t, i) => {
      const ox = i * 32;
      const cx = ox + 16, cy = 16;
      switch (t.shape) {
        case 'diamond':
          drawLine(ctx, cx, cy - 8, cx + 8, cy, t.color);
          drawLine(ctx, cx + 8, cy, cx, cy + 8, t.color);
          drawLine(ctx, cx, cy + 8, cx - 8, cy, t.color);
          drawLine(ctx, cx - 8, cy, cx, cy - 8, t.color);
          break;
        case 'hexagon':
          drawPolygon(ctx, cx, cy, 9, 6, t.color, 0);
          break;
        case 'circle':
          drawCircle(ctx, cx, cy, 9, t.color);
          // Antenna
          drawLine(ctx, cx, cy - 9, cx, cy - 13, t.color);
          setPixel(ctx, cx, cy - 13, PALETTE.white);
          break;
        case 'shield':
          drawLine(ctx, cx - 8, cy - 7, cx + 8, cy - 7, t.color);
          drawLine(ctx, cx - 8, cy - 7, cx - 8, cy + 2, t.color);
          drawLine(ctx, cx + 8, cy - 7, cx + 8, cy + 2, t.color);
          drawLine(ctx, cx - 8, cy + 2, cx, cy + 9, t.color);
          drawLine(ctx, cx + 8, cy + 2, cx, cy + 9, t.color);
          break;
      }
    });

    saveCanvas(canvas, `${OUTPUT_DIR}/tower-icons.png`);
    entries.push({
      key: 'ui-tower-icons',
      type: 'spritesheet',
      path: 'assets/ui/tower-icons.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    });
  }

  // unit-icons.png (160x32, 5 icons at 32x32)
  {
    const { canvas, ctx } = makeCanvas(160, 32);
    const unitDefs = [
      { color: PALETTE.scoutDrone, shape: 'triangle' as const },
      { color: PALETTE.battleRobot, shape: 'square' as const },
      { color: PALETTE.heavyWalker, shape: 'hexagon' as const },
      { color: PALETTE.stealthDrone, shape: 'diamond' as const },
      { color: PALETTE.titan, shape: 'octagon' as const },
    ];

    unitDefs.forEach((u, i) => {
      const ox = i * 32;
      const cx = ox + 16, cy = 16;
      switch (u.shape) {
        case 'triangle':
          drawLine(ctx, cx - 6, cy + 5, cx + 7, cy, u.color);
          drawLine(ctx, cx + 7, cy, cx - 6, cy - 5, u.color);
          drawLine(ctx, cx - 6, cy - 5, cx - 6, cy + 5, u.color);
          break;
        case 'square':
          drawLine(ctx, cx - 6, cy - 6, cx + 6, cy - 6, u.color);
          drawLine(ctx, cx + 6, cy - 6, cx + 6, cy + 6, u.color);
          drawLine(ctx, cx + 6, cy + 6, cx - 6, cy + 6, u.color);
          drawLine(ctx, cx - 6, cy + 6, cx - 6, cy - 6, u.color);
          // Head notch
          drawLine(ctx, cx - 3, cy - 9, cx + 3, cy - 9, u.color);
          drawLine(ctx, cx - 3, cy - 9, cx - 3, cy - 6, u.color);
          drawLine(ctx, cx + 3, cy - 9, cx + 3, cy - 6, u.color);
          break;
        case 'hexagon':
          drawPolygon(ctx, cx, cy, 9, 6, u.color, Math.PI / 6);
          break;
        case 'diamond':
          drawLine(ctx, cx, cy - 8, cx + 8, cy, u.color);
          drawLine(ctx, cx + 8, cy, cx, cy + 8, u.color);
          drawLine(ctx, cx, cy + 8, cx - 8, cy, u.color);
          drawLine(ctx, cx - 8, cy, cx, cy - 8, u.color);
          break;
        case 'octagon':
          drawPolygon(ctx, cx, cy, 10, 8, u.color, Math.PI / 8);
          break;
      }
    });

    saveCanvas(canvas, `${OUTPUT_DIR}/unit-icons.png`);
    entries.push({
      key: 'ui-unit-icons',
      type: 'spritesheet',
      path: 'assets/ui/unit-icons.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 5,
    });
  }

  // hp-bar.png (32x4)
  {
    const { canvas, ctx } = makeCanvas(32, 4);
    // Left-to-right gradient: green -> gold -> red
    for (let x = 0; x < 32; x++) {
      let color: string;
      if (x < 16) {
        // Green to gold
        const t = x / 16;
        const r = Math.round(0x2c + (0xe2 - 0x2c) * t);
        const g = Math.round(0xb6 + (0xb7 - 0xb6) * t);
        const b = Math.round(0x7d + (0x14 - 0x7d) * t);
        color = `rgb(${r},${g},${b})`;
      } else {
        // Gold to red
        const t = (x - 16) / 16;
        const r = Math.round(0xe2 + (0xe5 - 0xe2) * t);
        const g = Math.round(0xb7 + (0x31 - 0xb7) * t);
        const b = Math.round(0x14 + (0x70 - 0x14) * t);
        color = `rgb(${r},${g},${b})`;
      }
      drawRect(ctx, x, 0, 1, 4, color);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/hp-bar.png`);
    entries.push({ key: 'ui-hp-bar', type: 'image', path: 'assets/ui/hp-bar.png' });
  }

  // cursor-place.png (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    // Purple square outline, 2px thick, dashed pattern
    const color = PALETTE.purple;
    const dashLen = 4;
    // Top edge
    for (let x = 0; x < 32; x++) {
      if (Math.floor(x / dashLen) % 2 === 0) {
        setPixel(ctx, x, 0, color);
        setPixel(ctx, x, 1, color);
      }
    }
    // Bottom edge
    for (let x = 0; x < 32; x++) {
      if (Math.floor(x / dashLen) % 2 === 0) {
        setPixel(ctx, x, 30, color);
        setPixel(ctx, x, 31, color);
      }
    }
    // Left edge
    for (let y = 0; y < 32; y++) {
      if (Math.floor(y / dashLen) % 2 === 0) {
        setPixel(ctx, 0, y, color);
        setPixel(ctx, 1, y, color);
      }
    }
    // Right edge
    for (let y = 0; y < 32; y++) {
      if (Math.floor(y / dashLen) % 2 === 0) {
        setPixel(ctx, 30, y, color);
        setPixel(ctx, 31, y, color);
      }
    }
    // Subtle inner glow
    addGlow(ctx, 16, 16, 10, PALETTE.purple, 0.1);

    saveCanvas(canvas, `${OUTPUT_DIR}/cursor-place.png`);
    entries.push({ key: 'ui-cursor-place', type: 'image', path: 'assets/ui/cursor-place.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
