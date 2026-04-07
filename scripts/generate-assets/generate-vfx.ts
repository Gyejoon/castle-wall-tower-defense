import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, addGlow, ELEMENT_COLORS, type ElementType, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/vfx';

function drawElementSymbol(ctx: import('@napi-rs/canvas').SKRSContext2D, element: ElementType, cx: number, cy: number): void {
  const white = PALETTE.white;
  switch (element) {
    case 'fire':
      setPixel(ctx, cx, cy - 2, white);
      setPixel(ctx, cx - 1, cy - 1, white);
      setPixel(ctx, cx + 1, cy - 1, white);
      setPixel(ctx, cx, cy, white);
      break;
    case 'water':
      setPixel(ctx, cx, cy - 2, white);
      setPixel(ctx, cx - 1, cy, white);
      setPixel(ctx, cx + 1, cy, white);
      setPixel(ctx, cx, cy + 1, white);
      break;
    case 'lightning':
      setPixel(ctx, cx, cy - 2, white);
      setPixel(ctx, cx + 1, cy - 1, white);
      setPixel(ctx, cx - 1, cy, white);
      setPixel(ctx, cx, cy + 1, white);
      break;
    case 'neutral':
      setPixel(ctx, cx, cy - 1, white);
      setPixel(ctx, cx - 1, cy, white);
      setPixel(ctx, cx + 1, cy, white);
      setPixel(ctx, cx, cy + 1, white);
      break;
    default: {
      const _exhaustive: never = element;
      throw new Error(`Unknown element: ${_exhaustive}`);
    }
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // explosion-sm.png (128x32, 4 frames) — 투석기 착탄 (돌/흙 파편)
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    let ox = 0, cx = 16, cy = 16;

    // Frame 0: Impact flash (brown/orange)
    fillCircle(ctx, ox + cx, cy, 4, PALETTE.white);
    drawCircle(ctx, ox + cx, cy, 7, PALETTE.fireOrange);
    drawCircle(ctx, ox + cx, cy, 8, PALETTE.dirtPath);

    // Frame 1: Dirt/stone fragments
    ox = 32;
    fillCircle(ctx, ox + cx, cy, 5, hexToRgba(PALETTE.dirtPath, 0.6));
    fillCircle(ctx, ox + cx, cy, 3, hexToRgba(PALETTE.fireOrange, 0.5));
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 8 + (i * 37 % 4);
      setPixel(ctx, Math.round(ox + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), PALETTE.stoneDark);
    }

    // Frame 2: Dust cloud
    ox = 64;
    fillCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.dirtPath, 0.4));
    fillCircle(ctx, ox + cx, cy, 5, hexToRgba(PALETTE.dirtDark, 0.3));

    // Frame 3: Fading dust
    ox = 96;
    fillCircle(ctx, ox + cx, cy, 6, hexToRgba(PALETTE.dirtPath, 0.2));
    setPixel(ctx, ox + cx - 4, cy - 5, hexToRgba(PALETTE.gray, 0.15));
    setPixel(ctx, ox + cx + 5, cy - 3, hexToRgba(PALETTE.gray, 0.1));

    saveCanvas(canvas, `${OUTPUT_DIR}/explosion-sm.png`);
    entries.push({ key: 'vfx-explosion-sm', type: 'spritesheet', path: 'assets/vfx/explosion-sm.png', frameWidth: 32, frameHeight: 32, frameCount: 4 });
  }

  // explosion-lg.png (256x64, 4 frames) — 대형 착탄
  {
    const { canvas, ctx } = makeCanvas(256, 64);
    let ox = 0, cx = 32, cy = 32;

    // Frame 0: Big impact
    fillCircle(ctx, ox + cx, cy, 8, PALETTE.white);
    addGlow(ctx, ox + cx, cy, 12, PALETTE.fireOrange, 0.6);
    drawCircle(ctx, ox + cx, cy, 16, PALETTE.dirtPath);

    // Frame 1: Expanding debris
    ox = 64;
    fillCircle(ctx, ox + cx, cy, 14, hexToRgba(PALETTE.fireOrange, 0.5));
    fillCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.white, 0.4));
    drawCircle(ctx, ox + cx, cy, 20, PALETTE.dirtPath);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 18 + (i * 17 % 6);
      setPixel(ctx, Math.round(ox + cx + dist * Math.cos(angle)), Math.round(cy + dist * Math.sin(angle)), PALETTE.stoneDark);
    }

    // Frame 2: Dust cloud
    ox = 128;
    fillCircle(ctx, ox + cx, cy, 18, hexToRgba(PALETTE.dirtPath, 0.4));
    fillCircle(ctx, ox + cx, cy, 12, hexToRgba(PALETTE.dirtDark, 0.3));

    // Frame 3: Settling
    ox = 192;
    fillCircle(ctx, ox + cx, cy, 14, hexToRgba(PALETTE.dirtPath, 0.2));
    fillCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.gray, 0.1));

    saveCanvas(canvas, `${OUTPUT_DIR}/explosion-lg.png`);
    entries.push({ key: 'vfx-explosion-lg', type: 'spritesheet', path: 'assets/vfx/explosion-lg.png', frameWidth: 64, frameHeight: 64, frameCount: 4 });
  }

  // shield-bubble.png (32x32) — 성기사 황금 오라
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const cx = 16, cy = 16;
    fillCircle(ctx, cx, cy, 12, hexToRgba(PALETTE.gold, 0.15));
    drawCircle(ctx, cx, cy, 12, hexToRgba(PALETTE.gold, 0.7));
    // Golden highlight arc
    for (let a = 200; a < 280; a += 5) {
      const rad = (a * Math.PI) / 180;
      setPixel(ctx, Math.round(cx + 11 * Math.cos(rad)), Math.round(cy + 11 * Math.sin(rad)), hexToRgba(PALETTE.white, 0.5));
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/shield-bubble.png`);
    entries.push({ key: 'vfx-shield-bubble', type: 'image', path: 'assets/vfx/shield-bubble.png' });
  }

  // spawn-portal.png (128x32, 4 frames) — 동굴 어둠 이펙트
  {
    const { canvas, ctx } = makeCanvas(128, 32);
    const cy = 16;

    // Frame 0: Small dark wisp
    let ox = 0, cx = 16;
    fillCircle(ctx, ox + cx, cy, 3, hexToRgba(PALETTE.shadow, 0.6));
    setPixel(ctx, ox + cx, cy, hexToRgba(PALETTE.fireOrange, 0.4));

    // Frame 1: Growing dark portal
    ox = 32;
    drawCircle(ctx, ox + cx, cy, 6, hexToRgba(PALETTE.shadow, 0.7));
    fillCircle(ctx, ox + cx, cy, 3, hexToRgba(PALETTE.shadow, 0.4));
    setPixel(ctx, ox + cx + 5, cy - 3, hexToRgba(PALETTE.fireOrange, 0.4));

    // Frame 2: Full cave opening effect
    ox = 64;
    fillCircle(ctx, ox + cx, cy, 8, hexToRgba(PALETTE.shadow, 0.5));
    drawCircle(ctx, ox + cx, cy, 10, hexToRgba(PALETTE.stoneDark, 0.6));
    addGlow(ctx, ox + cx, cy, 6, PALETTE.fireOrange, 0.15);

    // Frame 3: Pulsing
    ox = 96;
    fillCircle(ctx, ox + cx, cy, 9, hexToRgba(PALETTE.shadow, 0.4));
    drawCircle(ctx, ox + cx, cy, 10, hexToRgba(PALETTE.stoneDark, 0.4));
    for (let a = 0; a < 90; a += 10) {
      const rad = (a * Math.PI) / 180;
      setPixel(ctx, Math.round(ox + cx + 10 * Math.cos(rad)), Math.round(cy + 10 * Math.sin(rad)), hexToRgba(PALETTE.fireOrange, 0.3));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-portal.png`);
    entries.push({ key: 'vfx-spawn-portal', type: 'spritesheet', path: 'assets/vfx/spawn-portal.png', frameWidth: 32, frameHeight: 32, frameCount: 4 });
  }

  // Element badge overlays (16x16 each)
  for (const [element, colors] of Object.entries(ELEMENT_COLORS)) {
    const { canvas, ctx } = makeCanvas(16, 16);
    fillCircle(ctx, 8, 8, 6, colors.primary);
    drawCircle(ctx, 8, 8, 7, PALETTE.shadow);
    drawElementSymbol(ctx, element as ElementType, 8, 8);

    const filename = `element-badge-${element}.png`;
    saveCanvas(canvas, `${OUTPUT_DIR}/${filename}`);
    entries.push({
      key: `vfx-element-badge-${element}`,
      type: 'image',
      path: `assets/vfx/${filename}`,
    });
  }

  // Boss warning text — "WARNING" (256x64)
  {
    const { canvas, ctx } = makeCanvas(256, 64);
    ctx.fillStyle = PALETTE.fireRed;
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING', 128, 42);
    saveCanvas(canvas, `${OUTPUT_DIR}/boss-warning.png`);
    entries.push({ key: 'vfx-boss-warning', type: 'image', path: 'assets/vfx/boss-warning.png', section: 'boss' as const });
  }

  // "FINAL BOSS" text (256x64)
  {
    const { canvas, ctx } = makeCanvas(256, 64);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINAL BOSS', 128, 42);
    saveCanvas(canvas, `${OUTPUT_DIR}/boss-final.png`);
    entries.push({ key: 'vfx-boss-final', type: 'image', path: 'assets/vfx/boss-final.png', section: 'boss' as const });
  }

  // Boss telegraph marker (64x64, danger zone)
  {
    const { canvas, ctx } = makeCanvas(64, 64);
    fillCircle(ctx, 32, 32, 28, hexToRgba(PALETTE.fireRed, 0.4));
    drawLine(ctx, 8, 8, 56, 56, PALETTE.fireRed);
    drawLine(ctx, 56, 8, 8, 56, PALETTE.fireRed);
    saveCanvas(canvas, `${OUTPUT_DIR}/boss-telegraph.png`);
    entries.push({ key: 'vfx-boss-telegraph', type: 'image', path: 'assets/vfx/boss-telegraph.png', section: 'boss' as const });
  }

  // Boss death FX (256x64, 4 frames)
  {
    const FW = 64, FH = 64, FRAMES = 4;
    const { canvas, ctx } = makeCanvas(FW * FRAMES, FH);
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const radius = 10 + f * 8;
      fillCircle(ctx, ox + 32, 32, radius, PALETTE.fireOrange);
      addGlow(ctx, ox + 32, 32, radius + 4, PALETTE.gold, 0.5 - f * 0.1);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/boss-death-fx.png`);
    entries.push({
      key: 'vfx-boss-death-fx', type: 'spritesheet',
      path: 'assets/vfx/boss-death-fx.png',
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
      section: 'boss' as const,
    });
  }

  // Upgrade success/fail effects (256x64, 4 frames each)
  for (const result of ['success', 'fail']) {
    const FW = 64, FH = 64, FRAMES = 4;
    const { canvas, ctx } = makeCanvas(FW * FRAMES, FH);
    const color = result === 'success' ? PALETTE.gold : PALETTE.fireRed;
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const r = 8 + f * 6;
      fillCircle(ctx, ox + 32, 32, r, color);
      addGlow(ctx, ox + 32, 32, r + 4, PALETTE.white, 0.3 - f * 0.07);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/upgrade-${result}-fx.png`);
    entries.push({
      key: `vfx-upgrade-${result}-fx`, type: 'spritesheet',
      path: `assets/vfx/upgrade-${result}-fx.png`,
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
    });
  }

  // Gacha reveal FX (5 tiers, 256x64, 4 frames each)
  const TIER_COLORS_FOR_FX = [
    { name: 'common', color: PALETTE.tierCommon },
    { name: 'rare', color: PALETTE.tierRare },
    { name: 'heroic', color: PALETTE.tierHeroic },
    { name: 'legendary', color: PALETTE.tierLegendary },
    { name: 'god', color: PALETTE.tierGod },
  ];
  for (const tier of TIER_COLORS_FOR_FX) {
    const FW = 64, FH = 64, FRAMES = 4;
    const { canvas, ctx } = makeCanvas(FW * FRAMES, FH);
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const r = 6 + f * 8;
      addGlow(ctx, ox + 32, 32, r, tier.color, 0.5);
      if (f >= 2) addGlow(ctx, ox + 32, 32, r / 2, PALETTE.white, 0.3);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/gacha-reveal-${tier.name}.png`);
    entries.push({
      key: `vfx-gacha-reveal-${tier.name}`, type: 'spritesheet',
      path: `assets/vfx/gacha-reveal-${tier.name}.png`,
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
      section: 'gacha' as const,
    });
  }

  // wall-smoke.png (192x32, 8 frames x 24x32) — 성벽 연기
  {
    const FW = 24, FH = 32, FRAMES = 8;
    const { canvas, ctx } = makeCanvas(FW * FRAMES, FH);
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const cx = 12, cy = 20;
      // Smoke rises y -1~-3px per frame
      const rise = -1 - (f % 3);
      // Alpha cycle: 0.15→0.45→0.15 (breathing)
      const t = f / (FRAMES - 1);
      const alpha = 0.15 + 0.30 * Math.sin(t * Math.PI);
      // Cloud radius varies 6~10
      const radius = 6 + Math.round(4 * Math.sin(t * Math.PI));
      // Main smoke cloud
      fillCircle(ctx, ox + cx, cy + rise, radius, `rgba(180,180,180,${alpha.toFixed(2)})`);
      // Secondary smaller cloud
      fillCircle(ctx, ox + cx + 3, cy + rise - 2, Math.max(3, radius - 3), `rgba(160,160,160,${(alpha * 0.7).toFixed(2)})`);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/wall-smoke.png`);
    entries.push({
      key: 'vfx-wall-smoke', type: 'spritesheet',
      path: 'assets/vfx/wall-smoke.png',
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
      section: 'preload' as const,
    });
  }

  // wall-fire.png (192x32, 8 frames x 24x32) — 성벽 화염
  {
    const FW = 24, FH = 32, FRAMES = 8;
    const { canvas, ctx } = makeCanvas(FW * FRAMES, FH);
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const cx = 12, cy = 22;
      // Fire flicker: y variation -1~-5px
      const flicker = -1 - (f * 7 % 5);

      // Fire tip (outermost, dimmer)
      fillCircle(ctx, ox + cx, cy + flicker - 4, 3, 'rgba(200,40,10,0.6)');

      // Fire mid
      fillCircle(ctx, ox + cx, cy + flicker - 1, 4, 'rgba(255,120,20,0.8)');

      // Fire core (brightest, smallest)
      fillCircle(ctx, ox + cx, cy + 1, 3, 'rgba(255,200,50,0.9)');

      // Fire tongues: 2 triangles (left/right)
      const tongueY = cy + flicker - 2;
      // Left tongue
      for (let ty = 0; ty < 5; ty++) {
        const tw = Math.max(1, 3 - ty);
        drawRect(ctx, ox + cx - 5, tongueY - ty, tw, 1, `rgba(255,120,20,${(0.7 - ty * 0.12).toFixed(2)})`);
      }
      // Right tongue
      for (let ty = 0; ty < 5; ty++) {
        const tw = Math.max(1, 3 - ty);
        drawRect(ctx, ox + cx + 4, tongueY - ty, tw, 1, `rgba(255,120,20,${(0.7 - ty * 0.12).toFixed(2)})`);
      }
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/wall-fire.png`);
    entries.push({
      key: 'vfx-wall-fire', type: 'spritesheet',
      path: 'assets/vfx/wall-fire.png',
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
      section: 'preload' as const,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
