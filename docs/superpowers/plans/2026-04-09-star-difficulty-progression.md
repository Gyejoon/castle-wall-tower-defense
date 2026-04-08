# 스테이지 난이도별 진행 시스템 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ★ 난이도 선택이 인게임 전투·보상·클리어 추적·UI에 실제 반영되도록 수정 (현재 항상 ★1로 동작하는 근본 버그 + UI 피드백 5건)

**Architecture:** PhaserGame.tsx의 selectedStar 레지스트리 미전달 근본 버그 수정 → shared 보상 함수에 star 파라미터 추가 → StageDetailPage 보상 연동 → GameOverScreen 별 클리어 표시 → WorldMapPage 별 진행도 표시

**Tech Stack:** TypeScript, React 18, Phaser 3, Zustand, Vitest, Tailwind CSS v4, pixel-art design tokens

---

## Context

### 🔴 근본 버그: selectedStar가 게임 런타임에 전달되지 않음

`PhaserGame.tsx`(실제 게임 플레이 경로)에서 `selectedStar`를 Phaser 레지스트리에 전혀 설정하지 않는다. `Game.ts:195-196`에서 `rawStar = this.game.registry.get('selectedStar')` → `undefined` → 항상 ★1로 fallback.

- `StageSelectPage.tsx` line 80: `registry.set('selectedStar', ...)` ✅ — 하지만 월드맵 Phaser 씬이지 실제 게임이 아님
- `PhaserGame.tsx` (GamePage가 사용): `selectedStar` 미설정 ❌ — 실제 게임이 항상 ★1로 실행

**즉, ★2/★3을 선택해도 적 HP/방어/속도 배율이 적용되지 않고, star clear 조건 판정도 ★1 기준(survival only)으로만 동작한다.**

### UI 이슈 (총 5건)

1. **보상 표시가 ★1 고정** — `getMaxXpForMap`/`getMaxGoldForMap`이 star 파라미터를 받지 않음
2. **게임 오버 화면에 별 클리어 결과 없음** — `GameOverStats`에 `selectedStar`/`starCleared` 필드가 있지만 `GameOverScreen`이 렌더링하지 않음
3. **보상 배율 미표시** — 맵별 `rewardMultiplier`(1x/2x/3x)와 별별 보상 배율이 UI에 노출되지 않음
4. **월드맵에 별 진행도 미표시** — `WorldMapPage`가 `stageStars`를 읽지 않고 `check-badge.png`만 표시
5. **별 클리어 여부 체크 미반영** — 기록은 되지만 UI에 피드백이 없어 유저가 인지 불가

---

## File Structure

| 파일 | 변경 | 역할 |
|---|---|---|
| `packages/web-shell/src/game/PhaserGame.tsx` | Modify | 🔴 selectedStar 레지스트리 전달 (근본 버그) |
| `packages/shared/src/constants/stageInfo.ts` | Modify | star 파라미터 추가, `getTotalRewardMultiplier` 신규 함수 |
| `packages/shared/src/index.ts` | Modify | `getTotalRewardMultiplier` export 추가 |
| `packages/shared/tests/stageInfo.test.ts` | Modify | star 파라미터 테스트 추가 |
| `packages/web-shell/src/pages/StageDetailPage.tsx` | Modify | 보상 배율 배지, star 연동 info cards |
| `packages/web-shell/src/components/game/GameOverScreen.tsx` | Modify | star 클리어 결과 표시 + 애니메이션 |
| `packages/web-shell/src/styles/global.css` | Modify | fadeSlideIn, starPop keyframes 추가 |
| `packages/web-shell/src/pages/WorldMapPage.tsx` | Modify | check-badge → 별 진행도, 보상 배율 배지 |

---

### Task 0: PhaserGame.tsx에 selectedStar 레지스트리 전달 (근본 버그 수정)

**Files:**
- Modify: `packages/web-shell/src/game/PhaserGame.tsx:37-80`

이 파일은 `showDamageNumbers`, `screenShake` 등의 설정을 `game.registry.set()`으로 Phaser에 전달하고, `useGameStore.subscribe()`로 실시간 동기화한다. `selectedStar`도 동일한 패턴으로 추가한다.

- [ ] **Step 1: 초기 레지스트리 설정 추가**

`packages/web-shell/src/game/PhaserGame.tsx` line 37 (`game.registry.set('screenShake', ...)`) 아래에 한 줄 추가:

```ts
game.registry.set('selectedStar', useGameStore.getState().selectedStar);
```

- [ ] **Step 2: 실시간 동기화 구독 추가**

line 65 (`unsubShake` 구독 블록 완료) 아래에 추가:

```ts
// Sync selectedStar to Phaser registry in real-time
let prevStar = useGameStore.getState().selectedStar;
const unsubStar = useGameStore.subscribe((state) => {
	if (state.selectedStar !== prevStar) {
		prevStar = state.selectedStar;
		gameRef.current?.registry.set('selectedStar', prevStar);
	}
});
```

- [ ] **Step 3: cleanup 함수에 unsubStar 추가**

return cleanup 함수 내부(line ~73)의 `unsubShake();` 아래에 추가:

```ts
unsubStar();
```

전체 cleanup:
```ts
return () => {
	EventBus.off('game-ready', onReady);
	if (!container.isConnected) {
		unsubDeck();
		unsubDmgNumbers();
		unsubShake();
		unsubStar();
		gameRef.current?.destroy(true);
		gameRef.current = null;
		setGameReady(false);
	}
};
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build --workspace=packages/web-shell`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add packages/web-shell/src/game/PhaserGame.tsx
git commit -m "fix: pass selectedStar to Phaser registry in PhaserGame (star difficulty was always ★1)"
```

---

### Task 1: shared 보상 계산에 star 파라미터 추가

**Files:**
- Modify: `packages/shared/src/constants/stageInfo.ts`
- Modify: `packages/shared/src/index.ts:85`
- Test: `packages/shared/tests/stageInfo.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/tests/stageInfo.test.ts` 전체를 아래로 교체:

```ts
import { describe, expect, it } from 'vitest';
import {
	getMaxGoldForMap,
	getMaxXpForMap,
	getTotalRewardMultiplier,
} from '../src/constants/stageInfo';

describe('stageInfo', () => {
	describe('getMaxXpForMap', () => {
		it('forest_gate returns 150 XP (10 waves × 10 + 50 victory bonus, ×1)', () => {
			expect(getMaxXpForMap('forest_gate')).toBe(150);
		});

		it('lava_fortress returns 300 XP (×2 multiplier)', () => {
			expect(getMaxXpForMap('lava_fortress')).toBe(300);
		});

		it('storm_citadel returns 450 XP (×3 multiplier)', () => {
			expect(getMaxXpForMap('storm_citadel')).toBe(450);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxXpForMap('nonexistent')).toBe(0);
		});

		it('forest_gate ★2 returns 300 XP (150 × 2 xp mult)', () => {
			expect(getMaxXpForMap('forest_gate', 2)).toBe(300);
		});

		it('forest_gate ★3 returns 450 XP (150 × 3 xp mult)', () => {
			expect(getMaxXpForMap('forest_gate', 3)).toBe(450);
		});
	});

	describe('getMaxGoldForMap', () => {
		it('forest_gate returns 848 gold (all bounties ×1)', () => {
			expect(getMaxGoldForMap('forest_gate')).toBe(848);
		});

		it('lava_fortress returns 2354 gold (×2 multiplier)', () => {
			expect(getMaxGoldForMap('lava_fortress')).toBe(2354);
		});

		it('storm_citadel returns 4254 gold (×3 multiplier)', () => {
			expect(getMaxGoldForMap('storm_citadel')).toBe(4254);
		});

		it('returns 0 for unknown map', () => {
			expect(getMaxGoldForMap('nonexistent')).toBe(0);
		});

		it('forest_gate ★2 returns 2120 gold (848 × 2.5 gold mult)', () => {
			expect(getMaxGoldForMap('forest_gate', 2)).toBe(2120);
		});

		it('forest_gate ★3 returns 4240 gold (848 × 5 gold mult)', () => {
			expect(getMaxGoldForMap('forest_gate', 3)).toBe(4240);
		});
	});

	describe('getTotalRewardMultiplier', () => {
		it('forest_gate ★1 = {gold:1, xp:1}', () => {
			expect(getTotalRewardMultiplier('forest_gate', 1)).toEqual({
				gold: 1,
				xp: 1,
			});
		});

		it('lava_fortress ★2 = {gold:5, xp:4}', () => {
			expect(getTotalRewardMultiplier('lava_fortress', 2)).toEqual({
				gold: 5,
				xp: 4,
			});
		});

		it('storm_citadel ★3 = {gold:15, xp:9}', () => {
			expect(getTotalRewardMultiplier('storm_citadel', 3)).toEqual({
				gold: 15,
				xp: 9,
			});
		});
	});
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd packages/shared && npx vitest run tests/stageInfo.test.ts`
Expected: FAIL — `getMaxXpForMap`이 2번째 인자를 무시, `getTotalRewardMultiplier` 미정의

- [ ] **Step 3: stageInfo.ts 전체 교체**

`packages/shared/src/constants/stageInfo.ts` 전체를 아래로 교체:

```ts
import { MAP_REGISTRY } from './maps';
import { battleXp } from './meta';
import { STAR_REWARD_MULTIPLIERS, type StarRating } from './starDifficulty';
import { UNITS } from './units';
import { getTotalWavesForMap, getWavesForMap } from './waves';

const unitBountyMap = new Map(UNITS.map((u) => [u.id, u.bounty]));

/** Max XP obtainable from a map (full clear, victory). */
export function getMaxXpForMap(mapId: string, star: StarRating = 1): number {
	const map = MAP_REGISTRY[mapId];
	if (!map) return 0;
	const totalWaves = getTotalWavesForMap(mapId);
	return Math.round(
		battleXp(totalWaves, true) *
			map.rewardMultiplier *
			STAR_REWARD_MULTIPLIERS[star].xp,
	);
}

/** Max gold obtainable from a map (all monsters killed). */
export function getMaxGoldForMap(mapId: string, star: StarRating = 1): number {
	const map = MAP_REGISTRY[mapId];
	if (!map) return 0;
	const waves = getWavesForMap(mapId);
	let total = 0;
	for (const wave of waves) {
		for (const group of wave.groups) {
			const bounty = unitBountyMap.get(group.unitId) ?? 0;
			total += bounty * group.count;
		}
	}
	return Math.round(
		total * map.rewardMultiplier * STAR_REWARD_MULTIPLIERS[star].gold,
	);
}

/** Combined map + star reward multiplier. */
export function getTotalRewardMultiplier(
	mapId: string,
	star: StarRating = 1,
): { gold: number; xp: number } {
	const map = MAP_REGISTRY[mapId];
	if (!map) return { gold: 0, xp: 0 };
	return {
		gold: map.rewardMultiplier * STAR_REWARD_MULTIPLIERS[star].gold,
		xp: map.rewardMultiplier * STAR_REWARD_MULTIPLIERS[star].xp,
	};
}
```

- [ ] **Step 4: index.ts export 추가**

`packages/shared/src/index.ts` line 85를:
```ts
export { getMaxGoldForMap, getMaxXpForMap } from './constants/stageInfo';
```
→
```ts
export { getMaxGoldForMap, getMaxXpForMap, getTotalRewardMultiplier } from './constants/stageInfo';
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd packages/shared && npx vitest run tests/stageInfo.test.ts`
Expected: ALL PASS (기존 8개 + 새 7개 = 15개)

- [ ] **Step 6: 커밋**

```bash
git add packages/shared/src/constants/stageInfo.ts packages/shared/src/index.ts packages/shared/tests/stageInfo.test.ts
git commit -m "feat: add star-aware reward calculations to stageInfo"
```

---

### Task 2: StageDetailPage 보상 배율 및 정보 카드 연동

**Files:**
- Modify: `packages/web-shell/src/pages/StageDetailPage.tsx:88-119`

- [ ] **Step 1: import에 STAR_REWARD_MULTIPLIERS 추가**

기존 `@gld/shared` import에 `STAR_REWARD_MULTIPLIERS` 추가. 현재 import 위치 확인 후 추가.

- [ ] **Step 2: maxXp/maxGold에 selectedStar 전달**

Lines 92-93 변경:
```ts
// Before
const maxXp = getMaxXpForMap(selectedMapId);
const maxGold = getMaxGoldForMap(selectedMapId);

// After
const maxXp = getMaxXpForMap(selectedMapId, selectedStar);
const maxGold = getMaxGoldForMap(selectedMapId, selectedStar);
```

- [ ] **Step 3: 보상 배율 배지 추가**

Hero 섹션 closing `</div>` (line ~184)과 info cards grid (line ~187) 사이에 삽입:

```tsx
{/* 보상 배율 */}
<div className="mx-3 mt-2 flex items-center justify-between px-3 py-1.5 bg-panel border border-gold/30 transition-all duration-200">
	<span className="font-pixel text-[8px] text-text-secondary">
		보상 배율
	</span>
	<div className="flex gap-3">
		<span className="font-pixel text-[10px] text-gold">
			x
			{map.rewardMultiplier *
				STAR_REWARD_MULTIPLIERS[selectedStar].gold}{' '}
			골드
		</span>
		<span className="font-pixel text-[10px] text-info">
			x
			{map.rewardMultiplier *
				STAR_REWARD_MULTIPLIERS[selectedStar].xp}{' '}
			XP
		</span>
	</div>
</div>
```

- [ ] **Step 4: info card sub 텍스트를 star 기준으로 변경**

```ts
const infoCards = [
	{
		label: '최대 경험치',
		value: `${maxXp} XP`,
		sub: `★${selectedStar} 기준`,
	},
	{
		label: '최대 골드',
		value: `~${maxGold} G`,
		sub: `★${selectedStar} 기준`,
	},
	{
		label: '웨이브',
		value: `${totalWaves}`,
		sub: hasBoss ? '보스 포함' : '보스 없음',
	},
	{
		label: '경로',
		value: `${lanes} 레인`,
		sub: lanes === 1 ? '단일 경로' : '분기 경로',
	},
];
```

- [ ] **Step 5: info card value에 transition 추가**

info cards 렌더링부의 value `<p>` 태그에 transition class 추가:

```tsx
<p className="font-pixel text-[11px] text-gold mt-1 transition-all duration-200">
	{card.value}
</p>
```

- [ ] **Step 6: 빌드 확인**

Run: `npm run build --workspace=packages/web-shell`
Expected: 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add packages/web-shell/src/pages/StageDetailPage.tsx
git commit -m "feat: StageDetailPage shows star-adjusted rewards and multiplier badge"
```

---

### Task 3: GameOverScreen에 별 클리어 결과 표시

**Files:**
- Modify: `packages/web-shell/src/components/game/GameOverScreen.tsx:4-67`
- Modify: `packages/web-shell/src/styles/global.css`

- [ ] **Step 1: props 인터페이스에 star 필드 추가**

`packages/web-shell/src/components/game/GameOverScreen.tsx` 내 `GameOverScreenProps` 인터페이스의 `gameOverStats` 타입에 optional 필드 추가:

```ts
interface GameOverScreenProps {
	runStatus: 'victory' | 'defeat';
	gameOverStats: {
		wavesCleared: number;
		towersPlaced: number;
		timeSurvivedSec: number;
		goldEarned: number;
		xpEarned: number;
		selectedStar?: 1 | 2 | 3;
		starCleared?: boolean;
	} | null;
	onRestart: () => void;
	onLobby: () => void;
}
```

- [ ] **Step 2: 배너 아래에 별 클리어 결과 strip 추가 (애니메이션 포함)**

배너 closing `</div>` (line ~67) 바로 아래에 삽입. `colors` import는 이미 존재:

```tsx
{/* Star clear result */}
{gameOverStats?.selectedStar != null && runStatus === 'victory' && (
	<div
		className="flex items-center justify-center gap-2 py-2 -mx-5 animate-[fadeSlideIn_0.5s_ease-out_0.3s_both]"
		style={{
			background: gameOverStats.starCleared
				? 'rgba(200,160,74,0.15)'
				: 'rgba(80,20,20,0.3)',
			borderBottom: `1px solid ${gameOverStats.starCleared ? colors.gold : 'rgba(200,60,60,0.3)'}`,
		}}
	>
		<div className="flex gap-[2px]">
			{Array.from(
				{ length: gameOverStats.selectedStar },
				(_, i) => (
					<img
						key={i}
						src={
							gameOverStats.starCleared
								? 'assets/ui/icon-star-active.png'
								: 'assets/ui/icon-star-inactive.png'
						}
						alt=""
						width={14}
						height={14}
						className="[image-rendering:pixelated]"
						style={{
							animation: gameOverStats.starCleared
								? `starPop 0.3s ease-out ${0.5 + i * 0.15}s both`
								: undefined,
						}}
					/>
				),
			)}
		</div>
		<span
			className="font-pixel text-[10px]"
			style={{
				color: gameOverStats.starCleared
					? colors.gold
					: colors.danger,
			}}
		>
			{gameOverStats.starCleared
				? `★${gameOverStats.selectedStar} 클리어!`
				: `★${gameOverStats.selectedStar} 조건 미달`}
		</span>
	</div>
)}
```

- [ ] **Step 3: global.css에 keyframes 추가**

`packages/web-shell/src/styles/global.css` 내 기존 `@keyframes warningPulse` (line ~230) 아래에 추가:

```css
@keyframes fadeSlideIn {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes starPop {
	0% {
		opacity: 0;
		transform: scale(0);
	}
	70% {
		transform: scale(1.3);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build --workspace=packages/web-shell`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add packages/web-shell/src/components/game/GameOverScreen.tsx packages/web-shell/src/styles/global.css
git commit -m "feat: GameOverScreen displays star clear result with pop animation"
```

---

### Task 4: WorldMapPage 별 진행도 표시

**Files:**
- Modify: `packages/web-shell/src/pages/WorldMapPage.tsx:41-253,265`

- [ ] **Step 1: stageStars 구독 추가**

Line 41 (`const stagesCleared = useMetaStore(...)`) 아래에 추가:

```ts
const stageStars = useMetaStore((s) => s.progress.stageStars);
```

- [ ] **Step 2: check-badge를 별 진행도로 교체**

Lines 246-253의 check-badge 블록:
```tsx
{cleared && !locked && (
	<img
		src="assets/ui/check-badge.png"
		alt="클리어"
		className="absolute top-1 right-1 w-5 h-5 drop-shadow-[1px_1px_0px_#0a0804] [image-rendering:pixelated]"
	/>
)}
```

을 아래로 교체:

```tsx
{!locked && (
	<div className="absolute top-1 right-1 flex gap-[1px]">
		{([1, 2, 3] as const).map((s) => (
			<img
				key={s}
				src={
					s <= (stageStars[map.id] ?? 0)
						? 'assets/ui/icon-star-active.png'
						: 'assets/ui/icon-star-inactive.png'
				}
				alt=""
				width={10}
				height={10}
				className="[image-rendering:pixelated] drop-shadow-[1px_1px_0px_#0a0804]"
			/>
		))}
	</div>
)}
```

- [ ] **Step 3: cleared 변수 선언 제거**

Line 172의 `const cleared = stagesCleared.includes(map.id);`를 삭제한다. 이 변수는 check-badge에서만 사용되었으며, 삭제해도 다른 코드에 영향 없음 (확인 완료).

- [ ] **Step 4: 맵 노드 아래에 보상 배율 표시**

맵 이름 `<span>` (line ~265) 아래에 추가:

```tsx
{map.rewardMultiplier > 1 && (
	<span className="font-pixel text-[7px] text-gold">
		x{map.rewardMultiplier} 보상
	</span>
)}
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build --workspace=packages/web-shell`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add packages/web-shell/src/pages/WorldMapPage.tsx
git commit -m "feat: WorldMapPage shows star progress instead of check badge"
```

---

### Task 5: GDD 스펙 문서 업데이트

**Files:**
- Modify: `docs/game-spec/01-GDD.md:281`

- [ ] **Step 1: WorldMapPage UI 설명 업데이트**

`docs/game-spec/01-GDD.md` line 281의:
```
- **WorldMapPage** (스테이지 선택): 맵 썸네일 카드 노드 + SVG 골드 점선 경로, 잠금/해금/클리어 상태 표시, 권장 레벨 뱃지, 클리어 배지(골드 방패 픽셀 아트).
```

를 아래로 교체:

```
- **WorldMapPage** (스테이지 선택): 맵 썸네일 카드 노드 + SVG 골드 점선 경로, 잠금/해금 상태 표시, 권장 레벨 뱃지, 별 진행도 표시(★1/★2/★3 활성 별 아이콘), 보상 배율 배지(x2/x3).
```

- [ ] **Step 2: 커밋**

```bash
git add docs/game-spec/01-GDD.md
git commit -m "docs: update GDD WorldMapPage description to match star progress UI"
```

---

## Verification

1. **Unit tests**: `cd packages/shared && npx vitest run tests/stageInfo.test.ts` — 15개 테스트 모두 통과
2. **Full build**: `npm run build` — 에러 없음
3. **수동 QA**:
   - **Task 0 핵심 검증**: ★2/★3 선택 후 인게임에서 적 HP가 실제로 2.5x/5.0x 증가하는지 확인 (데미지 넘버 비교)
   - StageDetailPage에서 ★1 → ★2 → ★3 전환 시 최대 XP/골드 값과 보상 배율 변경 확인
   - 게임 클리어 후 GameOverScreen에 별 클리어 성공/실패 + 별 pop 애니메이션 확인
   - WorldMapPage에서 스테이지별 별 진행도(0~3개 활성 별) 표시 확인
   - 맵 보상 배율(x2, x3) 배지 표시 확인
