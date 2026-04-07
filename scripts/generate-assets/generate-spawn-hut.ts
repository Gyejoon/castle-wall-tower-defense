import { makeCanvas, saveCanvas, PALETTE, drawRect, setPixel, fillCircle, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';
import type { SKRSContext2D } from '@napi-rs/canvas';

const OUTPUT_DIR = 'packages/web-shell/public/assets/spawn-hut';
const W = 64;
const H = 80;

const SH = PALETTE.spawnHut;

function drawSpawnHut(ctx: SKRSContext2D, w: number, h: number, active: boolean): void {
  // === Wooden walls (y:24~79) ===
  for (let y = 24; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const plank = Math.floor(x / 8);
      const isJoint = x % 8 === 0;
      if (isJoint) {
        setPixel(ctx, x, y, SH.shadow);
      } else {
        const color = plank % 2 === 0 ? SH.woodMid : SH.woodLight;
        setPixel(ctx, x, y, color);
      }
    }
  }

  // === Triangular roof (y:0~24) ===
  const roofPeak = 0;
  const roofBase = 24;
  const roofHeight = roofBase - roofPeak;
  for (let y = roofPeak; y < roofBase; y++) {
    const progress = (y - roofPeak) / roofHeight;
    const halfWidth = Math.round(progress * (w / 2));
    const left = w / 2 - halfWidth;
    const right = w / 2 + halfWidth;
    for (let x = left; x < right; x++) {
      // Thatch texture with variation
      const isRidge = Math.abs(x - w / 2) <= 1;
      if (isRidge) {
        setPixel(ctx, x, y, SH.woodDark);
      } else {
        // Irregular thatch pattern
        const noise = ((x * 7 + y * 13) % 5);
        const color = noise < 2 ? SH.woodDark : SH.thatch;
        setPixel(ctx, x, y, color);
      }
    }
    // Roof edge (2px dark line)
    if (halfWidth > 0) {
      setPixel(ctx, left, y, SH.woodDark);
      setPixel(ctx, left + 1, y, SH.woodDark);
      setPixel(ctx, right - 1, y, SH.woodDark);
      setPixel(ctx, right - 2, y, SH.woodDark);
    }
  }

  // Flagpole + bone decoration at roof peak
  drawRect(ctx, 31, 0, 2, 3, SH.flagPole);
  drawRect(ctx, 30, 0, 4, 2, SH.bone); // bone ornament

  // === Arched door (y:50~79, x:20~43) ===
  const doorLeft = 20;
  const doorRight = 43;
  const doorTop = 50;
  const doorCx = (doorLeft + doorRight) / 2;
  const doorRadius = (doorRight - doorLeft) / 2;

  // Door frame (shadow, 2px)
  for (let y = doorTop; y < h; y++) {
    for (let x = doorLeft - 2; x <= doorRight + 2; x++) {
      const dx = x - doorCx;
      const dy = y - doorTop;
      const inArch = dy < doorRadius && (dx * dx + (dy - doorRadius) * (dy - doorRadius)) <= (doorRadius + 2) * (doorRadius + 2);
      const inRect = dy >= doorRadius && x >= doorLeft - 2 && x <= doorRight + 2;
      if (inArch || inRect) {
        setPixel(ctx, x, y, SH.shadow);
      }
    }
  }

  // Door interior (black)
  for (let y = doorTop; y < h; y++) {
    for (let x = doorLeft; x <= doorRight; x++) {
      const dx = x - doorCx;
      const dy = y - doorTop;
      const inArch = dy < doorRadius && (dx * dx + (dy - doorRadius) * (dy - doorRadius)) <= doorRadius * doorRadius;
      const inRect = dy >= doorRadius;
      if (inArch || inRect) {
        setPixel(ctx, x, y, SH.door);
      }
    }
  }

  // === Skull decorations ===
  // Skull 1 (left of door): x:12~17, y:55~60
  drawRect(ctx, 12, 55, 6, 5, SH.bone);
  drawRect(ctx, 12, 60, 6, 1, SH.shadow); // jaw shadow
  setPixel(ctx, 13, 56, SH.door); // left eye
  setPixel(ctx, 14, 56, SH.door);
  setPixel(ctx, 16, 56, SH.door); // right eye
  setPixel(ctx, 17, 56, SH.door);

  // Skull 2 (right of door): x:46~51, y:55~60
  drawRect(ctx, 46, 55, 6, 5, SH.bone);
  drawRect(ctx, 46, 60, 6, 1, SH.shadow);
  setPixel(ctx, 47, 56, SH.door);
  setPixel(ctx, 48, 56, SH.door);
  setPixel(ctx, 50, 56, SH.door);
  setPixel(ctx, 51, 56, SH.door);

  // === Active state additions ===
  if (active) {
    // Red glow inside door (source-atop to stay within door area)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const gradient = ctx.createRadialGradient(doorCx, 65, 0, doorCx, 65, doorRadius);
    gradient.addColorStop(0, 'rgba(200,40,20,0.35)');
    gradient.addColorStop(1, 'rgba(200,40,20,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(doorLeft, doorTop, doorRight - doorLeft + 1, h - doorTop);
    ctx.restore();

    // Red highlight on inner door frame (1px)
    for (let y = doorTop + 1; y < h; y++) {
      setPixel(ctx, doorLeft, y, SH.accent);
      setPixel(ctx, doorRight, y, SH.accent);
    }

    // Glowing skull eyes (red)
    const redEye = '#ff4040';
    setPixel(ctx, 13, 56, redEye);
    setPixel(ctx, 14, 56, redEye);
    setPixel(ctx, 16, 56, redEye);
    setPixel(ctx, 17, 56, redEye);
    setPixel(ctx, 47, 56, redEye);
    setPixel(ctx, 48, 56, redEye);
    setPixel(ctx, 50, 56, redEye);
    setPixel(ctx, 51, 56, redEye);
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  const variants: { active: boolean; name: string }[] = [
    { active: false, name: 'idle' },
    { active: true, name: 'active' },
  ];

  for (const { active, name } of variants) {
    const { canvas, ctx } = makeCanvas(W, H);
    drawSpawnHut(ctx, W, H, active);
    const filename = `base-${name}.png`;
    saveCanvas(canvas, `${OUTPUT_DIR}/${filename}`);
    entries.push({
      key: `spawn-hut-${name}`,
      type: 'image',
      path: `assets/spawn-hut/${filename}`,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
