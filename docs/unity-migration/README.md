# Unity Migration — phase-by-phase documentation

Grid Line Defense's Unity 2D WebGL port documentation. Design spec for the overall migration lives in `docs/superpowers/specs/` (drafts) and `docs/game-spec/08-architecture.md` (authoritative once Phase 7 lands). Per-phase implementation plans live in `docs/superpowers/plans/`.

This directory tracks **current-state documentation** — runbooks, rollback procedures, performance snapshots, parity-failure dumps that agents and operators need during active migration work.

## Index

| File | Purpose |
|------|---------|
| `phase-0b-runbook.md` | User-side Phase 0 tasks: secrets, local Unity install, first scene, first build. |

Phases 1–8 produce additional documents (listed in the migration spec):
- Phase 7: `phase7-perf.md` (performance profile + budget evidence)
- Phase 8: `rollback-runbook.md` (flag-day swap + drill procedure)

## Conventions

- **Runbooks are action lists, not discussion.** Each step is a literal command or UI action a human can execute in order without judgement calls.
- **Link to source of truth.** Any numeric budget, version pin, or invariant referenced here must cite the file under `packages/` or `docs/game-spec/` where the authoritative value lives.
- **Date-stamped sections for snapshots.** Performance reports, soak results, and parity failures always include the date and git SHA so future readers can reconstruct state.
