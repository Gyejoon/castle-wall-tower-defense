# Unity Phase 3 Parity Acceptance

> Last Updated: 2026-05-05

## Gate

Phase 3 is accepted when Unity can run the core loop through wave 50 and the replay harness stays
within the drift thresholds below for Phase-3-supported fixtures.

## Fixture Scope

Required in Phase 3:

- seed-001: PoC baseline
- seed-003: boss wave 10 as HP bag
- seed-005: fast-clear reward
- seed-006: energy cap
- seed-008: meta `globalAtkPct`
- seed-009: 3x speed determinism

Skipped until Phase 4:

- seed-002: gacha odds stack
- seed-004: merge chain
- seed-007: continue run
- seed-010: tutorial completion

Skipped fixtures must include `"phase4_dependent": true`.

## Metrics

For each non-skipped fixture:

- kill count: exact
- wave start/completion event order: exact, ignoring timestamp fields where noted
- total damage: mean delta <= 5%
- energy peak: delta <= 5%
- wave clear time: delta <= 2% for non-boss waves, <= 5% for boss HP-bag waves
- energy bounds: never below 0 and never above 200
- 1x vs 3x deterministic event sequence: exact after timestamp normalization

## Boss Phase 3 Rule

Boss wave fixtures validate HP-bag behavior only. Phase transition timing, invulnerability, enrage,
and boss action cadence are not part of Phase 3 acceptance.

## CI Artifacts

The parity workflow must upload:

- `phase-3-replay-metrics.csv`
- `phase-3-balance-drift-baseline.csv`
- `phase-3-diff.json`
- Unity EditMode test log
- Unity PlayMode test log

## Balance Drift Baseline

`docs/unity-migration/phase-3-balance-drift-baseline.csv` is generated from the shared replay
reference with:

```bash
bun run --filter @gld/shared replay:baseline
```

It contains 50 deterministic seeds x waves 1-10. Each row stores TS reference damage, kill count,
clear time, energy peak, and the Phase 3 tolerance bounds used by the Unity comparison.
