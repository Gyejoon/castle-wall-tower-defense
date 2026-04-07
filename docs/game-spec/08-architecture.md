# 08 — 코드 아키텍처 레퍼런스

> **Last Updated:** 2026-04-08
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
registry.set(initialEnergy, initialLives, initialDeck)
EventBus.emit(game-ready, energy-changed, deck-loaded)
scene.launch('UIScene')  ─► TopHudUI, BossHpBarUI, DeckDockUI
TutorialSystem  (scene) — tutorialCompleted가 false일 때만
```

### update() 루프 실행 순서

```
1. WaveSystem.update(scaledDelta, activeUnitCount)
2. EnergySystem.update(scaledDelta / 1000)
3. processCombatField()
   ├─ TowerSystem.update() → damageEvents
   ├─ UnitSystem.applyDamage / applySlow / applyStun
   └─ UnitSystem.update() → reachedExit[]
4. DamageNumberSystem.update(_time, delta)  ← 실제 delta(스케일 없음)
5. Exit 처리 → player HP 감소 → defeat 체크
6. WavePhase === 'ended' + 유닛 없음 → victory 체크
```

`speedMultiplier`(1× or 2×)는 `scaledDelta`에만 적용된다. DamageNumberSystem은 시각 효과이므로 실제 delta를 사용한다.

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
scene.stop('UIScene')  ─► handleShutdown → TopHudUI/BossHpBarUI/DeckDockUI destroy
옵셔널 에셋 언로드
```

---

## §3 TypedEventBus 패턴

`EventBus.ts`에 정의된 `TypedEventBus`는 Phaser `Events.EventEmitter`를 래핑해 이벤트 이름과 페이로드를 `GameEventMap`으로 타입 안전하게 만든다.

### Game → UIScene 이벤트 (Phaser 내부)

HUD 관련 이벤트는 UIScene의 UI 컴포넌트가 직접 수신한다 (React를 거치지 않음).

| 이벤트 | 발화 시점 | 주요 수신자 |
|--------|----------|------------|
| `energy-changed` | 에너지 변동 | TopHudUI (에너지바 tween) |
| `player-damaged` | 유닛 exit 도달 | TopHudUI (HP 갱신, ≤3 blink) |
| `wave-started` | 웨이브 시작 | TopHudUI (타이머/속도 토글) |
| `wave-completed` | 웨이브 클리어 | TopHudUI (카운트다운) |
| `deck-loaded` | 씬 초기화 | DeckDockUI (카드 빌드) |
| `boss-hp-update` | 보스 피격 | BossHpBarUI (HP바 tween) |
| `boss-phase-change` | 보스 2페이즈 돌입 | BossHpBarUI (Phase 2 pulse) |
| `boss-defeated` | 보스 사망 | BossHpBarUI (페이드아웃) |
| `tower-placed` | 배치 성공 | DeckDockUI (선택 해제) |
| `request-set-speed` | 속도 토글 | TopHudUI (속도 버튼 갱신) |

### Game → React 이벤트

| 이벤트 | 발화 시점 | 주요 수신자 |
|--------|----------|------------|
| `game-ready` | create() 완료 | PhaserGame.tsx → gameStore.setGameReady |
| `current-scene-ready` | create() 완료 | PhaserGame.tsx |
| `tower-placed` | 배치 시도 결과 | useGameEvents → 피드백 처리 |
| `wave-started` | 웨이브 시작 | useGameEvents → runStatus='running' |
| `boss-warning` | pre_boss 웨이브 대기 진입 | useGameEvents → bossWarningVisible |
| `boss-defeated` | 보스 사망 | useGameEvents → 토스트 'BOSS CLEAR!' |
| `boss-phase-change` | 보스 2페이즈 돌입 | useGameEvents → 토스트 '보스 분노!' |
| `game-over` | 승/패 확정 | useGameEvents → runStatus, 메타 갱신 |
| `tutorial-step` | 튜토리얼 진행 | 튜토리얼 UI |
| `tutorial-completed` | 튜토리얼 완료 | metaStore.progress |

### React → Game 이벤트 (`request-*` 접두사)

| 이벤트 | 발화 주체 | 처리 위치 |
|--------|----------|----------|
| `request-select-tower` | DeckDockUI (Phaser) | Game.ts onSelectTower |
| `request-clear-tower-selection` | UI | Game.ts onClearTowerSelection |
| `request-place-tower` | UI | Game.ts (pointerdown 대체 경로) |
| `request-sell-tower` | UI | TowerSystem |
| `request-start-game` | UI | 씬 전환 |
| `request-reset-run` | 결과 화면 | useGameEvents → gameStore.resetRun |
| `request-set-speed` | TopHudUI (Phaser) | Game.ts onSetSpeed |
| `request-tutorial-advance` | 튜토리얼 UI | TutorialSystem |

---

## §4 상태 관리

3계층으로 분리된다.

### React Layer

| 스토어 | 수명 | 저장 내용 |
|--------|------|----------|
| `gameStore` (Zustand) | 런 단위 (resetRun()으로 초기화) | runStatus, 토스트, bossWarningVisible, gameOverStats, 설정 |
| `metaStore` (Zustand + localStorage) | 세션 영속 | 프로필, 컬렉션, 가챠, 미션, 설정, 덱 ID |

`metaStore`는 `subscribeWithSelector` 미들웨어를 사용하고, `beforeunload` / `visibilitychange`에서 localStorage에 flush한다.

### Phaser Layer

| 저장소 | 내용 |
|--------|------|
| `game.registry` | React→Phaser 초기값 전달 (deckIds, collection, tutorialCompleted, safeAreaBottom, speed2xUnlocked, initialEnergy, initialLives, initialDeck) |
| UIScene 내부 상태 | TopHudUI(HP, 에너지, 속도), BossHpBarUI(보스 HP/phase), DeckDockUI(덱 카드, 선택 인덱스) |
| 시스템 내부 상태 | TowerSystem(배치된 타워), UnitSystem(유닛 목록), EnergySystem(현재 에너지), WaveSystem(웨이브 인덱스/phase) |

### 동기화 규칙

- **React → Phaser 초기값**: `PhaserGame.tsx`에서 `game.registry.set()`으로 전달.
- **React → Phaser 실시간**: EventBus `request-*` 이벤트.
- **Phaser → React 실시간**: EventBus 서술형 이벤트 → `useGameEvents` 훅 → Zustand set (game-over, wave-started, tower-placed, boss-warning/defeated/phase-change).
- **Phaser 내부 HUD**: EventBus 이벤트 → UIScene UI 컴포넌트가 직접 수신·렌더링. React를 거치지 않음.

---

## §5 렌더링 파이프라인

`setDepth()` 수치 기반 painter's algorithm.

| Depth | 레이어 | 대상 |
|-------|--------|------|
| 0 | Ground | TinySwords 배경 타일 |
| 3 + x + y + depthOffset | Decorations | 나무, 바위 등 장식 스프라이트 (`gridManager.getDepth()` 기반) |
| 5 | Path | 경로 라인 오버레이 |
| ~12 | Towers | 타워 스프라이트 |
| 15 | Selection | selectionGraphics (배치 가능 하이라이트) |
| ~14–20 | Units | 유닛 스프라이트 |
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
       spawning ──► combat  ──► waiting ──► spawning (다음 웨이브)
                    boss ──►                     │
                                            (최종 웨이브 후)
                                                 ▼
                                               ended
```

| Phase | 조건 |
|-------|------|
| `spawning` | `advanceToNextWave()` 호출 시 → 유닛 spawn |
| `combat` | normal/pre_boss 웨이브 진행 중 |
| `boss` | boss 웨이브 진행 중 |
| `waiting` | 웨이브 클리어(유닛 0) → 다음 웨이브까지 딜레이 타이머 |
| `ended` | 마지막 웨이브 클리어 완료 |

보스 경고 메커니즘: `pre_boss` 웨이브가 `waiting`으로 전이될 때 `boss-warning` 이벤트를 emit. Game.ts는 이 시점에 보스 에셋 prefetch를 시작한다.

---

## §8 데이터 흐름 예시: 타워 배치

End-to-end 시퀀스.

```
1. Phaser UIScene: DeckDockUI에서 타워 카드 탭 (pointerdown + stopPropagation)
2. DeckDockUI → EventBus: emit('request-select-tower', { towerDefId })
3. Game.ts: onSelectTower() → selectedTowerId 설정, 배치 가능 하이라이트 렌더
4. 사용자: 그리드 셀 탭
5. Game.ts: pointerdown → handlePlaceTower(gridX, gridY, towerDefId)
   a. DeckSystem.getCardByTowerId() → energyCost 확인
   b. EnergySystem.canAfford(energyCost) → 부족 시 'insufficient_energy' emit
   c. getPlacementGuardFailure({ phase }) → combat 중 배치 불가 등 guard 체크
   d. TowerSystem.placeTower() → GridManager 점유, 스프라이트 생성
   e. EnergySystem.spend(energyCost) → energy 차감
   f. PathfindingSystem 경로 재계산 (UnitSystem.setPaths)
6. Game.ts → EventBus: emit('tower-placed', { success: true, energySpent })
             EventBus: emit('energy-changed', { energy })
             EventBus: emit('player-tower-count', { count })
7. UIScene: DeckDockUI.onTowerPlaced → 카드 선택 해제
            TopHudUI.onEnergyChanged → 에너지바 tween 갱신
   React: useGameEvents.onTowerPlaced → 피드백 처리
```
