# Unity Migration Phase 2 Design Decisions

Date: 2026-05-05

## Scope

Phase 2 is a PoC vertical slice only: one archer tower, five wave-1 scout units, placement, energy ticking, kill reward, and a minimal HUD. Phaser remains the default `/` runtime and Unity remains isolated behind `/unity/?slice=poc`.

## Runtime Pattern

- PoC gameplay logic uses pure C# `Minimal*` systems under `Assets/Scripts/Systems/Minimal/`.
- Scene glue lives under `Assets/Scripts/SceneRuntime/Slice2/`.
- Phase 0 `GLD.Core.GameEvents` stays unchanged. PoC events are exposed through `MinimalGameEvents` with names that can graduate to the Phase 3 event surface.
- Runtime collections use simple `List<T>` and `Dictionary<T>` containers. ScriptableObject runtime sets are deferred until the full Phase 3 architecture requires cross-scene ownership.

## Baseline Fixture

The Phase 2 deterministic fixture is `packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json`.

Baseline:

| Metric | Expected |
| --- | ---: |
| kills | 5 |
| totalDamage | 150 |
| energyPeak | 44.1 |
| waveClearMs | 9083 |

Parity tolerance is exact for kills and ±5% for damage, energy peak, and clear time.
