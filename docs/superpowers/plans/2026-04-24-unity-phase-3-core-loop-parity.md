# Unity Migration Phase 3 — Core Loop Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** This is a **large** phase (spec size "L"). Tasks 1–2 drive structural decisions (CoreOrchestrator composition, RNG determinism) that shape every subsequent task's implementation. The intentional Phase 3 scope **excludes** merge/gacha/boss/roguelike — those are Phase 4. Core loop here means: 19 towers + 5 unit families + 50 waves (non-boss) + pathfinding + energy + placement/sell/move + damage numbers + 3× speed + save hooks (save itself is Phase 6).

**Goal:** Unity runs a full 50-wave endless run end-to-end with all 19 towers and all 5 unit families, deterministic vs the Phaser reference at ±5% balance drift across 50 seeds × waves 1–10, passing the CI-enforced parity gate (`unity-parity-gate.yml`).

**Architecture:** Phase 2's `Minimal*` systems are replaced by full pure-C# ports of Phaser's 9 systems (Grid, Pathfinding, Towers, Units, Waves, Energy, DamageNumbers, CoreOrchestrator, plus the 3 unit sub-managers and 7 scene subpackages). `GameSceneController : MonoBehaviour` on Root.unity replaces `Slice2SceneController`. The deterministic replay harness from Phase 2 is expanded to 10 fixtures and becomes the hard parity gate. A custom LCG RNG (`DeterministicRng`) ported byte-identically TS ↔ C# powers all stochastic sites (wave composition jitter, damage-number jitter). `Time.fixedDeltaTime = 0.02` (50Hz) with FixedUpdate pump for wave/unit/tower stepping; variable-rate only for VFX.

**Tech Stack:** Unity 6 LTS · URP 2D · Input System · UI Toolkit · Addressables · DOTween · NUnit (PlayMode + EditMode) · Vitest (shared replay-runner expansion).

---

## Scope boundary

**In:**
- Replace `Minimal*` systems with full ports:
  - `GLD.Systems.Grid.GridManager` (pure C#)
  - `GLD.Systems.Pathfinding.PathfindingSystem` (A*, pure C#)
  - `GLD.Systems.Towers.TowerSystem` (+ `TowerInstance` MB)
  - `GLD.Systems.Units.UnitSystem` (+ `UnitInstance` MB, `PathFollower`, `CCStateManager`, `BossPhaseTracker` — boss tracker stubbed, Phase 4 fills)
  - `GLD.Systems.Waves.WaveSystem` (50 waves, boss waves **spawn bosses as regular units with HP scaled** for Phase 3 — phased AI is Phase 4)
  - `GLD.Systems.Energy.EnergySystem` (v3)
  - `GLD.Systems.DamageNumbers.DamageNumberSystem` (24 pool, TMP World)
  - `GLD.Systems.Orchestrator.CoreOrchestrator` (stubs merge/gacha/upgrade — Phase 4)
- Scene runtime: `GameSceneController`, `FieldRenderer`, `RangeOverlayController`, `InputController`, `PlacementCoordinator`, `CombatMediator`, `GameStateManager`, `BossContextBuilder`
- `GLD.Core.Random.DeterministicRng` (LCG) + TS counterpart in `packages/shared/src/random/deterministic-rng.ts`
- 3× speed: via `GameStateManager.Tick(dt * 1000 * mult)` scaledDelta pattern, `Time.timeScale` only for pause
- `GameEvents` static class with ~30 typed events (full surface from spec)
- URL param `/unity/?autostart=1` → auto-start run on Boot
- Replay harness expanded: 10 fixtures (at least 5 non-boss; boss parity deferred to Phase 4)
- `unity-parity-gate.yml` promoted from placeholder → required

**Out:**
- Merge / Gacha / Roguelike upgrade pick (Phase 4)
- Boss AI phases / enrage / warning (Phase 4 — basic HP-bag boss only here)
- Save system (Phase 6; Phase 3 holds run state in memory, loses on refresh)
- Audio (Phase 6)
- Lobby / MetaForge UI (Phase 5)
- DS6 primitives (Phase 5)
- Sentry (Phase 6)

## Dependencies

- Phase 2 merged: PoC runs in Unity, replay skeleton works.
- Phase 1 merged: all SOs populated.

## Pre-plan agent consultations

1. **Unity Architect** — 19 tower SO catalog concrete C# shape, CoreOrchestrator dependency graph (idempotent OnEnable/OnDisable, cancelled-cache from Phaser), scene runtime decomposition.
2. **Game Designer** — parity invariants. ≤5% drift is CI gate; what's the exact acceptance math (mean diff? p95? per-wave?). Baseline regression fixtures for waves 1–10 on seed set {12345, 99999, 54321, ...}.
3. **Technical Artist** — drawcall target for 50-wave endless gameplay (field tiles + towers + units + projectiles + damage numbers). If Atlas groupings cause drawcalls >60, flag atlas redesign before Phase 5.

---

## File Structure

### Create (packages/shared)
- `packages/shared/src/random/deterministic-rng.ts` — LCG impl
- `packages/shared/src/random/__tests__/deterministic-rng.test.ts`
- `packages/shared/src/testing/replay-runner.ts` — expanded from Phase 2 skeleton
- `packages/shared/src/testing/replay-fixtures/seed-{002..010}-*.json` (9 new fixtures)

### Create (packages/unity-game/Assets/Scripts/Core/Random/)
- `DeterministicRng.cs` (+ `Tests/EditMode/Random/DeterministicRngTests.cs`)

### Create (packages/unity-game/Assets/Scripts/Systems/)
- `Grid/GridManager.cs` (+ optional `GridManagerMB.cs` for gizmo visualization)
- `Pathfinding/PathfindingSystem.cs` + `PathCache.cs`
- `Towers/TowerSystem.cs` + `Towers/TowerInstance.cs`
- `Units/UnitSystem.cs` + `Units/UnitInstance.cs` + `Units/PathFollower.cs` + `Units/CCStateManager.cs` + `Units/BossPhaseTracker.cs`
- `Waves/WaveSystem.cs`
- `Energy/EnergySystem.cs`
- `DamageNumbers/DamageNumberSystem.cs` + `DamageNumbers/DamageNumberInstance.cs`
- `Orchestrator/CoreOrchestrator.cs`

### Create (packages/unity-game/Assets/Scripts/SceneRuntime/)
- `GameSceneController.cs` (replaces Slice2SceneController)
- `Input/InputController.cs` + `Input/PlacementCoordinator.cs`
- `Render/FieldRenderer.cs` + `Render/RangeOverlayController.cs`
- `Runtime/CombatMediator.cs` + `Runtime/GameStateManager.cs` + `Runtime/BossContextBuilder.cs`

### Create (packages/unity-game/Assets/Scripts/Core/)
- `Events/GameEvents.cs` — full ~30 typed event surface (replaces Phase 0 stub)

### Create (packages/unity-game/Assets/Prefabs/)
- `Towers/*.prefab` — one per 19 tower defs (or single parameterized prefab resolved by SO — decide in Task 1)
- `Units/*.prefab` — one per 5 unit families + variants
- `Projectiles/*.prefab`
- `DamageNumbers/DamageNumber.prefab` (TMP World)
- `World/FieldTile.prefab` / `Obstacle.prefab` variants

### Create (Assets/_Project/Scenes/)
- Update `Root.unity` to use `GameSceneController` and full HUD (temporary HUD — full overlay suite is Phase 5).

### Create (Tests)
- `EditMode/Systems/{TowerSystem,UnitSystem,WaveSystem,EnergySystem,MergeChain (partial)}Tests.cs`
- `EditMode/Replay/ReplayParityTests.cs` — expanded to all 10 fixtures
- `PlayMode/Integration/EndlessRunSmokeTest.cs` — wave 50 completion under autostart
- `EditMode/Orchestrator/CoreOrchestratorLifecycleTests.cs`

### Modify
- `.github/workflows/unity-parity-gate.yml` — replace stub with real harness
- `packages/shared/package.json` — expose `replay:record`, `replay:soak` bin commands
- `.github/workflows/unity-build.yml` — include PlayMode tests (already added in Phase 2 Task 8)

---

## Tasks

### Task 1: Agent consultations + parity acceptance spec

**Files:**
- Create: `docs/unity-migration/phase-3-design-decisions.md`
- Create: `docs/unity-migration/phase-3-parity-acceptance.md`

- [x] **Step 1**: Unity Architect consultation — `TowerSystem` shape (pure C# container vs MB), `FindObjectOfType` prohibited patterns, CoreOrchestrator idempotent lifecycle, cancelled-cache (`cancelledPoolDraw` + `cancelledGachaDraw` — gacha is Phase 4 but pool-draw happens in Phase 3).
- [x] **Step 2**: Game Designer consultation — write `phase-3-parity-acceptance.md` defining the exact pass/fail math. E.g., "For each of 10 fixtures × 10 waves: mean TS vs C# damage delta ≤5%, p95 ≤10%; kill count exact; boss phase timing ±500ms (Phase 4 enforced); wave clear time ±2%."
- [x] **Step 3**: Technical Artist consultation — drawcall target, atlas packing adjustments if needed.
- [x] **Step 4**: Reconcile findings. If any contradicts subsequent tasks, revise.
- [ ] **Step 5**: Commit `docs(phase-3): design decisions + parity acceptance math`.

### Task 2: `DeterministicRng` TS + C# byte-identical

**Files:**
- Create: `packages/shared/src/random/deterministic-rng.ts`
- Create: `packages/shared/src/random/__tests__/deterministic-rng.test.ts`
- Create: `packages/unity-game/Assets/Scripts/Core/Random/DeterministicRng.cs`
- Create: `packages/unity-game/Assets/Tests/EditMode/Random/DeterministicRngTests.cs`

- [ ] **Step 1**: Pick LCG constants (e.g., Numerical Recipes: a=1664525, c=1013904223, m=2^32). Document rationale in Task 1 design doc.
- [ ] **Step 2**: Write `deterministic-rng.ts` with API: `new DeterministicRng(seed: number) → { nextUint32(), nextFloat01(), nextInt(n), nextRange(min, max) }`.
- [ ] **Step 3**: Write failing TS test — assert first 100 outputs match a golden fixture (seed 12345 → `[1234567890, 2345678901, ...]`).
- [ ] **Step 4**: Implement, pass.
- [ ] **Step 5**: Port to `DeterministicRng.cs` with identical semantics (uint operations, no implicit sign extension).
- [ ] **Step 6**: Write C# EditMode test asserting identical first-100 output on same seed. If mismatch: fix C# (usually unsigned arithmetic).
- [ ] **Step 7**: Commit `feat(shared, unity-game): DeterministicRng (LCG) byte-identical TS↔C#`.

### Task 3: Core systems port — Grid, Pathfinding, Energy

**Files:**
- `Assets/Scripts/Systems/Grid/GridManager.cs`
- `Assets/Scripts/Systems/Pathfinding/PathfindingSystem.cs` + `PathCache.cs`
- `Assets/Scripts/Systems/Energy/EnergySystem.cs` (replaces MinimalEnergySystem)
- `Tests/EditMode/Systems/GridTest.cs`, `PathfindingTest.cs`, `EnergySystemTest.cs`

- [ ] **Step 1**: Port `GridManager.ts` → `GridManager.cs`. Preserve all public API: `WorldToGrid`, `GridToWorld`, `IsBlocked`, `GetObstacles`, `GetPremiumLane`. Source `MapLayoutSO`.
- [ ] **Step 2**: EditMode test — deterministic seed, assert every grid cell's WorldToGrid→GridToWorld is identity.
- [ ] **Step 3**: Port `PathfindingSystem.ts` → `PathfindingSystem.cs`. Keep A* with same tie-breaking (TS implementation's neighbor order dictates which of two equal-cost paths wins — preserve order).
- [ ] **Step 4**: EditMode test — 5 golden path pairs from current Phaser (spawn to exit on main_long map with known obstacle positions) match exactly.
- [ ] **Step 5**: Port `EnergySystem.ts` → `EnergySystem.cs`. Handle: +1/s, kill +1, boss +20 (handler only — boss kill emit is Phase 4), fast-clear +20, CAP 200, initial 40.
- [ ] **Step 6**: EditMode test — 6 invariants from spec Phase 7 checklist.
- [ ] **Step 7**: Commit `feat(unity-game): port Grid + Pathfinding + EnergySystem from Phaser`.

### Task 4: TowerSystem + TowerInstance (19 towers)

**Files:**
- `Assets/Scripts/Systems/Towers/TowerSystem.cs`
- `Assets/Scripts/Systems/Towers/TowerInstance.cs`
- `Assets/Prefabs/Towers/Tower.prefab` (parameterized)
- `Tests/EditMode/Systems/TowerSystemTest.cs`

- [ ] **Step 1**: Write `TowerInstance.cs` MB. Serialized fields: `TowerDefSO def`, current cooldown, current target. `Awake()` binds SpriteRenderer sprite from def. `AttackTick(dt, unitSystem, rng)` finds target + applies damage.
- [ ] **Step 2**: Write `TowerSystem.cs` pure C# container. API matches Phaser: `Place(def, col, row)`, `Sell(towerId)`, `Move(towerId, newCol, newRow)`, `GetAt(col, row)`, `GetAll()`.
- [ ] **Step 3**: Reuse single `Tower.prefab` and swap sprite at runtime based on def (per Unity Architect Task 1 recommendation). Family/tier visuals come from Phase 1 atlases.
- [ ] **Step 4**: Wire `globalAtkPct` meta injection (spec says "via scene registry" — port that indirection to a static `MetaBuffRegistry` singleton for now; proper DI in Phase 5).
- [ ] **Step 5**: EditMode test — spawn 1 of each 19 defs, tick 10 seconds against a stationary unit, assert cumulative damage matches Phaser reference per def.
- [ ] **Step 6**: Commit `feat(unity-game): TowerSystem + TowerInstance (19 towers)`.

### Task 5: UnitSystem + sub-managers (5 families)

**Files:**
- `Assets/Scripts/Systems/Units/UnitSystem.cs`
- `Assets/Scripts/Systems/Units/UnitInstance.cs`
- `Assets/Scripts/Systems/Units/PathFollower.cs`
- `Assets/Scripts/Systems/Units/CCStateManager.cs`
- `Assets/Scripts/Systems/Units/BossPhaseTracker.cs` (stub for Phase 3)
- `Tests/EditMode/Systems/UnitSystemTest.cs` + submanager tests

- [ ] **Step 1**: Write `UnitInstance.cs` + sub-manager composition. `PathFollower` tracks path index + world lerp. `CCStateManager` tracks slow/stun/invulnerability timers with `MIN_MOVE_SPEED=0.15` floor and 2s stun-immunity window. `BossPhaseTracker` — Phase 3 stub exposes `.isBoss`, `.ccResistance` per def; phase transitions are Phase 4.
- [ ] **Step 2**: Write `UnitSystem.cs` pure C#. Spawn pipeline: `Spawn(def, at)` → allocate path from cached `PathfindingSystem`. Tick: for each unit, advance PathFollower, apply CC, tick HP regen/poison. Remove on death or reach-exit (damages base).
- [ ] **Step 3**: EditMode test — 5 unit family kill scenarios with 1 archer each, assert HP curves match Phaser ticks within 1 frame of tolerance.
- [ ] **Step 4**: Commit `feat(unity-game): UnitSystem + PathFollower + CCStateManager (5 families)`.

### Task 6: WaveSystem (50 waves, non-boss behavior)

**Files:**
- `Assets/Scripts/Systems/Waves/WaveSystem.cs`
- `Tests/EditMode/Systems/WaveSystemTest.cs`

- [ ] **Step 1**: Port `WaveSystem.ts` → `WaveSystem.cs`. Use `WaveCatalogSO` for 50 wave defs. State machine: `prep → running → interwave → running ... → victory`.
- [ ] **Step 2**: Boss waves (e.g., waves 10, 20, 30, 40, 50) spawn the boss unit as a normal unit instance with scaled HP. Phase transitions, invuln windows, enrage — all **stubbed** here (log and continue). Phase 4 fills.
- [ ] **Step 3**: Fire `OnWaveStarted/Completed/PrepStarted/PrepTick/TimerTick` events matching Phaser names.
- [ ] **Step 4**: EditMode test — drive all 50 waves with no towers placed, assert correct unit spawn count per wave per Phaser reference.
- [ ] **Step 5**: Commit `feat(unity-game): WaveSystem — 50 waves, boss as HP-bag (Phase 3 scope)`.

### Task 7: DamageNumberSystem, CoreOrchestrator, GameEvents

**Files:**
- `Assets/Scripts/Systems/DamageNumbers/*.cs`
- `Assets/Scripts/Systems/Orchestrator/CoreOrchestrator.cs`
- `Assets/Scripts/Core/Events/GameEvents.cs` (replace stub)
- `Tests/EditMode/Orchestrator/CoreOrchestratorLifecycleTests.cs`

- [x] **Step 1**: Write `DamageNumberSystem.cs` — pool of 24 world text instances. `Show(worldPos, value)` unscaled-delta 800ms rise + fade.
- [x] **Step 2**: Write `GameEvents.cs` full surface. ~30 typed static events (list from spec). Unit test: reflection check that spec-listed names exist.
- [x] **Step 3**: Write `CoreOrchestrator.cs`. Idempotent `OnEnable/OnDisable`. Subscribes to summon/placement/merge request flow — Phase 3 wires summon + placement only (merge/gacha/upgrade are Phase 4 stubs that log and return).
- [x] **Step 4**: Port cancelled-cache (`cancelledPoolDraw`) — when a summon is offered but UX cancels, cache it for the next summon.
- [ ] **Step 5**: PlayMode lifecycle test — scene enter/exit 10× confirms no duplicate event subscriptions, no leaked listeners.
- [ ] **Step 6**: Commit `feat(unity-game): DamageNumberSystem + GameEvents + CoreOrchestrator (summon/placement only)`.

### Task 8: Scene runtime — GameSceneController + Input + Render + Runtime mediators

**Files:**
- `Assets/Scripts/SceneRuntime/GameSceneController.cs`
- `Assets/Scripts/SceneRuntime/Input/*.cs`
- `Assets/Scripts/SceneRuntime/Render/*.cs`
- `Assets/Scripts/SceneRuntime/Runtime/*.cs`

- [ ] **Step 1**: Port `Game.ts.create()` → `GameSceneController.Awake` in exact init order (Grid → Pathfinding → Energy → Units → Towers → Waves → Orchestrator → DamageNumbers → UI). Port `shutdown` → `OnDestroy` in reverse (Bus → input → runtime → systems → renderers).
- [x] **Step 2**: Write `InputController.cs` + `PlacementCoordinator.cs` (full, replacing Phase 2 `PlacementController`). Handle tap-to-place, drag-to-move, long-press-to-sell.
- [ ] **Step 3**: Write `FieldRenderer.cs` (static field + obstacles on Tilemap, 2 layers: base + highlight).
- [x] **Step 4**: Write `RangeOverlayController.cs` using a shader-graph ring sprite placeholder (full shader in Phase 4 or 5).
- [x] **Step 5**: Write `CombatMediator.cs` (dispatches tower → unit damage, guards boss CC resistance), `GameStateManager.cs` (playerHp, scaledGameTime, speedMultiplier, endGame), `BossContextBuilder.cs` (stub in Phase 3).
- [ ] **Step 6**: PlayMode smoke test: enter scene, autostart, run 30s, assert wave progression events fire correctly.
- [ ] **Step 7**: Commit `feat(unity-game): scene runtime — GameSceneController + input/render/runtime mediators`.

### Task 9: 3× speed + FixedUpdate pump

**Files:**
- Modify: `GameStateManager.cs`, `UnitSystem.cs`, `TowerSystem.cs`, `WaveSystem.cs`, `DamageNumberSystem.cs`

- [x] **Step 1**: Implement `GameStateManager.Tick(dt * 1000 * speedMultiplier)` pattern. Every pure-C# system consumes `scaledDelta` from GameStateManager, NOT `Time.deltaTime` directly.
- [ ] **Step 2**: `DOTween.timeScale = speedMultiplier` (tower idle pulses).
- [x] **Step 3**: `DamageNumberSystem` uses `Time.unscaledDeltaTime` for animation (spec).
- [x] **Step 4**: Pause uses `Time.timeScale = 0` (only for pause), separate from speedMultiplier.
- [ ] **Step 5**: Determinism test: fixed seed, run same replay at 1× and 3× speeds, assert identical event sequence (modulo timestamps), metrics within ±2%.
- [ ] **Step 6**: Commit `feat(unity-game): 3× speed via scaledDelta (FixedUpdate 50Hz preserved)`.

### Task 10: Replay harness expansion (10 fixtures, CI gate)

**Files:**
- `packages/shared/src/testing/replay-fixtures/seed-{002..010}-*.json`
- `packages/shared/src/testing/replay-runner.ts` (expand)
- `packages/unity-game/Assets/Tests/EditMode/Replay/ReplayParityTests.cs` (expand)
- `.github/workflows/unity-parity-gate.yml` (replace stub)

- [x] **Step 1**: Create 9 new fixtures per spec: seed-002 (gacha stack — skip for Phase 3, placeholder), seed-003 (boss wave 10 HP-bag), seed-004 (merge chain — skip Phase 3), seed-005 (fast-clear bonus), seed-006 (energy CAP), seed-007 (continue-run — placeholder), seed-008 (meta globalAtkPct injection), seed-009 (3× speed), seed-010 (tutorial completion — placeholder). Mark Phase-4-dependent fixtures with `"phase4_dependent": true`, skipped in Phase 3.
- [x] **Step 2**: Expand `replay-runner.ts` to emit per-wave metrics CSV (seed, wave, TS_damage, TS_kills, TS_clearMs).
- [x] **Step 3**: Expand `ReplayParityTests.cs` to load each fixture, run via `ReplayRunner`, compare to expected metrics file. Respect per-fixture drift thresholds from Task 1 Step 2.
- [x] **Step 4**: Write `unity-parity-gate.yml` — replaces placeholder. Runs:
  ```
  bun run replay:record  # generates TS reference ledger
  Unity -batchmode -executeMethod ReplayParityTests.RunAll  # compares
  ```
  Uploads CSV + diff.json artifacts. Required status.
- [ ] **Step 5**: Run CI. Iterate on fixes until all 10 (minus phase-4-dependent) pass.
- [ ] **Step 6**: Commit `feat(ci): unity-parity-gate with 10 deterministic replay fixtures`.

### Task 11: End-to-end endless run + exit gate verification

**Files:**
- `PlayMode/Integration/EndlessRunSmokeTest.cs`

- [ ] **Step 1**: PlayMode test: `/unity/?autostart=1` mode (invoked via URL param router or direct scene arg), autoplace 5 towers per a scripted build-order, run wave 1 → 50.
- [ ] **Step 2**: Assert: no exceptions, wave 50 clears, no `Energy < 0`, no `Energy > 200`, damage-total within parity threshold of Phaser endless reference.
- [x] **Step 3**: Capture balance-drift CSV across 50 seeds × waves 1–10. Commit as `docs/unity-migration/phase-3-balance-drift-baseline.csv`.
- [ ] **Step 4**: Confirm CI parity gate green, PlayMode suite green, bundle size still under budget.
- [ ] **Step 5**: Commit `feat(unity-game): endless-run smoke test + Phase 3 balance drift baseline`.

## Exit gate verification

From spec Phase 3 row:
- [ ] `/unity/?autostart=1` plays wave 50 endless (Task 11)
- [ ] PlayMode suite green (Task 11 + all prior tasks)
- [ ] Balance drift ≤5% across 50 seeds × waves 1–10 (Task 11 Step 3)
- [ ] `unity-parity-gate.yml` required + green (Task 10 Step 4)

## Self-review

**Spec coverage (Phase 3 deliverables):**
- `Systems/Grid,Pathfinding,Towers,Units,Waves,Energy,CoreOrchestrator,DamageNumbers` full → Tasks 3–7
- `SceneRuntime/*` 전부 → Task 8
- PlayMode tests → Tasks 3–11 include test per feature

**Known intentional skips (Phase 4 scope):**
- Boss phase AI (HP-bag in Phase 3)
- Merge/Gacha/Upgrade in CoreOrchestrator (stubbed + logged)
- 4 of the 10 replay fixtures marked phase4_dependent

**Risk exposure:**
- R6 (TS↔C# drift) — mitigated by Task 2 byte-identical LCG + Task 10 CI gate.
- R8 (IL2CPP build time) — Library cache (Phase 0 wiring); iterate on small PRs, not single mega-PR.

**Unknowns that Task 1 resolves:**
- Exact parity acceptance math (p95 vs mean; per-wave vs aggregate)
- Whether 19-tower single-prefab-with-SO-resolved-sprite actually works with Unity's SpriteRenderer atlas resolution or if per-tower prefabs are cheaper.
