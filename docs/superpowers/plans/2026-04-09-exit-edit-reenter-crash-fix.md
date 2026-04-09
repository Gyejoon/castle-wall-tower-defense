# Exit → Deck Edit → Re-enter Crash Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 게임 플레이 중 나가기 → 전쟁탁자에서 덱 편집 → 다시 게임 시작 시 발생하는 crash를 재현하고 근본 원인을 제거한다.

**Architecture:** 최근 02a28c2 커밋에서 추가된 `GameScene.onDeckIdsChange` 런타임 레지스트리 리스너 + `buildDeckCards` throw 경로가 재진입 시 스테일 상태와 만나 scene.create()를 깨뜨린다는 가설을 검증 후 수정한다. 런타임 덱 라이브 스왑 기능은 단일 PvE run 흐름에서 사용자 가치가 낮으므로 제거하고, scene 생성 시점의 deck 파싱을 방어적(fallback)으로 만든다.

**Tech Stack:** Phaser 3, React 18 (StrictMode), Zustand, TypeScript, pnpm monorepo, Vitest, Biome

---

## File Structure

수정/생성 대상:

- **Modify** `packages/phaser-game/src/scenes/Game.ts` — `onDeckIdsChange` 리스너 제거, `buildDeckCards` 호출 방어
- **Modify** `packages/web-shell/src/game/PhaserGame.tsx` — `selectedDeck` → registry 라이브 싱크 구독 제거 (런타임 스왑 중단에 맞춰)
- **Modify** `packages/web-shell/src/App.tsx` — 부팅 시 `selectedDeck` 유효성 보정(마이그레이션)
- **Modify** `packages/shared/src/constants/deck.ts` — `buildDeckCardsSafe` 추가 (기존 throw 버전은 테스트 계약 유지) + `DEFAULT_DECK_IDS` 단일 source of truth
- **Modify** `packages/shared/src/index.ts` — `buildDeckCardsSafe` + `DEFAULT_DECK_IDS` export
- **Modify** `packages/web-shell/src/stores/gameStore.ts` — 로컬 `DEFAULT_DECK_IDS` 제거, `@gld/shared`에서 import
- **Modify** `packages/shared/tests/deckBuilder.test.ts` — `buildDeckCardsSafe` 테스트 추가

---

## Task 1: 재현 및 에러 캡처

**Files:**
- Read-only: dev server + 브라우저

- [ ] **Step 1: dev 서버 백그라운드 기동**

Run (background): `pnpm --filter @gld/web-shell dev`
Expected: `VITE ... ready in ...ms, Local: http://localhost:5173/` 로그

- [ ] **Step 2: gstack 헤드리스로 접속 + 콘솔 에러 수집 설정**

실제 dev URL로 접속 후 DevTools console을 열어둔다. (gstack skill 사용 가능하면 page.on('pageerror') 캡처.)

- [ ] **Step 3: 재현 시나리오 A — 편집 포함 경로**

1. forest_gate ★1 진입 → resetRun → 게임 시작
2. 몇 초 후 TopHud의 나가기 버튼 → 확인 → 로비
3. 로비 "전쟁탁자"(collection 탭) → "편집" → 4장 중 1장을 다른 타워로 교체 → 확인(4/4)
4. 월드맵 → forest_gate → 게임 시작
5. crash 시점 콘솔 에러 메시지 + stack 캡처 (복사)

- [ ] **Step 4: 재현 시나리오 B — 편집 없이 재진입 비교**

1. 페이지 리프레시 (clean state)
2. 게임 진입 → 나가기 → **편집 건너뜀** → 바로 게임 시작
3. crash 여부 기록 — 정상 진입되면 편집이 트리거임을 확정

- [ ] **Step 5: 재현 시나리오 C — StageDetailPage 편집 경로**

1. 로비 → 월드맵 → forest_gate → StageDetailPage의 "편집"으로 덱 교체 → 게임 시작
2. (앞선 A와 같은 에러인지 확인 — 같으면 원인이 deck 편집 그 자체)

- [ ] **Step 6: 에러 결과를 plan에 기록 + STOP 분기 가드**

이 plan의 "Captured Error" 섹션(맨 아래)에 메시지/스택을 추가한다.
**그 다음 아래 분기 가드를 반드시 통과한 뒤에만 Task 2로 진행한다.**

| 캡처된 에러 패턴 | 가설 | 분기 |
|---|---|---|
| `Unknown tower: <id>` (`buildDeckCards`) | 가설 3 | ✅ Task 2~6 진행 |
| `Cannot read properties of ... (reading 'getCardByTowerId'\|'getCards'\|'getCard')` | 가설 1 | ✅ Task 2~6 진행 |
| `Cannot read properties of ... (reading 'registry'\|'destroy')` / `WebGL` / `Canvas` / `already destroyed` | 가설 2 (lifecycle) | 🛑 **STOP. 본 plan 즉시 중단.** Fallback Branch 따라 별도 plan 작성 |
| `calcCombatPower` / `updateAchievementProgress` / 스택에 `settingsSlice` | 가설 4 | 🛑 **STOP.** 본 plan 즉시 중단. 별도 plan으로 settingsSlice 가드 작업 |
| 에러가 재현되지 않음 (시나리오 A 5회 모두 정상) | — | 🛑 **STOP.** 사용자에게 재현 단계를 다시 확인. 잘못된 가정으로 fix 진행 금지. |

> 이 가드를 통과하지 않고 Task 2로 진행하지 말 것. systematic-debugging Iron Law: "no fixes without root cause"

- [ ] **Step 7: dev 서버 종료**

백그라운드 프로세스 종료.

---

## Task 2: `buildDeckCardsSafe` 헬퍼 + `DEFAULT_DECK_IDS` 단일 source + 테스트

**Files:**
- Modify: `packages/shared/src/constants/deck.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/web-shell/src/stores/gameStore.ts`
- Modify: `packages/shared/tests/deckBuilder.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/tests/deckBuilder.test.ts` 하단에 추가:

```ts
import { buildDeckCardsSafe, DEFAULT_DECK } from '../src';

describe('buildDeckCardsSafe', () => {
	it('returns valid cards for all-known ids', () => {
		const cards = buildDeckCardsSafe(['archer', 'plasma', 'emp', 'shield']);
		expect(cards).toHaveLength(4);
		expect(cards[0].towerDefId).toBe('archer');
	});

	it('filters out unknown tower ids without throwing', () => {
		const cards = buildDeckCardsSafe(['archer', 'not_a_tower', 'plasma']);
		expect(cards).toHaveLength(2);
		expect(cards.map((c) => c.towerDefId)).toEqual(['archer', 'plasma']);
	});

	it('falls back to DEFAULT_DECK when input is empty', () => {
		const cards = buildDeckCardsSafe([]);
		expect(cards).toEqual(DEFAULT_DECK);
	});

	it('falls back to DEFAULT_DECK when all ids are unknown', () => {
		const cards = buildDeckCardsSafe(['x', 'y']);
		expect(cards).toEqual(DEFAULT_DECK);
	});
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm --filter @gld/shared test deckBuilder`
Expected: FAIL — `buildDeckCardsSafe is not a function`

- [ ] **Step 3: 헬퍼 구현**

`packages/shared/src/constants/deck.ts`에 추가 (기존 `buildDeckCards`는 유지):

```ts
export function buildDeckCardsSafe(
	towerIds: readonly string[],
): readonly DeckCardDef[] {
	const valid: DeckCardDef[] = [];
	for (const id of towerIds) {
		const tower = ALL_TOWERS.find((t) => t.id === id);
		if (!tower) {
			console.warn(`[buildDeckCardsSafe] Unknown tower id dropped: ${id}`);
			continue;
		}
		valid.push({
			towerDefId: id,
			energyCost: tower.cost,
			role: towerToRole(tower),
		});
	}
	return valid.length > 0 ? valid : DEFAULT_DECK;
}
```

- [ ] **Step 4: `DEFAULT_DECK_IDS` 단일 source 추가**

`packages/shared/src/constants/deck.ts`의 `DEFAULT_DECK` 정의 위에 추가:

```ts
export const DEFAULT_DECK_IDS = [
	'archer',
	'plasma',
	'emp',
	'shield',
] as const;
```

- [ ] **Step 5: shared export 추가**

`packages/shared/src/index.ts:17` 교체:

```ts
export {
	buildDeckCards,
	buildDeckCardsSafe,
	DEFAULT_DECK,
	DEFAULT_DECK_IDS,
	towerToRole,
} from './constants/deck';
```

- [ ] **Step 6: `gameStore.ts`의 로컬 정의 제거**

`packages/web-shell/src/stores/gameStore.ts:18`의 로컬 상수를 삭제:

```ts
// 제거 대상
const DEFAULT_DECK_IDS = ['archer', 'plasma', 'emp', 'shield'];
```

그리고 동일 파일 상단의 `@gld/shared` import 블록에 `DEFAULT_DECK_IDS`를 추가:

```ts
import {
	type CombatHudState,
	DEFAULT_DECK,
	DEFAULT_DECK_IDS,
	DEFAULT_MAP_ID,
	type DeckCardDef,
	INITIAL_ENERGY,
	INITIAL_PLAYER_HP,
	isMapUnlocked,
	MAP_REGISTRY,
	type PlacementFailureReason,
	type StarRating,
	type WavePhase,
} from '@gld/shared';
```

- [ ] **Step 7: 테스트 + 타입체크 통과 확인**

Run: `pnpm --filter @gld/shared test deckBuilder && pnpm --filter @gld/web-shell typecheck`
Expected: PASS — 새 4개 테스트 모두 통과 + gameStore.ts 타입 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add packages/shared/src/constants/deck.ts packages/shared/src/index.ts packages/shared/tests/deckBuilder.test.ts packages/web-shell/src/stores/gameStore.ts
git commit -m "feat(shared): add buildDeckCardsSafe + DEFAULT_DECK_IDS single source

Hoists DEFAULT_DECK_IDS into @gld/shared so the same constant is not
duplicated between gameStore and the upcoming App.tsx migration.
Adds buildDeckCardsSafe which drops unknown ids and falls back to
DEFAULT_DECK instead of throwing."
```

---

## Task 3: `GameScene`에서 런타임 deck 라이브 스왑 제거 + safe 파싱 적용

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`

> Note: GameScene re-creation은 Phaser mock 복잡도 때문에 실용적인 단위 테스트
> 경계가 아니다. 헬퍼 계약은 Task 2의 `deckBuilder.test.ts`로 충분히 검증했으므로
> 본 Task에는 새 단위 테스트를 추가하지 않는다. 통합 검증은 Task 6의 실기 회귀가 담당.

- [ ] **Step 1: `Game.ts`의 deck 파싱을 safe 버전으로 교체**

`packages/phaser-game/src/scenes/Game.ts:1` 근처 import에서 `buildDeckCards`를 교체:

```ts
import {
	type AssetManifest,
	buildDeckCardsSafe,
	checkStarClear,
	DEFAULT_DECK,
	DEFAULT_MAP_ID,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	getStarDifficultyMult,
	getWavesForMap,
	INITIAL_PLAYER_HP,
	type MapLayout,
	PHASER_COLORS,
	type StarRating,
	type WaveDef,
	type WavePhase,
} from '@gld/shared';
```

`Game.ts:212-214`를 다음으로 교체:

```ts
		const deckIds = this.game.registry.get('deckIds') as string[] | undefined;
		const deckCards =
			deckIds && deckIds.length > 0 ? buildDeckCardsSafe(deckIds) : DEFAULT_DECK;
		this.playerDeck = new DeckSystem(deckCards);
```

- [ ] **Step 2: `onDeckIdsChange` 런타임 리스너 제거**

`Game.ts:99-104` 삭제 (필드 정의 블록):

```ts
// 제거 대상
private onDeckIdsChange = (_parent: unknown, value: string[]) => {
    if (value) {
        this.playerDeck = new DeckSystem(buildDeckCards(value));
        EventBus.emit('deck-loaded', { cards: this.playerDeck.getCards() });
    }
};
```

`Game.ts:224` 삭제:

```ts
// 제거 대상
this.game.registry.events.on('changedata-deckIds', this.onDeckIdsChange);
```

`Game.ts:830` 삭제:

```ts
// 제거 대상
this.game.registry.events.off('changedata-deckIds', this.onDeckIdsChange);
```

근거 (코드 주석으로 추가하지 말고 본 plan의 commit message에 포함):
1. 단일 PvE run 중 deck 라이브 교체는 사용자 가치가 낮고, 런타임 `playerDeck`
   교체가 `TowerSystem`/`DeckDock`의 기존 참조와 괴리를 만드는 위험이 크다.
2. 덱 변경은 다음 run에서 registry를 새로 읽어오는 현재 부팅 경로로 충분히 반영된다.
3. **08-architecture §4 동기화 규칙 정합**: settings 카테고리(`showDamageNumbers`,
   `screenShake`)만 `useGameStore.subscribe → registry.set` 라이브 동기화 예외에
   포함된다. `selectedDeck`은 settings가 아닌 *run-state*이므로 이 예외 목록에
   속하지 않는다 — 라이브 동기화 패턴 적용 대상이 아님.

- [ ] **Step 3: 린트/타입체크 통과**

Run: `pnpm --filter @gld/phaser-game typecheck && pnpm biome check packages/phaser-game/src/scenes/Game.ts`
Expected: no errors

- [ ] **Step 4: phaser-game 전체 테스트 통과**

Run: `pnpm --filter @gld/phaser-game test`
Expected: 모든 기존 테스트 통과 (회귀 없음)

- [ ] **Step 5: 커밋**

```bash
git add packages/phaser-game/src/scenes/Game.ts
git commit -m "fix(game): remove runtime deck hot-swap and use safe deck parser

GameScene.onDeckIdsChange replaced this.playerDeck mid-run, breaking
TowerSystem's cached card references and crashing on re-entry after
a deck edit in the lobby. Deck changes now only apply at scene create
time via the fresh registry snapshot, and buildDeckCardsSafe guards
unknown ids with a DEFAULT_DECK fallback.

selectedDeck is run-state, not a setting, so it is intentionally
excluded from the Zustand→registry live-sync exception documented
in 08-architecture §4."
```

---

## Task 4: `PhaserGame.tsx`에서 사용되지 않게 된 `selectedDeck` 라이브 구독 제거

**Files:**
- Modify: `packages/web-shell/src/game/PhaserGame.tsx`

- [ ] **Step 1: 스펙 확인 — 삭제 대상 이해**

Task 3에서 `GameScene`이 더 이상 `changedata-deckIds`를 구독하지 않으므로, `PhaserGame.tsx:41-48`의 `unsubDeck` 구독은 registry를 건드리되 scene은 반응하지 않는 dead write가 된다. 제거한다.

- [ ] **Step 2: 구독 코드 삭제**

`packages/web-shell/src/game/PhaserGame.tsx:41-48`에서 다음 블록 제거:

```ts
// 제거 대상
// Sync selectedDeck to Phaser registry so new runs use the latest deck
let prevDeck = useGameStore.getState().selectedDeck;
const unsubDeck = useGameStore.subscribe((state) => {
    if (state.selectedDeck !== prevDeck) {
        prevDeck = state.selectedDeck;
        gameRef.current?.registry.set('deckIds', prevDeck);
    }
});
```

그리고 cleanup 블록(`PhaserGame.tsx:83`)에서 `unsubDeck();` 호출 제거.

- [ ] **Step 3: 타입체크 + 린트**

Run: `pnpm --filter @gld/web-shell typecheck && pnpm biome check packages/web-shell/src/game/PhaserGame.tsx`
Expected: no errors

- [ ] **Step 4: 기존 테스트 통과**

Run: `pnpm --filter @gld/web-shell test`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/web-shell/src/game/PhaserGame.tsx
git commit -m "refactor(web-shell): drop dead selectedDeck registry subscription

GameScene no longer listens to changedata-deckIds; the subscription
was a dead write since deck is now snapshot only at scene create."
```

---

## Task 5: 부팅 시 `selectedDeck` 마이그레이션(방어적 복구)

**Files:**
- Modify: `packages/web-shell/src/App.tsx`

- [ ] **Step 1: 마이그레이션 코드 추가**

`packages/web-shell/src/App.tsx`의 `loadSave()` 직후 sync 블록을 다음으로 교체:

```tsx
useMetaStore.getState().loadSave();
// Sync persisted state to gameStore (created before loadSave runs)
const meta = useMetaStore.getState();
const validIds = new Set(ALL_TOWERS.map((t) => t.id));
const sanitizedDeck = (meta.selectedDeck ?? []).filter((id) =>
	validIds.has(id),
);
const safeDeck =
	sanitizedDeck.length === 4 ? sanitizedDeck : [...DEFAULT_DECK_IDS];
if (safeDeck !== meta.selectedDeck) {
	useMetaStore.getState().setSelectedDeck(safeDeck);
}
useGameStore.setState({
	selectedDeck: safeDeck,
	bgmVolume: meta.settings.bgmVolume,
	sfxVolume: meta.settings.sfxVolume,
	colorblindMode: meta.settings.colorblindMode,
	screenShake: meta.settings.screenShake,
});
```

그리고 파일 상단 import에 `ALL_TOWERS`와 `DEFAULT_DECK_IDS`를 추가:

```tsx
import { ALL_TOWERS, DEFAULT_DECK_IDS } from '@gld/shared';
```

> Note: `DEFAULT_DECK_IDS`는 `as const` readonly tuple이므로 mutable
> `selectedDeck: string[]` 타입에 맞추기 위해 `[...DEFAULT_DECK_IDS]` 스프레드한다.

- [ ] **Step 2: 타입체크 + 린트**

Run: `pnpm --filter @gld/web-shell typecheck && pnpm biome check packages/web-shell/src/App.tsx`
Expected: no errors

- [ ] **Step 3: 전체 web-shell 테스트**

Run: `pnpm --filter @gld/web-shell test`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add packages/web-shell/src/App.tsx
git commit -m "fix(web-shell): sanitize persisted selectedDeck on boot

Filters out tower ids no longer present in ALL_TOWERS and falls back
to the default deck if the result isn't a valid 4-card deck. Prevents
GameScene from receiving garbage deck ids across save migrations."
```

---

## Task 6: 실기 재현 + 회귀 검증

**Files:**
- Read-only validation

- [ ] **Step 1: dev 서버 재기동**

Run (background): `pnpm --filter @gld/web-shell dev`
Expected: ready

- [ ] **Step 2: Task 1의 시나리오 A 재실행**

게임 → 나가기 → CollectionTab 덱 편집 → 월드맵 → forest_gate → 게임 시작.
Expected: crash 없음, GameScene 정상 생성, 덱 교체 내용 반영.

- [ ] **Step 3: 시나리오 C (StageDetailPage 편집) 재실행**

월드맵 → forest_gate → StageDetail의 편집 → 게임 시작.
Expected: crash 없음.

- [ ] **Step 4: 연속 반복 5회**

게임 진입 → 나가기 → (편집 유/무 섞어서) → 재진입을 5회 반복.
Expected: 5회 모두 정상.

- [ ] **Step 5: 손상 deck 시뮬레이션**

DevTools → Application → localStorage에서 저장된 selectedDeck(또는 전체 save)에
존재하지 않는 id(예: `"ghost_tower"`)를 하나 끼워넣고 리프레시.
Expected: App.tsx 마이그레이션이 DEFAULT_DECK_IDS로 보정, 게임 정상 부팅.

- [ ] **Step 6: dev 서버 종료**

- [ ] **Step 7: 최종 검증 커맨드 일괄 실행**

Run:
```bash
pnpm --filter @gld/shared test
pnpm --filter @gld/phaser-game test
pnpm --filter @gld/web-shell test
pnpm biome check .
```
Expected: 모두 PASS

- [ ] **Step 8: 검증 결과 커밋 없음 (코드 변경 없음). Task 1의 plan에 결과 기록만.**

---

## Fallback Branch: Task 1에서 Canvas/WebGL 에러가 확인된 경우

Task 1 Step 6에서 `WebGL`, `Canvas`, `game.destroy`, `already destroyed` 류 에러가 캡처되면
이 plan의 Task 2~5로는 해결되지 않는다. 그 경우:

- 본 plan을 여기까지 중단
- 별도 plan `2026-04-09-phasergame-lifecycle-strictmode-fix.md`를 작성해
  `PhaserGame.tsx`의 `container.isConnected` 가드를 useRef mount 카운트 기반으로
  교체하고, `game.destroy(true)`를 try/catch로 감싸는 작업을 다룬다.

---

## Spec Coverage Self-Review

- ✅ 재현/캡처 + STOP 분기 가드: Task 1
- ✅ 런타임 deck 스왑 제거 (가설 1): Task 3
- ✅ `buildDeckCards` throw 방어 (가설 3): Task 2 + Task 3 Step 1
- ✅ 저장본 마이그레이션 (가설 3 근본 차단): Task 5
- ✅ Dead 구독 제거: Task 4
- ✅ 전체 회귀 + 손상 deck 시뮬: Task 6
- ✅ DRY: `DEFAULT_DECK_IDS`를 `@gld/shared`에 단일 source 통합 (Task 2 Step 4-6)
- ⚠️ 가설 2 (`isConnected` 가드)와 가설 4 (`calcCombatPower` 부수 효과)는 Task 1 결과에 따라 별도 plan 분기 — 본 plan의 Fallback Branch + Task 1 Step 6 STOP 가드에 명시

## Plan Review 적용 이력

- 2026-04-09 `/plan-review` 1차: BUG-1(DEFAULT_DECK_IDS DRY), SMELL-1(약한 테스트), SMELL-2(STOP 가드 부재) 반영. DRIFT-2/3(스펙 outdated)는 별도 doc PR 권고로 이관.

---

## Captured Error

**Task 1 실행일:** 2026-04-09  
**환경:** headless Chromium (gstack browse v0.15.16.0), macOS 24.6.0, bun dev server http://localhost:3000/

### 재현 결과 요약

| 시나리오 | 실행 여부 | 에러 | 판정 |
|---|---|---|---|
| Scenario A (edit path: game → exit → edit deck → re-enter) | ❌ 부분 실행 (exit 단계 미도달) | N/A | 미재현 |
| Scenario B (no-edit baseline) | ❌ 미실행 (Phaser 초기화 타이밍 문제로 skip) | N/A | 미재현 |
| Scenario C (StageDetailPage 편집 경로) | ❌ 미실행 | N/A | 미재현 |

### Headless 제약으로 인한 재현 불가 사유

gstack 헤드리스 브라우저에서 Phaser 캔버스 초기화가 불안정하다. 구체적 관찰:

1. **`게임 시작` 버튼 클릭 후 대부분의 경우** `hasCanvas: false`, `hasDiv: false` (GamePage Suspense 로딩 상태 지속)
2. **간헐적 성공 케이스** (result r41): `hasCanvas: true` 확인됨. 해당 실행에서는 Phaser 배너(`Phaser v3.90.0 (Canvas | Web Audio)`) 가 콘솔에 출력됨.
3. **exit 버튼 접근 불가**: `handleExitRequest`는 `runStatus === 'running'` 조건 체크함. Phaser가 `game-ready`를 emit해야 `running` 상태로 전환되는데, 헤드리스에서 이 이벤트가 안정적으로 도달하지 않음.
4. 따라서 "게임 실행 → exit → 덱 편집 → 재진입" 전체 사이클을 자동화 환경에서 완성하지 못함.

### Invalid deck id 테스트 결과

`localStorage`에 `['archer', 'plasma', 'unknown_tower_xyz', 'shield']`를 저장 후 게임 시작 시:
- `window.error` / `unhandledrejection` 이벤트 **없음**
- `console.error` **없음** (커스텀 인터셉터로 확인)
- 간헐 성공 케이스에서 `hasCanvas: true`로 게임 진입됨 → Phaser가 `buildDeckCards` throw를 내부적으로 캐치함을 시사
- DeckDock에 DEFAULT_DECK 카드가 표시됨 (`deck-loaded` 이벤트가 미발행된 것으로 추정)

### 코드 분석을 통한 crash path 파악

실제 crash는 다음 경로로 발생 가능:

**가설 3 (buildDeckCards throw):**
- `Game.ts:213` — `buildDeckCards(deckIds)` 호출 시 unknown id면 throw
- Phaser가 scene `create()` 에러를 내부 캐치 → 브라우저 window.error 미발생
- 결과: scene이 반쯤 초기화된 broken state, `deck-loaded` 미발행, DeckDock 오동작

**가설 1 (stale playerDeck):**
- `onDeckIdsChange` 리스너가 `create()` 이전 또는 도중 타이밍에 발화 가능
- PhaserGame.tsx의 `unsubDeck`이 StrictMode phantom cleanup에서 해제되지 않으면 이전 게임 인스턴스의 registry에 write 시도

### STOP gate 판정

**에러가 재현되지 않음** 행에 해당함 → 기술적으로 🛑 STOP 조건.

그러나 재현 실패 원인이 "해당 버그 없음"이 아니라 **headless 환경의 Phaser 초기화 타이밍 제약**임이 명확하다. 코드 분석으로 `buildDeckCards`의 throw 경로와 `onDeckIdsChange` 스테일 리스너 경로 모두 실제로 존재함이 확인됨. Plan의 Task 2~5 수정 사항은 defensive하며 regression 없이 적용 가능하다.

**에이전트 권고:** 사용자가 Task 2~6 계속 진행을 승인하면 진행. 아니면 실기 환경(macOS Chrome)에서 수동으로 Scenario A를 5회 반복해 에러 스택을 캡처 후 재분류.
