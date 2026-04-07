# Wave Scaling & QoL Improvements Design

**Date:** 2026-04-07
**Status:** Implemented
**Scope:** 웨이브 재설계, 밸런스 조정, 타워 판매, 게임 나가기, 덱 편집 버그 수정, iOS 사운드 수정, 보스 leak defeat

---

## Context

현재 게임의 웨이브는 하드코딩된 10개 구성으로, 웨이브 간 HP/속도 차이가 없어 난이도 곡선이 평탄하다.
첫 웨이브부터 다양한 몬스터가 등장해 "쉬운 시작 → 점진적 어려움"이라는 핵심 재미가 부재하다.
또한 타워 판매, 게임 나가기 등 기본적인 QoL 기능이 누락되어 있고,
덱 편집이 인게임에 반영되지 않는 버그가 보고되었다.

---

## 1. 웨이브 재설계 + 스케일링 커브

### 1.1 웨이브 구성 재설계

기존 하드코딩된 웨이브 구성을 초반 성공 경험 → 후반 실패 경험 커브로 재설계한다.

#### forest_gate (기본 맵)

| Wave | Kind | 몬스터 구성 | 의도 |
|------|------|------------|------|
| 1 | normal | scout_drone ×4 | 성공 경험. 약한 적 소수 |
| 2 | normal | scout_drone ×6 | 수량 증가, 여전히 쉬움 |
| 3 | normal | scout_drone ×4 + battle_robot ×2 | 새 몬스터 등장, 방어력 체감 |
| 4 | normal | battle_robot ×4 + stealth_drone ×2 | 빠른 적 등장 |
| 5 | boss | titan ×1 | 중간보스. 높은 체력 단일 적 |
| 6 | normal | scout_drone ×6 + battle_robot ×3 | 물량 증가 |
| 7 | normal | battle_robot ×4 + heavy_walker ×2 | 고방어 적 등장 |
| 8 | normal | stealth_drone ×4 + heavy_walker ×3 | 속도+방어 조합 |
| 9 | pre_boss | battle_robot ×4 + heavy_walker ×2 + stealth_drone ×3 | 혼합 대군 |
| 10 | boss | titan ×1 + heavy_walker ×2 + battle_robot ×3 | 최종보스 + 호위대 |

#### lava_fortress

기본 구성 동일, 각 웨이브 몬스터 수량 ×1.2 (반올림).

#### storm_citadel

기본 구성 동일, 각 웨이브 몬스터 수량 ×1.5 (반올림).
Wave 5: titan ×2 + heavy_walker ×2, Wave 10: titan ×2 + heavy_walker ×3 + battle_robot ×5 + stealth_drone ×3.

### 1.2 웨이브별 스케일링 커브

`waves.ts`에 `WAVE_SCALING` 배열 추가. Wave 1~4는 완만하게, Wave 5부터 본격 상승.

```typescript
export const WAVE_SCALING: readonly { hp: number; speed: number }[] = [
  { hp: 1.0, speed: 1.0 },   // Wave 1  — 성공 경험
  { hp: 1.0, speed: 1.0 },   // Wave 2  — 여전히 쉬움
  { hp: 1.1, speed: 1.0 },   // Wave 3  — 미세 증가
  { hp: 1.2, speed: 1.0 },   // Wave 4  — 약간 도전
  { hp: 1.5, speed: 1.05 },  // Wave 5  — 중간보스, 본격 상승
  { hp: 1.8, speed: 1.05 },  // Wave 6
  { hp: 2.2, speed: 1.1 },   // Wave 7
  { hp: 2.6, speed: 1.1 },   // Wave 8
  { hp: 3.0, speed: 1.15 },  // Wave 9  — 최종 러시
  { hp: 3.5, speed: 1.15 },  // Wave 10 — 최종보스
];
```

### 1.3 밸런스 조정 (difficultyHpMult)

기존 모든 맵의 `difficultyHpMult: 5`는 몬스터 HP를 5배로 만들어 Wave 1조차 클리어 불가능했음.
맵별 차등 적용으로 초반 성공 경험 보장:

| 맵 | 기존 | 변경 후 |
|----|------|---------|
| forest_gate | 5 | **1** |
| lava_fortress | 5 | **1.3** |
| storm_citadel | 5 | **1.6** |

**적용 순서:**
1. 기본 유닛 스탯 (units.ts)
2. × 스테이지 레벨 스케일링 (scaling.ts의 Band 배수)
3. × 맵 난이도 배수 (difficultyHpMult)
4. × 웨이브 스케일링 (WAVE_SCALING[slotIndex - 1])
5. × FINAL_BOSS_HP_MULTIPLIER (Wave 10 보스만)

### 1.4 변경 파일

- `packages/shared/src/constants/waves.ts` — 웨이브 구성 재작성 + WAVE_SCALING 추가
- `packages/shared/src/constants/maps.ts` — difficultyHpMult 맵별 차등 적용
- `packages/phaser-game/src/systems/WaveSystem.ts` — 스폰 시 WAVE_SCALING 적용
- `packages/phaser-game/src/systems/UnitSystem.ts` — waveHpMult/waveSpeedMult 파라미터 추가

---

## 2. 타워 판매

### 2.1 변경 사항

**환급률:** `Math.floor(cost * 0.5)` (50% 환급). `TowerSystem.calcRefund()` 정적 메서드로 단일 출처.

**인게임 판매 플로우:**
1. Phaser 측: 배치된 타워를 탭 → `EventBus.emit('tower-selected', { towerDefId, towerName, col, row, refund })`
2. 빈 타일 탭 → `EventBus.emit('tower-deselected')`
3. React 측: 타워 정보 패널 표시 (타워 이름 + "판매 E+{refund}" 버튼, danger 색상)
4. 판매 클릭 → `EventBus.emit('request-sell-tower', { col, row })`
5. Game.ts: `sellTower()` 호출 → `energySystem.add(refund)` → `tower-sold` emit → `tower-deselected` emit
6. 판매 성공 시 토스트 "E+{refund}" 표시

### 2.2 변경 파일

- `packages/phaser-game/src/systems/TowerSystem.ts` — 환급률 50%, `calcRefund()` 정적 메서드
- `packages/phaser-game/src/EventBus.ts` — `tower-selected`, `tower-deselected` 이벤트 타입
- `packages/phaser-game/src/scenes/Game.ts` — 타워 선택 감지, `request-sell-tower` 리스너
- `packages/web-shell/src/hooks/useGameEvents.ts` — tower-selected/deselected/sold 리스너
- `packages/web-shell/src/pages/GamePage.tsx` — 판매 패널 UI

---

## 3. 게임 나가기

### 3.1 변경 사항

**나가기 버튼:**
- TopHud 우상단에 "나가기" 텍스트 버튼 (배속 버튼과 동일 스타일)
- `runStatus === 'running'`일 때만 표시

**확인 모달:**
- 배경: `var(--color-panel)` + border(#4a3a20)
- "정말 나가시겠습니까?" + "진행 상황이 저장되지 않습니다"
- "나가기" 버튼(danger #c03020) / "계속하기" 버튼(accent #c8a04a)
- 모달 전환: `fadeIn 0.2s ease-out`
- 게임 오버 시 모달 자동 닫힘 (`runStatus === 'running'` 가드)

**게임 일시정지:**
- 모달 열림 → `EventBus.emit('request-pause')` → `scene.pause()`
- 모달 닫힘 → `EventBus.emit('request-resume')` → `scene.resume()`
- "나가기" → `enterLobby()` (기존 함수)

### 3.2 변경 파일

- `packages/web-shell/src/components/game/TopHud.tsx` — 나가기 텍스트 버튼, `onExitRequest` prop
- `packages/web-shell/src/pages/GamePage.tsx` — 확인 모달, pause/resume 핸들러
- `packages/phaser-game/src/scenes/Game.ts` — `request-pause`/`request-resume` 리스너

---

## 4. 덱 편집 버그 수정

### 4.1 근본 원인

`PhaserGame.tsx`의 `useEffect`가 Phaser 게임을 최초 1회만 생성하고 `game.registry.set('deckIds', ...)`도 그때 1회만 실행. 이후 덱 편집으로 `gameStore.selectedDeck`이 변경되어도 Phaser registry가 업데이트되지 않아 다음 게임에서 구 덱이 사용됨.

### 4.2 수정

`PhaserGame.tsx`에 `gameStore.selectedDeck` 변경을 구독하여 Phaser registry를 실시간 동기화하는 Zustand subscription 추가. 기존 `showDamageNumbers` 동기화와 동일한 패턴. cleanup 시 `unsubDeck()` 호출.

### 4.3 변경 파일

- `packages/web-shell/src/game/PhaserGame.tsx` — selectedDeck Zustand subscription + cleanup

---

## 5. iOS/iPad Safari/Chrome 사운드 수정

### 5.1 근본 원인

iOS Safari/Chrome은 사용자 제스처(`pointerdown`, `touchstart`, `click`) 없이 `AudioContext`를 시작할 수 없음.
기존 `soundGenerator.unlock()`은 `visibilitychange`에서만 호출되는데, iOS에서 사용자 제스처로 인정되지 않음.

### 5.2 수정

`GamePage.tsx`에 첫 사용자 인터랙션(`pointerdown`, `touchstart`, `click`)에서 `soundGenerator.unlock()` 호출 후 리스너 자동 제거 (1회성). 기존 `visibilitychange` 리스너는 탭 전환 후 복귀용으로 유지.

### 5.3 변경 파일

- `packages/web-shell/src/pages/GamePage.tsx` — 첫 제스처 AudioContext unlock useEffect

---

## 6. 보스 leak 시 즉시 defeat

### 6.1 문제

보스를 못 잡아도(경로 끝까지 leak) HP만 깎이고 게임이 계속 진행되어 victory 가능했음.

### 6.2 수정

- `UnitSystem.update()`의 `reachedExit` 반환 타입을 `string[]` → `{ id: string; isBoss: boolean }[]`로 변경
- `Game.ts`에서 leak된 유닛이 보스(`isBoss`)이면 HP 관계없이 즉시 defeat 처리
- 게임 오버 후 pointerdown 무시 (`this.gameOver` 가드)

### 6.3 변경 파일

- `packages/phaser-game/src/systems/UnitSystem.ts` — reachedExit에 isBoss 포함
- `packages/phaser-game/src/scenes/Game.ts` — 보스 leak instant defeat + gameOver 가드

---

## Verification

1. **웨이브 스케일링:** Wave 1~4는 laser 1~3개로 HP 20 유지 가능, Wave 5부터 본격 도전
2. **타워 판매:** 타워 탭 → 정보 패널 → 판매 → 에너지 50% 환급, 토스트 "E+N" 표시
3. **게임 나가기:** "나가기" 버튼 → 확인 모달 → 게임 일시정지 → 로비 복귀
4. **덱 편집:** 덱 변경 → 게임 시작 → DeckDock에 변경된 카드 표시
5. **iOS 사운드:** iPad/iPhone Safari/Chrome에서 첫 탭 후 사운드 재생
6. **보스 leak:** 보스가 경로 끝 도달 시 즉시 패배 처리
7. **테스트:** `pnpm test` 341 tests 통과 (134 shared + 141 phaser + 66 web-shell)
8. **빌드:** `pnpm build:web` 성공
