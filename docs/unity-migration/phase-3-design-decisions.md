# Unity Phase 3 Design Decisions

> Last Updated: 2026-05-05

## Scope

Phase 3 ports the visible core loop to Unity while keeping Phase 4 systems stubbed:
merge, gacha, roguelike card picks, and boss phase AI do not execute production logic here.

## Decisions

### Core system shape

- Grid, pathfinding, energy, towers, units, waves, orchestrator, and damage numbers stay in
  `GLD.Systems` as small C# systems.
- Scene glue stays under `GLD.SceneRuntime.CoreLoop`.
- `GameSceneController` owns construction order and teardown order.
- Runtime systems do not call `FindObjectOfType`; dependencies are passed by constructor or serialized
  reference.

### Event surface

`GLD.Core.GameEvents` is the Unity-side typed bridge for Phase 3. It includes request events
(`OnRequestPlaceTower`, `OnRequestSummon`, `OnRequestSetSpeed`) and game-state events
(`OnTowerPlaced`, `OnUnitDamaged`, `OnWaveStarted`, `OnGameOver`).

Phase 4 request events are intentionally present but handled as stubs:

- `OnRequestMerge`
- `OnRequestGacha`
- `OnRequestUpgradePick`
- `OnRequestUpgradeReroll`

### CoreOrchestrator

`CoreOrchestrator` subscribes idempotently through `Enable()` and unsubscribes through `Dispose()`.
Phase 3 wires:

- start-run
- summon offer
- summon cancel cache (`cancelledPoolDraw`)
- tower placement
- tower sell
- tower move

The cancelled summon cache mirrors Phaser behavior: cancelling an offered pool draw keeps that tower id
for the next summon request.

### Damage numbers

`DamageNumberSystem` uses a fixed pool of 24 `TextMesh` world instances. Animation uses unscaled
delta so pause/speed changes do not distort number fade timing.

### Speed and pause

`GameStateManager.Tick(fixedDeltaSeconds)` returns scaled delta:

```text
scaledDelta = fixedDeltaSeconds * speedMultiplier
```

Pure systems consume the returned scaled delta. Pause is separate and uses `Time.timeScale = 0`.

### Boss handling

Boss units are HP bags in Phase 3. `BossContextBuilder` only exposes id, HP ratio, and CC resistance.
Phase transitions, invulnerability windows, warning overlays, and boss actions remain Phase 4 scope.

### Rendering and input

The current Phase 3 visible loop uses SpriteRenderer/IMGUI placeholders:

- `CoreLoopFieldRenderer` renders grid, towers, and units.
- `CoreLoopHudController` provides start and placement controls.
- `PlacementCoordinator`, `InputController`, and `RangeOverlayController` exist as the migration target
  for the Phase 5 full HUD/runtime split.

## Follow-up Before Exit Gate

- Replay gate now runs the shared replay ledger and Unity `ReplayParityTests`.
- Replay fixtures now cover seed-001..010; Phase-4-dependent fixtures are explicitly skipped.
- Local Unity batchmode checks pass for Phase 3 targeted EditMode tests and the root PlayMode autostart
  smoke test.
- `bun run --filter @gld/shared replay:baseline` generates
  `docs/unity-migration/phase-3-balance-drift-baseline.csv` with 50 seeds x waves 1-10 TS
  reference metrics and tolerance bounds.
- Remaining external exit check: CI parity gate green status.
