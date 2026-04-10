# 타워 에셋 강화 — 파일럿 8종 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Steps use `- [ ]` checkbox syntax.

**Goal:** GitHub 이슈 #73·#75·#52를 하나의 파일럿으로 묶어 파이프라인을 검증한다. 8개 대표 타워(archer / flame_tower / dragon_nest / wind_spire / arcane_spire / world_tree / celestial / divine_throne)에 대해 (1) 128×160 고해상도 procedural 스프라이트, (2) layered grade 데코레이션(normal/rare/unique/epic 4종), (3) Phaser 런타임 idle tween, (4) 로비 승급 연출을 붙여 "Graphics+이모지 수준" 기준선을 확실히 넘는다. 특히 기존 "별 모양 일색"이었던 6개 T3~T5 타워를 각 이름에 맞는 개성 있는 실루엣으로 전면 재작성한다.

**Architecture:** 빌드 타임에 `scripts/generate-assets/generate-towers.ts`를 확장해 파일럿 8개 타워에 대해서만 새 draw 함수 + 공통 grade 데코레이션 헬퍼(rare/unique/epic)를 돌린다. 해상도 2배 업(64×80 → 128×160), 출력은 `tower-{id}.png` + `tower-{id}-{grade}.png` + `tower-{id}-fire.png`. 런타임은 `TowerSystem.placeTower`에서 owned grade를 읽어 올바른 텍스처 키를 선택하고, sprite에 sine yoyo scale tween을 건다. 로비 승급 연출은 `TowerBottomSheet`에서 promotion 성공 시 one-shot CSS/SVG 오버레이 컴포넌트로 재생. 파일럿 외 10개 타워는 기존 에셋을 fallback으로 유지 (regression 0건 기준).

**Tech Stack:** TypeScript, `@napi-rs/canvas` (빌드 타임 렌더링), Phaser 3 (런타임), React 18 + Zustand (로비), Vitest (테스트), pnpm monorepo.

**Plan mode note:** 이 파일은 plan mode 제약으로 `/Users/lio/.claude-personal/plans/resilient-plotting-anchor.md`에 쓰여 있다. 실행 단계에서 `docs/superpowers/plans/2026-04-09-tower-asset-pilot.md`로 이동해 기존 컨벤션과 맞출 것.

---

## Context

**왜 이 작업을 하는가.**
- 현재 타워 스프라이트(64×80 procedural)는 너무 단순하다. archer는 회색 돌탑에 빨간 깃발 하나, dragon_nest는 "별 모양"이 전부라 도저히 드래곤 둥지로 안 보인다. 사용자 메모리 `feedback_ui_quality`에도 "Graphics+이모지 수준은 허접" 명시.
- GitHub 이슈 3개가 같은 시각 파이프라인을 건드린다 — #73(전체 화질 상향), #75(idle/attack/upgrade 애니), #52(승급 시스템). 한 번에 묶어 파이프라인을 확립한 뒤 나머지 15개 타워로 확장하는 게 효율적.
- 데이터 레이어(`OwnedTower.grade`, `owned.level`)는 이미 존재한다 — 시각 레이어만 비어 있다.

**스코프 결정 (사용자 확정).**
- 포함: #75 + #73 + #52
- 제외(이번 파일럿): #73의 몬스터 경로, 나머지 10개 타워, in-match 레벨업(1~50) 시각화, 각성(awakening 0/1/2/3, 별도 이슈 #108)
- 방식: **파일럿 8개** 먼저, 승인 후 나머지 10개 확장은 후속 plan
- 품질 접근: **procedural 심화** — 현 파이프라인 유지
- grade 표현: **레이어드 데코레이션** (공통 base + grade별 layer)
- idle: **Phaser runtime tween** (에셋 추가 없음)
- upgrade 연출: **로비 승급 연출 one-shot만** (인게임 레벨업 제외)

**파일럿 타워 선정 및 목표 실루엣 (사용자 확정).**

| id | tier | 한글 | 현재 | 목표 실루엣 |
|---|---|---|---|---|
| `archer` | T1 | 궁수탑 | 회색 돌탑 + 깃발 | 돌계단 베이스 + 배럴 본체 + 배틀먼트 4칸 + 아처 슬릿 + 깃발 |
| `flame_tower` | T3 | 화염탑 | 별 + 빨강 | 현무암 베이스 + 6각 용광로 + 상단 고정 화염 + 열기 균열 |
| `dragon_nest` | T4 | 드래곤 둥지 | 별 모양만 | 돌 둥지 ring 3층 + 용 알 3개(크기/색상 다름) + 뼈 조각 2-3개 + 상승 증기 |
| `wind_spire` | T3 | 바람 첨탑 | 별 + 청록 | 얇은 대리석 첨탑 + 상단 풍차 4날개 + 소용돌이 구름 띠 + 청록 바람 자취 |
| `arcane_spire` | T4 | 비전 첨탑 | 별 + 보라 | 어두운 보라 석조 마법사 탑 + 떠있는 마법 구 + 공전 룬 기호 3개 + 창문 마법 빛 |
| `world_tree` | T4 | 세계수 | 별 + 초록 | 울퉁불퉁 나무 기둥 + 풍성한 원형 잎 크라운 + 뿌리 + 잎 사이 생명 스파클 |
| `celestial` | T5 | 천상의 별 | 별 + 남색 | 떠있는 은하 구(성운 노이즈) + 공전 별 4-5개 + 남색 아우라 + 공중 부양 |
| `divine_throne` | T5 | 신성한 옥좌 | 별 + 금색 | 대리석 3단 계단 + 황금 옥좌 + 후광 원반 + 천사 날개 2쌍 + 금빛 글로우 |

핵심: 기존 T3~T5 star-shape 6개가 전부 비슷비슷해서 구분이 안 됨. 이 재작성이 파일럿 확장의 핵심 가치.

---

## File Structure

**신규 파일**
- `scripts/generate-assets/towers/pilot-draw.ts` — 파일럿 8개 타워 전용 고해상도 draw 함수 (`drawArcherHQ`, `drawFlameTowerHQ`, `drawDragonNestHQ`, `drawWindSpireHQ`, `drawArcaneSpireHQ`, `drawWorldTreeHQ`, `drawCelestialHQ`, `drawDivineThroneHQ`). 재사용 draw primitive는 기존 `./shared`에서 가져와 확장.
- `scripts/generate-assets/towers/grade-decoration.ts` — 공통 grade overlay 함수 (`drawRareBanner`, `drawUniqueCrystal`, `drawEpicAura`). 입력: ctx, ox, tower color. 이 헬퍼는 이후 나머지 15개 타워에도 그대로 적용될 것을 전제로 설계.
- `packages/web-shell/src/components/lobby/tabs/collection/GradePromotionOverlay.tsx` — 승급 성공 시 1.2s one-shot 오버레이 (flash + particle + 새 grade 스프라이트 reveal).
- `scripts/generate-assets/__tests__/tower-pilot.test.ts` — 파일럿 에셋 파일 존재 + 사이즈 검증.
- `packages/phaser-game/tests/towerGradeTexture.test.ts` — `placeTower`가 grade에 맞는 텍스처 키를 고르는지 검증.

**수정 파일**
- `scripts/generate-assets/generate-towers.ts` — pilot 분기 추가, 해상도 업, grade variant 출력 루프. 기존 10개 타워 경로는 그대로(regression 0건).
- `packages/web-shell/public/assets/asset-manifest.json` — generate-towers가 출력하는 새 엔트리 (자동 생성이므로 수작업 편집 금지, 재생성으로 반영).
- `packages/phaser-game/src/systems/TowerSystem.ts:146` — 텍스처 키를 grade-aware로, idle tween 주입, 정리 시 tween stop.
- `packages/web-shell/src/components/lobby/tabs/collection/TowerBottomSheet.tsx` — promotion 성공 콜백에서 `GradePromotionOverlay` 마운트.
- `docs/game-spec/07-asset-definition.md` — 타워 에셋 섹션에 "파일럿 8종은 128×160, 4 grade variant" 스펙 추가 (Source of Truth 갱신).

**산출물 요약:** 8 타워 × 4 grade = 32 정적 스프라이트 + 8 fire 스프라이트시트 = **총 40 에셋 파일** (+ webp 포함 시 80)

---

## Task 1: 파일럿 draw 함수 모듈 스켈레톤 + 해상도 업 상수

**Files:**
- Create: `scripts/generate-assets/towers/pilot-draw.ts`
- Modify: `scripts/generate-assets/generate-towers.ts` (export `PILOT_IDS`, `HQ_WIDTH`, `HQ_HEIGHT` 상수)

- [ ] **Step 1: 파일 생성 + 상수 정의**

`scripts/generate-assets/generate-towers.ts` 상단에 추가:
```ts
export const PILOT_IDS = [
  'archer',
  'flame_tower',
  'dragon_nest',
  'wind_spire',
  'arcane_spire',
  'world_tree',
  'celestial',
  'divine_throne',
] as const;
export type PilotId = (typeof PILOT_IDS)[number];
export const HQ_WIDTH = 128;
export const HQ_HEIGHT = 160;
```

`scripts/generate-assets/towers/pilot-draw.ts` 신규 — 8개 draw 함수 전부 스텁으로 선언:
```ts
import type { SKRSContext2D } from '@napi-rs/canvas';
import { PALETTE, drawIsoShadow } from '../shared';

export function drawArcherHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 2 */ }
export function drawFlameTowerHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 3 */ }
export function drawDragonNestHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 4 */ }
export function drawWindSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 4a */ }
export function drawArcaneSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 4b */ }
export function drawWorldTreeHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 4c */ }
export function drawCelestialHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 4d */ }
export function drawDivineThroneHQ(ctx: SKRSContext2D, ox: number, oy: number): void { /* Task 4e */ }
```

- [ ] **Step 2: 타입 체크 통과 확인**

Run: `pnpm -w typecheck`
Expected: 에러 없음. (함수 body 비어도 타입만 맞으면 OK)

- [ ] **Step 3: 커밋**

```bash
git add scripts/generate-assets/generate-towers.ts scripts/generate-assets/towers/pilot-draw.ts
git commit -m "chore(assets): scaffold tower pilot draw module"
```

---

## Task 2: archer HQ draw 함수 구현 (128×160)

**Files:**
- Modify: `scripts/generate-assets/towers/pilot-draw.ts`

**목표 실루엣:** 회색 돌탑 본체 + 상단 배틀먼트(4칸) + 아래로 이어진 돌계단 베이스 + 측면 창문(아처 슬릿) 2개 + 깃발. 픽셀 그레이 팔레트 3단계(`stoneDark`/`stone`/`stoneLight`) + 목재 1단계 + 레드 깃발. 그림자는 `drawIsoShadow`로 ellipse.

- [ ] **Step 1: 실패하는 검증 테스트 작성**

Create `scripts/generate-assets/__tests__/tower-pilot.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { generate } from '../generate-towers';

describe('tower pilot assets', () => {
  beforeAll(async () => {
    await generate();
  });

  it('archer.png is 128x160 and non-empty', () => {
    const path = 'packages/web-shell/public/assets/towers/archer.png';
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeGreaterThan(1500);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: FAIL — 파일 사이즈가 작거나 기존 64×80 저해상도 상태.

- [ ] **Step 3: drawArcherHQ 구현**

`scripts/generate-assets/towers/pilot-draw.ts`의 `drawArcherHQ`를 채운다:
```ts
export function drawArcherHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 132;
  // 그림자
  drawIsoShadow(ctx, cx, baseY + 10, 38, 12, 0.45);
  // 돌계단 베이스 (3단)
  drawSteppedStoneBase(ctx, cx, baseY, 40, 3);
  // 타워 본체 — 배럴 실루엣 + 3단계 세로 쉐이딩
  drawTowerBarrel(ctx, cx, oy + 36, 22, 92);
  // 배틀먼트 (4칸 notches)
  drawBattlements(ctx, cx, oy + 30, 22, 4);
  // 아처 슬릿 2개 (앞면 + 측면)
  drawArrowSlit(ctx, cx - 3, oy + 74, 2, 10);
  drawArrowSlit(ctx, cx + 9, oy + 82, 2, 8);
  // 목재 깃대 + 빨간 깃발
  drawFlagPole(ctx, cx + 12, oy + 8, 24, '#c03020');
  // 하이라이트 라인
  drawEdgeHighlight(ctx, cx - 22, oy + 36, cx - 22, oy + 128, PALETTE.stoneLight, 0.4);
}
```

`drawSteppedStoneBase`, `drawTowerBarrel`, `drawBattlements`, `drawArrowSlit`, `drawFlagPole`, `drawEdgeHighlight`는 같은 파일 내 로컬 헬퍼로 작성. 각 ~15줄. 기존 `drawIsoCube`/`setPixel`/`drawRect` 활용.

- [ ] **Step 4: 재생성 + 시각 확인**

Run: `pnpm --filter @gld/asset-scripts generate:towers`
그리고 Read tool로 `packages/web-shell/public/assets/towers/archer.png` 확인. 기존보다 확실히 커지고 디테일이 늘어야 함.

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add scripts/generate-assets/towers/pilot-draw.ts scripts/generate-assets/__tests__/tower-pilot.test.ts packages/web-shell/public/assets/towers/archer.png packages/web-shell/public/assets/towers/archer.webp
git commit -m "feat(assets): high-quality archer tower 128x160"
```

---

## Task 3: flame_tower HQ draw 함수

**Files:**
- Modify: `scripts/generate-assets/towers/pilot-draw.ts`
- Modify: `scripts/generate-assets/__tests__/tower-pilot.test.ts`

**목표 실루엣:** 어두운 현무암 베이스 + 검붉은 용광로 몸통(hexagonal iso) + 꼭대기 화로에서 고정 화염 실루엣 + 측면 열기 균열(crack) 2-3개. 컬러 팔레트: `#2b0f08`/`#5b2512`/`#c54120`/`#f5b23b` + 흰색 하이라이트. idle 화염은 생성 시각만, 애니는 런타임 tween.

- [ ] **Step 1: 검증 테스트 추가**

`tower-pilot.test.ts`에 추가:
```ts
it('flame_tower.png is 128x160', () => {
  const path = 'packages/web-shell/public/assets/towers/flame_tower.png';
  expect(existsSync(path)).toBe(true);
  expect(statSync(path).size).toBeGreaterThan(1800);
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: FAIL on flame_tower assertion.

- [ ] **Step 3: drawFlameTowerHQ 구현**

```ts
export function drawFlameTowerHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 132;
  drawIsoShadow(ctx, cx, baseY + 10, 42, 13, 0.55);
  drawLavaBase(ctx, cx, baseY, 44);
  drawHexBody(ctx, cx, oy + 44, 26, 88, ['#2b0f08', '#5b2512', '#3a1609']);
  drawForgeMouth(ctx, cx, oy + 38, 18);
  drawStaticFlame(ctx, cx, oy + 20, 22, ['#c54120', '#f5b23b', '#ffe27a']);
  drawHeatCracks(ctx, cx, oy + 80, 24, 3);
  drawEdgeHighlight(ctx, cx - 24, oy + 44, cx - 24, oy + 130, '#c54120', 0.35);
}
```

로컬 헬퍼: `drawLavaBase`(다크 돌 + 오렌지 균열), `drawHexBody`(6각 실루엣 iso), `drawForgeMouth`(블랙 홀 + 붉은 glow), `drawStaticFlame`(3색 레이어드 tongue 4개), `drawHeatCracks`(불규칙 균열 라인).

- [ ] **Step 4: 재생성 + 확인**

Run: `pnpm --filter @gld/asset-scripts generate:towers`
Read로 `flame_tower.png` 시각 점검.

- [ ] **Step 5: 테스트 PASS**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add scripts/generate-assets/towers/pilot-draw.ts scripts/generate-assets/__tests__/tower-pilot.test.ts packages/web-shell/public/assets/towers/flame_tower.png packages/web-shell/public/assets/towers/flame_tower.webp
git commit -m "feat(assets): high-quality flame_tower 128x160"
```

---

## Task 4: dragon_nest HQ draw 함수

**Files:**
- Modify: `scripts/generate-assets/towers/pilot-draw.ts`
- Modify: `scripts/generate-assets/__tests__/tower-pilot.test.ts`

**목표 실루엣:** 거대한 돌 둥지(원형 stacked rocks) + 둥지 안에 반짝이는 용 알 3개(서로 다른 크기, 금빛/핏빛) + 둥지 가장자리에 말라붙은 뼈 2-3개 + 하단 연기/증기. "dragon nest"로 단번에 읽혀야 함. Star shape 완전히 버리고 재작성.

- [ ] **Step 1: 검증 테스트 추가**

```ts
it('dragon_nest.png is 128x160 and substantially larger than legacy', () => {
  const path = 'packages/web-shell/public/assets/towers/dragon_nest.png';
  expect(existsSync(path)).toBe(true);
  expect(statSync(path).size).toBeGreaterThan(2000);
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: FAIL.

- [ ] **Step 3: drawDragonNestHQ 구현**

```ts
export function drawDragonNestHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 130;
  drawIsoShadow(ctx, cx, baseY + 12, 44, 14, 0.5);
  drawNestStackedRocks(ctx, cx, baseY, 46, 18);    // 둥근 둥지 벽
  drawNestInterior(ctx, cx, oy + 90, 32, '#2b1a0a'); // 짙은 내부
  drawSteam(ctx, cx, oy + 74, 12);                   // 상승 증기
  drawDragonEgg(ctx, cx - 10, oy + 96, 10, '#c04a28', '#f2a13a'); // 큰 알
  drawDragonEgg(ctx, cx + 10, oy + 100, 8, '#7a2a12', '#d97a20'); // 작은 알
  drawDragonEgg(ctx, cx, oy + 88, 7, '#4a1a08', '#b85a15');       // 뒤쪽 알
  drawBoneFragment(ctx, cx - 20, oy + 114, 10);
  drawBoneFragment(ctx, cx + 18, oy + 112, 8);
  drawEggGlow(ctx, cx - 10, oy + 96, 12, '#ffdc80', 0.35);
}
```

로컬 헬퍼: `drawNestStackedRocks`(겹쳐진 돌 ring 3층), `drawNestInterior`(어두운 ellipse fill), `drawSteam`(흰 노이즈 ellipse), `drawDragonEgg`(알 본체 + 점박이 무늬 + specular 하이라이트), `drawBoneFragment`(흰/회색 뼈 조각), `drawEggGlow`(addGlow wrapper).

- [ ] **Step 4: 재생성 + 확인**

Run: `pnpm --filter @gld/asset-scripts generate:towers`
Read로 `dragon_nest.png` 시각 점검. "드래곤 둥지"로 읽혀야 함.

- [ ] **Step 5: 테스트 PASS**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add scripts/generate-assets/towers/pilot-draw.ts scripts/generate-assets/__tests__/tower-pilot.test.ts packages/web-shell/public/assets/towers/dragon_nest.png packages/web-shell/public/assets/towers/dragon_nest.webp
git commit -m "feat(assets): high-quality dragon_nest 128x160 (nest + eggs, replaces star shape)"
```

---

## Task 4a: wind_spire HQ draw 함수

**Files:** `scripts/generate-assets/towers/pilot-draw.ts`, test file

**목표 실루엣:** 얇고 높은 흰 대리석 첨탑(가늘고 tall) + 상단에 회전하는 풍차 4날개 실루엣(정지 프레임 — 런타임 tween으로 회전) + 탑 중앙 주위에 소용돌이치는 구름 띠 2-3줄 + 바닥에 청록 바람 자취. 팔레트: `#e8ecef`/`#a8b5c0`/`#6bd4d0`/`#f0faff`.

- [ ] **Step 1: 테스트 추가**
```ts
it('wind_spire.png is 128x160', () => {
  expect(existsSync('packages/web-shell/public/assets/towers/wind_spire.png')).toBe(true);
  expect(statSync('packages/web-shell/public/assets/towers/wind_spire.png').size).toBeGreaterThan(1600);
});
```

- [ ] **Step 2: 실패 확인**
Run: `pnpm --filter @gld/asset-scripts test tower-pilot` → FAIL

- [ ] **Step 3: drawWindSpireHQ 구현**
```ts
export function drawWindSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 134;
  drawIsoShadow(ctx, cx, baseY + 8, 32, 10, 0.35);
  drawMarbleBase(ctx, cx, baseY, 28, 3);           // 3단 대리석 기단
  drawThinSpire(ctx, cx, oy + 44, 14, 88, '#e8ecef', '#a8b5c0'); // 얇은 첨탑 본체
  drawSpireWindows(ctx, cx, oy + 58, 3);           // 수직 창문 3개
  drawWindmillBlades(ctx, cx, oy + 32, 22);        // 풍차 4날개 (정지)
  drawSwirlClouds(ctx, cx, oy + 72, 28, 2);        // 소용돌이 구름 2줄
  drawWindTrails(ctx, cx, baseY - 4, 24, '#6bd4d0'); // 바람 자취
}
```
로컬 헬퍼: `drawMarbleBase`, `drawThinSpire`, `drawSpireWindows`, `drawWindmillBlades`, `drawSwirlClouds`, `drawWindTrails`.

- [ ] **Step 4: 재생성 + 테스트 PASS + 커밋**
```bash
git commit -m "feat(assets): high-quality wind_spire 128x160 (marble spire + windmill)"
```

---

## Task 4b: arcane_spire HQ draw 함수

**Files:** `scripts/generate-assets/towers/pilot-draw.ts`, test file

**목표 실루엣:** 어두운 보라 석조 마법사 탑(긴 원통 + 원뿔 지붕) + 상단에 떠있는 마법 구(자주빛 radial glow) + 탑 주변 궤도에 떠다니는 룬 기호 3개 + 2-3개 창문에서 새어 나오는 보라 마법 빛. 팔레트: `#2a1a3e`/`#4a3068`/`#a855f7`/`#d8b4fe`.

- [ ] **Step 1: 테스트 추가**
```ts
it('arcane_spire.png is 128x160', () => {
  expect(existsSync('packages/web-shell/public/assets/towers/arcane_spire.png')).toBe(true);
  expect(statSync('packages/web-shell/public/assets/towers/arcane_spire.png').size).toBeGreaterThan(1700);
});
```

- [ ] **Step 2: 실패 확인**
Run: `pnpm --filter @gld/asset-scripts test tower-pilot` → FAIL

- [ ] **Step 3: drawArcaneSpireHQ 구현**
```ts
export function drawArcaneSpireHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 134;
  drawIsoShadow(ctx, cx, baseY + 8, 34, 11, 0.45);
  drawDarkStoneBase(ctx, cx, baseY, 32, '#2a1a3e', '#4a3068');
  drawWizardBody(ctx, cx, oy + 48, 20, 86, '#2a1a3e', '#4a3068');
  drawConeRoof(ctx, cx, oy + 32, 22, 16, '#1a0a2e');
  drawMagicWindow(ctx, cx - 6, oy + 70, '#a855f7'); // 왼쪽 창
  drawMagicWindow(ctx, cx + 6, oy + 82, '#a855f7'); // 오른쪽 창
  drawMagicWindow(ctx, cx, oy + 100, '#d8b4fe');    // 중앙 창
  drawFloatingOrb(ctx, cx, oy + 18, 6, '#a855f7', '#d8b4fe'); // 떠있는 구
  drawOrbitRune(ctx, cx - 16, oy + 28, '#d8b4fe');  // 룬 1
  drawOrbitRune(ctx, cx + 16, oy + 22, '#d8b4fe');  // 룬 2
  drawOrbitRune(ctx, cx + 4, oy + 12, '#d8b4fe');   // 룬 3
  addGlow(ctx, cx, oy + 18, 14, '#a855f7', 0.35);
}
```
로컬 헬퍼: `drawDarkStoneBase`, `drawWizardBody`, `drawConeRoof`, `drawMagicWindow`(작은 아치 + glow), `drawFloatingOrb`, `drawOrbitRune`(✦ 또는 ᚠ 스타일 pixel 심볼).

- [ ] **Step 4: 재생성 + 테스트 PASS + 커밋**
```bash
git commit -m "feat(assets): high-quality arcane_spire 128x160 (wizard tower + orb + runes)"
```

---

## Task 4c: world_tree HQ draw 함수

**Files:** `scripts/generate-assets/towers/pilot-draw.ts`, test file

**목표 실루엣:** 울퉁불퉁 거대 나무 기둥(bark 텍스처 suggest) + 풍성한 원형 잎 크라운(3색 그라데이션, 상단이 가장 밝음) + 지면으로 드러난 뿌리 2-3개 + 잎 사이 빛나는 생명 스파클(흰 점 5-6개) + 나무 허리에 작은 마법 룬. 팔레트: `#4a3018`/`#7a5828`/`#2d5f2d`/`#4ca04c`/`#8fe08f`.

- [ ] **Step 1: 테스트 추가**
```ts
it('world_tree.png is 128x160', () => {
  expect(existsSync('packages/web-shell/public/assets/towers/world_tree.png')).toBe(true);
  expect(statSync('packages/web-shell/public/assets/towers/world_tree.png').size).toBeGreaterThan(1800);
});
```

- [ ] **Step 2: 실패 확인**
Run: `pnpm --filter @gld/asset-scripts test tower-pilot` → FAIL

- [ ] **Step 3: drawWorldTreeHQ 구현**
```ts
export function drawWorldTreeHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 140;
  drawIsoShadow(ctx, cx, baseY + 6, 40, 12, 0.4);
  drawExposedRoots(ctx, cx, baseY, 38, 3);                 // 뿌리 3개
  drawGnarledTrunk(ctx, cx, oy + 80, 22, 56, '#4a3018', '#7a5828'); // 기둥
  drawTrunkRune(ctx, cx, oy + 108, '#8fe08f');            // 허리 룬
  drawFoliageCrown(ctx, cx, oy + 42, 44, ['#2d5f2d', '#4ca04c', '#8fe08f']); // 3색 잎
  drawLifeSparkles(ctx, cx, oy + 42, 44, 6, '#ffffff');   // 6개 스파클
}
```
로컬 헬퍼: `drawExposedRoots`(곡선 나무 뿌리), `drawGnarledTrunk`(불규칙 bark), `drawTrunkRune`(작은 녹색 심볼), `drawFoliageCrown`(원형 + 3색 레이어), `drawLifeSparkles`(랜덤 위치 흰 점).

- [ ] **Step 4: 재생성 + 테스트 PASS + 커밋**
```bash
git commit -m "feat(assets): high-quality world_tree 128x160 (gnarled trunk + foliage crown)"
```

---

## Task 4d: celestial HQ draw 함수

**Files:** `scripts/generate-assets/towers/pilot-draw.ts`, test file

**목표 실루엣:** 공중 부양하는 은하 구(보라-남색 그라데이션 + 성운 노이즈 점들) + 주변 공전 궤도에 작은 별 4-5개 (별마다 밝기 다름) + 은은한 남색 아우라(외곽 3겹 glow) + 하단에 돌 제단 **없음** — 순수 공중 부양 실루엣. 팔레트: `#0a0820`/`#2a1a5e`/`#5a3ab0`/`#fde68a`/`#ffffff`.

- [ ] **Step 1: 테스트 추가**
```ts
it('celestial.png is 128x160 and has floating silhouette', () => {
  expect(existsSync('packages/web-shell/public/assets/towers/celestial.png')).toBe(true);
  expect(statSync('packages/web-shell/public/assets/towers/celestial.png').size).toBeGreaterThan(1700);
});
```

- [ ] **Step 2: 실패 확인**
Run: `pnpm --filter @gld/asset-scripts test tower-pilot` → FAIL

- [ ] **Step 3: drawCelestialHQ 구현**
```ts
export function drawCelestialHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const cy = oy + 80;
  // 공중 부양이라 ground shadow 없음. 대신 하단에 soft 광 잔상
  addGlow(ctx, cx, oy + 140, 26, '#5a3ab0', 0.2);
  // 외곽 아우라 3겹
  addGlow(ctx, cx, cy, 44, '#2a1a5e', 0.25);
  addGlow(ctx, cx, cy, 32, '#5a3ab0', 0.35);
  addGlow(ctx, cx, cy, 22, '#2a1a5e', 0.5);
  // 은하 구
  drawGalaxyOrb(ctx, cx, cy, 18, '#0a0820', '#2a1a5e', '#5a3ab0');
  drawNebulaNoise(ctx, cx, cy, 18, '#ffffff', 12); // 12개 점
  // 공전 별 4개
  const starPositions: Array<[number, number, number]> = [
    [cx - 32, cy - 10, 3],   // 좌상
    [cx + 30, cy - 4, 2],    // 우
    [cx - 20, cy + 28, 2],   // 좌하
    [cx + 28, cy + 22, 3],   // 우하
    [cx + 4, cy - 34, 2],    // 상단
  ];
  for (const [x, y, size] of starPositions) {
    drawTwinkleStar(ctx, x, y, size, '#fde68a', '#ffffff');
  }
}
```
로컬 헬퍼: `drawGalaxyOrb`(radial gradient fill), `drawNebulaNoise`(seeded random 점), `drawTwinkleStar`(✦ 4-point 실루엣 + 흰 core).

- [ ] **Step 4: 재생성 + 테스트 PASS + 커밋**
```bash
git commit -m "feat(assets): high-quality celestial 128x160 (galaxy orb + orbiting stars)"
```

---

## Task 4e: divine_throne HQ draw 함수

**Files:** `scripts/generate-assets/towers/pilot-draw.ts`, test file

**목표 실루엣:** 대리석 3단 계단 + 황금 옥좌(등받이 높음, 팔걸이 2개, iso view) + 옥좌 뒤 거대 후광 원반(금빛 radial) + 상단에 천사 날개 2쌍 실루엣(옥좌보다 넓게 펼쳐짐) + 전체 금빛 글로우. 팔레트: `#f0ece0`/`#b8a878`/`#fde68a`/`#c09028`/`#ffffff`.

- [ ] **Step 1: 테스트 추가**
```ts
it('divine_throne.png is 128x160', () => {
  expect(existsSync('packages/web-shell/public/assets/towers/divine_throne.png')).toBe(true);
  expect(statSync('packages/web-shell/public/assets/towers/divine_throne.png').size).toBeGreaterThan(2000);
});
```

- [ ] **Step 2: 실패 확인**
Run: `pnpm --filter @gld/asset-scripts test tower-pilot` → FAIL

- [ ] **Step 3: drawDivineThroneHQ 구현**
```ts
export function drawDivineThroneHQ(ctx: SKRSContext2D, ox: number, oy: number): void {
  const cx = ox + 64;
  const baseY = oy + 148;
  drawIsoShadow(ctx, cx, baseY + 4, 46, 14, 0.55);
  drawMarbleSteps(ctx, cx, baseY, 44, 3, '#f0ece0', '#b8a878'); // 3단 계단
  drawHaloDisc(ctx, cx, oy + 46, 38, '#fde68a', '#c09028');     // 후광 원반
  drawAngelWingPair(ctx, cx, oy + 40, 52, 22, '#ffffff', '#f0ece0'); // 날개 2쌍
  drawGoldenThrone(ctx, cx, oy + 86, 26, 34, '#fde68a', '#c09028'); // 옥좌 본체
  drawThroneArmrests(ctx, cx, oy + 100, 22, '#c09028');         // 팔걸이
  // 전체 금빛 글로우
  addGlow(ctx, cx, oy + 70, 40, '#fde68a', 0.35);
  addGlow(ctx, cx, oy + 46, 26, '#ffffff', 0.3);
}
```
로컬 헬퍼: `drawMarbleSteps`(3단 iso 계단), `drawHaloDisc`(원 + radial glow), `drawAngelWingPair`(feather arch 2쌍), `drawGoldenThrone`(등받이 높은 의자 iso), `drawThroneArmrests`.

- [ ] **Step 4: 재생성 + 테스트 PASS + 커밋**
```bash
git commit -m "feat(assets): high-quality divine_throne 128x160 (marble steps + golden throne + wings)"
```

---

## Task 5: 공통 grade 데코레이션 헬퍼

**Files:**
- Create: `scripts/generate-assets/towers/grade-decoration.ts`

**설계:** 각 데코 함수는 `(ctx, cx, topY, width, height, accentColor) => void` 시그니처. 타워 실루엣 위에 overlay로 그려진다. **타워 형태에 독립적**이어야 함 (나머지 15개 타워에도 그대로 적용될 예정).

- [ ] **Step 1: 파일 생성**

```ts
import type { SKRSContext2D } from '@napi-rs/canvas';
import { PALETTE, drawRect, setPixel, addGlow, drawLine, fillCircle, hexToRgba } from '../shared';

export type GradeVariant = 'normal' | 'rare' | 'unique' | 'epic';

export interface GradeContext {
  cx: number;
  topY: number;
  width: number;
  height: number;
  accentColor: string;
}

export function drawGradeDecoration(
  ctx: SKRSContext2D,
  grade: GradeVariant,
  g: GradeContext,
): void {
  switch (grade) {
    case 'normal': return;
    case 'rare':   return drawRareBanner(ctx, g);
    case 'unique': return drawUniqueCrystal(ctx, g);
    case 'epic':   return drawEpicAura(ctx, g);
  }
}

// rare: 본체 허리에 청록 배너 + 흰 트림
function drawRareBanner(ctx: SKRSContext2D, g: GradeContext): void {
  const y = g.topY + Math.round(g.height * 0.55);
  drawRect(ctx, g.cx - Math.round(g.width * 0.55), y, g.width + 12, 6, '#2dd4bf');
  drawRect(ctx, g.cx - Math.round(g.width * 0.55), y + 6, g.width + 12, 1, '#ffffff');
  // V자 트림
  drawLine(ctx, g.cx - 4, y + 6, g.cx, y + 10, '#2dd4bf');
  drawLine(ctx, g.cx + 4, y + 6, g.cx, y + 10, '#2dd4bf');
}

// unique: 상단 위로 떠 있는 보라 크리스탈 + glow
function drawUniqueCrystal(ctx: SKRSContext2D, g: GradeContext): void {
  const cy = g.topY - 10;
  drawLine(ctx, g.cx - 5, cy + 6, g.cx, cy - 8, '#a855f7');
  drawLine(ctx, g.cx + 5, cy + 6, g.cx, cy - 8, '#a855f7');
  drawLine(ctx, g.cx - 5, cy + 6, g.cx + 5, cy + 6, '#a855f7');
  setPixel(ctx, g.cx, cy - 4, '#ffffff');
  setPixel(ctx, g.cx - 1, cy - 2, '#f0abfc');
  addGlow(ctx, g.cx, cy, 9, '#a855f7', 0.45);
  // rare banner도 같이 그려 진화감
  drawRareBanner(ctx, g);
}

// epic: 전체 아우라 + 금테 + 금안 파츠
function drawEpicAura(ctx: SKRSContext2D, g: GradeContext): void {
  // 크리스탈 + 배너 유지
  drawUniqueCrystal(ctx, g);
  // 외곽 금테 아우라
  addGlow(ctx, g.cx, g.topY + Math.round(g.height * 0.5), Math.round(g.width * 0.9), PALETTE.gold, 0.35);
  addGlow(ctx, g.cx, g.topY + Math.round(g.height * 0.5), Math.round(g.width * 0.6), PALETTE.magicGold ?? '#fde68a', 0.3);
  // 베이스 금띠
  drawRect(ctx, g.cx - Math.round(g.width * 0.6), g.topY + g.height - 4, g.width + 16, 2, PALETTE.gold);
  // 부유 파편 4개
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    fillCircle(
      ctx,
      Math.round(g.cx + Math.cos(a) * (g.width * 0.65)),
      Math.round(g.topY + g.height * 0.5 + Math.sin(a) * (g.height * 0.3)),
      2,
      hexToRgba(PALETTE.gold, 0.85),
    );
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm -w typecheck`
Expected: PASS. (`PALETTE.magicGold`가 없으면 fallback 처리 OK)

- [ ] **Step 3: 커밋**

```bash
git add scripts/generate-assets/towers/grade-decoration.ts
git commit -m "feat(assets): add layered grade decoration helpers (rare/unique/epic)"
```

---

## Task 6: generate-towers.ts에 파일럿 분기 + grade variant 생성

**Files:**
- Modify: `scripts/generate-assets/generate-towers.ts`

**목표:** `generate()` 루프에서 `PILOT_IDS.includes(tower.id)` 분기. 파일럿이면:
1. 128×160 canvas로 `drawArcherHQ`/`drawFlameTowerHQ`/`drawDragonNestHQ` 호출해 `{id}.png` 생성.
2. 동일 canvas 위에 `drawGradeDecoration('rare'|'unique'|'epic', ctx)` overlay해서 `{id}-rare.png`, `{id}-unique.png`, `{id}-epic.png` 3개 추가 생성.
3. fire 스프라이트시트는 128×160 프레임 × 8 = 1024×160 로 업사이즈. 기존 `drawFireFrame`을 HQ 좌표계에 맞춰 스케일 팩터 2 적용.
4. 파일럿이 아니면 기존 경로 그대로 (regression 0건).

- [ ] **Step 1: grade variant 출력 테스트 선작성**

`tower-pilot.test.ts`에 추가:
```ts
const GRADES = ['rare', 'unique', 'epic'] as const;
for (const id of ['archer', 'flame_tower', 'dragon_nest', 'wind_spire', 'arcane_spire', 'world_tree', 'celestial', 'divine_throne']) {
  for (const grade of GRADES) {
    it(`${id}-${grade}.png exists`, () => {
      expect(existsSync(`packages/web-shell/public/assets/towers/${id}-${grade}.png`)).toBe(true);
    });
  }
}

it('archer-fire.png is HQ spritesheet (1024x160)', () => {
  const path = 'packages/web-shell/public/assets/towers/archer-fire.png';
  expect(statSync(path).size).toBeGreaterThan(6000);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: FAIL — 9개의 grade variant 파일이 없음.

- [ ] **Step 3: `generate()` 루프에 파일럿 분기 추가**

```ts
// 상단 import 추가
import {
  drawArcherHQ, drawFlameTowerHQ, drawDragonNestHQ,
  drawWindSpireHQ, drawArcaneSpireHQ, drawWorldTreeHQ,
  drawCelestialHQ, drawDivineThroneHQ,
} from './towers/pilot-draw';
import { drawGradeDecoration, type GradeVariant } from './towers/grade-decoration';

const PILOT_DRAW: Record<string, (ctx: SKRSContext2D, ox: number, oy: number) => void> = {
  archer: drawArcherHQ,
  flame_tower: drawFlameTowerHQ,
  dragon_nest: drawDragonNestHQ,
  wind_spire: drawWindSpireHQ,
  arcane_spire: drawArcaneSpireHQ,
  world_tree: drawWorldTreeHQ,
  celestial: drawCelestialHQ,
  divine_throne: drawDivineThroneHQ,
};

function isPilot(id: string): id is PilotId {
  return (PILOT_IDS as readonly string[]).includes(id);
}
```

`generate()` 루프 내 static sprite 블록을 이렇게 대체:
```ts
if (isPilot(tower.id)) {
  const drawFn = PILOT_DRAW[tower.id];
  const gradeCtx = {
    cx: 64,
    topY: 36,
    width: 44,
    height: 96,
    accentColor: tower.color,
  };

  // normal
  {
    const { canvas, ctx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
    drawFn(ctx, 0, 0);
    saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}.png`);
    entries.push({ key: `tower-${tower.id}`, type: 'image', path: `assets/towers/${tower.id}.png` });
  }

  // rare / unique / epic
  for (const grade of ['rare', 'unique', 'epic'] as GradeVariant[]) {
    const { canvas, ctx } = makeCanvas(HQ_WIDTH, HQ_HEIGHT);
    drawFn(ctx, 0, 0);
    drawGradeDecoration(ctx, grade, gradeCtx);
    saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}-${grade}.png`);
    entries.push({
      key: `tower-${tower.id}-${grade}`,
      type: 'image',
      path: `assets/towers/${tower.id}-${grade}.png`,
    });
  }
} else {
  // 기존 64x80 경로 그대로 유지
  const { canvas, ctx } = makeCanvas(64, 80);
  renderWithGate(/* ... existing ... */);
  saveCanvas(canvas, `${OUTPUT_DIR}/${tower.id}.png`);
  entries.push({ key: `tower-${tower.id}`, type: 'image', path: `assets/towers/${tower.id}.png` });
}
```

fire 스프라이트시트 블록도 `isPilot` 분기 — 파일럿은 `makeCanvas(128 * FIRE_FRAME_COUNT, 160)` + `drawFireFrame` 좌표 × 2로 스케일. 파일럿 외는 기존 유지.

- [ ] **Step 4: 재생성**

Run: `pnpm --filter @gld/asset-scripts generate:towers`
Expected: 8 pilot × 4 variants = 32 파일 + 8 fire spritesheet + 나머지 10 타워 기존대로. `assertRequiredOutputs` 통과.

- [ ] **Step 5: 테스트 PASS**

Run: `pnpm --filter @gld/asset-scripts test tower-pilot`
Expected: 모든 assertion PASS.

- [ ] **Step 6: 자동 생성된 asset-manifest.json 반영**

Run: `pnpm --filter @gld/asset-scripts generate:all` (manifest 재계산 스크립트가 있다면)
또는 `generate-all.ts`가 manifest를 취합하는 경로 확인 후 실행.

- [ ] **Step 7: 커밋**

```bash
git add scripts/generate-assets/generate-towers.ts packages/web-shell/public/assets/towers/ packages/web-shell/public/assets/asset-manifest.json
git commit -m "feat(assets): pilot tower HQ rendering with grade variants"
```

---

## Task 7: Phaser assetManifest 로딩 확인 + 런타임 등록

**Files:**
- Read-only verify: `packages/phaser-game/src/assets/assetManifest.ts`
- Modify (if needed): manifest 관련 shared 타입/register 함수

**목표:** asset-manifest.json의 새 엔트리가 `preloadAssetSection` 경로로 자동 로드되는지 확인. 이미 `tower-archer-rare` 등이 `image` 타입으로 등록되면 기존 pipe가 자동 처리. section 추론만 문제 없으면 코드 변경 없음.

- [ ] **Step 1: 기존 preloadAssets 테스트 실행**

Run: `pnpm --filter @gld/phaser-game test preloadAssets`
Expected: PASS. 새 엔트리들이 manifest에 있으면 기존 test가 스냅샷 차이를 잡아낼 수 있음.

- [ ] **Step 2: manifest에 section 누락이 없는지 확인**

Read `packages/web-shell/public/assets/asset-manifest.json`에서 `tower-archer-rare`/`tower-flame_tower-unique` 등이 section을 갖는지 확인. 없으면 `inferAssetManifestSection` 로직이 `tower-` prefix를 처리하는지 확인.

- [ ] **Step 3: 필요시 section 추론 보정**

만약 grade suffix 엔트리가 잘못된 section으로 들어가면 `packages/shared/src/assets/*` 내 inferAssetManifestSection에 `key.startsWith('tower-')` 분기 확인/추가. 이미 있으면 skip.

- [ ] **Step 4: 런타임 통합 테스트**

Run: `pnpm --filter @gld/phaser-game test assetIntegration`
Expected: PASS.

- [ ] **Step 5: 커밋 (변경이 있으면)**

```bash
git add packages/shared packages/phaser-game
git commit -m "feat(assets): ensure grade variants route through existing asset loader"
```

(변경 없으면 이 step은 skip.)

---

## Task 8: TowerSystem.placeTower grade-aware 텍스처 키

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts:146`
- Create: `packages/phaser-game/tests/towerGradeTexture.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `packages/phaser-game/tests/towerGradeTexture.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveTowerTextureKey } from '../src/systems/TowerSystem';

describe('resolveTowerTextureKey', () => {
  it('normal grade → base key', () => {
    expect(resolveTowerTextureKey('archer', 'normal')).toBe('tower-archer');
  });
  it('rare → suffixed key when variant exists in pilot list', () => {
    expect(resolveTowerTextureKey('archer', 'rare')).toBe('tower-archer-rare');
  });
  it('non-pilot tower ignores grade (uses base)', () => {
    expect(resolveTowerTextureKey('plasma', 'rare')).toBe('tower-plasma');
  });
  it('epic on pilot', () => {
    expect(resolveTowerTextureKey('dragon_nest', 'epic')).toBe('tower-dragon_nest-epic');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @gld/phaser-game test towerGradeTexture`
Expected: FAIL — `resolveTowerTextureKey` 미정의.

- [ ] **Step 3: 구현**

`packages/phaser-game/src/systems/TowerSystem.ts` 파일 상단에 추가:
```ts
const TOWER_GRADE_VARIANT_IDS = new Set([
  'archer', 'flame_tower', 'dragon_nest',
  'wind_spire', 'arcane_spire', 'world_tree',
  'celestial', 'divine_throne',
]);

export function resolveTowerTextureKey(
  defId: string,
  grade: 'normal' | 'rare' | 'unique' | 'epic',
): string {
  if (grade === 'normal') return `tower-${defId}`;
  if (!TOWER_GRADE_VARIANT_IDS.has(defId)) return `tower-${defId}`;
  return `tower-${defId}-${grade}`;
}
```

`placeTower` 내 line 146-150을 교체:
```ts
const textureKey = resolveTowerTextureKey(towerDefId, towerGrade);
const sprite = this.scene.add.image(worldPos.x, worldPos.y, textureKey);
```

- [ ] **Step 4: 테스트 PASS**

Run: `pnpm --filter @gld/phaser-game test towerGradeTexture`
Expected: PASS.

- [ ] **Step 5: 전체 phaser-game 테스트 회귀 없음**

Run: `pnpm --filter @gld/phaser-game test`
Expected: ALL PASS.

- [ ] **Step 6: 커밋**

```bash
git add packages/phaser-game/src/systems/TowerSystem.ts packages/phaser-game/tests/towerGradeTexture.test.ts
git commit -m "feat(game): grade-aware tower texture resolution for pilot towers"
```

---

## Task 9: idle tween 주입

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts`

**목표:** 모든 placed tower에 미세한 scale pulse tween 적용. 파일럿 여부 무관 (런타임 효과이므로 15개 타워에도 동등). destroy 시 tween 정리.

- [ ] **Step 1: 테스트 작성**

`packages/phaser-game/tests/towerIdleTween.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
// 기존 테스트 셋업(scene mock) 재사용. 
// 실제 검증 포인트: placeTower 이후 towerInstance에 idleTween 핸들 존재.
```

실제 구현: TowerInstance 타입에 `idleTween?: Phaser.Tweens.Tween` 필드 추가. Test는 mock scene의 `tweens.add` spy 호출 여부로 검증.

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @gld/phaser-game test towerIdleTween`
Expected: FAIL.

- [ ] **Step 3: placeTower에 tween 추가**

line 155 근처 `this.towers.set(...)` 전에:
```ts
const idleTween = this.scene.tweens.add({
  targets: sprite,
  scale: { from: 1, to: 1.03 },
  y: { from: sprite.y, to: sprite.y - 1 },
  duration: 1800,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.InOut',
  // 타워마다 위상 offset → 동기화된 딱딱함 방지
  delay: (this.nextId * 137) % 1800,
});

this.towers.set(instanceId, {
  data: towerData,
  def,
  effectiveDamage: getEffectiveStats(def.stats.damage, towerLevel, towerGrade),
  base,
  sprite,
  idleTween,
  lastAttackTime: 0,
  lastAuraTime: 0,
});
```

sell/destroy 경로에서 `instance.idleTween?.stop(); instance.idleTween?.remove();` 호출.

- [ ] **Step 4: 테스트 PASS**

Run: `pnpm --filter @gld/phaser-game test`
Expected: ALL PASS.

- [ ] **Step 5: 수동 확인**

Run: `pnpm --filter @gld/web-shell dev` 후 브라우저에서 타워 배치하고 idle 상태에서 미세하게 숨쉬는 움직임 확인. (design-review 스킬 사용)

- [ ] **Step 6: 커밋**

```bash
git add packages/phaser-game
git commit -m "feat(game): add idle breathing tween to placed towers"
```

---

## Task 10: 로비 grade promotion 연출

**Files:**
- Create: `packages/web-shell/src/components/lobby/tabs/collection/GradePromotionOverlay.tsx`
- Modify: `packages/web-shell/src/components/lobby/tabs/collection/TowerBottomSheet.tsx`

**목표:** TowerBottomSheet에서 promotion 버튼 성공 시 1.2초 one-shot 오버레이 — 배경 dim + 기존 스프라이트 → flash + particle burst → 새 grade 스프라이트 reveal + scale pop. CSS transition 기반 (복잡한 WebGL 불필요).

- [ ] **Step 1: 컴포넌트 신규 작성**

```tsx
import { useEffect, useState } from 'react';
import type { TowerGrade } from '@gld/shared';

interface Props {
  fromGrade: TowerGrade;
  toGrade: TowerGrade;
  towerId: string;
  onDone: () => void;
}

const GRADE_COLOR: Record<TowerGrade, string> = {
  normal: '#94a3b8',
  rare: '#2dd4bf',
  unique: '#a855f7',
  epic: '#fde68a',
};

export function GradePromotionOverlay({ fromGrade, toGrade, towerId, onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'flash' | 'reveal' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flash'), 150);
    const t2 = setTimeout(() => setPhase('reveal'), 450);
    const t3 = setTimeout(() => setPhase('exit'), 1000);
    const t4 = setTimeout(onDone, 1300);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  const spriteSrc =
    toGrade === 'normal'
      ? `/assets/towers/${towerId}.png`
      : `/assets/towers/${towerId}-${toGrade}.png`;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-black/60 transition-opacity duration-300" style={{ opacity: phase === 'exit' ? 0 : 1 }}>
      {/* flash */}
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{
          background: `radial-gradient(circle, ${GRADE_COLOR[toGrade]}cc, transparent 60%)`,
          opacity: phase === 'flash' ? 1 : 0,
        }}
      />
      {/* sprite reveal */}
      <img
        src={spriteSrc}
        alt=""
        className="relative transition-all duration-500 ease-out"
        style={{
          imageRendering: 'pixelated',
          width: 256,
          height: 320,
          transform: phase === 'reveal' ? 'scale(1) rotate(0deg)' : 'scale(0.4) rotate(-8deg)',
          opacity: phase === 'enter' ? 0 : 1,
          filter: `drop-shadow(0 0 32px ${GRADE_COLOR[toGrade]})`,
        }}
      />
      {/* particles */}
      {phase !== 'enter' &&
        Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              background: GRADE_COLOR[toGrade],
              transform: `translate(${Math.cos((i / 16) * Math.PI * 2) * 140}px, ${Math.sin((i / 16) * Math.PI * 2) * 140}px)`,
              transition: 'transform 900ms ease-out, opacity 900ms ease-out',
              opacity: phase === 'reveal' || phase === 'exit' ? 0 : 1,
            }}
          />
        ))}
    </div>
  );
}
```

- [ ] **Step 2: TowerBottomSheet에서 마운트**

`TowerBottomSheet.tsx`에 상태 추가:
```tsx
const [promotion, setPromotion] = useState<{ from: TowerGrade; to: TowerGrade } | null>(null);
```

promotion 핸들러가 `store.promoteTower(towerId)` 같은 걸 부른다고 가정. 성공 반환 시:
```tsx
if (result.ok) {
  setPromotion({ from: result.fromGrade, to: result.toGrade });
}
```

JSX 말미:
```tsx
{promotion && (
  <GradePromotionOverlay
    fromGrade={promotion.from}
    toGrade={promotion.to}
    towerId={tower.defId}
    onDone={() => setPromotion(null)}
  />
)}
```

- [ ] **Step 3: Vitest 컴포넌트 테스트**

`packages/web-shell/src/components/lobby/tabs/collection/__tests__/GradePromotionOverlay.test.tsx`:
```tsx
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { GradePromotionOverlay } from '../GradePromotionOverlay';

describe('GradePromotionOverlay', () => {
  it('calls onDone after full sequence', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<GradePromotionOverlay fromGrade="normal" toGrade="rare" towerId="archer" onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(1400); });
    expect(onDone).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders new grade sprite', () => {
    render(<GradePromotionOverlay fromGrade="normal" toGrade="rare" towerId="archer" onDone={() => {}} />);
    const img = screen.getByRole('img', { hidden: true });
    expect(img.getAttribute('src')).toBe('/assets/towers/archer-rare.png');
  });
});
```

- [ ] **Step 4: 테스트 PASS**

Run: `pnpm --filter @gld/web-shell test GradePromotionOverlay`
Expected: PASS.

- [ ] **Step 5: 수동 QA**

Run: `pnpm --filter @gld/web-shell dev`, 로비에서 archer normal → rare 승급 실행, 연출이 1.2초간 재생되는지 확인. (design-review 스킬로 before/after)

- [ ] **Step 6: 커밋**

```bash
git add packages/web-shell/src/components/lobby/tabs/collection
git commit -m "feat(lobby): grade promotion one-shot reveal overlay"
```

---

## Task 11: Regression 검증 (10개 비파일럿 타워)

**Files:**
- Read-only verification

- [ ] **Step 1: 전체 타워 에셋 재생성**

Run: `pnpm --filter @gld/asset-scripts generate:towers`
Expected: 8 pilot HQ + 10 legacy (기존 64×80 그대로). `assertRequiredOutputs` PASS.

- [ ] **Step 2: git diff로 비파일럿 PNG 변동 없는지 확인**

Run: `git status packages/web-shell/public/assets/towers/`
Expected: 파일럿 8개와 관련 variant + fire만 변경. plasma/emp/shield 등 legacy 10개는 unchanged.

- [ ] **Step 3: 전체 테스트 suite**

Run: `pnpm -w test`
Expected: ALL PASS.

- [ ] **Step 4: phaser-game 타입 체크**

Run: `pnpm -w typecheck`
Expected: PASS.

- [ ] **Step 5: 인게임 smoke — 모든 타워 배치 가능**

`pnpm --filter @gld/web-shell dev` 실행 → 스테이지 시작 → legacy 타워 중 하나(예: plasma), 파일럿 타워 8개를 각각 배치해 스프라이트 정상 표시 + idle tween + fire 애니 확인. (gstack/browse 스킬 자동화 권장)

- [ ] **Step 6: 최종 커밋 (필요시)**

regression fix가 필요하면 여기서 별도 커밋. 없으면 skip.

---

## Task 12: 스펙 문서 갱신

**Files:**
- Modify: `docs/game-spec/07-asset-definition.md`

- [ ] **Step 1: 타워 에셋 섹션에 파일럿 규격 추가**

§3 Tower Assets에 추가:
```markdown
### 3.5 파일럿 타워 고해상도 규격 (2026-04-09~)

- 대상: archer, flame_tower, dragon_nest, wind_spire, arcane_spire, world_tree, celestial, divine_throne (8종)
- 해상도: 128×160 (정적), 1024×160 (8-frame fire spritesheet)
- Grade variant: normal/rare/unique/epic 4종
  - 파일명: `{id}.png`, `{id}-rare.png`, `{id}-unique.png`, `{id}-epic.png`
  - Normal은 base 스프라이트, rare/unique/epic은 공통 decoration 헬퍼로 overlay
- Grade decoration 헬퍼: `scripts/generate-assets/towers/grade-decoration.ts`
  - rare: 청록 배너 + V 트림
  - unique: rare + 보라 크리스탈 + glow
  - epic: unique + 금색 아우라 + 부유 파편
- idle animation: 에셋 없음 — Phaser runtime tween (scale 1→1.03 yoyo, 1800ms, Sine.InOut, 위상 offset)
- 승급 연출: 로비 `GradePromotionOverlay` one-shot (1.2s), React + CSS transition

### 3.6 비파일럿 타워 (legacy, 10개)
plasma, emp, shield, twin_archer, disruptor, nova_cannon, fortress, stasis_field, earth_golem, holy_shrine — 기존 64×80 procedural 유지. 후속 plan에서 파일럿 파이프라인으로 확장 예정.
```

- [ ] **Step 2: AGENTS.md source-of-truth 갱신 불필요 확인**

Read `AGENTS.md`에서 07-asset-definition.md 참조가 최신인지 확인. 변경 없으면 skip.

- [ ] **Step 3: 커밋**

```bash
git add docs/game-spec/07-asset-definition.md
git commit -m "docs(spec): document pilot tower HQ pipeline and grade variants"
```

---

## Task 13: PR 작성 및 이슈 연결

**Files:**
- PR body

- [ ] **Step 1: PR 생성**

```bash
git push -u origin HEAD
gh pr create --title "[에셋] 파일럿 타워 8종 고품질 에셋 + grade visual + idle 애니" --body "$(cat <<'EOF'
## Summary
- archer / flame_tower / dragon_nest / wind_spire / arcane_spire / world_tree / celestial / divine_throne 8종을 128×160 고해상도 procedural 스프라이트로 재작업
- 별 모양 일색이던 6개 T3~T5 타워를 각 이름에 맞는 고유 실루엣으로 전면 재작성
- normal/rare/unique/epic 4종 grade variant 레이어드 데코레이션 파이프라인 확립
- 모든 placed tower에 미세 idle breathing tween (파일럿/비파일럿 공통)
- 로비 승급 성공 시 `GradePromotionOverlay` one-shot 연출 (flash + particle + reveal)
- 나머지 10개 타워는 기존 에셋 유지 (regression 0건)

## Test plan
- [ ] `pnpm --filter @gld/asset-scripts test tower-pilot` — 파일럿 에셋 존재 + 사이즈
- [ ] `pnpm --filter @gld/phaser-game test towerGradeTexture towerIdleTween` — 런타임 로직
- [ ] `pnpm --filter @gld/web-shell test GradePromotionOverlay` — 연출 타이밍
- [ ] 수동: 브라우저에서 8개 파일럿 타워 배치 후 idle/fire 확인
- [ ] 수동: 로비 collection → 타워 승급 → 연출 재생 확인
- [ ] 수동: legacy 타워(plasma 등) 스프라이트 변동 없음 확인

Closes #73 (partial — pilot 8 towers, 나머지 10개는 후속 plan)
Closes #75 (partial — idle + upgrade 연출 완료, per-tower attack refresh는 후속)
Closes #52 (visual 측면만 — promotion 연출 + grade variant)

Related #108 (awakening은 본 plan에서 제외)
EOF
)"
```

- [ ] **Step 2: 이슈 #73, #75, #52에 "파일럿 PR 링크 + 후속 확장 계획" 댓글**

Run: `gh issue comment 73 --body "파일럿 3종(archer/flame_tower/dragon_nest) PR #XXX 에서 진행. 나머지 15개 타워는 파일럿 승인 후 확장 plan."` (#75, #52도 동일)

---

## Verification

**End-to-end 시나리오 (파일럿 완료 기준):**
1. `pnpm --filter @gld/asset-scripts generate:towers` → 파일럿 8종 × 4 grade + fire = 40 파일 생성, legacy 10 타워 unchanged.
2. `pnpm -w test` → 전체 테스트 PASS (기존 + 신규 tower-pilot, towerGradeTexture, towerIdleTween, GradePromotionOverlay).
3. `pnpm --filter @gld/web-shell dev` → 로비 로드 정상, 8개 파일럿 타워의 컬렉션 카드 이미지가 HQ 스프라이트로 표시.
4. 스테이지 입장 → 파일럿 타워 8개 순차 배치 → 각각 이름에 맞는 개성 있는 실루엣 확인 → idle 숨쉬기 tween + 공격 시 fire 재생.
5. 컬렉션에서 archer normal → rare 승급 실행 → `GradePromotionOverlay` 1.2초 재생 → 이후 컬렉션 스프라이트가 `archer-rare.png`로 교체.
6. design-review 스킬로 before/after 스크린샷 캡처 → `Graphics+이모지 수준` 기준선을 명확히 넘었는지 확인. 특히 별 모양 6개가 전부 서로 다르고 이름에 맞는 실루엣인지.
7. plasma/shield/twin_archer 등 legacy 타워 배치 → 기존과 동일하게 표시 (regression 0건).

**합격 기준:**
- 모든 자동 테스트 PASS
- 수동 smoke 시나리오 6번까지 모두 통과
- 기존 별 모양이던 6개 타워가 **서로 명확히 구분되는** 개성 있는 실루엣으로 교체됨
- legacy 타워 시각 변화 없음 (git diff로 파일 변동 확인)
- 60fps 프레임 유지 (18 타워 배치 + idle tween 포함)

---

## 후속 (본 plan 범위 밖)

- **Extension plan**: 나머지 10개 타워(plasma/emp/shield/twin_archer/disruptor/nova_cannon/fortress/stasis_field/earth_golem/holy_shrine)에 동일 HQ 파이프라인 + grade variant 적용.
- **Awakening visual** (#108): awakening 0→1→2→3 외형 진화. 본 plan에서 확립한 layered decoration 패턴을 확장.
- **In-match 레벨업 연출** (#75 잔여): level 1~50 구간별 subtle glow/scale. 본 plan에서 제외.
- **Attack animation refresh** (#75 잔여): fire spritesheet을 per-tower 전용 drawing으로 재작업.
