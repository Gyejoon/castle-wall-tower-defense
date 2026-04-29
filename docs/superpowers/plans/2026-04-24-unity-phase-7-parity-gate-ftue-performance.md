# Unity Migration Phase 7 — Parity Gate + FTUE + Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** This is the acceptance phase — the last step before Phase 8's production swap. No new gameplay systems; everything here tightens parity, adds the FTUE tutorial, and proves performance budgets. Task 1 Technical Artist consultation sets the performance work program. Task 2 Game Designer signs off on the final parity checklist from spec.

**Goal:** Unity build passes the full parity checklist (15 automated items + 8 manual QA items per spec), hits 60fps Desktop / 45fps iOS Safari / 20fps+ at 3× speed, compressed bundle <30MB, LCP <5s Desktop. A first-run FTUE tutorial is live. Nightly soak runs 7 consecutive days with zero crashes + <0.5% balance drift.

**Architecture:** Performance work is measurement-driven — measure first (Lighthouse CI, Unity profiler traces, memory snapshots), then target hotspots. `TutorialSystem.cs` is new but additive (overlay on first run, state in SaveDataV9). Parity work is verification via expanded EditMode/PlayMode tests + the existing `unity-parity-gate.yml` promoted to block any PR that drifts. Nightly soak (`nightly-soak.yml`) introduced Phase 3 becomes authoritative; `scripts/morning-briefing.ts` (Phase 3) auto-writes morning summary.

**Tech Stack:** Unity 6 LTS · URP 2D · Unity Profiler · Lighthouse CI · Playwright · DOTween · NUnit.

---

## Scope boundary

**In:**
- `TutorialSystem.cs` + `TutorialOverlay.uxml` full content (replaces Phase 5 stub) + tutorial state in SaveDataV9
- `Tests/PlayMode/ParityAcceptance/` — CI-driven expanded acceptance suite covering all automated checklist items
- `docs/unity-migration/phase7-perf.md` — performance snapshot with profiler evidence
- `lighthouse-ci.yml` — required from this phase onward
- Bundle-size gate tightened to 30MB
- Memory-leak gate from `nightly-soak.yml` becomes required (was informational)
- `docs/unity-migration/QA-Checklist.md` — 8-item manual QA doc
- FTUE flow: first-boot detection → tutorial overlay → skippable → completion saved
- Performance tuning tasks as needed (atlas repack, font subset trim, code-path optimizations identified in profiling)

**Out:**
- Production flag-day swap (Phase 8)
- Rollback drill automation (Phase 8)
- Phaser freeze announcement in phaser-game README (Phase 8)

## Dependencies

- Phase 6 merged: save system, audio, Sentry, AdService live.
- Phase 5 merged: full UI suite including TutorialOverlay stub.
- Phase 3 merged: `unity-parity-gate.yml`, `nightly-soak.yml`, `scripts/morning-briefing.ts`.

## Pre-plan agent consultations

1. **Technical Artist** — WebGL bundle audit: texture compression review, atlas packing efficiency, LOD needs (if any — typically none for 2D). Target: 30MB compressed, evidence chart.
2. **Game Designer** — final parity checklist sign-off. Review spec's 15 automated items vs current test coverage; identify gaps; write acceptance criteria per item.
3. **Level Designer** — FTUE onboarding pacing: what to teach, in what order, skip policy.
4. **Unity Shader Graph Artist** — VFX performance validation (boss tint / invuln ring / range overlay shaders from Phase 3/4) on low-end mobile.

---

## File Structure

### Create (packages/unity-game/Assets/Scripts/Systems/Tutorial/)
- `TutorialSystem.cs`
- `TutorialStepSO.cs` — SO per tutorial step (copy, highlight target, wait condition)
- `Assets/Data/Tutorial/*.asset` — concrete step SOs (5–8 steps)

### Create (packages/unity-game/Assets/Scripts/UI/Controllers/)
- Updated `TutorialOverlayController.cs` (replacing Phase 5 stub)

### Modify (packages/unity-game/Assets/Scripts/Core/Save/)
- `SaveDataV9.cs` — add `tutorialCompleted: bool`, `tutorialStep: int`

### Create (packages/unity-game/Assets/Tests/PlayMode/ParityAcceptance/)
- `ParityTest_TowerDefs.cs` — 19 towers JSON round-trip byte-equality
- `ParityTest_Energy.cs` — 6 energy v3 cases
- `ParityTest_Gacha.cs` — 10⁵ distribution (moved from Phase 4 if not already in ParityAcceptance folder)
- `ParityTest_MergeChain.cs` — all paths
- `ParityTest_3xSpeedDeterminism.cs` — fixed seed, 1× vs 3× identical event sequences
- `ParityTest_SaveV8V9.cs` — 10 sample round-trip
- `ParityTest_ContinueRun.cs` — once-per-run
- `ParityTest_Atlas.cs` — boundary integrity snapshot
- `ParityTest_PixelPerfect.cs` — 8×18 no subpixel blur
- `ParityTest_BundleSize.cs` — asserts <30MB
- `ParityTest_GameEvents.cs` — 30 retained events payload schema check
- `ParityTest_RunStatusFSM.cs` — state machine transitions
- `ParityTest_SaveFlushOnVisibility.cs` — visibilitychange triggers save
- `ParityTest_CCResistance.cs` — boss 0.5–0.7, MIN_MOVE_SPEED=0.15, 2s stun immunity

### Create (docs/unity-migration/)
- `phase7-perf.md` — bundle analysis + profiler traces + frame-rate matrix
- `QA-Checklist.md` — 8 manual QA items with pass/fail
- `QA-Checklist-run-template.md` — template per QA run

### Create (.github/workflows/)
- `lighthouse-ci.yml` — required
- `nightly-soak.yml` — updated to required (was informational)

### Create (config)
- `lighthouserc.json` — thresholds (LCP mobile≤5s desktop≤3s, CLS≤0.1, TBT≤400ms, total JS ≤15MB)

---

## Tasks

### Task 1: Agent consultations

**Files:**
- Create: `docs/unity-migration/phase-7-design-decisions.md`

- [ ] **Step 1**: Technical Artist — bundle audit program, atlas packing review, texture compression tuning.
- [ ] **Step 2**: Game Designer — parity checklist sign-off, acceptance math per item.
- [ ] **Step 3**: Level Designer — FTUE step list + copy + pacing.
- [ ] **Step 4**: Unity Shader Graph Artist — low-end mobile shader performance review.
- [ ] **Step 5**: Consolidate. Revise following tasks if needed.
- [ ] **Step 6**: Commit `docs(phase-7): design decisions (perf, parity, FTUE, shader)`.

### Task 2: `ParityAcceptance` test suite

**Files:**
- `Tests/PlayMode/ParityAcceptance/*.cs` (14 files)

- [ ] **Step 1**: For each spec automated-parity item, write a PlayMode or EditMode test that enforces it. Many already exist from earlier phases — consolidate into the `ParityAcceptance/` folder for easy discovery. Where existing tests don't cover it, add new.
- [ ] **Step 2**: `ParityTest_BundleSize.cs` — reads `build-size.json` CI artifact (or invokes local build measurement), asserts <30MB compressed.
- [ ] **Step 3**: `ParityTest_3xSpeedDeterminism.cs` — expands Phase 3 Task 9 test. Covers all 10 fixtures at 1× and 3×.
- [ ] **Step 4**: `ParityTest_SaveFlushOnVisibility.cs` — PlayMode mocks visibilitychange, asserts SaveRepository flushes.
- [ ] **Step 5**: `ParityTest_CCResistance.cs` — boss ccResistance 0.5–0.7, MIN_MOVE_SPEED=0.15 floor, 2s stun immunity window enforcement.
- [ ] **Step 6**: All tests green in CI as required.
- [ ] **Step 7**: Commit `test(unity-game): full ParityAcceptance suite (14 tests)`.

### Task 3: Lighthouse CI integration

**Files:**
- `.github/workflows/lighthouse-ci.yml`
- `lighthouserc.json`

- [ ] **Step 1**: Write `lighthouserc.json` with thresholds per spec Section E: LCP mobile≤5s/desktop≤3s, CLS≤0.1, TBT≤400ms, total JS ≤15MB.
- [ ] **Step 2**: Write `lighthouse-ci.yml` — on PR or nightly, runs Lighthouse CI against preview URL (Vercel or local `dev:unity-preview`). Mobile (Moto G Power emulation) + Desktop presets. Required status on PR.
- [ ] **Step 3**: Capture baseline on current Unity build. If any metric fails, revisit in Task 5 performance tuning.
- [ ] **Step 4**: Commit `ci(perf): Lighthouse CI workflow + thresholds`.

### Task 4: Bundle size tightening to 30MB

**Files:**
- Modify: `unity-build.yml` bundle-size gate (was 50MB or unset — now 30MB)
- `Assets/Editor/BundleAuditor.cs` — analyzes build output for largest contributors, writes `build-size-breakdown.json`

- [ ] **Step 1**: Run baseline build, inspect size. If >30MB, identify top offenders via `BundleAuditor.cs`.
- [ ] **Step 2**: Apply reductions per Technical Artist recommendations: atlas compression tuning, font subset trim, Addressables group rebalance, strip debug symbols from release.
- [ ] **Step 3**: Re-run, verify <30MB. Document reductions in `phase7-perf.md`.
- [ ] **Step 4**: Tighten `unity-build.yml` size gate to 30MB.
- [ ] **Step 5**: Commit `perf(unity-game): bundle <30MB — atlas + font + debug strip`.

### Task 5: Performance profile + targeted optimization

**Files:**
- `docs/unity-migration/phase7-perf.md` (written in stages across Tasks 4, 5, 6)

- [ ] **Step 1**: Run Unity Profiler against a 60s endless-run playback (autostart + scripted build). Capture per-system CPU ms, draw calls, GC allocations per frame. Save `phase7-perf-profiler-trace.zip`.
- [ ] **Step 2**: Identify any system above budget (e.g., TowerSystem >2ms per frame, UI Toolkit redraw >100/frame, GC alloc >5KB/frame per spec Section E GCProfileTest).
- [ ] **Step 3**: For each offender, apply targeted fix (object pooling, string caching, schedule.Execute throttle for UI, etc).
- [ ] **Step 4**: Re-profile, document deltas.
- [ ] **Step 5**: Run frame-rate matrix on real devices: Desktop Chrome (60fps target), iPhone 12 iOS Safari (45fps+ target), Pixel 6 Android Chrome (45fps+ target), all at 1× and 3× speed. Record in `phase7-perf.md`.
- [ ] **Step 6**: Commit `perf(unity-game): profile-driven optimizations + frame-rate matrix`.

### Task 6: `nightly-soak.yml` tightening

**Files:**
- Modify: `.github/workflows/nightly-soak.yml`

- [ ] **Step 1**: Promote nightly-soak to required status: 7 consecutive nights must pass before Phase 7 exit.
- [ ] **Step 2**: Tighten thresholds: `balance-drift.csv` daily delta <0.5%, zero crashes, memory trend slope not monotonically increasing over 30min run.
- [ ] **Step 3**: Ensure `scripts/morning-briefing.ts` runs and commits to `docs/unity-migration/nightly-reports/` (separate branch if configured).
- [ ] **Step 4**: Let run for at least 7 nights before declaring Phase 7 exit gate met.
- [ ] **Step 5**: Commit `ci(nightly): required status + tightened thresholds`.

### Task 7: FTUE tutorial

**Files:**
- `Assets/Scripts/Systems/Tutorial/TutorialSystem.cs`
- `Assets/Scripts/Systems/Tutorial/TutorialStepSO.cs`
- `Assets/Data/Tutorial/*.asset`
- `Assets/Scripts/UI/Controllers/TutorialOverlayController.cs` (full version)
- Modify: `Assets/Scripts/Core/Save/SaveDataV9.cs`
- Modify: `Assets/Scripts/SceneRuntime/GameSceneController.cs` (boot flow)

- [ ] **Step 1**: Write `TutorialStepSO.cs` — fields: `stepId`, `koreanCopy`, `englishCopy` (optional Phase 7), `highlightTarget` (UI element name), `advanceCondition` enum.
- [ ] **Step 2**: Create ~6 step SOs per Level Designer plan from Task 1: welcome → first summon → first placement → energy concept → first wave → merge hint.
- [ ] **Step 3**: Write `TutorialSystem.cs` — driven by `OnTutorialStep` / `OnTutorialAdvance` events. First boot (checked via `SaveDataV9.tutorialCompleted == false`) starts tutorial; `Skip` button completes.
- [ ] **Step 4**: Update `SaveDataV9` — `tutorialCompleted: bool`, `tutorialStep: int`. Migration (v8→v9) defaults `tutorialCompleted = false` so v8 players see tutorial once on upgrade (or `true` to grandfather — decide per Game Designer input).
- [ ] **Step 5**: Write `TutorialOverlayController.cs` full — highlights target with DOTween pulse, renders copy, advance/skip buttons.
- [ ] **Step 6**: PlayMode test `TutorialFlowTest.cs` — fresh boot → tutorial runs → complete → saved. Subsequent boot → no tutorial.
- [ ] **Step 7**: Commit `feat(unity-game): FTUE tutorial (6-step) with save-backed completion`.

### Task 8: QA-Checklist

**Files:**
- `docs/unity-migration/QA-Checklist.md`
- `docs/unity-migration/QA-Checklist-template.md`

- [ ] **Step 1**: Write the checklist of 8 manual QA items from spec Phase 7 manual QA section + per Game Designer Task 1:
  - iOS Safari real device (iPhone 12/13/SE) BGM unlock / SFX latency <100ms / touch hit-test
  - Android Chrome real device (Pixel 6, Galaxy S20)
  - Portrait fixed, landscape rotation letterbox
  - Galmuri11 Korean readability
  - Merge drag/tap UX
  - Boss warning timing feel
  - 3× speed audio distortion check
  - FTUE first-launch flow
- [ ] **Step 2**: Write run template (one file per QA session).
- [ ] **Step 3**: 2 independent QA sessions run, record results. Any fail → fix and re-run.
- [ ] **Step 4**: Commit `docs(phase-7): QA-Checklist + 2 independent QA runs evidence`.

### Task 9: Exit gate rollup

**Files:**
- Modify: `docs/unity-migration/phase7-perf.md` (final state)

- [ ] **Step 1**: Verify every checklist item (automated + manual) is passing.
- [ ] **Step 2**: Final `phase7-perf.md` assembled with profiler snapshots, bundle breakdown, frame-rate matrix, Lighthouse scores, 7-night soak summary.
- [ ] **Step 3**: CI: `ci.yml` ✓, `unity-build.yml` ✓, `unity-parity-gate.yml` ✓, `save-migration-fuzz.yml` ✓, `lighthouse-ci.yml` ✓, `nightly-soak.yml` 7 nights ✓.
- [ ] **Step 4**: Commit `docs(phase-7): exit gate rollup — all automated + 2-QA manual green`.

## Exit gate verification

From spec Phase 7 row:
- [ ] 자동화 parity green (Tasks 2, 3, 6)
- [ ] 수동 QA 2인 통과 (Task 8)
- [ ] Desktop 60fps / iOS Safari 45fps+ / 3× 20fps+ (Task 5)
- [ ] 빌드 <30MB (Task 4)

## Self-review

**Spec coverage (Phase 7 deliverables):**
- `TutorialSystem.cs` → Task 7
- `Tests/PlayMode/ParityAcceptance/` → Task 2
- `docs/unity-migration/phase7-perf.md` → Tasks 4, 5, 6, 9
- `unity-parity-gate.yml` full wiring → leverages Phase 3 infrastructure (no new workflow here; tightened thresholds)

**Risks engaged:**
- R1 (iOS OOM) — Task 5 frame rate matrix on real iPhone 12.
- R5 (Galmuri11 readability) — Task 8 manual QA.
- R3 (touch lag) — Task 8 manual QA + Task 5 profiler.
- R7 (Addressables remote) — decision still deferred (local Vercel default per spec).

**Deferred to Phase 8:**
- Flag-day cutover mechanics.
- Rollback drill automation.

**Key decisions resolved in Task 1:**
- FTUE step list + copy.
- Performance tuning targets (which systems need optimization; depends on measurement).
- v8→v9 tutorial grandfathering policy.
