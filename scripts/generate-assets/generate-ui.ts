import { makeCanvas, saveCanvas, PALETTE, hexToRgba, drawRect, fillCircle, drawCircle, setPixel, drawLine, drawPolygon, drawStar, addGlow, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = 'packages/web-shell/public/assets/ui';

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  // tower-icons.png (288x32, 9 icons) — 중세 타워 미니 아이콘
  {
    const { canvas, ctx } = makeCanvas(288, 32);

    // 궁수 탑 (laser) — 돌 탑 실루엣
    let ox = 0, cx = 16, cy = 16;
    drawRect(ctx, ox + 10, cy - 4, 12, 12, PALETTE.stone);
    drawRect(ctx, ox + 10, cy - 4, 12, 2, PALETTE.stoneLight);
    drawRect(ctx, ox + 9, cy - 8, 4, 5, PALETTE.stone);
    drawRect(ctx, ox + 19, cy - 8, 4, 5, PALETTE.stone);
    setPixel(ctx, ox + 14, cy - 6, PALETTE.laser);

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
    const fusionColors = [PALETTE.laser, PALETTE.emp, PALETTE.plasma, PALETTE.shield, PALETTE.stasis];
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
    entries.push({ key: 'ui-boss-hp-bar', type: 'image', path: 'assets/ui/boss-hp-bar.png' });
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

  // Stage select thumbnails (128x96 each, 3 stages)
  const STAGES = [
    { id: 'forest_gate', name: 'Forest Gate', color: PALETTE.foliageBright },
    { id: 'lava_fortress', name: 'Lava Fortress', color: PALETTE.fireRed },
    { id: 'storm_citadel', name: 'Storm Citadel', color: '#4060c0' },
  ];
  for (const stage of STAGES) {
    const { canvas, ctx } = makeCanvas(128, 96);
    drawRect(ctx, 0, 0, 128, 96, stage.color);
    drawRect(ctx, 4, 4, 120, 88, hexToRgba(PALETTE.shadow, 0.5));
    ctx.fillStyle = PALETTE.white;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stage.name, 64, 54);
    saveCanvas(canvas, `${OUTPUT_DIR}/stage-thumb-${stage.id}.png`);
    entries.push({
      key: `ui-stage-thumb-${stage.id}`, type: 'image',
      path: `assets/ui/stage-thumb-${stage.id}.png`,
    });
  }

  // Lock/unlock icons (32x32 each)
  for (const state of ['locked', 'unlocked']) {
    const { canvas, ctx } = makeCanvas(32, 32);
    const color = state === 'locked' ? PALETTE.gray : PALETTE.gold;
    fillCircle(ctx, 16, 16, 12, color);
    if (state === 'locked') {
      drawLine(ctx, 10, 10, 22, 22, PALETTE.shadow);
      drawLine(ctx, 22, 10, 10, 22, PALETTE.shadow);
    } else {
      drawLine(ctx, 10, 16, 14, 22, PALETTE.shadow);
      drawLine(ctx, 14, 22, 24, 10, PALETTE.shadow);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/icon-${state}.png`);
    entries.push({ key: `ui-icon-${state}`, type: 'image', path: `assets/ui/icon-${state}.png` });
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
