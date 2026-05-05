# 08 — 코드 아키텍처 레퍼런스

> **Last Updated:** 2026-05-05 (v3.7 — Unity Phase 3 replay parity fixture expansion)
>
> AGENTS.md = "무엇이 어디 있는가" (파일 맵, 편집 가이드)
> 이 문서 = "왜 이렇게 연결되는가" (구조적 이유, 상태머신, 시퀀스)

---

## §1 패키지 구조

모노레포 5패키지. Phaser 런타임은 계속 기본 경로(`/`)를 담당하고, Unity WebGL 런타임은 migration 기간 동안 `/unity/` 아래에 병행 호스팅한다.

```
@gld/shared  ──►  @gld/phaser-game  ──►  web-shell
      ▲                                      ▲
      └────────────── tools-app ─────────────┘
      └────────────── unity-game ────────────┘
```

| 패키지 | 역할 | 주요 의존성 |
|--------|------|------------|
| `@gld/shared` | 게임 규칙, 타입, 상수, 수치 데이터 | 없음 (pure TS) |
| `@gld/phaser-game` | Phaser 씬, 9개 시스템, EventBus | `@gld/shared`, `phaser` |
| `web-shell` | React UI, Zustand 스토어, PWA 진입점 | `@gld/phaser-game`, `@gld/shared`, `zustand` |
| `unity-game` | Unity 6 WebGL 포트. Phase 2 PoC를 유지하면서 Phase 3 1차 코어 시스템 포트 진행 중 | Unity 6, `@gld/shared` JSON export |
| `tools-app` | 개발용 에셋/타일맵/씬/밸런스 관리 UI와 로컬 Vite middleware | `@gld/shared`, `react`, `vite` |

`web-shell`은 `@gld/phaser-game`을 import하지만, 런타임 통신은 EventBus를 통해서만 한다. 직접 시스템 인스턴스를 참조하지 않는다.

`tools-app`은 public game shell이 아니다. `bun run dev:tools`로만 띄우는 로컬 개발 도구이며, asset catalog/ACR, Tiled JSON draft/apply, Phaser scene registry, balance sheet read/apply API를 Vite middleware로 제공한다. `web-shell`의 `/asset-review` 공개 라우트와 plugin은 제거되어 배포 surface에 개발 도구가 섞이지 않는다.

`unity-game` Phase 2 PoC는 계속 보존한다. `Assets/Scripts/Systems/Minimal/`의 pure C# systems가 1 archer + 5 wave-1 scout units + placement + energy/HUD만 처리하며, `Assets/Scripts/SceneRuntime/Slice2/`가 scene glue와 `/unity/?slice=poc` additive routing을 담당한다. Phase 3 코어는 별도 `Assets/Scripts/Systems/{Grid,Pathfinding,Energy,Units,Waves,Towers,DamageNumbers,Orchestrator}`와 `Assets/Scripts/SceneRuntime/CoreLoop/`에 병렬 추가되어, RNG/Grid/Pathfinding/Energy/기본 Unit-Wave-Tower loop를 검증한다. `CoreLoopFieldRenderer`가 9×18 grid/path/buildable/tower/unit 상태를 SpriteRenderer 기반으로 표시하고, `CoreLoopHudController`가 IMGUI 기반 energy/wave/status HUD와 최소 타워 선택 → 타일 탭 배치를 제공한다. `GameEvents`는 Phase 3 request/state 이벤트 표면을 제공하고, `CoreOrchestrator`는 summon/placement/sell/move 및 cancelled pool draw cache를 처리한다. `packages/shared/src/testing/replay-fixtures/seed-001..010`과 `replay-runner.ts`가 TS reference CSV를 생성하며, `.github/workflows/unity-parity-gate.yml`이 Unity EditMode parity test를 실행한다. `/unity/?autostart=1` smoke path에서 WebGL ready + visible field/HUD/placement를 확인한다. Merge/Gacha/Roguelike/Boss phase AI/full HUD는 후속 tranche 또는 Phase 4 범위다.

---

## §2 시스템 의존성 및 생명주기

### 초기화 순서 (`Game.ts create()`)

```
GridManager
    └─► PathfindingSystem
    └─► TowerSystem  (GridManager, PathfindingSystem, collection, spawnExitPairs)
    └─► UnitSystem   (GridManager)
        └─► WaveSystem   (UnitSystem, mapWaves, difficultyHpMult)
DeckSystem    (deckCards — 현행 맵에서는 빈 배열로 생성, 4타워 흐름 skip. 구 시나리오 맵 대비 호환용 shell)
CoreOrchestrator  (towerSystem, gridManager, buildablePoints, initialPool, energySystem)
    └─► SummonPoolSystem  (initialPool, rng)
    └─► RandomSummonSystem  (summonPool, rng)
    └─► MergeSystem
DamageNumberSystem  (scene)
EnergySystem  (standalone)
GimmickSystem (scene, gridManager, starRating) — 월드별 기믹 처리 — 정식 모드 `main_long` 맵에는 등록된 factory 없음 (legacy hook)
TutorialSystem  (scene) — tutorialCompleted가 false일 때만
```

**맵 분기 로직 (legacy)**: `currentMap.id === MAIN_MAP_ID` 일 때만 `CoreOrchestrator`를 생성하고 `this.orchestrator` 필드에 저장. 정식 모드에서는 이 분기가 항상 true로 평가되지만, 구 시나리오 맵 코드 경로가 일부 남아 있어 optional chaining + cleanup 안전성을 유지한다. 후속 정리 과제.

> **네이밍 노트**: `CoreOrchestrator`, `MAIN_MAP_ID`, `main_long`, `GameHud`, `summon-ready` 등은 정식 모드 전용 모드 중립 식별자다. 구 프로토타입 트랙명 "Phase A"에서 유래한 `PhaseAOrchestrator` / `PHASE_A_MAP_ID` / `phase_a_long` / `phase-a-summon-ready` 등은 전면 제거되었다.

**CoreOrchestrator 책임 경계**
- 생성자에서 3개 정식 모드 시스템을 owning하고 EventBus 리스너를 **idempotent off→on** 으로 등록 (HMR / 씬 재마운트로 이전 인스턴스 리스너가 남아도 중복 없음)
- **취소·배치 실패 리롤 차단** (v3.1 PR #175): 풀 소환은 `cancelledPoolDraw`, 가챠는 `cancelledGachaDraw`(towerId + targetTier) 캐시 필드로 draw 보존. `settlePendingSummon('cancelled' | 'cancelled-no-refund')`에서 양쪽 경로가 동일 캐시에 기록되며, 동일 tier 재요청 시 캐시 재사용 (가챠는 비용 재지불, 풀은 배치 시 지불). 다른 tier 가챠 요청은 캐시 폐기 + 새 roll.
- `TowerSystem.getTowerLocator` / `TowerSystem.applyMerge` / `TowerSystem.placeTower({ gradeOverride, levelOverride })` 로만 TowerSystem에 접근 — 직접 mutation 없음
- 에너지 gating은 `CoreEnergyApi` 구조적 인터페이스(`canAfford` + `spend`)로 받음. `EnergySystem`을 직접 import하지 않아 테스트 fake 주입 가능
- `destroy()`는 idempotent — 두 번 호출해도 안전
- `activeUpgrades` Map으로 로그라이트 강화 스택 관리, `getModifier()` → `TowerSystem.setModifierFn` 콜백으로 데미지/공속/범위 modifier 주입

### update() 루프 실행 순서

```
1. WaveSystem.update(scaledDelta, activeUnitCount)
2. EnergySystem.update(scaledDelta / 1000)
2.5 CoreOrchestrator.tickEnergyRegen (energy_regen 로그라이크 upgrade tick)
3. GimmickSystem.update(scaledDelta)  ← [M2+ 추가]
4. processCombatField()
   ├─ TowerSystem.update() → damageEvents
   ├─ UnitSystem.applyDamage / applySlow / applyStun
   └─ UnitSystem.update() → reachedExit[]
5. DamageNumberSystem.update(_time, delta)  ← 실제 delta(스케일 없음)
6. Exit 처리 → player HP 감소 → defeat 체크
7. WavePhase === 'ended' + 유닛 없음 → victory 체크
```

`speedMultiplier`(1×, 2×, or 3×)는 `scaledDelta`에만 적용된다. DamageNumberSystem은 시각 효과이므로 실제 delta를 사용한다.

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
EventBus 리스너 해제 (request-select-tower, request-sell-tower, wave-started 등)
입력/배치 컨트롤러 destroy (InputController, PlacementCoordinator)
런타임 컨트롤러 destroy (GameStateManager, CombatMediator는 stateless, BossContextBuilder는 stateless)
CoreOrchestrator.destroy() [v2, main_long 전용, optional chaining]
    └─► EventBus.off('request-summon-tower', ...)
    └─► EventBus.off('request-merge-towers', ...)
soundGenerator.reset()
TutorialSystem.destroy()
DamageNumberSystem.destroy()
TowerSystem.destroy()
UnitSystem.destroy()
WaveSystem.destroy()
DeckSystem.reset()
EnergySystem.reset()
FieldRenderer.destroy() / RangeOverlayController.destroy()
옵셔널 에셋 언로드
```

**순서 이유 (AGENTS.md Phase 6 규정)**: `EventBus.off → input/placement → combat/state/bossCtx → systems → renderers`. Bus를 먼저 끊어 이후 request-* 이벤트가 destroy된 컨트롤러에 닿지 않게 하고, 컨트롤러를 시스템보다 먼저 내려 stale 상태에서 TowerSystem/UnitSystem을 touch하지 못하게 하고, renderer는 마지막에 내려 destroy 중인 컨트롤러의 마지막 프레임까지 그릴 수 있게 한다. CoreOrchestrator는 EventBus 리스너만 소유하므로 컨트롤러 destroy 이후, 시스템 destroy 이전에 내린다.

### Scene sub-packages (`src/scenes/**`, Phase 4–6 분해)

Phase 4–6 리팩토링으로 `GameScene.ts`의 주요 책임이 다음 하위 패키지로 분해됐다:

| 패키지 | 파일 | 역할 |
|--------|------|------|
| `src/scenes/render/` | `FieldRenderer.ts` | 타일/경로/장식 정적 렌더 |
| | `RangeOverlayController.ts` | 사거리/선택/배치 가능 오버레이 |
| `src/scenes/input/` | `InputController.ts` | 포인터 입력 → 타워 배치/선택/이동 모드 |
| | `PlacementCoordinator.ts` | 정식 모드 fast-path + 배치 가드 + 성공/실패 이벤트 |
| `src/scenes/runtime/` | `CombatMediator.ts` | 타워→유닛 데미지 디스패치, 보스 CC 면역 가드, 데미지 넘버, 킬 골드 |
| | `GameStateManager.ts` | playerHp / gameOver / goldEarned / speedMultiplier / scaledGameTime / currentWaveSlot + applyExits/endGame |
| | `BossContextBuilder.ts` | 보스 AI 틱당 `BossContext` 생성 |

`Game.ts`는 scene 셋업, EventBus 구독/해제, 컨트롤러 오케스트레이션만 담당한다 (update() ~25줄).

### UnitSystem sub-managers (`src/systems/units/`, Phase 3 분해)

| 파일 | 역할 |
|------|------|
| `PathFollower.ts` | path index 진행 + world 좌표 보간 |
| `CCStateManager.ts` | 슬로우/스턴/invulnerability 타이머 집계 |
| `BossPhaseTracker.ts` | 보스 HP 구간 → phase 1/2 전이 + enrage 상태 관리 |

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
| `request-select-tower` | DeckDock (legacy) | Game.ts onSelectTower |
| `request-clear-tower-selection` | UI | Game.ts onClearTowerSelection |
| `request-sell-tower` | UI (legacy) | TowerSystem |
| `request-start-game` | UI | 씬 전환 |
| `request-reset-run` | 결과 화면 | useGameEvents → gameStore.resetRun |
| `request-set-speed` | SpeedButton | Game.ts onSetSpeed |
| `request-tutorial-advance` | 튜토리얼 UI | TutorialSystem |
| `request-gimmick-info` | UI에서 기믹 상태 요청 | GimmickSystem |
| `star-selected` | StageDetail에서 별 선택 | game.registry sync |
| `request-summon-tower` [v2] | `GameHud` 소환 버튼 | `CoreOrchestrator.handleSummonRequest` |
| `request-merge-towers` [v2] | `GameHud` 두 번째 타워 탭 | `CoreOrchestrator.handleMergeRequest` |
| `request-enter-move-mode` [v2] | `GameHud` 이동 버튼 | `CoreOrchestrator.handleMoveMode` |
| `request-move-tower` [v2] | `GameHud` 빈 칸 탭 | `CoreOrchestrator.handleMoveTower` |

### 정식 모드 주요 이벤트 (맵 id: `main_long`)

| 이벤트 | 방향 | 페이로드 | 발화 시점 |
|--------|------|---------|----------|
| `request-summon-tower` | React → Game | `undefined` | 소환 버튼 탭 + 에너지 충분 |
| `request-merge-towers` | React → Game | `{ fromCol, fromRow, toCol, toRow }` | 두 번째 타워 탭 |
| `tower-summoned` | Game → React | `{ col, row, towerId, grade: TowerGrade }` | 소환 성공 직후 (placeTower + playSummonVfx 뒤) |
| `towers-merged` | Game → React | `{ col, row, towerId, fromGrade, toGrade }` | 합성 성공 직후 (applyMerge + playMergeVfx 뒤) |
| `merge-failed` | Game → React | `{ fromCol, fromRow, toCol, toRow, reason }` | MergeSystem validation 실패 또는 applyMerge post-validation 실패 |
| `request-enter-move-mode` | React→Game | `{ fromCol, fromRow }` | 이동 모드 진입 |
| `request-move-tower` | React→Game | `{ fromCol, fromRow, toCol, toRow }` | 타워 이동 요청 |
| `tower-moved` | Game→React | `{ fromCol, fromRow, toCol, toRow }` | 타워 이동 완료 |
| `move-failed` | Game→React | `{ reason }` | 이동 실패 |
| `summon-failed` | Game → React | `{ reason: 'insufficient-energy' \| 'no-empty-tile' \| 'placement-failed' }` | canAfford 실패 / 빈 칸 없음 / placeTower 실패 |
| `upgrade-choice-ready` | Game→React | `{ choices: Array<{id,name,description,icon}> }` | 보스 클리어 후 3장 카드 제시 |
| `request-apply-upgrade` | React→Game | `{ upgradeId: string }` | 유저가 카드 선택 |
| `upgrade-applied` | Game→React | `{ upgradeId: string, totalStacks: number }` | 강화 적용 완료 |

**merge-failed 이유 타입**: `'different-tower' | 'different-grade' | 'max-grade' | 'invalid-tile'`. GameHud가 한국어 라벨로 변환해 토스트 표시.

`request-summon-tower` 페이로드는 의도적으로 `undefined` — 다른 parameterless 이벤트(`request-pause`, `request-reset-run`)와 일치시키기 위해서며, TypedEventBus 오버로드가 zero-arg로 취급한다.

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
| 시스템 내부 상태 | TowerSystem(배치된 타워 + 각 타워의 grade/effectiveDamage), UnitSystem(유닛 목록), EnergySystem(현재 에너지), WaveSystem(웨이브 인덱스/phase), CoreOrchestrator(SummonPool + RandomSummon + Merge 내부 상태)[v2] |

**정식 모드는 전용 gameStore 슬라이스를 추가하지 않는다**: GameHud는 로컬 `useState` + `useRef`로 `firstPick` 상태를 관리하고, 에너지는 기존 `gameStore.energy` 셀렉터를 그대로 사용한다. 합성 실패/성공 피드백은 기존 `pushToast` 경로로 흐른다. 이는 전환 검증 기간 중 gameStore 변경을 최소화해 롤백을 쉽게 만들기 위한 의도적 선택이었으며, 정식 승격 이후에도 구조적 가치를 유지하므로 그대로 두었다.

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
| 2026-04-14 | §2, §3, §4 | **v2 랜덤 소환 + 합성 피벗 (당시 "Phase A" 트랙) 시스템 추가**. `CoreOrchestrator`를 `Game.ts create()` 초기화 시퀀스에 추가(`currentMap.id === MAIN_MAP_ID` 게이팅). SummonPoolSystem / RandomSummonSystem / MergeSystem 을 orchestrator가 owning. EventBus 리스너는 idempotent off→on 등록. `request-summon-tower`, `request-merge-towers`, `tower-summoned`, `towers-merged`, `merge-failed`, `summon-failed` 6개 신규 이벤트. 전용 gameStore 슬라이스 없이 기존 `energy` 셀렉터 + GameHud 로컬 state 조합. DeckSystem은 main_long에서 빈 덱으로 생성되어 4타워 흐름을 skip. cleanup()은 `orchestrator?.destroy()` 를 EventBus.off 직후에 호출. PR #170. |
| 2026-04-20 | §2, §3 헤더 | **v3.1 정식 모드 안정화 (PR #175)**. 용어 정리 1차: "Phase A" prose → "정식 모드" 치환 (당시 코드 상수 `PhaseAOrchestrator`/`PHASE_A_MAP_ID`/`phase_a_long`/`phase-a-summon-ready`는 historical identifier로 유지 — v4에서 완전 제거됨). `CoreOrchestrator.handleGachaRequest` + `settlePendingSummon('cancelled' \| 'cancelled-no-refund')` 경로에 `cancelledGachaDraw` 캐시 추가 — 풀·가챠 양쪽 재소환 리롤 차단, 다른 tier 가챠는 캐시 폐기 + 새 roll. Phaser `scale.mode = Scale.NONE` + `autoCenter = NO_CENTER` 고정, React `GamePage` shell은 `100dvh + max-w-[430px] + flex-col` 모바일 세로형 표준 레이아웃 (TopHud safe-area-inset-top, GameHud safe-area-inset-bottom, 캔버스가 flex-1 슬롯 채움). `UnitSystem.applyDamage`의 `boss-hp-update` emit에 `Math.max(1, Math.floor(hp))` 가드 + `BossHpBar` 렌더 가드. `getWaveScaling` slots 11+ 공식 선형화 (`HP_SLOPE = 0.55`). |
| 2026-04-21 | §2, §3, §8 | **v4 용어 정리 완결**. "Phase A" 식별자 전면 제거 (파일/클래스/상수/이벤트키/testid/에셋). 주요 코드 심볼 rename: `PhaseAOrchestrator` → `CoreOrchestrator`, `PhaseAHud` → `GameHud`, `PHASE_A_MAP_ID='phase_a_long'` → `MAIN_MAP_ID='main_long'`, `PHASE_A_SUMMON_COST` → `SUMMON_COST`, `generatePhaseAWaves` → `generateWaves`, `PhaseA{Energy,AdService}Api` → `Core{Energy,AdService}Api`, EventBus `'phase-a-summon-ready'` → `'summon-ready'`, TowerSystem `playPhaseA{Summon,Merge}Vfx` → `play{Summon,Merge}Vfx`, `startPhaseA` store action → `startGame`, data-testid prefix `phase-a-*` → `hud-*`. 에셋 `phase-a-long.json` → `main-long.json` + manifest key 동기화. SaveData 스키마 변화 없음 (v8 유지; `selectedMapId`는 in-memory only). |
| 2026-05-04 | §1 | **개발용 tools-app 분리**. asset-review 공개 라우트/플러그인을 `web-shell`에서 제거하고, 에셋/타일맵/씬/밸런스 관리를 `packages/tools-app` 로컬 Vite 앱으로 이동. |
