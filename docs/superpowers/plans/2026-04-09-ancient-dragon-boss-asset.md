# Ancient Dragon Boss Asset Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보스 드래곤 에셋을 중세풍 서양 드래곤으로 전면 재설계 (탑다운 정면뷰, 머리 아래/꼬리 위, 어두운 다크레드~블랙)

**Architecture:** `generate-units.ts`의 `drawBossFrame()` 함수를 전면 재작성한다. 기존 시그니처 `(ctx, size, frame, rage)` 유지. 호출부(line 619-666)와 `applyColorTint()` 로직은 그대로 둔다. 드래곤 전용 팔레트와 헬퍼 함수를 추가하고, 드로잉 로직을 교체한다.

**Tech Stack:** TypeScript, @napi-rs/canvas, bun

**Design Spec:** `docs/superpowers/specs/2026-04-09-ancient-dragon-boss-asset-redesign.md`

---

### Task 1: Dragon Palette + fillEllipse Helper

**Files:**
- Modify: `scripts/generate-assets/generate-units.ts:380-416` (drawBossDragon 삭제 후 그 자리에 팔레트+헬퍼 배치)

- [ ] **Step 1: Add DRAGON_PALETTE constant**

`drawBossDragon` 함수(line 380-416)를 삭제하고 그 자리에 다음을 추가:

```typescript
// === Dragon Boss Palette (dark & evil medieval dragon) ===
const DRAGON = {
  bodyDeep:    '#1a0404',  // 거의 블랙
  bodyDark:    '#2a0808',  // 매우 어두운 레드
  body:        '#3a0e0e',  // 기본 몸체
  bodyMid:     '#4a1212',  // 중간톤
  bodyLight:   '#5a1818',  // 하이라이트
  belly:       '#602020',  // 배 비늘
  bellyGlow:   '#803020',  // 배 용암 글로우
  wingBone:    '#200404',  // 날개 뼈대
  wingMem:     '#180303',  // 날개 막
  wingMemRage: '#2a0606',  // rage 날개 막
  spine:       '#1a0e04',  // 등 가시
  horn:        '#2a1a0a',  // 뿔
  hornTip:     '#3a2a1a',  // 뿔 끝
  claw:        '#0a0402',  // 발톱
  eyeNorm:     '#e0b040',  // 정상 눈
  eyeRage:     '#ff1010',  // 분노 눈
  fireCore:    '#ffe060',  // 불꽃 코어
  fireOrange:  '#e07020',  // 불꽃 주황
  fireRed:     '#c03020',  // 불꽃 빨강
  fireDark:    '#801808',  // 불꽃 어두운
  smoke:       '#403020',  // 연기
  lavaGlow:    '#c04010',  // 용암 글로우
} as const;
```

- [ ] **Step 2: Add fillEllipse helper**

`DRAGON` 상수 바로 아래에 추가:

```typescript
/** Pixel-art ellipse fill (no anti-aliasing) — uses setPixel for crisp edges */
function fillEllipse(ctx: import('@napi-rs/canvas').SKRSContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        setPixel(ctx, cx + dx, cy + dy, color);
      }
    }
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/lio/.superset/worktrees/grid-line-defense-pvp/lio/tasteful-magnolia && bun run scripts/generate-assets/generate-units.ts 2>&1 | head -5`

Expected: 정상 실행 (에셋 생성 시작). `drawBossDragon` 호출부가 없으므로 삭제해도 컴파일 문제 없음.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-assets/generate-units.ts
git commit -m "refactor: add dragon boss palette and fillEllipse helper, remove unused drawBossDragon"
```

---

### Task 2: Rewrite drawBossFrame — Static Structure (Shadow + Tail + Body)

**Files:**
- Modify: `scripts/generate-assets/generate-units.ts:418-483` (drawBossFrame 내용 교체)

- [ ] **Step 1: Replace drawBossFrame body — setup + shadow + tail**

기존 `drawBossFrame` 함수(line 418-483)의 **내용**을 전면 교체. 시그니처 유지:

```typescript
function drawBossFrame(ctx: import('@napi-rs/canvas').SKRSContext2D, size: number, frame: number, rage: boolean): void {
  const cx = size / 2; // 48
  const cy = 44;       // body center (slightly above center, room for tail above and head below)
  const phase = (frame / 8) * Math.PI * 2;

  // === Animation parameters ===
  const wingFlap = Math.sin(phase);
  const wingY = wingFlap > 0 ? wingFlap * 6 : wingFlap * 4; // asymmetric: fast down, slow up
  const wingSpread = 1 + wingFlap * 0.08;
  const tailSwing1 = Math.sin(phase + Math.PI * 0.6) * 6;
  const tailSwing2 = Math.sin(phase + Math.PI) * 4;
  const headBob = Math.round(Math.sin(phase * 2) * 1);
  const bodyBob = Math.round(Math.sin(phase * 2) * 0.5);
  const breathScale = 1 + Math.sin(phase * 2) * 0.02;
  const legAnim = Math.round(Math.sin(phase) * 3);

  // === 1. Fire aura (ground glow) ===
  addGlow(ctx, cx, cy, 40, rage ? DRAGON.fireRed : DRAGON.fireOrange, rage ? 0.12 : 0.08);

  // === 2. Shadow ===
  drawIsoShadow(ctx, cx, cy + 2, 32, 16, 0.25);

  // === 3. Tail (top — extending upward, away from movement) ===
  // Tail main stroke
  const tailBaseY = cy - 16;
  for (let t = 0; t <= 1; t += 0.04) {
    const tx = cx + tailSwing1 * t * 0.7 + tailSwing2 * t * t * 0.3;
    const ty = tailBaseY - t * 30;
    const thickness = Math.round(3 - t * 2); // thins toward tip
    const c = t < 0.5 ? DRAGON.body : DRAGON.bodyDark;
    drawRect(ctx, tx - thickness, ty, thickness * 2 + 1, 1, c);
  }
  // Tail spade (diamond at tip)
  const tsX = Math.round(cx + tailSwing2 * 0.8);
  const tsY = Math.round(tailBaseY - 30);
  drawLine(ctx, tsX, tsY, tsX - 4, tsY - 4, DRAGON.bodyDark);
  drawLine(ctx, tsX, tsY, tsX + 4, tsY - 4, DRAGON.bodyDark);
  drawLine(ctx, tsX - 4, tsY - 4, tsX, tsY - 2, DRAGON.bodyDark);
  drawLine(ctx, tsX + 4, tsY - 4, tsX, tsY - 2, DRAGON.bodyDark);
  // Tail spines (3)
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 4;
    const spX = Math.round(cx + tailSwing1 * t * 0.5);
    const spY = Math.round(tailBaseY - t * 22);
    drawLine(ctx, spX - 2, spY, spX, spY - 3, DRAGON.spine);
    drawLine(ctx, spX + 2, spY, spX, spY - 3, DRAGON.spine);
  }
  // Tail fire (rage only)
  if (rage) {
    addGlow(ctx, tsX, tsY - 2, 4, DRAGON.fireRed, 0.25 + Math.sin(phase * 3) * 0.1);
  }

  // === 4. Body (vertical ellipse — head-to-tail orientation) ===
  const bw = Math.round(16 * breathScale);
  const bh = Math.round(20 * breathScale);
  const bcy = cy + bodyBob;

  // Body outer shadow
  fillEllipse(ctx, cx, bcy, bw + 1, bh + 1, DRAGON.bodyDeep);
  // Main body
  fillEllipse(ctx, cx, bcy, bw, bh, DRAGON.body);
  // Spine ridge (center line)
  drawLine(ctx, cx, bcy - bh + 2, cx, bcy + bh - 2, DRAGON.bodyDeep);
  // Belly glow (lava showing through)
  const bellyAlpha = rage ? 0.3 : 0.12;
  addGlow(ctx, cx, bcy, Math.round(bw * 0.6), rage ? DRAGON.lavaGlow : DRAGON.bellyGlow, bellyAlpha + Math.sin(phase * 2) * 0.05);
  // Belly scale lines
  for (let i = 0; i < 3; i++) {
    const sy = bcy + 2 + i * 3;
    const hw = Math.round(bw * (0.5 - i * 0.1));
    drawLine(ctx, cx - hw, sy, cx + hw, sy, hexToRgba(DRAGON.belly, 0.5));
  }
  // Scale texture dots
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + phase * 0.08;
    const sx = cx + Math.round(Math.cos(a) * bw * 0.5);
    const sy = bcy + Math.round(Math.sin(a) * bh * 0.45);
    setPixel(ctx, sx, sy, hexToRgba(DRAGON.bodyMid, 0.4));
  }

  // (Wings, Legs, Head, Fire — added in subsequent tasks)
  // Placeholder comment — will be replaced in Task 3-5
}
```

- [ ] **Step 2: Generate and verify output**

Run: `cd /Users/lio/.superset/worktrees/grid-line-defense-pvp/lio/tasteful-magnolia && bun run scripts/generate-assets/generate-all.ts 2>&1 | tail -10`

Expected: `wrote .../titan-boss.png (768x96)` 출력. 에러 없음.

- [ ] **Step 3: Visually inspect the partial output**

이미지를 직접 확인: `packages/web-shell/public/assets/units/titan-boss.png`

Expected: 어두운 타원 몸체 + 위로 뻗은 꼬리가 보여야 함. 아직 날개/머리/다리 없음.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-assets/generate-units.ts
git commit -m "feat: rewrite boss dragon body + tail (partial, no wings/head yet)"
```

---

### Task 3: Add Wings

**Files:**
- Modify: `scripts/generate-assets/generate-units.ts` — drawBossFrame 내부, body 섹션 이후에 날개 코드 추가

- [ ] **Step 1: Add wing drawing code after body section**

`drawBossFrame` 내부, body 섹션(`Scale texture dots` 루프) 바로 아래, placeholder 주석을 교체하여 다음을 추가:

```typescript
  // === 5. Spine ridges (on body) ===
  for (let i = 0; i < 6; i++) {
    const t = (i - 2.5) / 3;
    const sy = Math.round(bcy + t * bh * 0.7);
    drawLine(ctx, cx - 2, sy, cx, sy - 1, DRAGON.spine);
    drawLine(ctx, cx + 2, sy, cx, sy - 1, DRAGON.spine);
  }

  // === 6. Wings (massive, spread left-right) ===
  for (const side of [-1, 1] as const) {
    const wbx = cx + side * 8;  // wing base on body edge
    const wby = cy;

    // 3 wing bones
    const boneLens = [34, 30, 24].map(l => Math.round(l * wingSpread));
    // Bone endpoints: front bone angles down (toward head), back bone angles up (toward tail)
    const boneEndpoints = [
      { x: wbx + side * boneLens[0], y: wby + 12 + Math.round(wingY) },      // front
      { x: wbx + side * boneLens[1], y: wby - 2 + Math.round(wingY * 0.7) },  // middle
      { x: wbx + side * boneLens[2], y: wby - 14 + Math.round(wingY * 0.4) }, // back
    ];

    // Wing membrane — fill area between bones using scanline
    // We approximate with pixel rows between bone lines
    const memColor = rage ? DRAGON.wingMemRage : DRAGON.wingMem;
    for (let row = Math.min(boneEndpoints[2].y, wby - 8); row <= Math.max(boneEndpoints[0].y, wby + 8); row++) {
      // Find x range at this y by interpolating between outermost bones and body
      const t = (row - boneEndpoints[2].y) / (boneEndpoints[0].y - boneEndpoints[2].y + 0.01);
      const outerX = Math.round(wbx + side * (boneLens[2] + t * (boneLens[0] - boneLens[2])));
      const innerX = wbx + side * 2;
      const startX = Math.min(innerX, outerX);
      const endX = Math.max(innerX, outerX);
      for (let px = startX; px <= endX; px++) {
        setPixel(ctx, px, row, hexToRgba(memColor, 0.55));
      }
    }

    // Rage: wing inner glow
    if (rage) {
      addGlow(ctx, wbx + side * 18, wby, 14, DRAGON.fireRed, 0.08);
    }

    // Wing bones
    for (const ep of boneEndpoints) {
      drawLine(ctx, wbx, wby, ep.x, ep.y, DRAGON.wingBone);
      // Slightly thicker: draw adjacent line
      drawLine(ctx, wbx, wby + 1, ep.x, ep.y + 1, DRAGON.wingBone);
    }

    // Wing bone tip claws (first 2 bones)
    for (let b = 0; b < 2; b++) {
      const ep = boneEndpoints[b];
      setPixel(ctx, ep.x + side, ep.y, DRAGON.claw);
      setPixel(ctx, ep.x + side, ep.y + 1, DRAGON.claw);
    }
  }
```

- [ ] **Step 2: Generate and verify**

Run: `cd /Users/lio/.superset/worktrees/grid-line-defense-pvp/lio/tasteful-magnolia && bun run scripts/generate-assets/generate-all.ts 2>&1 | tail -5`

Expected: 에러 없음. 출력 이미지에서 좌우 대칭 날개가 몸체 옆에 보여야 함.

- [ ] **Step 3: Visual check**

Read `titan-boss.png` 이미지 — 어두운 몸체 + 꼬리 + 좌우 날개.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-assets/generate-units.ts
git commit -m "feat: add dragon boss wings with membrane and bone structure"
```

---

### Task 4: Add Legs + Neck + Head + Horns + Eyes

**Files:**
- Modify: `scripts/generate-assets/generate-units.ts` — drawBossFrame 내부, wing 코드 이후

- [ ] **Step 1: Add legs, neck, head after wings**

Wings 코드 바로 아래에 추가:

```typescript
  // === 7. Back legs (toward tail = upper area) ===
  for (const side of [-1, 1] as const) {
    const lx = cx + side * 14;
    const ly = bcy - 8;
    const le = -legAnim; // opposite phase to front legs
    drawRect(ctx, lx + (side > 0 ? 0 : -5), ly + le, 5, 10, DRAGON.bodyDark);
    // Claws (3)
    for (let c = 0; c < 3; c++) {
      setPixel(ctx, lx + side * (3 + c), ly + le + 9 + c, DRAGON.claw);
    }
  }

  // === 8. Front legs (toward head = lower area) ===
  for (const side of [-1, 1] as const) {
    const lx = cx + side * 12;
    const ly = bcy + 6;
    const le = legAnim; // main phase
    drawRect(ctx, lx + (side > 0 ? 0 : -5), ly + le, 5, 10, DRAGON.bodyMid);
    for (let c = 0; c < 3; c++) {
      setPixel(ctx, lx + side * (3 + c), ly + le + 9 + c, DRAGON.claw);
    }
  }

  // === 9. Neck connection ===
  fillEllipse(ctx, cx, bcy + bh - 2, 8, 5, DRAGON.body);

  // === 10. Head (bottom — facing downward, movement direction) ===
  const headY = bcy + bh + 6 + headBob;

  // Head shape (hexagonal, snout pointing down)
  // Top of head (wider)
  fillEllipse(ctx, cx, headY, 9, 6, DRAGON.body);
  // Snout (narrower, extends down)
  for (let dy = 0; dy < 6; dy++) {
    const hw = Math.round(5 - dy * 0.7);
    drawRect(ctx, cx - hw, headY + 4 + dy, hw * 2 + 1, 1, dy < 3 ? DRAGON.body : DRAGON.bodyDark);
  }
  // Head center ridge
  drawLine(ctx, cx, headY - 4, cx, headY + 9, DRAGON.bodyDeep);
  // Head dark top half
  for (let dy = -5; dy < 0; dy++) {
    const hw = Math.round(4 + dy * 0.3);
    if (hw > 0) drawRect(ctx, cx - hw, headY + dy, hw * 2 + 1, 1, DRAGON.bodyDark);
  }

  // Horns (sweeping upward/outward — trailing behind the head)
  for (const side of [-1, 1] as const) {
    // Horn base to tip
    drawLine(ctx, cx + side * 6, headY - 2, cx + side * 14, headY - 8, DRAGON.horn);
    drawLine(ctx, cx + side * 6, headY - 1, cx + side * 14, headY - 7, DRAGON.horn);
    // Horn tip highlight
    setPixel(ctx, cx + side * 14, headY - 8, DRAGON.hornTip);
    setPixel(ctx, cx + side * 13, headY - 8, DRAGON.hornTip);
  }

  // Eyes (on sides of head, glowing)
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 4;
    const ey = headY + 1;
    const eColor = rage ? DRAGON.eyeRage : DRAGON.eyeNorm;
    // Eye glow
    addGlow(ctx, ex, ey, rage ? 5 : 3, eColor, rage ? 0.3 : 0.2);
    // Eye dot
    setPixel(ctx, ex, ey, eColor);
    setPixel(ctx, ex + 1, ey, eColor);
    // Eye highlight
    setPixel(ctx, ex + 1, ey - 1, '#ffffff');
  }

  // Nostrils
  setPixel(ctx, cx - 1, headY + 8, DRAGON.bodyDeep);
  setPixel(ctx, cx + 1, headY + 8, DRAGON.bodyDeep);
```

- [ ] **Step 2: Generate and verify**

Run: `cd /Users/lio/.superset/worktrees/grid-line-defense-pvp/lio/tasteful-magnolia && bun run scripts/generate-assets/generate-all.ts 2>&1 | tail -5`

Expected: 에러 없음.

- [ ] **Step 3: Visual check**

Read `titan-boss.png` — 완전한 드래곤 실루엣 (몸체+꼬리+날개+다리+머리+뿔+눈) 확인.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-assets/generate-units.ts
git commit -m "feat: add dragon boss legs, head, horns, and eyes"
```

---

### Task 5: Add Fire Breath + Rage Overlay + Final Polish

**Files:**
- Modify: `scripts/generate-assets/generate-units.ts` — drawBossFrame 내부, head 코드 이후 (함수 끝)

- [ ] **Step 1: Add fire breath, smoke, and rage overlay**

Nostrils 코드 바로 아래, 함수 닫는 `}` 전에 추가:

```typescript
  // === 11. Fire breath (downward — toward movement direction) ===
  // Nostril smoke (always)
  setPixel(ctx, cx - 1, headY + 10, hexToRgba(DRAGON.smoke, 0.3));
  setPixel(ctx, cx + 1, headY + 11, hexToRgba(DRAGON.smoke, 0.25));

  // Periodic fire breath (4-frame cycle)
  const breathCycle = frame % 4;
  if (breathCycle >= 1) {
    const fireLen = rage ? breathCycle * 5 : breathCycle * 3;
    const fireBaseY = headY + 10;
    // Fire stream — 3 layers
    for (let fy = 0; fy < fireLen; fy++) {
      const t = fy / fireLen;
      const halfW = Math.round(2 * (1 - t * 0.5)); // narrows toward tip
      const colors = [DRAGON.fireCore, rage ? DRAGON.fireRed : DRAGON.fireOrange, DRAGON.fireDark];
      const c = colors[Math.min(Math.floor(t * 3), 2)];
      const alpha = 0.8 - t * 0.4;
      for (let fx = -halfW; fx <= halfW; fx++) {
        // Slight wave
        const wave = Math.round(Math.sin(fy * 0.8 + phase * 3) * 1);
        setPixel(ctx, cx + fx + wave, fireBaseY + fy, hexToRgba(c, alpha));
      }
    }
    // Fire core (bright center)
    setPixel(ctx, cx, fireBaseY, DRAGON.fireCore);
    setPixel(ctx, cx, fireBaseY + 1, DRAGON.fireCore);

    // Smoke puffs at tip
    if (breathCycle >= 2) {
      setPixel(ctx, cx - 1, fireBaseY + fireLen + 1, hexToRgba(DRAGON.smoke, 0.2));
      setPixel(ctx, cx + 1, fireBaseY + fireLen + 2, hexToRgba(DRAGON.smoke, 0.15));
    }
  }

  // === 12. Rage overlay ===
  if (rage) {
    // Lava crack lines on body (5 lines)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + phase * 0.12;
      const r1 = bw * 0.3;
      const r2 = bw * 0.8;
      const x1 = Math.round(cx + Math.cos(a) * r1);
      const y1 = Math.round(bcy + Math.sin(a) * bh * 0.3);
      const x2 = Math.round(cx + Math.cos(a + 0.3) * r2);
      const y2 = Math.round(bcy + Math.sin(a + 0.3) * bh * 0.7);
      drawLine(ctx, x1, y1, x2, y2, hexToRgba('#e04020', 0.2));
    }

    // Body edge glow
    for (let a = 0; a < Math.PI * 2; a += 0.15) {
      const edgeX = Math.round(cx + Math.cos(a) * (bw + 2));
      const edgeY = Math.round(bcy + Math.sin(a) * (bh + 2));
      setPixel(ctx, edgeX, edgeY, hexToRgba(DRAGON.fireRed, 0.15));
    }
  }
```

- [ ] **Step 2: Remove the placeholder comment**

drawBossFrame 내의 `// (Wings, Legs, Head, Fire — added in subsequent tasks)` 및 `// Placeholder comment — will be replaced in Task 3-5` 주석이 있다면 제거 (Task 2에서 남긴 것).

- [ ] **Step 3: Generate both assets**

Run: `cd /Users/lio/.superset/worktrees/grid-line-defense-pvp/lio/tasteful-magnolia && bun run scripts/generate-assets/generate-all.ts 2>&1 | grep -E 'titan-boss|error|Error'`

Expected:
```
  wrote .../titan-boss.png (768x96)
  wrote .../titan-boss-rage.png (768x96)
```
에러 없음.

- [ ] **Step 4: Visual verification — Phase 1**

Read `packages/web-shell/public/assets/units/titan-boss.png`

Expected: 8프레임 스프라이트시트. 어두운 드래곤 — 꼬리 위, 날개 좌우, 머리 아래, 화염 브레스 아래로. 각 프레임에서 날개/꼬리/다리 위치가 미세하게 다름.

- [ ] **Step 5: Visual verification — Phase 2 (Rage)**

Read `packages/web-shell/public/assets/units/titan-boss-rage.png`

Expected: Phase 1보다 붉은 톤. 눈 글로우 강하고, 용암 균열선 보이고, 꼬리 끝 화염.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-assets/generate-units.ts
git commit -m "feat: complete dragon boss with fire breath and rage effects"
```

---

### Task 6: In-Game Verification + Adjustments

**Files:**
- Possibly adjust: `scripts/generate-assets/generate-units.ts` (drawBossFrame 내부 수치 미세 조정)

- [ ] **Step 1: Start dev server**

Run: `cd /Users/lio/.superset/worktrees/grid-line-defense-pvp/lio/tasteful-magnolia && bun run dev`

Open browser and play to boss wave (wave 5 or 10).

- [ ] **Step 2: Verify in-game rendering**

Check:
- 드래곤 실루엣이 인게임에서 드래곤답게 보이는가
- 다른 유닛 대비 보스 크기감이 적절한가 (2배 크기)
- Phase 1 → Phase 2 전환 시 시각적 차이가 명확한가
- 날개 펄럭/꼬리 흔들림/화염 애니메이션이 부드러운가

- [ ] **Step 3: Adjust if needed**

가능한 조정 포인트:
- 몸체/날개 크기 비율 (bw, bh, boneLens 값)
- 화염 길이/빈도 (fireLen, breathCycle 조건)
- 색상 명도 (DRAGON 팔레트 값)
- 눈 글로우 크기 (addGlow radius)

- [ ] **Step 4: Re-generate if adjusted**

Run: `bun run scripts/generate-assets/generate-all.ts`

- [ ] **Step 5: Final commit**

```bash
git add scripts/generate-assets/generate-units.ts
git commit -m "fix: adjust dragon boss proportions after in-game testing"
```

(이 단계에서 변경 없으면 커밋 스킵)

---

## PLAN REVIEW REPORT

### 스펙 정합성 (Game Spec Alignment) — 하드 게이트

| Phase | 검증 문서 수 | PASS | DRIFT | CONFLICT |
|-------|-----------|------|-------|----------|
| CEO   | 1 (01-GDD) | 3 | 0 | 0 |
| Design| 1 (07-asset-def) | 6 | 1 | 0 |
| Eng   | 0 | — | — | — |

**스펙 정합성: ✅ ALL PASS** (DRIFT 1건은 경고, 블로킹 아님)

### ⚠️ DRIFT-1: 팔레트 원천 이탈
- **문서**: 07-asset-definition §1
- **스펙**: "색상 팔레트: shared.ts의 PALETTE 상수"
- **Plan**: DRAGON 로컬 상수를 generate-units.ts에 추가 (22색)
- **권고**: 보스 전용이므로 합리적. 스펙 §6에 명시 추가 권고.

### 버그 2건 (구현 시 수정 필요)

**BUG-1: 꼬리 프레임 밖 벗어남**
- Task 2의 `tailBaseY - t * 30`이 y=-2까지 도달. 스페이드는 y=-6.
- **수정**: `t * 30` → `t * 24` 또는 `cy`를 48로 조정.

**BUG-2: bodyBob 실질 효과 없음**
- `Math.round(Math.sin(phase * 2) * 0.5)` → 대부분 0.
- **수정**: amplitude를 1.0으로 증가하거나 Math.round 제거.

### 미학 리뷰 결과
- **미학 종합**: 9.0/10
- **AI Slop 위험도**: 9/10 (구체적 명세, 모호성 없음)

### VERDICT: ✅ APPROVED WITH 2 BUGS TO FIX
Plan의 방향과 구조는 건전. 구현 시 BUG-1, BUG-2를 수정하면 됨.
