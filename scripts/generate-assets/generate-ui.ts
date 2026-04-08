import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawStar, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // tower-icons.png (288x32, 9 icons) — 중세 타워 미니 아이콘
  {
    const { canvas, ctx } = makeCanvas(288, 32);

    // 궁수 탑 (archer) — 돌 탑 실루엣
    let ox = 0, cx = 16, cy = 16;
    drawRect(ctx, ox + 10, cy - 4, 12, 12, PALETTE.stone);
    drawRect(ctx, ox + 10, cy - 4, 12, 2, PALETTE.stoneLight);
    drawRect(ctx, ox + 9, cy - 8, 4, 5, PALETTE.stone);
    drawRect(ctx, ox + 19, cy - 8, 4, 5, PALETTE.stone);
    setPixel(ctx, ox + 14, cy - 6, PALETTE.archer);

    // 투석기 (plasma) — 나무 프레임
    ox = 32;
    drawRect(ctx, ox + 8, cy, 16, 4, PALETTE.wood);
    drawCircle(ctx, ox + 10, cy + 5, 3, PALETTE.woodDark);
    drawCircle(ctx, ox + 22, cy + 5, 3, PALETTE.woodDark);
    drawLine(ctx, ox + 12, cy, ox + 18, cy - 8, PALETTE.woodDark);
    fillCircle(ctx, ox + 18, cy - 8, 2, PALETTE.stoneDark);

    // 서리 마탑 (emp) — 얼음 결정
    ox = 64;
    drawRect(ctx, ox + 11, cy - 2, 10, 12, PALETTE.stoneDark);
    drawLine(ctx, ox + 16, cy - 8, ox + 13, cy - 2, PALETTE.ice);
    drawLine(ctx, ox + 16, cy - 8, ox + 19, cy - 2, PALETTE.ice);
    setPixel(ctx, ox + 16, cy - 9, PALETTE.white);
    addGlow(ctx, ox + 16, cy - 4, 4, PALETTE.iceGlow, 0.4);

    // 성기사 제단 (shield) — 황금 십자가
    ox = 96;
    drawRect(ctx, ox + 10, cy + 2, 12, 5, PALETTE.stone);
    drawRect(ctx, ox + 14, cy - 6, 4, 10, PALETTE.gold);
    drawRect(ctx, ox + 10, cy - 2, 12, 3, PALETTE.gold);
    addGlow(ctx, ox + 16, cy - 2, 5, PALETTE.magicGold, 0.3);

    // Fusion tier 2 — 별 모양 기반, 각 타워 색상
    const fusionColors = [PALETTE.archer, PALETTE.emp, PALETTE.plasma, PALETTE.shield, PALETTE.stasis];
    for (let i = 0; i < 5; i++) {
      ox = (4 + i) * 32;
      drawStar(ctx, ox + 16, cy, 9, 4, 5, fusionColors[i]);
      fillCircle(ctx, ox + 16, cy, 3, hexToRgba(fusionColors[i], 0.4));
    }

    saveCanvas(canvas, `${OUTPUT_DIR}/tower-icons.png`);
    entries.push({ key: 'ui-tower-icons', type: 'spritesheet', path: 'assets/ui/tower-icons.png', frameWidth: 32, frameHeight: 32, frameCount: 9 });
  }

  // unit-icons.png (160x32, 5 icons) — 마물 아이콘
  {
    const { canvas, ctx } = makeCanvas(160, 32);
    const cy = 16;

    // 고블린 정찰병
    let ox = 0;
    fillCircle(ctx, ox + 16, cy - 2, 5, PALETTE.scoutDrone);
    setPixel(ctx, ox + 14, cy - 4, '#ff2020');
    setPixel(ctx, ox + 18, cy - 4, '#ff2020');
    setPixel(ctx, ox + 12, cy - 4, PALETTE.scoutDrone);  // ear
    setPixel(ctx, ox + 20, cy - 4, PALETTE.scoutDrone);  // ear

    // 오크 전사
    ox = 32;
    drawRect(ctx, ox + 11, cy - 4, 10, 10, PALETTE.battleRobot);
    drawRect(ctx, ox + 10, cy - 6, 12, 3, '#4a4a3a');  // helmet
    setPixel(ctx, ox + 10, cy - 8, '#4a4a3a');  // horn
    setPixel(ctx, ox + 22, cy - 8, '#4a4a3a');  // horn
    setPixel(ctx, ox + 14, cy - 2, '#e0e000');
    setPixel(ctx, ox + 18, cy - 2, '#e0e000');

    // 돌 트롤
    ox = 64;
    fillCircle(ctx, ox + 16, cy, 8, PALETTE.heavyWalker);
    drawCircle(ctx, ox + 16, cy, 8, PALETTE.stoneDark);
    setPixel(ctx, ox + 13, cy - 2, '#e04020');
    setPixel(ctx, ox + 19, cy - 2, '#e04020');

    // 그림자 암살자
    ox = 96;
    for (let dy = -6; dy <= 6; dy++) {
      const w = 6 - Math.abs(dy);
      for (let dx = -w; dx <= w; dx++) {
        setPixel(ctx, ox + 16 + dx, cy + dy, hexToRgba(PALETTE.stealthDrone, 0.7));
      }
    }
    setPixel(ctx, ox + 15, cy - 3, '#ff40ff');
    setPixel(ctx, ox + 17, cy - 3, '#ff40ff');

    // 고대 드래곤
    ox = 128;
    fillCircle(ctx, ox + 16, cy, 7, hexToRgba(PALETTE.titan, 0.7));
    drawCircle(ctx, ox + 16, cy, 7, PALETTE.titan);
    drawLine(ctx, ox + 8, cy - 3, ox + 5, cy - 7, PALETTE.titan);  // wing
    drawLine(ctx, ox + 24, cy - 3, ox + 27, cy - 7, PALETTE.titan);  // wing
    setPixel(ctx, ox + 15, cy - 2, '#ffe040');
    setPixel(ctx, ox + 17, cy - 2, '#ffe040');
    addGlow(ctx, ox + 16, cy, 4, PALETTE.fireOrange, 0.2);

    saveCanvas(canvas, `${OUTPUT_DIR}/unit-icons.png`);
    entries.push({ key: 'ui-unit-icons', type: 'spritesheet', path: 'assets/ui/unit-icons.png', frameWidth: 32, frameHeight: 32, frameCount: 5 });
  }

  // hp-bar.png (32x4) — 갈색/금빛 테마
  {
    const { canvas, ctx } = makeCanvas(32, 4);
    for (let x = 0; x < 32; x++) {
      let r: number, g: number, b: number;
      if (x < 16) {
        // Green → Gold
        const t = x / 16;
        r = Math.round(0x7a + (0xf0 - 0x7a) * t);
        g = Math.round(0xb6 + (0xd0 - 0xb6) * t);
        b = Math.round(0x48 + (0x60 - 0x48) * t);
      } else {
        // Gold → Red
        const t = (x - 16) / 16;
        r = Math.round(0xf0 + (0xc0 - 0xf0) * t);
        g = Math.round(0xd0 + (0x30 - 0xd0) * t);
        b = Math.round(0x60 + (0x20 - 0x60) * t);
      }
      drawRect(ctx, x, 0, 1, 4, `rgb(${r},${g},${b})`);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/hp-bar.png`);
    entries.push({ key: 'ui-hp-bar', type: 'image', path: 'assets/ui/hp-bar.png' });
  }

  // cursor-place.png (32x32) — 중세 배치 커서 (금빛 테두리)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const color = PALETTE.gold;
    const dashLen = 4;
    for (let x = 0; x < 32; x++) {
      if (Math.floor(x / dashLen) % 2 === 0) {
        setPixel(ctx, x, 0, color); setPixel(ctx, x, 1, color);
        setPixel(ctx, x, 30, color); setPixel(ctx, x, 31, color);
      }
    }
    for (let y = 0; y < 32; y++) {
      if (Math.floor(y / dashLen) % 2 === 0) {
        setPixel(ctx, 0, y, color); setPixel(ctx, 1, y, color);
        setPixel(ctx, 30, y, color); setPixel(ctx, 31, y, color);
      }
    }
    addGlow(ctx, 16, 16, 10, PALETTE.gold, 0.08);
    saveCanvas(canvas, `${OUTPUT_DIR}/cursor-place.png`);
    entries.push({ key: 'ui-cursor-place', type: 'image', path: 'assets/ui/cursor-place.png' });
  }

  // Boss HP bar (256x16)
  {
    const { canvas, ctx } = makeCanvas(256, 16);
    drawRect(ctx, 0, 0, 256, 16, PALETTE.shadow);
    drawRect(ctx, 2, 2, 252, 12, PALETTE.fireRed);
    drawRect(ctx, 2, 2, 252, 4, hexToRgba(PALETTE.white, 0.2));
    saveCanvas(canvas, `${OUTPUT_DIR}/boss-hp-bar.png`);
    entries.push({ key: 'ui-boss-hp-bar', type: 'image', path: 'assets/ui/boss-hp-bar.png', section: 'boss' as const });
  }

  // Energy gauge (128x16)
  {
    const { canvas, ctx } = makeCanvas(128, 16);
    drawRect(ctx, 0, 0, 128, 16, PALETTE.shadow);
    drawRect(ctx, 2, 2, 124, 12, PALETTE.magicBlue);
    drawRect(ctx, 2, 2, 124, 4, hexToRgba(PALETTE.white, 0.2));
    saveCanvas(canvas, `${OUTPUT_DIR}/energy-gauge.png`);
    entries.push({ key: 'ui-energy-gauge', type: 'image', path: 'assets/ui/energy-gauge.png' });
  }

  // Upgrade button (120x40, 3 states: available/unavailable/complete)
  const BUTTON_STATES = [
    { name: 'available', bg: PALETTE.gold, text: PALETTE.shadow },
    { name: 'unavailable', bg: PALETTE.gray, text: PALETTE.shadow },
    { name: 'complete', bg: '#2ecc71', text: PALETTE.white },
  ];
  for (const state of BUTTON_STATES) {
    const { canvas, ctx } = makeCanvas(120, 40);
    drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
    drawRect(ctx, 2, 2, 116, 36, state.bg);
    drawRect(ctx, 2, 2, 116, 8, hexToRgba(PALETTE.white, 0.15));
    saveCanvas(canvas, `${OUTPUT_DIR}/upgrade-btn-${state.name}.png`);
    entries.push({
      key: `ui-upgrade-btn-${state.name}`, type: 'image',
      path: `assets/ui/upgrade-btn-${state.name}.png`,
    });
  }

  // Promotion button (120x40, 2 states)
  for (const state of [{ name: 'available', bg: PALETTE.tierHeroic }, { name: 'unavailable', bg: PALETTE.gray }]) {
    const { canvas, ctx } = makeCanvas(120, 40);
    drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
    drawRect(ctx, 2, 2, 116, 36, state.bg);
    saveCanvas(canvas, `${OUTPUT_DIR}/promote-btn-${state.name}.png`);
    entries.push({
      key: `ui-promote-btn-${state.name}`, type: 'image',
      path: `assets/ui/promote-btn-${state.name}.png`,
    });
  }

  // Stage thumbnails are now generated via ComfyUI in generate-worldmap.ts

  // Lock icon (32x32) — medieval iron padlock, pixel art
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    // Medieval iron palette
    const iron = '#6a6a72';
    const ironLight = '#8a8a94';
    const ironDark = '#3a3a42';
    const ironDeep = '#24242c';
    const bronze = '#8a6a3a';
    const bronzeLight = '#b8944a';
    const keyholeGold = '#c8a04a';
    const keyholeDark = '#1a1208';

    // === Shackle (forged iron arch) ===
    // Outer arch
    const shacklePixels: [number, number, string][] = [
      // Top curve
      [13,3,ironLight],[14,2,ironLight],[15,2,ironLight],[16,2,ironLight],[17,2,ironLight],[18,3,ironLight],
      [12,4,iron],[19,4,iron],
      [11,5,iron],[20,5,iron],
      [11,6,iron],[20,6,iron],
      [11,7,iron],[20,7,iron],
      [11,8,iron],[20,8,iron],
      [11,9,iron],[20,9,iron],
      [11,10,iron],[20,10,iron],
      [11,11,iron],[20,11,iron],
      [11,12,iron],[20,12,iron],
      // Inner arch highlight
      [13,4,ironLight],[14,3,ironLight],[15,3,ironLight],[16,3,ironLight],[17,3,ironLight],[18,4,ironLight],
      // Inner hole
      [13,5,ironDark],[14,4,ironDark],[15,4,ironDark],[16,4,ironDark],[17,4,ironDark],[18,5,ironDark],
      [13,6,ironDark],[18,6,ironDark],
      [13,7,ironDark],[18,7,ironDark],
      [13,8,ironDark],[18,8,ironDark],
      [13,9,ironDark],[18,9,ironDark],
      [13,10,ironDark],[18,10,ironDark],
      [13,11,ironDark],[18,11,ironDark],
      [13,12,ironDark],[18,12,ironDark],
      // Shackle thickness fill
      [12,5,iron],[12,6,iron],[12,7,iron],[12,8,iron],[12,9,iron],[12,10,iron],[12,11,iron],[12,12,iron],
      [19,5,iron],[19,6,iron],[19,7,iron],[19,8,iron],[19,9,iron],[19,10,iron],[19,11,iron],[19,12,iron],
      // Left shadow edge
      [10,5,ironDark],[10,6,ironDark],[10,7,ironDark],[10,8,ironDark],[10,9,ironDark],[10,10,ironDark],[10,11,ironDark],[10,12,ironDark],
      // Right highlight
      [21,5,ironLight],[21,6,ironLight],[21,7,ironLight],[21,8,ironLight],[21,9,ironLight],[21,10,ironLight],[21,11,ironLight],[21,12,ironLight],
    ];
    for (const [x, y, c] of shacklePixels) setPixel(ctx, x, y, c);

    // === Body (rounded rectangle with medieval plate feel) ===
    // Main body fill
    drawRect(ctx, 7, 13, 18, 14, iron);
    // Top edge highlight
    drawRect(ctx, 8, 13, 16, 1, ironLight);
    // Bottom edge shadow
    drawRect(ctx, 7, 26, 18, 1, ironDeep);
    // Left shadow
    for (let y = 13; y <= 26; y++) setPixel(ctx, 7, y, ironDark);
    // Right highlight
    for (let y = 13; y <= 25; y++) setPixel(ctx, 24, y, ironLight);
    // Rounded corners
    ctx.clearRect(7, 13, 1, 1);
    ctx.clearRect(24, 13, 1, 1);
    ctx.clearRect(7, 26, 1, 1);
    ctx.clearRect(24, 26, 1, 1);

    // Bronze decorative band (horizontal stripe)
    drawRect(ctx, 8, 14, 16, 1, bronze);
    drawRect(ctx, 8, 25, 16, 1, bronze);

    // Bronze corner rivets
    for (const [rx, ry] of [[9,15],[22,15],[9,24],[22,24]]) {
      setPixel(ctx, rx, ry, bronzeLight);
    }

    // === Keyhole (classic medieval shape) ===
    // Circle top
    fillCircle(ctx, 16, 19, 2, keyholeDark);
    setPixel(ctx, 16, 17, keyholeDark);
    // Slit bottom
    setPixel(ctx, 15, 21, keyholeDark);
    setPixel(ctx, 16, 21, keyholeDark);
    setPixel(ctx, 15, 22, keyholeDark);
    setPixel(ctx, 16, 22, keyholeDark);
    setPixel(ctx, 15, 23, keyholeDark);
    setPixel(ctx, 16, 23, keyholeDark);
    // Keyhole gold rim
    setPixel(ctx, 14, 18, keyholeGold);
    setPixel(ctx, 18, 18, keyholeGold);
    setPixel(ctx, 14, 20, keyholeGold);
    setPixel(ctx, 17, 20, keyholeGold);
    setPixel(ctx, 14, 21, keyholeGold);
    setPixel(ctx, 17, 21, keyholeGold);

    saveCanvas(canvas, `${OUTPUT_DIR}/icon-locked.png`);
    entries.push({ key: 'ui-icon-locked', type: 'image', path: 'assets/ui/icon-locked.png' });
  }

  // Unlock icon (32x32) — same medieval iron padlock, shackle open
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    const iron = '#6a6a72';
    const ironLight = '#8a8a94';
    const ironDark = '#3a3a42';
    const ironDeep = '#24242c';
    const bronze = '#8a6a3a';
    const bronzeLight = '#b8944a';
    const keyholeGold = '#c8a04a';

    // === Open shackle (right side lifted up) ===
    // Left leg stays attached
    [10,11,12].forEach(x => {
      for (let y = 5; y <= 12; y++) {
        setPixel(ctx, x, y, x === 10 ? ironDark : iron);
      }
    });
    // Arch curves up and right side is lifted
    const archPixels: [number, number, string][] = [
      [13,3,ironLight],[14,2,ironLight],[15,2,ironLight],[16,2,ironLight],[17,2,ironLight],[18,3,ironLight],
      [12,4,iron],[19,4,iron],
      [13,4,ironLight],[14,3,ironLight],[15,3,ironLight],[16,3,ironLight],[17,3,ironLight],[18,4,ironLight],
      [13,5,ironDark],[14,4,ironDark],[15,4,ironDark],[16,4,ironDark],[17,4,ironDark],[18,5,ironDark],
      // Right leg lifted — only goes to y=7
      [19,5,iron],[20,5,iron],[21,5,ironLight],
      [19,6,iron],[20,6,iron],[21,6,ironLight],
      [19,7,iron],[20,7,iron],[21,7,ironLight],
    ];
    for (const [x, y, c] of archPixels) setPixel(ctx, x, y, c);

    // === Body (same iron as locked) ===
    drawRect(ctx, 7, 13, 18, 14, iron);
    drawRect(ctx, 8, 13, 16, 1, ironLight);
    drawRect(ctx, 7, 26, 18, 1, ironDeep);
    for (let y = 13; y <= 26; y++) setPixel(ctx, 7, y, ironDark);
    for (let y = 13; y <= 25; y++) setPixel(ctx, 24, y, ironLight);
    ctx.clearRect(7, 13, 1, 1);
    ctx.clearRect(24, 13, 1, 1);
    ctx.clearRect(7, 26, 1, 1);
    ctx.clearRect(24, 26, 1, 1);

    // Bronze bands
    drawRect(ctx, 8, 14, 16, 1, bronze);
    drawRect(ctx, 8, 25, 16, 1, bronze);

    // Rivets
    for (const [rx, ry] of [[9,15],[22,15],[9,24],[22,24]]) {
      setPixel(ctx, rx, ry, bronzeLight);
    }

    // Keyhole (same as locked)
    const keyholeDark = '#1a1208';
    fillCircle(ctx, 16, 19, 2, keyholeDark);
    setPixel(ctx, 16, 17, keyholeDark);
    setPixel(ctx, 15, 21, keyholeDark);
    setPixel(ctx, 16, 21, keyholeDark);
    setPixel(ctx, 15, 22, keyholeDark);
    setPixel(ctx, 16, 22, keyholeDark);
    setPixel(ctx, 15, 23, keyholeDark);
    setPixel(ctx, 16, 23, keyholeDark);
    setPixel(ctx, 14, 18, keyholeGold);
    setPixel(ctx, 18, 18, keyholeGold);
    setPixel(ctx, 14, 20, keyholeGold);
    setPixel(ctx, 17, 20, keyholeGold);
    setPixel(ctx, 14, 21, keyholeGold);
    setPixel(ctx, 17, 21, keyholeGold);

    saveCanvas(canvas, `${OUTPUT_DIR}/icon-unlocked.png`);
    entries.push({ key: 'ui-icon-unlocked', type: 'image', path: 'assets/ui/icon-unlocked.png' });
  }

  // Gold icon (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    fillCircle(ctx, 16, 16, 12, PALETTE.gold);
    fillCircle(ctx, 16, 16, 8, PALETTE.tierGodBright);
    ctx.fillStyle = PALETTE.shadow;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('G', 16, 20);
    saveCanvas(canvas, `${OUTPUT_DIR}/icon-gold.png`);
    entries.push({ key: 'ui-icon-gold', type: 'image', path: 'assets/ui/icon-gold.png' });
  }

  // Diamond icon (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    fillCircle(ctx, 16, 16, 12, PALETTE.tierRare);
    fillCircle(ctx, 16, 16, 8, PALETTE.white);
    ctx.fillStyle = PALETTE.shadow;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('D', 16, 20);
    saveCanvas(canvas, `${OUTPUT_DIR}/icon-diamond.png`);
    entries.push({ key: 'ui-icon-diamond', type: 'image', path: 'assets/ui/icon-diamond.png' });
  }

  // Offer card backgrounds (160x200, 3 price tiers)
  for (const tier of [{ name: 'basic', color: PALETTE.wood }, { name: 'premium', color: PALETTE.tierRare }, { name: 'legendary', color: PALETTE.tierGod }]) {
    const { canvas, ctx } = makeCanvas(160, 200);
    drawRect(ctx, 0, 0, 160, 200, PALETTE.shadow);
    drawRect(ctx, 2, 2, 156, 196, tier.color);
    drawRect(ctx, 4, 4, 152, 192, hexToRgba(PALETTE.shadow, 0.7));
    saveCanvas(canvas, `${OUTPUT_DIR}/offer-card-${tier.name}.png`);
    entries.push({ key: `ui-offer-card-${tier.name}`, type: 'image', path: `assets/ui/offer-card-${tier.name}.png` });
  }

  // Buy button (120x40, 2 states)
  for (const state of [{ name: 'available', bg: '#2ecc71' }, { name: 'unavailable', bg: PALETTE.gray }]) {
    const { canvas, ctx } = makeCanvas(120, 40);
    drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
    drawRect(ctx, 2, 2, 116, 36, state.bg);
    saveCanvas(canvas, `${OUTPUT_DIR}/buy-btn-${state.name}.png`);
    entries.push({ key: `ui-buy-btn-${state.name}`, type: 'image', path: `assets/ui/buy-btn-${state.name}.png` });
  }

  // Mission icons (32x32 each, 4 types)
  const MISSIONS = [
    { name: 'daily', color: PALETTE.gold, symbol: 'D' },
    { name: 'weekly', color: PALETTE.tierRare, symbol: 'W' },
    { name: 'kill', color: PALETTE.fireRed, symbol: 'K' },
    { name: 'build', color: PALETTE.foliageBright, symbol: 'B' },
  ];
  for (const mission of MISSIONS) {
    const { canvas, ctx } = makeCanvas(32, 32);
    fillCircle(ctx, 16, 16, 14, mission.color);
    fillCircle(ctx, 16, 16, 10, hexToRgba(PALETTE.shadow, 0.5));
    ctx.fillStyle = PALETTE.white;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mission.symbol, 16, 21);
    saveCanvas(canvas, `${OUTPUT_DIR}/mission-icon-${mission.name}.png`);
    entries.push({ key: `ui-mission-icon-${mission.name}`, type: 'image', path: `assets/ui/mission-icon-${mission.name}.png` });
  }

  // Complete checkmark (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    fillCircle(ctx, 16, 16, 14, '#2ecc71');
    drawLine(ctx, 8, 16, 14, 22, PALETTE.white);
    drawLine(ctx, 14, 22, 24, 10, PALETTE.white);
    saveCanvas(canvas, `${OUTPUT_DIR}/icon-complete.png`);
    entries.push({ key: 'ui-icon-complete', type: 'image', path: 'assets/ui/icon-complete.png' });
  }

  // Star icon — active (gold filled, 16x16)
  {
    const { canvas, ctx } = makeCanvas(16, 16);
    drawStar(ctx, 8, 8, 7, 3, 5, PALETTE.gold);
    fillCircle(ctx, 8, 8, 3, PALETTE.gold);
    saveCanvas(canvas, `${OUTPUT_DIR}/icon-star-active.png`);
    entries.push({ key: 'ui-icon-star-active', type: 'image', path: 'assets/ui/icon-star-active.png' });
  }

  // Star icon — inactive (dim border, 16x16)
  {
    const { canvas, ctx } = makeCanvas(16, 16);
    drawStar(ctx, 8, 8, 7, 3, 5, '#5a5040');
    saveCanvas(canvas, `${OUTPUT_DIR}/icon-star-inactive.png`);
    entries.push({ key: 'ui-icon-star-inactive', type: 'image', path: 'assets/ui/icon-star-inactive.png' });
  }

  // Ad button (120x40)
  {
    const { canvas, ctx } = makeCanvas(120, 40);
    drawRect(ctx, 0, 0, 120, 40, PALETTE.shadow);
    drawRect(ctx, 2, 2, 116, 36, PALETTE.magicBlue);
    saveCanvas(canvas, `${OUTPUT_DIR}/ad-btn.png`);
    entries.push({ key: 'ui-ad-btn', type: 'image', path: 'assets/ui/ad-btn.png' });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
