# Unity Migration Phase 2 Parity Results

Date: 2026-05-05

## Fixture

- Fixture: `packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json`
- Seed: `12345`
- Scenario: place `archer` at `(3,14)` at `100ms`, spawn five wave-1 scout units.

## Result

| Metric | Fixture | Unity PoC Gate |
| --- | ---: | --- |
| kills | 5 | exact |
| totalDamage | 150 | ±5% |
| energyPeak | 44.1 | ±5% |
| waveClearMs | 9083 | ±5% |

Unity verification is covered by `ReplayParityTests`, which loads the shared fixture and compares `MinimalReplayRunner` metrics against these gates.

## Deferred Evidence

Compressed WebGL size and browser smoke evidence are not recorded in this snapshot because the local Unity WebGL build gate was not completed in this implementation pass.
