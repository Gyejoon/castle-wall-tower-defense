# Wave Scaling & QoL Improvements Design

**Date:** 2026-04-07
**Status:** Draft
**Scope:** 웨이브 재설계, 타워 판매, 게임 나가기, 덱 편집 버그 수정

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

#### lava_fortress (1.2x 난이도)

기본 구성 동일, 각 웨이브 몬스터 수량 ×1.2 (반올림).

#### storm_citadel (1.5x 난이도)

기본 구성 동일, 각 웨이브 몬스터 수량 ×1.5 (반올림).
Wave 5, 10에 추가 호위대 포함.

### 1.2 웨이브별 스케일링 커브

`waves.ts`에 `WAVE_SCALING` 배열을 추가한다. `WaveSystem`이 유닛 스폰 시 이 배수를 적용한다.

```typescript
export const WAVE_SCALING: readonly { hp: number; speed: number }[] = [
  { hp: 1.0, speed: 1.0 },   // Wave 1
  { hp: 1.1, speed: 1.0 },   // Wave 2
  { hp: 1.2, speed: 1.05 },  // Wave 3
  { hp: 1.4, speed: 1.05 },  // Wave 4
  { hp: 1.6, speed: 1.1 },   // Wave 5 (boss)
  { hp: 1.8, speed: 1.1 },   // Wave 6
  { hp: 2.0, speed: 1.15 },  // Wave 7
  { hp: 2.3, speed: 1.15 },  // Wave 8
  { hp: 2.7, speed: 1.2 },   // Wave 9
  { hp: 3.0, speed: 1.2 },   // Wave 10 (final boss)
];
```

**적용 순서:**
1. 기본 유닛 스탯 (units.ts)
2. × 스테이지 레벨 스케일링 (scaling.ts의 Band 배수)
3. × 맵 난이도 배수 (difficultyHpMult)
4. × **웨이브 스케일링** (WAVE_SCALING[slotIndex - 1]) ← 신규
5. × FINAL_BOSS_HP_MULTIPLIER (Wave 10 보스만)

### 1.3 변경 파일

- `packages/shared/src/constants/waves.ts` — 웨이브 구성 재작성 + WAVE_SCALING 추가
- `packages/phaser-game/src/systems/WaveSystem.ts` — 스폰 시 WAVE_SCALING 적용
- `packages/phaser-game/src/systems/UnitSystem.ts` — spawnUnit에 hpMult/speedMult 파라미터 추가

---

## 2. 타워 판매

### 2.1 현재 상태

`TowerSystem.sellTower(gridX, gridY)` 구현 완료 (70% 환급).
인게임에서 호출하는 코드 없음.

### 2.2 변경 사항

**환급률:** `Math.floor(cost * 0.7)` → `Math.floor(cost * 0.5)`

**인게임 판매 플로우:**
1. 배치된 타워를 탭/클릭
2. 타워 정보 팝업 표시 (타워 이름, 스탯, 판매 버튼)
3. 판매 버튼 탭 → `EventBus.emit('request-sell-tower', { col, row })`
4. `Game.ts`에서 `sellTower()` 호출 → 에너지 환급
5. `EventBus.emit('tower-sold', { col, row, refund })` → React HUD 갱신

**UI:**
- 타워 탭 시 해당 타워 위에 간단한 정보 패널 표시
- "판매 (E+환급량)" 버튼
- 타워 선택 해제: 빈 타일 탭 또는 다른 타워 탭

### 2.3 변경 파일

- `packages/phaser-game/src/systems/TowerSystem.ts` — 환급률 0.5로 변경
- `packages/phaser-game/src/scenes/Game.ts` — 타워 탭 이벤트 처리, sellTower 호출
- `packages/shared/src/types/events.ts` — 필요 시 이벤트 타입 추가
- `packages/web-shell/src/pages/GamePage.tsx` — 타워 정보/판매 UI

---

## 3. 게임 나가기

### 3.1 현재 상태

인게임 중 나가기 불가. 패배를 기다려야 함.

### 3.2 변경 사항

**나가기 버튼:**
- GamePage HUD 상단 영역에 나가기 아이콘 버튼 추가

**확인 모달:**
- 나가기 버튼 탭 → 확인 모달 표시
- 텍스트: "정말 나가시겠습니까? 진행 상황이 저장되지 않습니다."
- 버튼: "나가기" / "계속하기"
- "나가기" → `enterLobby()` 호출 (기존 gameStore 함수 재사용)
- "계속하기" → 모달 닫기

**게임 일시정지:**
- 모달이 열리는 동안 게임 일시정지 (`EventBus.emit('request-pause')`)
- 모달 닫히면 재개 (`EventBus.emit('request-resume')`)

### 3.3 변경 파일

- `packages/web-shell/src/pages/GamePage.tsx` — 나가기 버튼 + 확인 모달

---

## 4. 덱 편집 버그 수정

### 4.1 현재 문제

덱 편집 후 인게임에 반영되지 않는 현상 보고.

### 4.2 의심 원인

데이터 플로우:
```
DeckEditSheet.handleConfirm()
  → gameStore.setSelectedDeck(selected)
    → metaStore.setSelectedDeck(deck)  // localStorage 저장
  → gameStore.selectedDeck 업데이트

게임 시작:
  PhaserGame.tsx → metaStore.getState().selectedDeck 읽기
  → game.registry.set('deckIds', ...)
  → Game.ts create() → buildDeckCards(deckIds)
```

**잠재적 문제점:**
1. **gameStore ↔ metaStore 동기화:** `gameStore.setSelectedDeck`이 `metaStore`를 업데이트하는 순서/타이밍
2. **Phaser registry 설정 타이밍:** `PhaserGame.tsx`에서 `game.registry.set`이 `Game.create()` 전에 실행되는지
3. **DeckEditSheet 상태 관리:** `selected` 로컬 상태가 스토어와 정확히 동기화되는지

### 4.3 수정 방향

1. `DeckEditSheet` → `metaStore` → `gameStore` 데이터 플로우 추적
2. 두 스토어 간 동기화 검증, 필요 시 단일 출처로 통합
3. `PhaserGame.tsx`의 registry 설정 타이밍 검증
4. 덱 편집 → 게임 시작 → 인게임 덱 확인 E2E 플로우 테스트

### 4.4 변경 파일

- `packages/web-shell/src/components/lobby/DeckEditSheet.tsx`
- `packages/web-shell/src/stores/gameStore.ts`
- `packages/web-shell/src/stores/metaStore.ts`
- `packages/web-shell/src/game/PhaserGame.tsx`

---

## Verification

1. **웨이브 스케일링:** Wave 1 vs Wave 10에서 같은 몬스터(scout_drone)의 HP/속도가 스케일링 배수만큼 증가하는지 확인
2. **타워 판매:** 타워 설치 → 탭 → 판매 → 에너지 50% 환급 확인, 격자에서 타워 제거 확인
3. **게임 나가기:** 인게임 중 나가기 → 확인 모달 → "나가기" → 로비 복귀 확인
4. **덱 편집:** 덱 변경 → 게임 시작 → DeckDock에 변경된 카드 표시 확인
5. **기존 테스트:** `pnpm test` 통과
6. **빌드:** `pnpm build` 성공
