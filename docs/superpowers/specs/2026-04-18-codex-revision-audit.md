# Codex Refactor Audit Report
**Date:** 2026-04-18 | **Status:** Ready for Phase 1 refactor

## A. Tower ID References to Delete

### plasma
- `packages/shared/src/constants/towers.ts:18` — tower def
- `packages/shared/src/constants/meta.ts:117` — DEFAULT_STARTER_IDS
- `packages/phaser-game/tests/MergeSystem.test.ts` — test fixtures (multiple)
- `packages/phaser-game/tests/SummonPoolSystem.test.ts` — test fixtures
- `packages/phaser-game/tests/towerGradeTexture.test.ts` — test
- `packages/phaser-game/tests/PhaseAOrchestrator.test.ts` — test
- `packages/phaser-game/tests/TowerSystemCombat.test.ts` — test
- `packages/phaser-game/src/scenes/Game.ts` — likely summon pool
- `packages/phaser-game/src/audio/SoundGenerator.ts` — tower sound refs
- `packages/shared/tests/summonPool.test.ts` — pool test
- `packages/shared/tests/deckBuilder.test.ts` — deck test
- `packages/shared/tests/combatPower.test.ts` — combat test
- `packages/shared/src/constants/deck.ts` — deck constants
- `packages/web-shell/src/stores/__tests__/metaStore.test.ts` — meta test
- `packages/web-shell/src/stores/__tests__/metaStore-migration.test.ts` — migration test
- `scripts/generate-assets/ai-config.ts` — AI generation config
- `scripts/generate-assets/generate-towers.ts` — tower generation
- `scripts/generate-assets/shared.ts` — shared generation utils

### dragon_nest
- `packages/shared/src/types/tower.ts:15` — FusionTowerType enum
- `packages/shared/src/constants/towers.ts` — tower def location unknown (read tower defs)
- `packages/phaser-game/tests/towerGradeTexture.test.ts` — test fixture
- `packages/phaser-game/tests/preloadAssets.test.ts:69` — asset preload test
- `packages/shared/tests/deckBuilder.test.ts` — deck builder test
- `packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx` — settings/debug menu
- `scripts/generate-assets/generate-towers.ts` — tower generation

## B. Tower `grade` Field References

### Type Definitions
- `packages/shared/src/types/save.ts:6` — TowerGrade type definition
- `packages/shared/src/types/save.ts:14-21` — OwnedTower interface (has grade field)
- `packages/shared/src/types/grade.ts` — Grade type alias + nextGrade/isMaxGrade functions
- `packages/phaser-game/src/systems/MergeSystem.ts:7` — TowerLocator.grade

### Constants & Helpers
- `packages/shared/src/constants/meta.ts:14-28` — GRADE_COST_MULT, enhancementCost()
- `packages/shared/src/constants/meta.ts:51-60` — GRADE_MAX_LEVEL, maxLevelForGrade()
- `packages/shared/src/constants/meta.ts:62-95` — PROMOTION_CONFIG (grade progression)
- `packages/shared/src/constants/meta.ts:97-102` — GRADE_BONUS multiplier table
- `packages/shared/src/constants/meta.ts:104-112` — getEffectiveStats()

### Game Logic
- `packages/phaser-game/src/systems/MergeSystem.ts:68-84` — grade equality check + nextGrade() call
- `packages/phaser-game/src/systems/TowerSystem.ts:185,640,1032,1054,1084` — grade overrides, merge output
- `packages/phaser-game/src/systems/PhaseAOrchestrator.ts:194,210,227,232` — grade in pending summon state
- `packages/phaser-game/src/systems/RandomSummonSystem.ts:51` — grade in draw
- `packages/web-shell/src/stores/meta/collectionSlice.ts:20,23,54` — maxLevelForGrade, enhancementCost, PROMOTION_CONFIG
- `packages/web-shell/src/stores/metaStore.ts:99-103` — grade-based condition checks for star rewards

### UI Components
- `packages/web-shell/src/components/lobby/tabs/collection/TowerGridCard.tsx:17,30,68` — GRADE_BORDER lookup, epic grade check
- `packages/web-shell/src/components/lobby/tabs/collection/TowerBottomSheet.tsx:102` — grade ?? 'normal' fallback
- `packages/web-shell/src/components/game/PhaseAHud.tsx:63-64,244` — grade in phase-a UI, display string

### Tests
- `packages/shared/tests/grade.test.ts` — nextGrade/isMaxGrade tests
- `packages/shared/tests/meta.test.ts:39-118` — enhancementCost, maxLevelForGrade tests
- Multiple test files use grade field in fixtures (TowerSystemPlacement, SummonPoolSystem, etc.)

## C. Scenario Mode References (worldId/stageId/missionId/achievementId/DeckDock/StageSelect/GimmickSystem)

### Core Types & Constants
- `packages/shared/src/types/stage.ts:15,29` — UnlockRule with worldId, StageDef.worldId
- `packages/shared/src/constants/stages.ts` — 24 stage defs with worldId (w1_forest, w2_forge, w3_tower, phase_a_lab, w4_catacombs, w5_fallen)
- `packages/shared/src/constants/worlds.ts` — 5 world defs (w1_forest → w5_fallen)
- `packages/shared/src/constants/waves.ts` — STAGE_WAVES keyed by stageId, getWavesForStage(), getTotalWavesForStage()
- `packages/shared/src/constants/stageInfo.ts` — stage metadata (unknown content, needs read)
- `packages/shared/src/types/save.ts:58,71-72` — stageStars: Record<string, StarRating>, stagesCleared array

### Game Systems
- `packages/phaser-game/src/scenes/Game.ts:278-323` — currentStageId, loadStageWaves, deckCards from stage
- `packages/phaser-game/src/scenes/StageDetailScene.ts` — entire scene dedicated to stage selection
- `packages/phaser-game/src/systems/world-gimmicks/` — registry.ts, W2FurnaceGimmick.test.ts, W3ArcaneGimmick.test.ts
- `packages/shared/src/systems/unlock-rules.ts` — isWorldUnlocked(), isStageUnlocked(), getNextUnlock()

### Persistence & Migration
- `packages/web-shell/src/stores/meta/persistence.ts:61-92` — MAP_TO_WORLD_STAGES (forest_gate, lava_fortress, storm_citadel)
- `packages/web-shell/src/stores/meta/persistence.ts:96-170` — SAVE_MIGRATIONS: v4→v5 migrates mapId→stageId

### HUD & Components
- `packages/web-shell/src/components/lobby/tabs/SettingsTab.tsx` — stage/world debug selectors

### Tests
- `packages/shared/tests/waves.test.ts` — stageId validation & fallback
- Multiple scene/stage tests reference stageId, worldId

## D. Map Reference Inventory

### Map Definitions
- `packages/shared/src/constants/maps.ts` — FOREST_GATE_PATH (starting point 3,0), blocks {3,0,4,17}, 18 rows
- Additional maps: LAVA_FORTRESS_*, STORM_CITADEL_*, phase_a_* (read full file for complete list)

### Map Registry
- `packages/shared/src/constants/maps.ts` — likely has MAP_REGISTRY or export list
- `packages/shared/tests/maps.test.ts` — map validation tests
- `packages/shared/src/constants/achievements.ts` — may reference specific maps
- `packages/shared/src/constants/stageInfo.ts` — stage-to-map mapping (not read yet)
- `packages/phaser-game/src/scenes/StageDetailScene.ts` — loads maps by stageId
- `packages/web-shell/src/stores/gameStore.ts` — map selection/loading

## E. Save Schema & Persistence

### Save Version
- **Current: SAVE_VERSION = 6** (packages/shared/src/types/save.ts:3)

### SaveData Structure
- version, profile (nickname/level/xp/gold/diamond/wins/losses), collection (OwnedTower[])
- progress (highestWave, stagesCleared, missions, stageStars, achievements)
- settings (bgmVolume, sfxVolume, screenShake, colorblindMode)
- selectedDeck (tower defId array)

### Migrations
- `packages/web-shell/src/stores/meta/persistence.ts:96+` — SAVE_MIGRATIONS object
- v5→v6: remove showDamageNumbers from settings (package/web-shell/src/stores/meta/persistence.ts:97-106)
- v4→v5: mapId→stageId + highestWave/stageStars migration (package/web-shell/src/stores/meta/persistence.ts:107-170)
- Earlier: v3→v4, v2→v3 likely present (read persistence.ts fully to see)

**Action:** When tier/family model ships, create v6→v7 migration in SAVE_MIGRATIONS

## F. EventBus & GameEventMap

### Location
- `packages/phaser-game/src/EventBus.ts:12-195` — GameEventMap type definition + TypedEventBus class

### Current Events with grade
- `tower-summoned:156` — {col, row, towerId, grade: TowerGrade}
- `towers-merged:158-164` — {col, row, towerId, fromGrade, toGrade: TowerGrade}
- `phase-a-summon-ready:179-182` — {towerId, grade: TowerGrade}
- `tower-selected:81-88` — {grade: TowerGrade}
- `upgrade-choice-ready:185-192` — array of {id, name, description, icon}

### Emission Sites
- `packages/phaser-game/src/scenes/Game.ts:343` — on('phase-a-summon-ready')
- `packages/phaser-game/src/scenes/Game.ts:438` — emit('upgrade-choice-ready')
- `packages/phaser-game/src/systems/PhaseAOrchestrator.ts:230` — emit('phase-a-summon-ready')
- `packages/phaser-game/src/systems/MergeSystem.ts` — emit output in caller sites
- `packages/phaser-game/src/scenes/Game.ts:853` — tower.grade in event payload
- `packages/phaser-game/src/systems/TowerSystem.ts` — grade in placement & merge events

### Tests
- `packages/phaser-game/tests/EventBus.types.test.ts` — type safety checks
- `packages/phaser-game/tests/PhaseAOrchestrator.test.ts:131` — 'phase-a-summon-ready' listener test

## G. bun:test Imports

**Status:** No legacy `from 'bun:test'` imports found. All tests use vitest (confirmed by absence in grep results).

## H. Energy System

### Constants
- `packages/shared/src/constants/energy.ts:1-4` — INITIAL_ENERGY=40, ENERGY_PER_SEC=1, ENERGY_CAP=100, ENERGY_PER_WAVE_CLEAR=5
- `packages/shared/src/data/summonPool.ts` — likely contains cost defaults
- `packages/phaser-game/src/scenes/Game.ts` — energy management in game loop

### Class/System
- Location unknown (not yet found; likely `packages/phaser-game/src/systems/EnergySystem.ts` or inline in Game.ts)

## I. MergeSystem State

- `packages/phaser-game/src/systems/MergeSystem.ts:1-87` — grade-based merge logic (from.grade, to.grade, nextGrade(from.grade))
- Reads: files at line 8 imports Grade, nextGrade from @gld/shared
- `packages/phaser-game/tests/MergeSystem.test.ts` — test file exists (not fully read)
- **Key:** MergeSystem.tryMerge() checks from.grade === to.grade, returns upgraded grade via nextGrade()

## J. Upgrade Cards & Roguelike

### Data File
- `packages/shared/src/data/upgradeCards.ts:1-82` — 6 upgrade cards (dmg_up, spd_up, range_up, kill_energy, energy_regen, summon_discount)
- pickRandomUpgrades(count, rng) function at line 73

### UI Component
- `packages/web-shell/src/components/game/UpgradePickOverlay.tsx:1-62` — renders choices, emits 'request-apply-upgrade'

### Trigger Logic
- `packages/phaser-game/src/scenes/Game.ts:438` — emit('upgrade-choice-ready', ...) — trigger location TBD
- Expected pattern: slotIndex % 10 === 0 for boss/reward trigger (not confirmed in codebase yet)

## K. Tower Definitions Current State

### Count & Structure
- `packages/shared/src/constants/towers.ts:3-64` — BASE_TOWERS (4): archer, plasma, emp, shield (tier=1)
- Line 66+: RARE_TOWERS (4): twin_archer, disruptor, nova_cannon, fortress (tier=2)
- File likely continues with heroic (tier=3), legendary (tier=4), god (tier=5) towers
- **Total towers: likely ~20-25** (TowerDef[] arrays concatenated as ALL_TOWERS in shared/index.ts)

### Current Field Shape (TowerDef)
- id: string
- name: string
- type: TowerType | FusionTowerType
- tier: number (1–5, mapped to TowerTier)
- stats: {damage, range, attackSpeed, special?, projectileSpeed?}
- cost: number
- element: ElementType
- isPremium: boolean
- color: string (hex)
- shape: 'diamond'|'circle'|'hexagon'|'shield'|'star'

**Missing:** No `grade` field in TowerDef (only in OwnedTower); tier is already numeric (1–5, not string enum).

---

## Summary of Refactor Touchpoints

| Category | File Count | Complexity |
|----------|-----------|-----------|
| A. plasma/dragon_nest removal | ~19 files | Medium (test fixtures + tower defs) |
| B. grade → tier/family migration | ~25 files | **High** (persisted, tested, ui, events) |
| C. Scenario mode purge | ~30 files | **Very High** (stages, worlds, gimmicks, unlock rules) |
| D. Map registry | ~5 files | Low (ref only in tests + stage loading) |
| E. Save migration | 1 file | Medium (add v6→v7 migration) |
| F. EventBus refactor | 1 file | Medium (update GameEventMap payloads) |
| G. bun:test | 0 files | N/A (clean) |
| H. Energy system | 2 files | Low (constants only, logic in Game.ts) |
| I. MergeSystem | 2 files | Medium (grade → tier/family logic) |
| J. Upgrade cards | 3 files | Low (data + UI, logic TBD) |
| K. Tower defs | 1 file | Low (inventory only, no changes needed) |

**Estimated scope:** ~70 files across 11 categories. **Recommended phases:** 1. Grade→tier/family + save v7, 2. Scenario purge (stages/worlds/gimmicks), 3. Tower ID removal, 4. Upgrade trigger logic.
