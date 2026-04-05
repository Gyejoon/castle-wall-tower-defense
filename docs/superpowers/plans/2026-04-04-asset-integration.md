<!-- /autoplan restore point: ~/.gstack/projects/Gyejoon-grid-line-defense-pvp/feature-slow-owner-autoplan-restore-20260405-000956.md -->
# Game Asset Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 생성된 167개 게임 에셋을 Phaser 3 + React 게임에 9단계로 통합한다.

**Architecture:** `generators → asset-manifest.json → Boot(cache) → Preloader(preload 섹션) → GameScene(optional 비동기 프리페치)`. 새 섹션 추가 후 단계별로 게임 시스템에 연결.

**Tech Stack:** Bun, Vitest, TypeScript strict, Phaser 3.60, React 18, Zustand, @gld/shared

---

## Context

Obsidian planning 문서(`게임 에셋 통합 planning`)에 정의된 9 Step 통합 사양을 실행한다. 에셋 파일은 `scripts/generate-assets/` 파이프라인으로 이미 생성 완료(167 entries). 코드 통합만 남았다.

**핵심 발견 — 라우팅 캐비엇:**
현재 boss/tutorial/gacha 에셋이 `assets/ui/`, `assets/vfx/`, `assets/units/` 경로에 있어 `inferAssetManifestSection()`이 기존 섹션(`ui`, `vfx`, `preload`)으로 라우팅한다. 새 섹션 활용을 위해 제너레이터에서 `section` 필드를 명시적으로 설정해야 한다(파일 이동보다 안전).

---

## Dependency Matrix

```
Step 1 (매니페스트 확장) ← 모든 Step의 기반
  ├── Step 2 (속성 시각) — Phase 0
  ├── Step 3 (보스)     — Phase 1
  ├── Step 4 (결과 화면) — Phase 1
  ├── Step 5 (등급/강화) — Phase 2
  ├── Step 6 (멀티 스테이지) — Phase 3, Step 3 데이터 의존
  ├── Step 7 (튜토리얼) — Phase 4
  └── Step 8 (가챠)     — Phase 4, Step 5 의존 (등급 프레임 재사용)
Step 9 (PVP 폐기) ← Step 4 완료 후
```

**실행 배치:**
- **Batch A**: Step 1 (기반, 단독)
- **Batch B**: Steps 2, 3, 4, 5, 7 (병렬 가능)
- **Batch C**: Steps 6, 8 (B 완료 후)
- **Batch D**: Step 9 (정리)

---

## Task 1: 매니페스트 스키마 확장 (Step 1)

**Files:**
- Modify: `packages/shared/src/assets/manifest.ts:3-9`
- Modify: `packages/phaser-game/src/assets/assetManifest.ts:9`
- Test: `packages/shared/tests/manifest.test.ts` (create)

### 1.1 AssetManifestSection 타입 확장

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// packages/shared/tests/manifest.test.ts
import { describe, expect, it } from 'vitest';
import type { AssetManifestSection } from '../src/assets/manifest';
import { inferAssetManifestSection } from '../src/assets/manifest';

// 컴파일 타임 타입 테스트
const _boss: AssetManifestSection = 'boss';
const _reward: AssetManifestSection = 'reward';
const _tutorial: AssetManifestSection = 'tutorial';
const _gacha: AssetManifestSection = 'gacha';

describe('inferAssetManifestSection — new sections', () => {
  it('routes /boss/ paths', () => {
    expect(inferAssetManifestSection({ key: 'boss-titan', path: 'assets/boss/titan.png' })).toBe('boss');
  });
  it('routes /reward/ paths', () => {
    expect(inferAssetManifestSection({ key: 'reward-victory', path: 'assets/reward/victory.png' })).toBe('reward');
  });
  it('routes /tutorial/ paths', () => {
    expect(inferAssetManifestSection({ key: 'tut-arrow', path: 'assets/tutorial/arrow.png' })).toBe('tutorial');
  });
  it('routes /gacha/ paths', () => {
    expect(inferAssetManifestSection({ key: 'gacha-box', path: 'assets/gacha/box.png' })).toBe('gacha');
  });
  it('preserves existing routing', () => {
    expect(inferAssetManifestSection({ key: 'ui-hp', path: 'assets/ui/hp.png' })).toBe('ui');
    expect(inferAssetManifestSection({ key: 'vfx-exp', path: 'assets/vfx/exp.png' })).toBe('vfx');
    expect(inferAssetManifestSection({ key: 'tower-laser', path: 'assets/towers/laser.png' })).toBe('preload');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd packages/shared && bunx vitest run tests/manifest.test.ts`
Expected: 컴파일 에러 — `'boss'` is not assignable to `AssetManifestSection`

- [ ] **Step 3: 타입 + 추론 함수 구현**

`packages/shared/src/assets/manifest.ts` 수정:

```typescript
export type AssetManifestSection =
  | 'preload'
  | 'ui'
  | 'vfx'
  | 'projectiles'
  | 'mobile'
  | 'icons'
  | 'boss'
  | 'reward'
  | 'tutorial'
  | 'gacha';

export function inferAssetManifestSection(
  entry: Pick<AssetManifestEntry, 'key' | 'path'>,
): AssetManifestSection {
  if (entry.path.includes('/ui-mobile/')) return 'mobile';
  if (entry.path.includes('/icons/')) return 'icons';
  if (entry.path.includes('/projectiles/')) return 'projectiles';
  if (entry.path.includes('/vfx/')) return 'vfx';
  if (entry.path.includes('/boss/')) return 'boss';
  if (entry.path.includes('/reward/')) return 'reward';
  if (entry.path.includes('/tutorial/')) return 'tutorial';
  if (entry.path.includes('/gacha/')) return 'gacha';
  if (entry.path.includes('/ui/')) return 'ui';
  if (entry.path.includes('/towers/') && entry.key.endsWith('-fire')) return 'vfx';
  return 'preload';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd packages/shared && bunx vitest run tests/manifest.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/assets/manifest.ts packages/shared/tests/manifest.test.ts
git commit -m "feat(manifest): add boss/reward/tutorial/gacha sections to AssetManifestSection"
```

### 1.2 OPTIONAL_ASSET_SECTIONS 확장

- [ ] **Step 1: OPTIONAL_ASSET_SECTIONS 수정**

`packages/phaser-game/src/assets/assetManifest.ts:9`:

```typescript
export const OPTIONAL_ASSET_SECTIONS: AssetManifestSection[] = [
  'ui', 'vfx', 'projectiles', 'boss', 'reward', 'tutorial', 'gacha',
];
```

- [ ] **Step 2: 빌드 검증**

Run: `bun build:web`
Expected: 성공, 타입 에러 없음

- [ ] **Step 3: 전체 테스트**

Run: `bun test`
Expected: 모든 테스트 통과

- [ ] **Step 4: 커밋**

```bash
git add packages/phaser-game/src/assets/assetManifest.ts
git commit -m "feat(manifest): add new sections to OPTIONAL_ASSET_SECTIONS"
```

### 1.3 제너레이터 섹션 태깅

기존 에셋이 `assets/ui/`, `assets/vfx/` 경로에 있으므로 `inferAssetManifestSection`만으로는 새 섹션으로 라우팅 불가. 제너레이터에서 명시적 `section` 설정 필요.

- [ ] **Step 1: generate-vfx.ts 수정 — boss/gacha 에셋에 section 명시**

해당 에셋 엔트리에 `section: 'boss'` 또는 `section: 'gacha'` 추가:
- `vfx-boss-warning`, `vfx-boss-final`, `vfx-boss-telegraph`, `vfx-boss-death-fx` → `section: 'boss'`
- `vfx-gacha-reveal-*` (5개) → `section: 'gacha'`

**Files:**
- Modify: `scripts/generate-assets/generate-vfx.ts`

- [ ] **Step 2: generate-ui.ts 수정 — boss/tutorial/gacha/reward 에셋에 section 명시**

- `ui-boss-hp-bar` → `section: 'boss'`
- `ui-tutorial-*` (6개) → `section: 'tutorial'`
- `ui-gacha-*` (5개) → `section: 'gacha'`
- `ui-defense-success`, `ui-defense-fail` → `section: 'reward'`

**Files:**
- Modify: `scripts/generate-assets/generate-ui.ts`

- [ ] **Step 3: generate-units.ts 수정 — boss 유닛에 section 명시**

- `unit-titan-boss`, `unit-titan-boss-rage` → `section: 'boss'`

**Files:**
- Modify: `scripts/generate-assets/generate-units.ts`

- [ ] **Step 4: 매니페스트 재생성 및 검증**

Run: `bun generate:assets`

그 후 매니페스트에서 새 섹션 할당 확인:
```bash
cat packages/web-shell/public/assets/asset-manifest.json | python3 -c "
import json,sys
m=json.load(sys.stdin)
for a in m['assets']:
  if a.get('section') in ('boss','reward','tutorial','gacha'):
    print(f\"{a['section']:10s} {a['key']}\")
"
```

Expected: boss 8개, reward 2개, tutorial 6개, gacha 10개 항목

- [ ] **Step 5: 빌드 + 테스트**

Run: `bun build:web && bun test`
Expected: 성공

- [ ] **Step 6: 커밋**

```bash
git add scripts/generate-assets/generate-vfx.ts scripts/generate-assets/generate-ui.ts scripts/generate-assets/generate-units.ts
git commit -m "feat(assets): tag boss/reward/tutorial/gacha entries with explicit manifest sections"
```

---

## Task 2: 속성 시각 통합 (Step 2)

**Files:**
- Modify: `packages/shared/src/types/tower.ts` — `element` 필드 추가
- Modify: `packages/shared/src/types/unit.ts` — `element` 필드 추가
- Create: `packages/shared/src/constants/elements.ts` — 상성 테이블, 데미지 배율
- Modify: `packages/shared/src/constants/towers.ts` — 18개 타워에 element 할당
- Modify: `packages/shared/src/constants/units.ts` — 5개 유닛에 element 할당
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts` — 뱃지 오버레이 + 상성 배율
- Modify: `packages/phaser-game/src/systems/UnitSystem.ts` — 속성 틴트
- Modify: `packages/shared/src/types/events.ts` — `element-matchup` 이벤트
- Modify: `packages/phaser-game/src/EventBus.ts` — GameEventMap 동기화

**핵심 설계:**
- Element 타입: `'fire' | 'ice' | 'lightning' | 'neutral'`
- 상성: fire→ice 1.5x, ice→lightning 1.5x, lightning→fire 1.5x, 역 0.75x
- 뱃지: 매니페스트의 `vfx-element-badge-*` 스프라이트 활용 (이미 생성됨)
- 기존 `vfx-element-badge-*`는 현재 `vfx` 섹션 — 프리페치 시 자동 로드

---

## Task 3: 보스 에셋 통합 (Step 3)

**Files:**
- Modify: `packages/phaser-game/src/assets/assetManifest.ts` — boss 애니메이션 등록 함수
- Modify: `packages/phaser-game/src/scenes/Game.ts` — boss 경고 오버레이, HP바, 프리페치 타이밍
- Modify: `packages/phaser-game/src/systems/UnitSystem.ts` — 보스 유닛 특수 처리
- Modify: `packages/shared/src/types/events.ts` — `boss-phase2` 이벤트 추가

**핵심 설계:**
- Task 1.3에서 boss 에셋이 `'boss'` 섹션으로 태깅됨
- 웨이브 3~4 시작 시 `prefetchAssetSections(scene, manifest, ['boss'], webP)` 호출
- boss HP바: `Phaser.GameObjects.Graphics` depth 100
- 경고: `boss-warning` 이벤트 시 화면 붉은 틴트 + 카메라 흔들림(0.3초)

---

## Task 4: 결과 화면 통합 (Step 4)

**Files:**
- Create: `packages/web-shell/src/components/ResultScreen.tsx`
- Modify: `packages/web-shell/src/pages/GamePage.tsx` — 기존 game-over 오버레이 교체
- Modify: `packages/web-shell/src/stores/gameStore.ts` — 결과 데이터 확장

**핵심 설계:**
- `ui-defense-success`/`ui-defense-fail`은 Task 1.3에서 `'reward'` 섹션으로 태깅됨
- React DOM 컴포넌트 (Phaser 오버레이 아님)
- 골드 보상 카운터 CSS 애니메이션

---

## Task 5: 등급/강화 시각 통합 (Step 5)

**Files:**
- Modify: `packages/phaser-game/src/systems/TowerSystem.ts` — 등급 프레임 오버레이
- Modify: `packages/web-shell/src/components/lobby/tabs/CollectionTab.tsx` — 등급별 카드
- Create: `packages/shared/src/constants/rarity.ts` — tier→rarity 매핑, 프레임 키

**핵심 설계:**
- `ui-rarity-frame-{common|rare|heroic|legendary|god}` 이미 `'ui'` 섹션
- `TIER_NAMES` → rarity frame key 매핑 유틸
- 전투 씬: Phaser Container (base sprite + frame + badge)
- 컬렉션 UI: React `<img>` 오버레이

---

## Task 6: 멀티 스테이지 통합 (Step 6)

**Files:**
- Modify: `packages/shared/src/constants/maps.ts` — LAVA_FORTRESS_MAP, STORM_CITADEL_MAP 추가
- Modify: `packages/phaser-game/src/scenes/Game.ts` — FOREST_GATE_MAP 하드코딩 제거, mapId 파라미터
- Modify: `packages/phaser-game/src/scenes/Preloader.ts` — 스테이지별 에셋 로드
- Modify: `packages/web-shell/src/stores/gameStore.ts` — selectedMapId 추가
- Modify: `packages/web-shell/src/pages/LobbyPage.tsx` — 스테이지 선택 UI

**핵심 설계:**
- 맵 JSON 이미 `assets/maps/`에 존재 (`lava_fortress.json`, `storm_citadel.json`)
- GameScene.init(data: { mapId }) → 맵 상수 조회
- 스테이지 썸네일 `ui-stage-thumb-*` 이미 `'ui'` 섹션

---

## Task 7: 튜토리얼 통합 (Step 7)

**Files:**
- Create: `packages/phaser-game/src/systems/TutorialSystem.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts` — 튜토리얼 레이어 통합
- Modify: `packages/phaser-game/src/assets/assetManifest.ts` — tutorial lazy load 로직

**핵심 설계:**
- Task 1.3에서 tutorial 에셋이 `'tutorial'` 섹션으로 태깅됨
- 첫 게임: `localStorage.getItem('tutorial_completed')` 체크 → 없으면 'tutorial' 프리페치
- 5단계 시퀀스, depth 150 레이어
- 완료 후 `localStorage.setItem('tutorial_completed', 'true')` + 에셋 언로드

---

## Task 8: 가챠 통합 (Step 8)

**Files:**
- Create: `packages/web-shell/src/components/GachaScreen.tsx`
- Modify: `packages/web-shell/src/pages/LobbyPage.tsx` — 가챠 진입점
- Modify: `packages/web-shell/src/stores/gameStore.ts` — gachaOpen 상태

**핵심 설계:**
- Task 1.3에서 gacha 에셋이 `'gacha'` 섹션으로 태깅됨
- 화면 진입 시 lazy load, 닫을 때 unload
- Step 5의 등급 프레임 재사용 → Step 5 완료 필수 선행

---

## Task 9: PVP 에셋 폐기 (Step 9)

**Files:**
- Modify: `scripts/generate-assets/generate-all.ts` — PVP 제너레이터 제거
- Delete: PVP 전용 UI 에셋 파일
- Modify: `packages/shared/src/types/events.ts` — PVP 전용 이벤트 제거 (참조 없는 것만)

**핵심 설계:**
- Step 4 완료 확인 후 실행
- `pressure-*`, `ghost-*`, `match-draw` 키 제거
- `bun test` 통과 필수

---

## CRITICAL FINDINGS (from /autoplan review)

### CF-1: Element enum 불일치 (CRITICAL)
플랜: `fire | ice | lightning | neutral`. 생성기(`shared.ts:88`): `fire | water | lightning | neutral`. Mock(`mockLobbyData.ts:7`): `fire | ice | lightning | nature | dark`.
**Fix:** canonical enum을 `fire | water | lightning | neutral`로 통일 (생성기 기준). mock 데이터 동기화.

### CF-2: OPTIONAL_ASSET_SECTIONS와 lazy load 모순 (CRITICAL)
boss/tutorial/gacha를 `OPTIONAL_ASSET_SECTIONS`에 넣으면 `Game.create()`에서 즉시 전체 프리페치됨(`Game.ts:156`→`prefetchOptionalAssets()`). lazy load 의도와 충돌.
**Fix:** `OPTIONAL_ASSET_SECTIONS`에 넣지 말 것. 대신 별도 `LAZY_ASSET_SECTIONS` 상수 도입하거나, 각 Step에서 독립적으로 `prefetchAssetSections` 호출.

### CF-3: registerOptionalCombatAnimations가 boss 미포함 (HIGH)
`assetManifest.ts:102-104` — `vfx`와 `projectiles`만 스캔. boss 스프라이트시트 애니메이션 미등록.
**Fix:** boss 프리페치 후 별도 `registerBossAnimations()` 호출 추가.

### CF-4: Batch B 병렬 불가 (HIGH)
Steps 2+3은 UnitSystem, Steps 2+5는 TowerSystem 동시 수정. 파일 소유권 충돌.
**Fix:** 실행 순서 변경: Step 1 → Step 2 → Step 3 → (4,7 병렬) → Step 5 → (6,8) → Step 9.

### CF-5: FOREST_GATE_MAP blast radius 과소평가 (HIGH)
Game.ts에 최소 6곳 참조 + Preloader, PhaserGame, 테스트 3곳. 플랜의 5파일보다 넓음.
**Fix:** `grep -r FOREST_GATE_MAP` 실행 후 정확한 파일 목록 작성. Step 6을 독립 서브플랜으로 분리.

### CF-6: Phaser loader 동시 호출 비안전 (HIGH)
`prefetchAssetSections`가 `scene.load.once('complete')`에 의존. 동시 호출 시 한쪽 complete만 resolve.
**Fix:** loader 큐잉 또는 mutex 패턴 도입. 또는 lazy load를 순차적으로만 호출.

### CF-7: Boss state transition 미정의 (HIGH)
titan → titan-boss → titan-boss-rage 전환 시점, UnitType으로 분리 여부 미결정.
**Fix:** Step 3 구현 전에 boss를 별도 UnitType으로 정의할지, titan의 variant로 볼지 결정.

### CF-8: events.ts 파일 미존재 (MEDIUM)
플랜이 `packages/shared/src/types/events.ts` 수정을 참조하나, 이벤트 계약은 `EventBus.ts`의 `GameEventMap`에만 존재.
**Fix:** 플랜의 파일 경로를 `packages/phaser-game/src/EventBus.ts`로 수정.

### CF-9: TowerSystem Container 전환 숨은 범위 (MEDIUM)
Step 5의 Phaser Container 전환은 TowerDragController의 Image 의존성까지 리팩토링 필요.
**Fix:** Container 대신 depth 기반 오버레이로 우회하거나, 명시적 리팩토링 범위에 TowerDragController 포함.

### CF-10: 디자인 세부 미정의 (MEDIUM)
보스 경고 오버레이 duration, 결과화면 render order, 튜토리얼 step별 copy, 가챠 reveal beat 모두 미정의.
**Fix:** 각 Step 구현 시 서브플랜에서 UX 디테일을 명시적으로 정의.

---

## Revised Execution Order

기존 Batch B 병렬 → 직렬로 변경:
```
Batch A: Step 1 (매니페스트 확장 — OPTIONAL에 boss/tutorial/gacha 넣지 않음)
Batch B: Step 2 (속성 — water로 통일)
Batch C: Step 3 (보스 — UnitType 결정 후)
Batch D: Steps 4, 7 (결과화면 + 튜토리얼, 병렬 가능 — 파일 충돌 없음)
Batch E: Step 5 (등급/강화 — TowerSystem Container 또는 depth 오버레이)
Batch F: Step 6 (멀티 스테이지 — 독립 서브플랜)
Batch G: Step 8 (가챠 — Step 5 완료 후)
Batch H: Step 9 (PVP 정리)
```

---

## Verification

각 Task 완료 후:
1. `bun build:web` — TypeScript 컴파일 성공
2. `bun test` — 전체 테스트 통과
3. `bun dev:web` → 브라우저 콘솔 에러 없음
4. 해당 Step의 시각 요소 스크린샷 확인

전체 완료 후:
- 3스테이지 모두 플레이 가능
- 보스 등장/경고/처치 연출 완료
- 튜토리얼 첫 회 진행/이후 미표시
- 가챠 열기/닫기 메모리 해제
- lobby→battle→result→lobby 10회 순환 메모리 누수 없음

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | SELECTIVE EXPANSION mode | Mechanical | P3 | Obsidian spec이 이미 범위 정의 | SCOPE EXPANSION |
| 2 | CEO | Approach B (병렬 서브에이전트) → 직렬로 수정 | Taste→Fixed | P5 | Eng review에서 파일 충돌 확인 | Approach B |
| 3 | CEO | 플레이테스트 게이트 추가 (Step 4 후) | Mechanical | P1 | 리텐션 검증 없이 9 Step 완주는 위험 | — |
| 4 | Eng | Element enum을 `water`로 통일 | Mechanical | P4 | 생성기가 이미 `water` 사용중, DRY | `ice` |
| 5 | Eng | OPTIONAL_ASSET_SECTIONS에서 boss/tutorial/gacha 제외 | Mechanical | P5 | lazy load 의도와 모순 | 전체 포함 |
| 6 | Eng | Batch B 직렬화 | Mechanical | P3 | UnitSystem/TowerSystem 동시 수정 불가 | 병렬 |
| 7 | Eng | Step 6을 독립 서브플랜으로 분리 | Taste | P5 | FOREST_GATE_MAP blast radius가 넓어 별도 관리 필요 | 인라인 |
| 8 | Eng | Container 대신 depth 오버레이 검토 | Taste | P5 | TowerDragController 리팩토링 회피 가능 | Container |
| 9 | Design | 각 Step 서브플랜에서 UX 디테일 보강 | Mechanical | P1 | 현재 플랜에 디자인 세부 부족 | — |

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | 6 concerns (premise P4, risk, differentiation) |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | 2 critical, 3 high, 2 medium |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | issues_open | 10 findings (2 critical, 5 high, 3 medium) |
| CEO Voices | Codex+subagent | Strategy challenge | 1 | partial | Codex truncated, subagent 6 concerns |
| Eng Voices | Codex+subagent | Architecture challenge | 1 | clean | Both voices aligned on CF-1~CF-9 |
| DX Review | `/plan-devex-review` | Developer experience | 0 | skipped | No developer-facing scope |

**VERDICT:** 10 CRITICAL/HIGH FINDINGS incorporated into plan. Execution order revised. Element enum and lazy load strategy fixed. Ready for approval with taste decisions surfaced.
