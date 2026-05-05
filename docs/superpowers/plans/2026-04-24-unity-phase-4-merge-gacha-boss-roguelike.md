# Unity Migration Phase 4 — Merge, Gacha, Boss AI, Roguelike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** Builds on Phase 3's full system set. Phase 4 closes the **in-run loop**: every stochastic subsystem (gacha draws, merge resolution, boss phase transitions, roguelike card selection + reroll) must be deterministic under seed, and the replay harness fixtures that were phase4_dependent in Phase 3 go live here. Task 1 agent consultations drive boss AI state-machine design.

**Goal:** Unity completes the Phase-4 parity slice for Phaser's current in-run systems: gacha T2/T3/T4 distribution within ±0.5%p over 10⁵ rolls, merge chain all-paths correct, shared boss phase transitions + the 4 current Phaser boss behaviors, roguelike card pick with reroll + cancelled-cache, and Phase-4-supported replay fixtures green on CI.

**Architecture:** Three pure-C# systems (`MergeSystem`, `GachaSystem`, `UpgradeCardSystem`) plus pure-C# boss behavior registry. `BossPhaseTracker` (stubbed in Phase 3) becomes a shared phase state machine matching Phaser's 50%/25% transitions, while 4 concrete behaviors mirror Phaser's current behavior modules (`orc_warlord`, `forge_master`, `corrupted_archmage`, `dragon`). `CoreOrchestrator.cs` (stubbed in Phase 3) fills merge/gacha/upgrade branches including cancelled-pool-draw and cancelled-gacha-draw caches. Shader Graph/VFX polish remains Phase 5+ unless explicitly requested.

**Tech Stack:** Unity 6 LTS · URP 2D · Shader Graph · DOTween (boss phase transitions) · NUnit · Vitest (shared distribution tests).

---

## Scope boundary

**In:**
- `MergeSystem.cs` — static resolver matching Phaser `resolveMerge` against `MERGE_CHAIN`
- `GachaSystem.cs` — static draw with tier weights, `tier_odds_up` stacking
- `UpgradeCardSystem.cs` + overlay event flow — 3 card offer on boss clear, reroll via AdService (stubbed — Phase 6 wires WebGLBridgeAdService)
- shared boss phase transitions (50%/25% HP, 500ms invuln, speed/tint config) + 4 current Phaser boss behaviors
- Cancelled-cache port (`cancelledPoolDraw` + `cancelledGachaDraw`) in `CoreOrchestrator`
- Gacha distribution EditMode test 10⁵ rolls ±0.5%p
- Merge chain all-paths EditMode test (4 family × 4 tier + hybrid 2 + ultimate 1)
- Boss phase transition EditMode test (10 seed × 4 boss)
- Replay fixtures seed-002 (gacha stack), seed-003 (boss wave 10 full AI), seed-004 (merge chain full) — promoted from phase4_dependent

**Out:**
- Meta forge / roguelike persistence (Phase 5 / Phase 6)
- Save system (Phase 6)
- AdService real wiring (Phase 6 — Phase 4 uses `MockAdService` direct)
- UI Toolkit overlays full polish (Phase 5; Phase 4 uses minimally styled overlays sufficient for PlayMode tests)
- Lobby / MetaForge screens (Phase 5)
- Shader Graph boss tint / invuln ring polish (Phase 5+ visual pass)
- seed-007 continue-run and seed-010 tutorial fixture ungating

## Dependencies

- Phase 3 merged: full systems running, replay harness CI gate live, `DeterministicRng` ported.
- `UpgradeCardCatalogSO` + `GachaConfigSO` + `BossConfigSO` populated in Phase 1.

## Pre-plan agent consultations

1. **Game Designer** — Gacha distribution acceptance math (spec: ±0.5%p at 10⁵). `tier_odds_up` stacking ceiling (+50%p). Pity policy (current code has none; Phase 4 mirrors Phaser exactly). Review roguelike card pool weights.
2. **Unity Architect** — Boss AI state machine pattern (hierarchical vs flat). `BossAIBase` abstract class vs composition via components. UpgradeCard SO pattern (single SO per card vs enum-driven).
3. **Level Designer** — Boss encounter pacing (warning lead time, enrage timing). Wave tempo with boss injected.
4. **Unity Shader Graph Artist** — Boss phase-transition tint shader (URP 2D Sprite-Lit). Invuln ring. Performance budget: draw calls added per boss ≤2.

---

## File Structure

### Create (packages/unity-game/Assets/Scripts/Systems/)
- `Merge/MergeSystem.cs` (static)
- `Gacha/GachaSystem.cs` (static)
- `Upgrade/UpgradeCardSystem.cs`
- `Upgrade/UpgradeCardOverlay.cs` (minimal UI Toolkit — polished in Phase 5)
- `Boss/BossAIBase.cs`
- `Boss/OrcWarlordAI.cs`, `ForgeMasterAI.cs`, `CorruptedArchmageAI.cs`, `DragonAI.cs`
- `Boss/BossContextBuilder.cs` (fill Phase 3 stub)

### Create (packages/unity-game/Assets/Shaders/)
- `BossTint.shadergraph` (URP 2D sprite tint during phase transitions)
- `BossInvulnRing.shadergraph` (ring pulse during invuln window)

### Create (packages/unity-game/Assets/Prefabs/Bosses/)
- `Boss_OrcWarlord.prefab`, `Boss_ForgeMaster.prefab`, `Boss_CorruptedArchmage.prefab`, `Boss_Dragon.prefab`

### Create (Tests)
- `EditMode/Merge/MergeChainAllPathsTest.cs`
- `EditMode/Gacha/GachaDistributionTest.cs` (10⁵ rolls)
- `EditMode/Boss/BossPhaseTransitionTest.cs` (10 seed × 4 boss)
- `EditMode/Orchestrator/CancelledCacheTest.cs`
- `PlayMode/Integration/BossEncounterTest.cs`
- `PlayMode/Integration/FullRunFixtureTest.cs` (wave 50 with all subsystems)

### Create (packages/shared/)
- `packages/shared/src/testing/gacha-distribution.test.ts` (TS side of cross-engine check)
- `packages/shared/src/testing/replay-fixtures/seed-002-gacha-stack.json` (ungate)
- `packages/shared/src/testing/replay-fixtures/seed-003-boss-wave-10.json` (ungate)
- `packages/shared/src/testing/replay-fixtures/seed-004-merge-chain-full.json` (ungate)

### Modify
- `Assets/Scripts/Systems/Orchestrator/CoreOrchestrator.cs` — fill merge/gacha/upgrade stubs
- `Assets/Scripts/Systems/Units/BossPhaseTracker.cs` — driven by BossAIBase now
- `Assets/Scripts/Core/Events/GameEvents.cs` — add/verify boss phase events (OnBossPhaseChange, OnBossWarning)

---

## Tasks

### Task 1: Agent consultations

**Files:**
- Create: `docs/unity-migration/phase-4-design-decisions.md`

- [ ] **Step 1**: Game Designer — gacha acceptance math, pity policy confirmation, roguelike card pool weight review.
- [ ] **Step 2**: Unity Architect — BossAI hierarchy pattern, UpgradeCard SO shape, cancelled-cache composition.
- [ ] **Step 3**: Level Designer — boss encounter pacing, enrage timing, wave tempo.
- [ ] **Step 4**: Unity Shader Graph Artist — tint + invuln ring shader design.
- [ ] **Step 5**: Consolidate. If any recommendation contradicts Tasks 3–7 below, revise.
- [ ] **Step 6**: Commit `docs(phase-4): design decisions (gacha math, boss AI, shaders)`.

### Task 2: `MergeSystem` port + all-paths test

**Files:**
- `Assets/Scripts/Systems/Merge/MergeSystem.cs`
- `Tests/EditMode/Merge/MergeChainAllPathsTest.cs`

- [ ] **Step 1**: Port `resolveMerge` from `packages/shared/src/constants/towers.ts` → `MergeSystem.Resolve(input1, input2, RngState)` static. Port `MERGE_CHAIN` via `TowerCatalogSO.GetMergeOutput(family, tier)`.
- [ ] **Step 2**: Write EditMode test `MergeChainAllPathsTest.cs` — enumerate all 4×4 same-family-same-tier combinations + hybrid paths (2) + ultimate (1). Assert each resolves to expected output per spec `MERGE_CHAIN`. Assert missing paths fail fast.
- [ ] **Step 3**: Commit `feat(unity-game): MergeSystem + all-paths parity test`.

### Task 3: `GachaSystem` port + 10⁵ distribution test

**Files:**
- `Assets/Scripts/Systems/Gacha/GachaSystem.cs`
- `Tests/EditMode/Gacha/GachaDistributionTest.cs`
- `packages/shared/src/testing/gacha-distribution.test.ts`

- [ ] **Step 1**: Port `GachaSystem` from Phaser. API: `DrawT2(rng, modifiers) → TowerDefSO`, `DrawT3`, `DrawT4`. Modifiers include `tier_odds_up` (+50%p stacking ceiling).
- [ ] **Step 2**: TS side — write `gacha-distribution.test.ts` (10⁵ rolls with seed 42), χ² test for T1–T5 distribution. Write golden file `packages/shared/src/testing/fixtures/gacha-seed-42-100k.json`.
- [ ] **Step 3**: C# side — `GachaDistributionTest.cs` (10⁵ rolls with seed 42), assert within ±0.5%p of expected weights AND within ±0.1%p of TS golden (confirming LCG byte-identical).
- [ ] **Step 4**: Seed-002 fixture (`gacha-stack`) ungated — runs 10-round gacha with roguelike `tier_odds_up` stacking up to +50%p. Verify output sequence matches TS ref within fixture tolerance.
- [ ] **Step 5**: Commit `feat(unity-game): GachaSystem + 10⁵ distribution test + cross-engine parity`.

### Task 4: `UpgradeCardSystem` + overlay + cancelled-cache

**Files:**
- `Assets/Scripts/Systems/Upgrade/UpgradeCardSystem.cs`
- `Assets/Scripts/Systems/Upgrade/UpgradeCardOverlay.cs`
- `Assets/UI/Documents/UpgradePickOverlay.uxml` (minimal styling)
- `Assets/Scripts/Systems/Orchestrator/CoreOrchestrator.cs` (fill merge/gacha/upgrade + cancelled-cache)
- `Tests/EditMode/Orchestrator/CancelledCacheTest.cs`
- `Tests/PlayMode/Integration/UpgradePickFlowTest.cs`

- [ ] **Step 1**: Write `UpgradeCardSystem.cs`. API: `OfferThree(rng, modifiers) → UpgradeCardSO[3]`, `Apply(card)`, `Reroll(rng) → UpgradeCardSO[3]`. Weights from `UpgradeCardCatalogSO`.
- [ ] **Step 2**: Port cancelled-cache from Phaser `CoreOrchestrator` — if user dismisses a summon reveal without accepting, cache the draw and replay next click. Same for gacha.
- [ ] **Step 3**: Write `UpgradeCardOverlay.uxml` minimal — 3 cards + reroll button. Polish is Phase 5; for Phase 4 this just needs to be test-driveable via event-name identifiers.
- [ ] **Step 4**: Write `UpgradeCardOverlay.cs` — subscribes to `OnUpgradeChoiceReady`, renders cards, dispatches `OnUpgradeChosen(cardId)` or `OnUpgradeReroll`.
- [ ] **Step 5**: EditMode `CancelledCacheTest.cs` — dispatch draw → cancel → next draw returns cached. Also for gacha.
- [ ] **Step 6**: PlayMode `UpgradePickFlowTest.cs` — force-complete a boss wave, verify overlay appears, simulate card pick via direct system call, verify buff applied.
- [ ] **Step 7**: Commit `feat(unity-game): UpgradeCardSystem + cancelled-cache + minimal overlay`.

### Task 5: `BossAIBase` + 4 concrete boss AIs

**Files:**
- `Assets/Scripts/Systems/Boss/BossAIBase.cs`
- `Assets/Scripts/Systems/Boss/{OrcWarlord,ForgeMaster,CorruptedArchmage,Dragon}AI.cs`
- `Assets/Scripts/Systems/Boss/BossContextBuilder.cs` (fill Phase 3 stub)
- `Assets/Scripts/Systems/Units/BossPhaseTracker.cs` (wire to BossAIBase)
- `Assets/Prefabs/Bosses/*.prefab` (4)
- `Tests/EditMode/Boss/BossPhaseTransitionTest.cs`

- [ ] **Step 1**: Write `BossAIBase.cs` abstract. State machine: `Intro → Phase1 → PhaseTransition (invuln 500ms) → Phase2 → PhaseTransition → Phase3 (enrage) → Death`. HP thresholds 50% / 25%. Exposes `OnPhaseChange` event.
- [ ] **Step 2**: Port per-boss concrete AIs from Phaser (look at current Phaser boss logic in `packages/phaser-game/src/systems/units/`). Match attack cadences, enrage multipliers, phase-specific CC resistances.
- [ ] **Step 3**: `BossContextBuilder` produces per-tick `BossContext` used by AI `Decide()`.
- [ ] **Step 4**: Create 4 boss prefabs with correct SpriteRenderer + BossAI component + BossAIBase-derived class + BossPhaseTracker wired.
- [ ] **Step 5**: EditMode test `BossPhaseTransitionTest.cs` — for each of 4 bosses × 10 seeds, spawn boss, damage to 51% HP, verify no transition; damage to 49%, verify transition + invuln window. Repeat for 25%. Timing tolerance ±500ms per spec.
- [ ] **Step 6**: Commit `feat(unity-game): BossAI hierarchy + 4 boss AIs + phase transition tests`.

### Task 6: Boss VFX shaders

**Files:**
- `Assets/Shaders/BossTint.shadergraph`
- `Assets/Shaders/BossInvulnRing.shadergraph`
- `Assets/Prefabs/VFX/BossInvulnRing.prefab`

- [ ] **Step 1**: Create `BossTint.shadergraph` in URP 2D — simple Sprite-Lit shader with a tint color property driven via `MaterialPropertyBlock` from `BossAIBase`.
- [ ] **Step 2**: Create `BossInvulnRing.shadergraph` — expanding ring alpha pulse, drawn over boss during 500ms invuln. Duration-driven.
- [ ] **Step 3**: Hook BossAIBase phase-transition event to trigger both.
- [ ] **Step 4**: PlayMode visual test (manual — record a 5s gif of a boss phase-transition for phase-4-vfx-evidence.md).
- [ ] **Step 5**: Draw call delta check: with boss present, total DC ≤60 (Technical Artist budget from Task 1).
- [ ] **Step 6**: Commit `feat(unity-game): BossTint + BossInvulnRing Shader Graph assets`.

### Task 7: Fixture ungating + full-run integration test

**Files:**
- Update: `seed-002-gacha-stack.json`, `seed-003-boss-wave-10.json`, `seed-004-merge-chain-full.json` (remove `phase4_dependent` flag)
- `Tests/PlayMode/Integration/FullRunFixtureTest.cs`
- `Tests/PlayMode/Integration/BossEncounterTest.cs`

- [ ] **Step 1**: Update the 3 phase-4-dependent fixtures with expected metrics now that subsystems are live. Include boss phase-change timestamps in expected data for seed-003.
- [ ] **Step 2**: `FullRunFixtureTest.cs` — PlayMode: load fixture, run full 50 waves under autostart + scripted builds (merge + gacha events scripted), assert final state matches Phaser reference within parity thresholds.
- [ ] **Step 3**: `BossEncounterTest.cs` — force-spawn each of 4 bosses in isolation, verify full phase cycle + death event.
- [ ] **Step 4**: Run `unity-parity-gate.yml` CI — all 10 fixtures green now.
- [ ] **Step 5**: Commit `feat(unity-game): Phase 4 full-run integration + ungated 10-fixture parity gate`.

## Exit gate verification

From spec Phase 4 row:
- [ ] Phase-4-supported replay fixtures reproducible (Task 7 integration)
- [ ] Gacha ±0.5%p over 10⁵ rolls (Task 3)
- [ ] Boss phase transitions verified (Task 5 EditMode + Task 7 PlayMode)
- [ ] Phase-4-supported replay fixtures green on CI; continue/tutorial fixtures remain skipped (Task 7 Step 4)

## Self-review

**Spec coverage (Phase 4 deliverables):**
- `MergeSystem` → Task 2
- `GachaSystem` → Task 3
- `UpgradeCardSystem` → Task 4
- `BossAI/{Orc,Forge,CorruptedArchmage,Dragon}` → Task 5
- cancelled-cache 포팅 → Task 4 Step 2
- 10만 롤 분포 테스트 → Task 3

**Risks engaged:**
- R6 (drift) — fixtures 002–004 cover the three newly-live stochastic subsystems.

**Deferred to Phase 5:**
- Overlay polishing (UpgradePickOverlay in particular — Phase 4 version is test-driveable but visually sparse).
- BossWarningOverlay (spec puts this in Phase 5 UI suite; Phase 4 fires the event but doesn't render the overlay).

**Deferred to Phase 6:**
- Real AdService integration for roguelike reroll (Phase 4 uses MockAdService direct call).

**Unknowns Task 1 resolves:**
- Whether gacha pity exists (current Phaser has none — confirm with Game Designer).
- Hierarchical vs flat boss AI state machine (Unity Architect decision).
- Shader Graph vs code shader for tint (Shader Graph Artist decision based on URP 2D compatibility).
