# Unity Migration Phase 2 — PoC Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** Task 1 is Unity Architect agent consultation on SO event channel vs static class decision. Task 2 is Technical Artist / Game Designer numeric-invariant baseline capture from the current Phaser build. Tasks 3+ build on those outputs; if consultations recommend materially different patterns (e.g., ECS over MonoBehaviour composition), revise.

**Goal:** Prove the Unity pipeline end-to-end on a **minimal vertical slice**: 8×18 grid + 1 tower (archer) + 1 enemy (orc) + wave 1 + energy HUD, running in iOS Safari at the `/unity/?slice=poc` route, with wave-1 damage totals within ±5% of the Phaser reference.

**Architecture:** A single additive scene `Slice2_PoC.unity` built on top of Phase 1 SOs. Minimal system set (`MinimalTowerSystem`, `MinimalUnitSystem`, `MinimalWaveSystem`, `MinimalEnergySystem`) — pure C# containers orchestrated by `Slice2SceneController : MonoBehaviour`. `Minimal` prefix signals these are PoC-grade and will be superseded by Phase 3 full implementations. PixelPerfectCamera configured per spec. UI Toolkit HUD renders energy + wave + base HP only. A deterministic replay harness pair (`packages/shared/src/testing/replay-runner.ts` + Unity `ReplayParityTests.cs`) is introduced here in **skeleton form** to be matured in Phase 3.

**Tech Stack:** Unity 6 LTS · URP 2D · Input System (Enhanced Touch) · UI Toolkit · Addressables · Phase 1 SOs · DOTween (idle pulse only) · NUnit (PlayMode).

---

## Scope boundary

**In:**
- `Scenes/Slice2_PoC.unity`
- `Slice2SceneController.cs`
- `MinimalTowerSystem`, `MinimalUnitSystem`, `MinimalWaveSystem`, `MinimalEnergySystem` (pure C#)
- `TowerInstance` MB prefab (archer only)
- `UnitInstance` MB prefab (orc only)
- `PlacementController.cs` (Input System → grid)
- `Slice2Hud.uxml` + `Slice2HudController.cs`
- `Slice2SmokeTest.cs` (PlayMode)
- Deterministic replay harness **skeleton**: `packages/shared/src/testing/replay-runner.ts` + `packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json` + Unity `Tests/EditMode/Replay/ReplayParityTests.cs` (minimal — one fixture, one assertion). Phase 3 matures this.
- URL param router stub: `/unity/?slice=poc` enters Slice2 scene.

**Out:**
- All other 18 towers (Phase 3)
- All other 4 unit families (Phase 3)
- Waves 2-50 (Phase 3)
- Boss, merge, gacha, roguelike (Phase 4)
- UI primitives DS6 (Phase 5)
- Save, audio, BM, Sentry (Phase 6)
- 3× speed (deferred to Phase 3 correctness baseline — PoC uses 1×)

## Dependencies

- Phase 1 merged: all 13 SOs populated, tower/unit/wave data importable from shared.
- Phase 0b: Boot.unity + Root.unity exist.

## Pre-plan agent consultations

1. **Unity Architect** — Minimal system pattern. Specifically: do we use `static class GameEvents` per spec or SO event channels for this scene? Do we use `RuntimeSet<TowerInstance>` or `List<TowerInstance>` in MinimalTowerSystem? What's the prefab-vs-runtime-instantiate split? Target: written decision, used in Tasks 3–6.
2. **Technical Artist** — PixelPerfectCamera configuration (Reference 512×1152, PPU 64, Upscale off, Pixel Snapping on, Crop Frame Both). Verify no subpixel drift at 8×18 tile boundaries. Confirm one UI canvas (UI Toolkit PanelSettings) + one gameplay camera both render cleanly.
3. **Game Designer** — **Baseline metrics capture from Phaser** before Unity work starts. Run `bun dev:web` with seed 12345 on `main_long` map, place 1 archer at (3, 14), let wave 1 (5 orcs) play out. Record: total damage dealt, kills, wave clear time, energy peak. These numbers are the target Unity must hit ±5%.

---

## File Structure

### Create (packages/shared)
- `packages/shared/src/testing/replay-runner.ts` — headless Phaser system runner
- `packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json`
- `packages/shared/src/testing/__tests__/replay-runner.test.ts`

### Create (packages/unity-game/Assets/Scripts/SceneRuntime/Slice2/)
- `Slice2SceneController.cs`
- `PlacementController.cs`
- `Slice2HudController.cs`

### Create (packages/unity-game/Assets/Scripts/Systems/Minimal/)
- `MinimalTowerSystem.cs`
- `MinimalUnitSystem.cs`
- `MinimalWaveSystem.cs`
- `MinimalEnergySystem.cs`
- `MinimalGridManager.cs` (reuse Phase 1 MapLayoutSO, no pathfinding cache)

### Create (packages/unity-game/Assets/Prefabs/Slice2/)
- `TowerInstance.prefab` (archer visual + collider + SpriteRenderer)
- `UnitInstance.prefab` (orc visual + collider + SpriteRenderer)
- `GridCell.prefab` (highlight overlay)

### Create (packages/unity-game/Assets/UI/Documents/)
- `Slice2Hud.uxml`
- `Slice2Hud.uss`

### Create (packages/unity-game/Assets/_Project/Scenes/)
- `Slice2_PoC.unity`

### Create (packages/unity-game/Assets/Tests/)
- `EditMode/Replay/ReplayParityTests.cs`
- `PlayMode/Slice2/Slice2SmokeTest.cs`
- `PlayMode/Slice2/PlacementInputTest.cs`

### Modify
- `Assets/_Project/Scenes/Root.unity` — add URL param router that, if `?slice=poc`, loads Slice2 additively and unloads Phase 0 label.
- `ProjectSettings/EditorBuildSettings.asset` — add Slice2_PoC to scene list.

---

## Tasks

### Task 1: Agent consultations + design-decisions doc

**Files:**
- Create: `docs/unity-migration/phase-2-design-decisions.md`

- [ ] **Step 1**: Invoke Unity Architect agent. Topics: Minimal systems pattern, SO-channel vs static-events, RuntimeSet vs List. Capture recommendation.
- [ ] **Step 2**: Invoke Technical Artist agent. PixelPerfectCamera parameters, camera stack ordering.
- [ ] **Step 3**: Invoke Game Designer agent with a **one-shot task**: read `packages/phaser-game/src/systems/WaveSystem.ts`, `TowerSystem.ts`, `UnitSystem.ts`, and describe the numeric invariants for wave 1 with 1 archer: total damage, kills (should be 5), clear time range, energy peak. Produce fixture seed metadata.
- [ ] **Step 4**: Write `docs/unity-migration/phase-2-design-decisions.md` consolidating above.
- [ ] **Step 5**: Commit `docs(phase-2): design decisions + baseline metrics from agents`.

### Task 2: Replay harness skeleton (TDD)

**Files:**
- Create: `packages/shared/src/testing/replay-runner.ts`
- Create: `packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json`
- Create: `packages/shared/src/testing/__tests__/replay-runner.test.ts`
- Create: `packages/unity-game/Assets/Tests/EditMode/Replay/ReplayParityTests.cs`

- [ ] **Step 1**: Write `seed-001-slice2-poc.json` fixture: seed 12345, 60s scenario, events `[t=100ms: place archer at (3,14)]`, expected metrics from Task 1 Step 3.
- [ ] **Step 2**: Write failing Vitest test for `replay-runner.ts`:
  - `runReplay(fixture) → { events[], metrics{ kills, totalDamage, energyPeak, waveClearMs } }`
  - Deterministic: two runs with same seed produce identical event stream.
- [ ] **Step 3**: Write `replay-runner.ts`. Imports the pure logic from `packages/phaser-game/src/systems/{Tower,Unit,Wave,Energy}System.ts` (refactor slightly if needed — keep those modules pure/testable). Runs the fixture by stepping 16.67ms ticks, executing scheduled events, collecting metrics.
- [ ] **Step 4**: Run test. Pass.
- [ ] **Step 5**: Write `ReplayParityTests.cs` skeleton — for now it loads the fixture JSON, calls the yet-to-exist Unity `MinimalReplayRunner.Run(fixture)`, and asserts `metrics.kills == expected.kills`. Test will fail until Task 6 wires the Unity runner. Skeleton commit is OK.
- [ ] **Step 6**: Commit `feat(shared): replay-runner + seed-001 fixture (Unity parity skeleton)`.

### Task 3: Minimal systems (pure C#)

**Files:**
- Create: `Assets/Scripts/Systems/Minimal/*.cs` (5 files)

- [ ] **Step 1**: Write `MinimalGridManager.cs`. Loads `MapLayoutSO`. `WorldToGrid(Vector2) → (col, row)`, `GridToWorld((col, row)) → Vector2`, `IsBlocked((col, row)) → bool`.
- [ ] **Step 2**: Write `MinimalEnergySystem.cs`. Holds `float energy`. Ticks +1/sec capped to 200. `SpendOrFail(amount) → bool`. `OnEnergyChanged` event.
- [ ] **Step 3**: Write `MinimalWaveSystem.cs`. Single-wave driver. `StartWave1()` schedules 5 orc spawns at intervals per `WaveDefSO[0]`. Fires `OnUnitSpawned(UnitInstance)`. Fires `OnWaveCompleted` when all units cleared.
- [ ] **Step 4**: Write `MinimalUnitSystem.cs`. Manages `List<UnitInstance>`, ticks each unit (move along path computed in Task 3 Step 1 via plain straight-line BFS as pathfinding — good enough for Phase 2 with orc-only straightforward path). Applies damage from towers.
- [ ] **Step 5**: Write `MinimalTowerSystem.cs`. Place/remove archers on grid cells. Each archer ticks an attack cooldown from its `TowerDefSO`, finds nearest in-range unit, deals damage via UnitSystem.
- [ ] **Step 6**: EditMode test `Tests/EditMode/Slice2/MinimalSystemsTest.cs`: construct systems headlessly with fixed seed, simulate wave 1 by stepping delta time manually, assert final kill count == 5, energy peak within spec.
- [ ] **Step 7**: Commit `feat(unity-game): Slice2 minimal systems (pure C#, wave-1 deterministic)`.

### Task 4: Scene + prefabs + scene controller

**Files:**
- Create: `Assets/Prefabs/Slice2/*.prefab`
- Create: `Assets/_Project/Scenes/Slice2_PoC.unity`
- Create: `Assets/Scripts/SceneRuntime/Slice2/Slice2SceneController.cs`

- [ ] **Step 1**: Create `TowerInstance.prefab`. Empty GameObject → add SpriteRenderer (assigns at runtime from TowerDefSO), add CircleCollider2D (range), add `TowerInstance` MB (binds to SO).
- [ ] **Step 2**: Create `UnitInstance.prefab`. Same pattern with `UnitInstance` MB tracking path index + HP.
- [ ] **Step 3**: Create `GridCell.prefab` (simple SpriteRenderer for highlight overlay).
- [ ] **Step 4**: Create `Slice2_PoC.unity` scene. Add Main Camera with PixelPerfectCamera component configured per Task 1 Step 2 decisions. Add UIDocument with Slice2Hud.uxml. Add empty `SceneRoot` GameObject with `Slice2SceneController` MB.
- [ ] **Step 5**: Write `Slice2SceneController.cs`. `Awake()` wires: loads `GameDatabase` Addressable → constructs Minimal systems in correct order (Grid → Energy → Units → Towers → Waves) → subscribes HUD controller → registers placement controller. `Start()` calls `WaveSystem.StartWave1()` after a 3-second prep countdown.
- [ ] **Step 6**: PlayMode test `Slice2SmokeTest.cs`: load scene in test mode → wait 3s prep → verify wave starts → place archer at (3,14) via direct system call → tick time 60s → assert `WaveCompleted` fired and kills == 5.
- [ ] **Step 7**: Commit `feat(unity-game): Slice2_PoC scene + scene controller + prefabs`.

### Task 5: Input + placement + HUD

**Files:**
- Create: `Assets/Scripts/SceneRuntime/Slice2/PlacementController.cs`
- Create: `Assets/UI/Documents/Slice2Hud.uxml`
- Create: `Assets/UI/Styles/Slice2Hud.uss`
- Create: `Assets/Scripts/SceneRuntime/Slice2/Slice2HudController.cs`

- [ ] **Step 1**: Write `PlacementController.cs`. Input System PointerPress action → `Camera.ScreenToWorldPoint` → `MinimalGridManager.WorldToGrid` → if empty + energy sufficient + has placement mode active → call `MinimalTowerSystem.Place(archerDef, cell)`.
- [ ] **Step 2**: Write `Slice2Hud.uxml`. Energy label `⚡<value>/200`, wave label `W <n>/50`, HP label `❤<value>`, a single "Place Archer (⚡10)" button bottom-center that toggles placement mode.
- [ ] **Step 3**: Write `Slice2Hud.uss` pulling from Phase 1's generated `tokens.uss` (colors, fonts).
- [ ] **Step 4**: Write `Slice2HudController.cs` (MB with `[SerializeField] UIDocument document`). Subscribes to `OnEnergyChanged`, `OnWaveStarted`, `OnPlayerDamaged`. Updates labels via `INotifyValueChanged` pattern.
- [ ] **Step 5**: PlayMode test `PlacementInputTest.cs`: simulate InputSystem pointer at screen pos corresponding to (3,14), dispatch press, assert archer placed.
- [ ] **Step 6**: Commit `feat(unity-game): Slice2 placement controller + UI Toolkit HUD`.

### Task 6: Unity replay runner + URL param router

**Files:**
- Create: `packages/unity-game/Assets/Scripts/SceneRuntime/Slice2/MinimalReplayRunner.cs`
- Modify: `Assets/_Project/Scenes/Root.unity` + its SceneRootController to route `?slice=poc`

- [ ] **Step 1**: Write `MinimalReplayRunner.cs`. Static API `Run(fixture JSON) → RunMetrics`. Spins up Minimal systems headlessly (no MonoBehaviours, no scene), steps time per fixture events, collects metrics.
- [ ] **Step 2**: Wire this into Task 2's `ReplayParityTests.cs`. Test now must pass with Unity metrics within ±5% of TS metrics.
- [ ] **Step 3**: Write a small `UrlParamRouter.cs` MB on Root scene that on Awake reads `Application.absoluteURL` (WebGL) or editor override. If contains `?slice=poc`, loads `Slice2_PoC` additively and hides Phase 0 label; else shows Phase 0 label.
- [ ] **Step 4**: Also honor `?autostart=1` (no-op in Phase 2, used by Phase 3 wave-50 endless).
- [ ] **Step 5**: Commit `feat(unity-game): Slice2 replay runner + URL param router`.

### Task 7: Build, deploy, iOS Safari verification

**Files:**
- Modify: none (runtime verification + evidence capture)

- [ ] **Step 1**: `bun run build:unity-json` + Unity `GLD/Import Shared Data` + Unity `GLD/Validate Database` (Phase 1 wiring).
- [ ] **Step 2**: Unity menu `GLD/Build/WebGL` (or CLI) → verify `Build/WebGL/` produced, size <10MB compressed (spec Phase 2 goal).
- [ ] **Step 3**: `bun run build:all` → `bun run dev:unity-preview`.
- [ ] **Step 4**: Open `http://localhost:8080/unity/?slice=poc` in Safari with iOS Responsive mode (iPhone 12). Record 30s video: archer placed → orcs spawn → orcs killed → energy increments. Save as `docs/unity-migration/phase-2-slice-demo.mp4` (or frame capture if mp4 commit not preferred).
- [ ] **Step 5**: Compare Unity-run metrics to Phaser baseline from Task 1 Step 3. Document in `docs/unity-migration/phase-2-parity-results.md`. Must be ≤5% delta on damage, kills=5 exact, energy peak ±5%.
- [ ] **Step 6**: `lighthouse-ci.yml` informational run (spec Phase 2 verification). Record LCP / CLS / TBT as baseline for Phase 7 targets.
- [ ] **Step 7**: Commit `docs(phase-2): parity results + 30s iOS Safari demo evidence`.

### Task 8: CI integration

**Files:**
- Modify: `.github/workflows/unity-build.yml`

- [ ] **Step 1**: Add PlayMode test invocation to GameCI step:
  ```yaml
  testMode: all
  ```
  This adds EditMode+PlayMode tests to the Unity build action.
- [ ] **Step 2**: Add a post-build step that uploads PoC build size + `phase-2-parity-results.md` as artifacts.
- [ ] **Step 3**: Confirm `unity-build.yml` green on PR.

## Exit gate verification

From spec Phase 2 row:
- [ ] iOS Safari on real or emulated iPhone 12: 30s video of place → kill → energy+1 cycle (Task 7)
- [ ] Phaser wave 1 damage parity ≤5% (Task 2 + Task 7)
- [ ] PoC build <10MB compressed (Task 7 Step 2)
- [ ] `Slice2SmokeTest` PlayMode green in CI (Task 8)
- [ ] Lighthouse baseline recorded (Task 7 Step 6)

## Self-review

**Spec coverage (Phase 2 deliverables):**
- `Scenes/Slice2_PoC.unity` → Task 4
- `MinimalTowerSystem/UnitSystem/WaveSystem/EnergySystem` → Task 3
- `Slice2Hud.uxml` → Task 5
- `Slice2SmokeTest` → Task 4 Step 6

**Replay harness investment here** — Phase 3 matures this significantly. Starting the skeleton in Phase 2 with only `seed-001-slice2-poc.json` is cheap and de-risks Phase 3's parity gate commitment.

**Risks engaged:**
- R1 (iOS OOM) — checked via build size <10MB goal.
- R3 (UI Toolkit touch lag) — PlacementInputTest (Task 5 Step 5) validates basic input.
- R6 (TS↔C# drift) — seeded in Task 2 skeleton.
- R11 (UI Toolkit HUD frame drop) — single HUD with 3 labels; measure in Task 7.

**Deferred to Phase 3:**
- Full tower set, full pathfinding, full wave progression, full system set.
- Replay harness expansion to 10 fixtures.
- 3× speed correctness.
