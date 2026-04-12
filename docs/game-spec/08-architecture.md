# 08 — 코드 아키텍처 레퍼런스

> **Last Updated:** 2026-04-11
>
> AGENTS.md = "무엇이 어디 있는가" (파일 맵, 편집 가이드)
> 이 문서 = "왜 이렇게 연결되는가" (구조적 이유, 상태머신, 시퀀스)

---

## §1 패키지 구조

모노레포 3패키지. 의존 방향은 단방향이다.

```
@gld/shared  ──►  @gld/phaser-game  ──►  web-shell
```

| 패키지 | 역할 | 주요 의존성 |
|--------|------|------------|
| `@gld/shared` | 게임 규칙, 타입, 상수, 수치 데이터 | 없음 (pure TS) |
| `@gld/phaser-game` | Phaser 씬, 9개 시스템, EventBus | `@gld/shared`, `phaser` |
| `web-shell` | React UI, Zustand 스토어, PWA 진입점 | `@gld/phaser-game`, `@gld/shared`, `zustand` |

`web-shell`은 `@gld/phaser-game`을 import하지만, 런타임 통신은 EventBus를 통해서만 한다. 직접 시스템 인스턴스를 참조하지 않는다.

---

## §2 시스템 의존성 및 생명주기

### 초기화 순서 (`Game.ts create()`)

```
GridManager
    └─► PathfindingSystem
    └─► TowerSystem  (GridManager, PathfindingSystem, collection, spawnExitPairs)
    └─► UnitSystem   (GridManager)
        └─► WaveSystem   (UnitSystem, mapWaves, difficultyHpMult)
DeckSystem    (deckCards)
DamageNumberSystem  (scene)
EnergySystem  (standalone)
GimmickSystem (scene, gridManager, starRating) — 월드별 기믹 처리 [M2+]
TutorialSystem  (scene) — tutorialCompleted가 false일 때만
```

### update() 루프 실행 순서

```
1. WaveSystem.update(scaledDelta, activeUnitCount)
2. EnergySystem.update(scaledDelta / 1000)
3. GimmickSystem.update(scaledDelta)  ← [M2+ 추가]
4. processCombatField()
   ├─ TowerSystem.update() → damageEvents
   ├─ UnitSystem.applyDamage / applySlow / applyStun
   └─ UnitSystem.update() → reachedExit[]
5. DamageNumberSystem.update(_time, delta)  ← 실제 delta(스케일 없음)
6. Exit 처리 → player HP 감소 → defeat 체크
7. WavePhase === 'ended' + 유닛 없음 → victory 체크
```

`speedMultiplier`(1× or 2×)는 `scaledDelta`에만 적용된다. DamageNumberSystem은 시각 효과이므로 실제 delta를 사용한다.

### 유닛 이동 방향 표현

| 유닛 타입 | 방향 표현 | 비고 |
|-----------|----------|------|
| 비행 보스 (`flying: true`) | `setRotation(moveAngle - π/2)` | 이동 방향을 바라봄 |
| 지상 보스 | `flipX` only | 좌우 반전만, 회전 없음 |
| 일반 유닛 | `flipX` | 이동 방향에 따라 좌우 반전 |

> 코드: `packages/phaser-game/src/systems/UnitSystem.ts` — update() 내 스프라이트 방향 처리

### 몬스터 충돌

`sweepCollisions()`는 비활성화 상태 (즉시 반환). 스폰 차단 로직도 제거되어 몬스터가 서로를 통과하여 이동한다.

### 시스템 간 의존 관계

```
WaveSystem ──► UnitSystem ──► GridManager
TowerSystem ──► GridManager
TowerSystem ──► PathfindingSystem
Game.ts ──────────────────────► EventBus (emit/off)
```

### 클린업 역순 (`cleanup()`)

```
EventBus 리스너 해제
TutorialSystem.destroy()
DamageNumberSystem.destroy()
TowerSystem.destroy()
UnitSystem.destroy()
WaveSystem.destroy()
DeckSystem.reset()
EnergySystem.reset()
옵셔널 에셋 언로드
```

---

## §3 TypedEventBus 패턴

`EventBus.ts`에 정의된 `TypedEventBus`는 Phaser `Events.EventEmitter`를 래핑해 이벤트 이름과 페이로드를 `GameEventMap`으로 타입 안전하게 만든다.

### Game → React 이벤트

| 이벤트 | 발화 시점 | 주요 수신자 |
|--------|----------|------------|
| `game-ready` | create() 완료 | PhaserGame.tsx → gameStore.setGameReady |
| `current-scene-ready` | create() 완료 | PhaserGame.tsx |
| `energy-changed` | 에너지 변동 | useGameEvents → gameStore.setEnergy |
| `tower-placed` | 배치 시도 결과 | useGameEvents → 피드백 처리 |
| `deck-loaded` | 씬 초기화 | useGameEvents → gameStore.setDeckCards |
| `wave-prep-started` | `WaveSystem.start()` 진입 시 (prep 페이즈, 모든 전투) | useGameEvents → gameStore.setCountdown + wavePhase='prep' |
| `wave-prep-tick` | prep 페이즈 update() tick (매 프레임) | useGameEvents → gameStore.setCountdown |
| `wave-started` | 웨이브 시작 | useGameEvents → runStatus='running', HUD 갱신 |
| `wave-completed` | 웨이브 클리어 | useGameEvents → 카운트다운 시작 |
| `boss-warning` | boss 웨이브 진입 시 | useGameEvents → bossWarningVisible |
| `boss-hp-update` | 보스 피격 | useGameEvents → setBossHp |
| `boss-phase-change` | 보스 2페이즈 돌입 | useGameEvents → 토스트 |
| `boss-defeated` | 보스 사망 | useGameEvents → setBossHp 초기화 |
| `player-damaged` | 유닛 exit 도달 | useGameEvents → setLives |
| `player-tower-count` | 타워 배치/판매 | useGameEvents → setPlayerTowerCount |
| `game-over` | 승/패 확정 | useGameEvents → runStatus, 메타 갱신 |
| `tutorial-step` | 튜토리얼 진행 | 튜토리얼 UI |
| `tutorial-completed` | 튜토리얼 완료 | metaStore.progress |
| `gimmick-state-changed` | GimmickSystem 상태 변경 | useGameEvents → HUD 표시 |

### React → Game 이벤트 (`request-*` 접두사)

| 이벤트 | 발화 주체 | 처리 위치 |
|--------|----------|----------|
| `request-select-tower` | DeckDock | Game.ts onSelectTower |
| `request-clear-tower-selection` | UI | Game.ts onClearTowerSelection |
| `request-sell-tower` | UI | TowerSystem |
| `request-start-game` | UI | 씬 전환 |
| `request-reset-run` | 결과 화면 | useGameEvents → gameStore.resetRun |
| `request-set-speed` | SpeedButton | Game.ts onSetSpeed |
| `request-tutorial-advance` | 튜토리얼 UI | TutorialSystem |
| `request-gimmick-info` | UI에서 기믹 상태 요청 | GimmickSystem |
| `star-selected` | StageDetail에서 별 선택 | game.registry sync |

---

## §4 상태 관리

3계층으로 분리된다.

### React Layer

| 스토어 | 수명 | 저장 내용 |
|--------|------|----------|
| `gameStore` (Zustand) | 런 단위 (resetRun()으로 초기화) | runStatus, 에너지, HP, 웨이브, HUD, 토스트, 덱 카드 |
| `metaStore` (Zustand + localStorage) | 세션 영속 | 프로필, 컬렉션, 가챠, 미션, 설정, 덱 ID |

`metaStore`는 `subscribeWithSelector` 미들웨어를 사용하고, `beforeunload` / `visibilitychange`에서 localStorage에 flush한다.

### Phaser Layer

| 저장소 | 내용 |
|--------|------|
| `game.registry` | React→Phaser 초기값 전달 (deckIds, collection, tutorialCompleted) |
| 시스템 내부 상태 | TowerSystem(배치된 타워), UnitSystem(유닛 목록), EnergySystem(현재 에너지), WaveSystem(웨이브 인덱스/phase) |

### 동기화 규칙

- **React → Phaser 초기값**: `PhaserGame.tsx`에서 `game.registry.set()`으로 전달.
- **React → Phaser 실시간**: EventBus `request-*` 이벤트.
- **Phaser → React 실시간**: EventBus 서술형 이벤트 → `useGameEvents` 훅 → Zustand set.
- **설정값 실시간 동기화 예외**: `screenShake`는 `useGameStore.subscribe()`로 변경 감지 후 `game.registry.set()` 호출.

---

## §5 렌더링 파이프라인

`setDepth()` 수치 기반 painter's algorithm.

| Depth | 레이어 | 대상 |
|-------|--------|------|
| 0 | Ground | TinySwords 배경 타일 |
| 0.1-0.9 | Gimmick VFX | 용암 glow(0.1), 역병 안개(0.5), 마력 폭발(0.9) |
| 3 + x + y + depthOffset | Decorations | 나무, 바위 등 장식 스프라이트 (`gridManager.getDepth()` 기반) |
| 5 | Path | 경로 라인 오버레이 |
| ~12 | Towers | 타워 스프라이트 |
| 15 | Selection | selectionGraphics (배치 가능 하이라이트) |
| ~14–20 | Units | 유닛 스프라이트 |
| 22 | Range overlay | 타워 선택 시 사거리 링 (gold fill 0.08 + stroke 0.6, Phaser tween fade 120ms) |
| 80 | DamageNumbers | 피해 숫자 텍스트 |
| 90 | VFX | 보스 경고 오버레이 |
| 150 | Tutorial | 튜토리얼 오버레이 |

데코레이션은 `3 + x + y + asset.depthOffset`을 사용해 타일 위치에 따라 자연스러운 depth 정렬(앞에 있는 오브젝트가 뒤의 것을 가림)을 구현한다.

---

## §6 게임 루프 상태머신 (RunStatus)

```
         request-reset-run / resetRun()
              ┌────────────────────────────────────────┐
              ▼                                        │
           lobby  ──► building  ──► running  ──► victory
                                        │
                                        └──────────────► defeat
              ▲                                        │
              └────────────── enterLobby() ────────────┘
```

| 전이 | 트리거 |
|------|--------|
| `lobby → building` | `resetRun()` 호출 (맵 선택 후 Start) |
| `building → running` | EventBus `wave-started` 수신 |
| `running → victory` | EventBus `game-over` (result: 'victory') |
| `running → defeat` | EventBus `game-over` (result: 'defeat') |
| `victory/defeat → lobby` | `enterLobby()` 호출 (결과 화면에서 Home) |

---

## §7 웨이브 시스템 상태머신 (WavePhase)

```
       start()
          │
          ▼
       prep ──► spawning ──► combat  ──► waiting ──► spawning (다음 웨이브)
       (매 전투)             boss ──►                     │
                                                  (최종 웨이브 후)
                                                          ▼
                                                        ended
```

| Phase | 조건 |
|-------|------|
| `prep` | `start()` 호출 시 항상 진입. `INITIAL_PREP_MS`(5000ms) 타이머 동안 플레이어가 덱에서 타워를 배치할 수 있는 준비 시간. 타이머 종료 시 `advanceToNextWave()` 호출. prep 중에는 에너지가 자연 증가하지 않는다(초기 에너지 40으로 전략적 배치). 킬 보상은 제거됨 — 에너지 획득은 자연 재생(1/sec)과 웨이브 클리어 보상(+5)만 존재. |
| `spawning` | `advanceToNextWave()` 호출 시 → 유닛 spawn |
| `combat` | normal 웨이브 진행 중. 30초 타이머(MAX_WAVE_DURATION_MS) 적용, 만료 시 잔존 몬스터 유지한 채 다음 웨이브로 강제 진행 |
| `boss` | boss 웨이브 진행 중. 마지막 웨이브는 타이머 면제(무제한) |
| `waiting` | 웨이브 클리어(유닛 0) 또는 타이머 만료 → 다음 웨이브까지 딜레이 타이머 (타이머 만료 시 딜레이 0) |
| `ended` | 마지막 웨이브 클리어 완료 |

보스 경고 메커니즘: `boss` 웨이브 진입 시 `boss-warning` 이벤트를 emit. Game.ts는 이 시점에 보스 에셋 prefetch를 시작한다. `WaveSlotKind`는 `'normal' | 'boss'`만 존재하며 `pre_boss`는 완전 제거되었다.

prep 페이즈 중에는 `getPlacementGuardFailure({ phase: 'prep' })`가 null을 반환해 타워 배치가 허용된다. `wave-prep-started`/`wave-prep-tick` 이벤트가 HUD 카운트다운을 구동한다. 모든 전투는 prep으로 시작하며 에너지 자연 증가가 정지된다(이슈 #93).

---

## §8 데이터 흐름 예시: 타워 배치

End-to-end 시퀀스. 탭 선택 + 탭 배치 경로.

```
1. React: DeckDock에서 타워 카드 탭
2. React → EventBus: emit('request-select-tower', { towerDefId })
3. Game.ts: onSelectTower() → selectedTowerId 설정, 배치 가능 하이라이트 렌더
4. 사용자: 그리드 셀 탭
5. Game.ts: pointerdown → handlePlaceTower(gridX, gridY, towerDefId)
이후:
   a. DeckSystem.getCardByTowerId() → energyCost 확인
   b. EnergySystem.canAfford(energyCost) → 부족 시 'insufficient_energy' emit
   c. getPlacementGuardFailure({ phase }) → combat 중 배치 불가 등 guard 체크
   d. TowerSystem.placeTower() → GridManager 점유, 스프라이트 생성
   e. EnergySystem.spend(energyCost) → energy 차감
   f. PathfindingSystem 경로 재계산 (UnitSystem.setPaths)
6. Game.ts → EventBus: emit('tower-placed', { success: true, energySpent })
             EventBus: emit('energy-changed', { energy })
             EventBus: emit('player-tower-count', { count })
7. useGameEvents: onTowerPlaced → setSelectedCardIndex(null), 피드백 초기화
                  onEnergyChanged → gameStore.setEnergy
                  onPlayerTowerCount → gameStore.setPlayerTowerCount
8. React: DeckDock 선택 해제, 에너지 HUD 리렌더
```

---

## 변경 이력

| 날짜 | 항목 | 변경 내용 |
|------|------|---------|
| 2026-04-09 | §3, §5, §7 | WavePhase `prep` 상태 추가(이슈 #93, 모든 전투 시작 시 5초 준비 + 에너지 증가 정지). `wave-prep-started`/`wave-prep-tick` 이벤트 추가. Range overlay depth 22 신설(이슈 #103 사거리 시각화). |
| 2026-04-11 | §2, §3, §7 | 유닛 이동 방향 표현 추가(비행 보스 setRotation, 지상 보스/일반 유닛 flipX). 몬스터 충돌 비활성화(sweepCollisions disabled). 웨이브 30초 타이머(마지막 웨이브 면제). drag-drop/drag-hover 이벤트 추가(드래그 앤 드롭 타워 배치). |
