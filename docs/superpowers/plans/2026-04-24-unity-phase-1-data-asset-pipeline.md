# Unity Migration Phase 1 — Data & Asset Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** Tasks 1–2 are agent-consultation / Unity-side scaffolding that require running Unity Editor and calling the Unity Architect and Unity Editor Tool Developer agents. Their output determines concrete SO schemas and file paths. Tasks 3+ assume that output; if the agent recommends a materially different structure, revise Tasks 3+ before executing.

**Goal:** Make the `@gld/shared` TypeScript data (towers, units, waves, energy, gacha, merge, boss, family-upgrade, scaling, elements, maps, meta, design tokens) loadable inside Unity as strongly-typed ScriptableObjects, and make the ~234 committed PNGs loadable via Sprite Atlas V2 + Addressables — with automated round-trip tests proving no data drift.

**Architecture:** Bun script (`scripts/export-shared-to-json.ts`) emits deterministic JSON snapshots of all shared constants/data modules to `packages/unity-game/Assets/Resources/GameData/*.json`. Unity Editor script (`Editor/JsonToSOImporter.cs`) reads those JSONs and generates/updates SO assets under `Assets/Data/`. PNG sprites are copied from `packages/web-shell/public/assets/**` into `Assets/Art/Sprites/**`, given consistent import settings via `SpriteImportPostprocessor.cs` (PPU 64, Point filter, no mips, sRGB), and grouped into 10 Sprite Atlas V2 assets. `AddressablesKeyAssigner.cs` reads `packages/shared/src/assets/manifest.ts` (exported to JSON by the same export script) and labels every asset with the matching group/label. `ValidateDatabase.cs` is the Editor integrity check.

**Tech Stack:** Unity 6 LTS · URP 2D · Addressables 2.x · Sprite Atlas V2 · Bun/TypeScript · Vitest · Unity Editor scripting.

---

## Scope boundary

**In:**
- `scripts/export-shared-to-json.ts` + round-trip Vitest
- 13 ScriptableObject type definitions under `Assets/Scripts/Data/` (Tower, Unit, Wave, Map, Upgrade, SummonPool, Gacha, Boss, Energy, Scaling, FamilyUpgrade, ElementMatchup, DesignTokens)
- `Editor/JsonToSOImporter.cs` (menu `GLD/Import Shared Data`)
- `Editor/SpriteImportPostprocessor.cs`
- `Editor/AddressablesKeyAssigner.cs`
- `Editor/ValidateDatabase.cs`
- 10 Sprite Atlas V2 assets + Addressables Groups (Preload / Optional_UI / Boss / BGM / Default)
- Galmuri11 + Press Start 2P TMP SDF font generation (KS X 1001 완성형 ~2,350 glyphs)
- `tokens.uss` auto-generator (DesignTokensSO → Assets/UI/Styles/tokens.uss)
- CI wiring: `bun run build:unity-json` in pre-Unity-build step

**Out:**
- No runtime consumers yet (Phase 2 PoC onward uses these SOs)
- No gameplay C# (Phase 2+)
- UI Toolkit components (Phase 5)
- Remote Addressables hosting (Phase 7 decision)

## Dependencies

- Phase 0a merged: `packages/unity-game/` scaffold, asmdefs, WebGLTemplate, BuildScripts.
- Phase 0b complete: Unity 6 LTS installed, ProjectSettings committed, Boot+Root scenes exist.

## Pre-plan agent consultations

Before any implementation, invoke the following agents **with the full migration spec as context** and document their recommendations in a section added to `docs/unity-migration/phase-1-design-decisions.md` (created in Task 1).

1. **Unity Architect** — SO schema design for 13 catalogs. Key questions:
   - Single `GameDatabase` SO holding references, or flat `Resources/GameData/` folder with individual SO assets?
   - How to represent tier chains (enum + lookup vs inline `TowerDefSO[] mergeOutputs`)?
   - How to keep SO round-trippable to JSON for Phase 3 parity harness?
   - Anti-pattern watchlist: avoid God SO, avoid runtime mutation of SO fields.
2. **Unity Editor Tool Developer** — importer + postprocessor patterns.
   - `AssetPostprocessor` vs explicit menu-driven import — plan uses menu (explicit) for Phase 1 stability.
   - How to make importer idempotent and diff-friendly (stable GUIDs, stable field order).
   - How to fail-loud on schema mismatch instead of silently dropping fields.
3. **Technical Artist** — atlas/texture strategy.
   - Atlas grouping: by category (Towers/Units/UI) vs by load phase (Preload/Boss/Optional)?
   - PPU 64 import settings confirmation.
   - Padding 4px+ and Extrude Edges On for pixel-perfect safety.

---

## File Structure

### Create (scripts / packages/shared)
- `scripts/export-shared-to-json.ts` — bun CLI that emits deterministic JSON snapshots
- `packages/shared/src/constants/__tests__/unity-export-parity.test.ts` — round-trip test
- `packages/shared/src/testing/deterministic-json.ts` — stable-stringify helper shared between script and tests

### Create (packages/unity-game/Assets/Scripts/Data/)
- `TowerCatalogSO.cs`, `TowerDefSO.cs`
- `UnitCatalogSO.cs`, `UnitDefSO.cs`
- `WaveCatalogSO.cs`, `WaveDefSO.cs`
- `MapLayoutSO.cs`
- `UpgradeCardCatalogSO.cs`, `UpgradeCardSO.cs`
- `SummonPoolSO.cs`
- `GachaConfigSO.cs`
- `BossConfigSO.cs`
- `EnergyConfigSO.cs`
- `ScalingConfigSO.cs`
- `FamilyUpgradeConfigSO.cs`
- `ElementMatchupSO.cs`
- `DesignTokensSO.cs`
- `GameDatabase.cs` (aggregate root, held in `Assets/Resources/GameBootstrap.asset` as a single SO reference hub)

### Create (packages/unity-game/Assets/Scripts/Data/Editor/)
- `JsonToSOImporter.cs` — menu + static API
- `SpriteImportPostprocessor.cs`
- `AddressablesKeyAssigner.cs`
- `ValidateDatabase.cs` (+ menu `GLD/Validate Database`)
- `TokensUssGenerator.cs` (DesignTokensSO → tokens.uss)
- `FontSdfGenerator.cs` (hook to invoke TMP font asset creator for Galmuri11/Press Start 2P)
- `GLD.Data.Editor.asmdef`

### Create (packages/unity-game/Assets/)
- `Assets/Data/Towers/*.asset` — one TowerDefSO per 19 towers
- `Assets/Data/Units/*.asset` — one UnitDefSO per 5 unit families
- `Assets/Data/Waves/*.asset` — one WaveDefSO per wave
- `Assets/Data/Upgrades/*.asset` — UpgradeCardSO per 6 cards
- `Assets/Data/Bosses/*.asset` — BossConfigSO per boss
- `Assets/Data/SummonPools/*.asset`
- Singletons: `GachaConfigSO.asset`, `EnergyConfigSO.asset`, `ScalingConfigSO.asset`, `FamilyUpgradeConfigSO.asset`, `ElementMatchupSO.asset`, `DesignTokensSO.asset`, `GameDatabase.asset`
- `Assets/Resources/GameData/*.json` — staged JSON (gitignored — regenerated from TS)
- `Assets/Art/Sprites/**/*.png` — copied from web-shell public assets
- `Assets/Art/Atlases/*.spriteatlasv2` — 10 atlases
- `Assets/Art/Fonts/Galmuri11-SDF.asset`, `PressStart2P-SDF.asset`
- `Assets/UI/Styles/tokens.uss` — auto-generated (gitignored; regenerated)
- `Assets/Addressables/Groups/` — AddressableAssetGroup assets for Preload / Optional_UI / Boss / BGM / Default

### Modify
- `packages/shared/package.json` — add `"build:unity-json": "bun run ../../scripts/export-shared-to-json.ts"`
- root `package.json` — add `"build:unity-json": "bun run --filter @gld/shared build:unity-json"`
- `.gitignore` — add `packages/unity-game/Assets/Resources/GameData/*.json` and `packages/unity-game/Assets/UI/Styles/tokens.uss` (regenerated)
- `.github/workflows/unity-build.yml` — add `bun run build:unity-json` step before GameCI step

---

## Tasks

### Task 1: Agent consultation + design-decisions doc

**Files:**
- Create: `docs/unity-migration/phase-1-design-decisions.md`

- [ ] **Step 1**: Invoke Unity Architect agent with the full migration spec (`docs/superpowers/specs/2026-04-24-unity-migration-design.md`). Ask: SO schema for 13 catalogs, single-GameDatabase vs flat-folder, JSON round-trip strategy. Target under 400 lines of agent output.
- [ ] **Step 2**: Invoke Unity Editor Tool Developer agent. Ask: `AssetPostprocessor` vs menu importer, idempotent import, fail-loud schema mismatch.
- [ ] **Step 3**: Invoke Technical Artist agent. Ask: 10-atlas grouping, padding/extrude, PPU 64, WebGL compression choice (DXT5 vs ASTC fallback).
- [ ] **Step 4**: Compile results into `docs/unity-migration/phase-1-design-decisions.md`. Sections: "SO schema decisions", "Importer pattern", "Atlas strategy", "Open questions deferred to Phase 2". Include each agent's concrete recommendation verbatim, then the chosen option with 1-sentence rationale.
- [ ] **Step 5**: If any recommendation contradicts a task below, revise that task before proceeding. Log revision in design-decisions doc.
- [ ] **Step 6**: Commit `docs(phase-1): design decisions from Unity Architect / Editor Tool Developer / Technical Artist`.

### Task 2: `scripts/export-shared-to-json.ts` with round-trip test (TDD)

**Files:**
- Create: `scripts/export-shared-to-json.ts`
- Create: `packages/shared/src/constants/__tests__/unity-export-parity.test.ts`
- Create: `packages/shared/src/testing/deterministic-json.ts`

- [ ] **Step 1**: Write `deterministic-json.ts` — exports `stableStringify(value)` that sorts object keys recursively and normalizes numbers (`-0` → `0`, no scientific notation for integers).
- [ ] **Step 2**: Write the failing test `unity-export-parity.test.ts`. Covers:
  - `TOWERS` array → JSON → re-parsed → deep-equal original
  - `WAVES` (50 entries) same
  - `GACHA_CONFIG` / `ENERGY_CONFIG` / `MERGE_CHAIN` / `SCALING_CONFIG` / `FAMILY_UPGRADE` / `ELEMENT_MATCHUP` / `BOSS_CONFIG` / `MAPS.main_long` / `UPGRADE_CARDS` / `SUMMON_POOLS` / `UNITS` / `DESIGN_TOKENS` all round-trip
  - JSON field order is stable across runs (hash the output; assert equality with committed fixture).
- [ ] **Step 3**: Run test, confirm all cases fail with "module './exporter' not found" or similar.
- [ ] **Step 4**: Write `scripts/export-shared-to-json.ts`. It imports every constants module, runs `stableStringify`, writes to `packages/unity-game/Assets/Resources/GameData/<name>.json`, and also writes a top-level `index.json` listing all emitted files with SHA-256 hashes.
- [ ] **Step 5**: Run test. All pass.
- [ ] **Step 6**: Run `bun run build:unity-json` end-to-end. Check `ls packages/unity-game/Assets/Resources/GameData/` lists 13 JSON files + `index.json`.
- [ ] **Step 7**: Add `build:unity-json` to `packages/shared/package.json` and root `package.json`. Add gitignore entry for `Assets/Resources/GameData/*.json`.
- [ ] **Step 8**: Commit `feat(scripts): export shared TS data to deterministic JSON for Unity import`.

### Task 3: SO type definitions (13 catalogs)

**Files:**
- Create: 17 files under `packages/unity-game/Assets/Scripts/Data/` (see File Structure)

- [ ] **Step 1**: Write `TowerDefSO.cs` + `TowerCatalogSO.cs`. Fields mirror `shared/src/data/towers.ts` (`id`, `family`, `tier`, `damage`, `range`, `attackSpeed`, `projectileType`, `element`, `specials[]`, cost, etc.). Use `[CreateAssetMenu]`. `TowerCatalogSO` holds `TowerDefSO[] all` + O(1) dictionary built in `OnEnable`.
- [ ] **Step 2**: Repeat for UnitDefSO/UnitCatalogSO, WaveDefSO/WaveCatalogSO.
- [ ] **Step 3**: Write singletons: `GachaConfigSO`, `EnergyConfigSO`, `ScalingConfigSO`, `FamilyUpgradeConfigSO`, `ElementMatchupSO`, `MapLayoutSO`, `BossConfigSO`, `SummonPoolSO`, `UpgradeCardSO`+`UpgradeCardCatalogSO`, `DesignTokensSO`.
- [ ] **Step 4**: Write `GameDatabase.cs` — aggregate SO with references to all catalogs/singletons. Stored at `Assets/Resources/GameBootstrap.asset` (wait — per Phase 0 runbook, GameBootstrap is a broader asset; decide in Task 1 whether GameDatabase is a separate asset referenced by GameBootstrap. Default: separate, `Assets/Data/GameDatabase.asset`).
- [ ] **Step 5**: Add EditMode test stub `Tests/EditMode/Data/SOShapeTests.cs` that loads each SO via `AssetDatabase`, asserts required fields are non-null/non-empty, asserts all enum fields have valid values.
- [ ] **Step 6**: Commit `feat(unity-game): 13 ScriptableObject schemas for shared data catalogs`.

### Task 4: `JsonToSOImporter.cs` with fail-loud schema validation

**Files:**
- Create: `packages/unity-game/Assets/Scripts/Data/Editor/GLD.Data.Editor.asmdef`
- Create: `packages/unity-game/Assets/Scripts/Data/Editor/JsonToSOImporter.cs`
- Create: `packages/unity-game/Assets/Scripts/Data/Editor/ValidateDatabase.cs`

- [ ] **Step 1**: Write `GLD.Data.Editor.asmdef`. Editor-only, references `GLD.Core` and `GLD.Data`.
- [ ] **Step 2**: Write `JsonToSOImporter.cs`. Menu `GLD/Import Shared Data` reads `Assets/Resources/GameData/index.json`, for each listed JSON loads or creates the matching SO asset at its canonical path, populates fields using `JsonUtility` (or `Newtonsoft.Json` if `JsonUtility` can't handle nested unions — check in Task 1). Log "Imported N towers, M waves, ..." to console.
- [ ] **Step 3**: Fail-loud rules. If a JSON field has no matching SO field → throw with field name. If a SO enum value is missing in JSON → throw. If tier chain references a missing tower id → throw.
- [ ] **Step 4**: Write `ValidateDatabase.cs`. Menu `GLD/Validate Database`. Checks: `MERGE_CHAIN` tier references all resolve in `TowerCatalogSO`; `SummonPool` tower ids all exist; boss ids in `WaveCatalogSO` resolve in `BossConfigSO`; unit ids in waves resolve in `UnitCatalogSO`.
- [ ] **Step 5**: Write EditMode test `Tests/EditMode/Editor/JsonImportRoundTripTests.cs` that runs `JsonToSOImporter.ImportAll` in a temp project copy, then serializes each SO back to JSON and deep-equals the original JSON.
- [ ] **Step 6**: Commit `feat(unity-game): JsonToSOImporter + ValidateDatabase with fail-loud schema checks`.

### Task 5: PNG import + SpriteImportPostprocessor + 10 Sprite Atlas V2 assets

**Files:**
- Create: `packages/unity-game/Assets/Scripts/Data/Editor/SpriteImportPostprocessor.cs`
- Create: 10 `*.spriteatlasv2` under `Assets/Art/Atlases/`
- Create: copy tree `packages/unity-game/Assets/Art/Sprites/**/*.png` from `packages/web-shell/public/assets/**`

- [ ] **Step 1**: Write a one-shot copy script `scripts/copy-assets-to-unity.ts` that mirrors `packages/web-shell/public/assets/**/*.png` into `packages/unity-game/Assets/Art/Sprites/**` (preserve subfolder structure; WebP skipped). Run once, commit the copied PNGs.
- [ ] **Step 2**: Write `SpriteImportPostprocessor.cs`. On any PNG in `Assets/Art/Sprites/**`: set PPU 64, filterMode Point, mipmaps off, sRGB on, WebGL compression DXT5 High Quality (or per Phase 1 design-decisions Task 1 output), wrapMode Clamp.
- [ ] **Step 3**: Trigger re-import (`AssetDatabase.ImportAsset` or right-click > Reimport). Verify in Inspector.
- [ ] **Step 4**: Create 10 Sprite Atlas V2 assets (`Towers`, `Units_Core`, `Units_Boss`, `Projectiles`, `VFX`, `UI_HUD`, `UI_Lobby`, `CastleWall_SpawnHut`, `Tiles`, `Icons`). Via Editor UI: Assets → Create → 2D → Sprite Atlas V2. Configure: Padding 4, Extrude Edges On, Allow Rotation Off, Tight Packing On, Compression None (or per Technical Artist recommendation), Include in Build Off, Master atlas.
- [ ] **Step 5**: Drag corresponding sprite folders into each atlas's `Objects for Packing`.
- [ ] **Step 6**: EditMode test `Tests/EditMode/Assets/AtlasBoundaryTest.cs`: for each atlas, pack and render each sprite; assert 1px border alpha = 0 around each sprite (no bleed).
- [ ] **Step 7**: Commit `feat(unity-game): sprite import + 10 Sprite Atlas V2 with boundary integrity tests`.

### Task 6: Addressables groups + `AddressablesKeyAssigner.cs`

**Files:**
- Create: 5 AddressableAssetGroups under `Assets/Addressables/Groups/`
- Create: `packages/unity-game/Assets/Scripts/Data/Editor/AddressablesKeyAssigner.cs`

- [ ] **Step 1**: Open Window → Asset Management → Addressables → Groups. Create 5 groups: `Default` (Local built-in, no label), `Preload` (Local, label `preload`), `Optional_UI` (Local, label `optional`), `Boss` (Local, label `boss`), `BGM` (Local, label `bgm`).
- [ ] **Step 2**: Write `AddressablesKeyAssigner.cs`. Reads `packages/shared/src/assets/manifest.ts` (exported as JSON by `export-shared-to-json.ts` in Task 2 — extend the exporter if not already covered). For each asset listed, assigns it to the matching group and sets its Addressable key to the canonical id.
- [ ] **Step 3**: Assign each of the 10 atlases, BGM mp3, font SDFs, and GameDatabase to their correct groups.
- [ ] **Step 4**: Editor test `Tests/EditMode/Addressables/ManifestParityTest.cs`: parse `manifest.ts` JSON, iterate, assert each declared key is present in Addressables settings with correct group. Missing or extra → fail.
- [ ] **Step 5**: Commit `feat(unity-game): Addressables groups + AddressablesKeyAssigner from shared manifest`.

### Task 7: TMP SDF fonts + Korean subset

**Files:**
- Create: `Assets/Art/Fonts/Galmuri11-SDF.asset`, `PressStart2P-SDF.asset`
- Create: `packages/unity-game/Assets/Scripts/Data/Editor/FontSdfGenerator.cs`
- Create: `packages/unity-game/Assets/Art/Fonts/ks-x-1001-2350.txt` (character subset list)

- [ ] **Step 1**: Generate KS X 1001 완성형 subset list (2,350 Hangul glyphs + ASCII + basic punctuation + game-specific symbols ⚡★●◆). Commit as `ks-x-1001-2350.txt`.
- [ ] **Step 2**: In Unity: Window → TextMeshPro → Font Asset Creator. Source = Galmuri11.ttf, Atlas Resolution 2048×2048, Character Set = Characters from File = `ks-x-1001-2350.txt`. Generate SDF, save to `Assets/Art/Fonts/Galmuri11-SDF.asset`. Repeat for Press Start 2P (ASCII only).
- [ ] **Step 3**: Write `FontSdfGenerator.cs` as a menu action (`GLD/Regenerate TMP Fonts`) that scripts the above so the generation is reproducible (stretch — may defer to Phase 5 if TMP Font Asset Creator lacks API surface).
- [ ] **Step 4**: Verify SDF atlas size <4MB for Galmuri11. If exceeded, fall back to tighter subset (most-common-1800).
- [ ] **Step 5**: Commit `feat(unity-game): TMP SDF fonts (Galmuri11 KS X 1001 + Press Start 2P ASCII)`.

### Task 8: `tokens.uss` generator from DesignTokensSO

**Files:**
- Create: `packages/unity-game/Assets/Scripts/Data/Editor/TokensUssGenerator.cs`
- Create: `Assets/UI/Styles/tokens.uss` (output, gitignored)

- [ ] **Step 1**: Write `TokensUssGenerator.cs`. Reads `DesignTokensSO.asset`, emits `:root { --color-accent: #c8a04a; --color-panel: #2a2010; ... --space-1: 4px; ... }` to `Assets/UI/Styles/tokens.uss`. Menu `GLD/Generate tokens.uss`. Also runs as a post-`JsonToSOImporter.ImportAll` hook.
- [ ] **Step 2**: Parity test `Tests/EditMode/UI/TokensUssParityTest.cs`: parse generated `tokens.uss`, compare to `DesignTokensSO` fields. Any mismatch → fail.
- [ ] **Step 3**: Verify a sample UXML loading `tokens.uss` can resolve `var(--color-accent)` in Editor preview.
- [ ] **Step 4**: Commit `feat(unity-game): DesignTokensSO → tokens.uss generator`.

### Task 9: CI wiring + exit gate verification

**Files:**
- Modify: `.github/workflows/unity-build.yml`
- Modify: `scripts/merge-build.ts` (no-op unless manifest changed)

- [ ] **Step 1**: Add a pre-build step to `unity-build.yml`: after bun install, run `bun run build:unity-json`. This ensures CI-generated Unity builds use fresh JSON regardless of commit state of `Assets/Resources/GameData/`.
- [ ] **Step 2**: Add an after-build step: extract and upload `build-size.json` (already partly in Phase 0 — refine to break out by Addressables group).
- [ ] **Step 3**: Run entire pipeline locally:
  ```bash
  bun run build:unity-json
  # open Unity, run GLD/Import Shared Data
  # open Unity, run GLD/Validate Database
  bunx vitest run packages/shared/src/constants/__tests__/unity-export-parity.test.ts
  # in Unity: run EditMode tests (Tests window > Run All EditMode Tests)
  ```
  All must pass.
- [ ] **Step 4**: Push PR. Confirm `unity-build.yml` green on CI.
- [ ] **Step 5**: Commit `chore(ci): pre-Unity-build hook for bun run build:unity-json`.

## Exit gate verification

From spec Phase 1 row:
- [ ] `bunx vitest run` for unity-export-parity passes green (Task 2 + 9)
- [ ] Editor menu `GLD/Import Shared Data` reports "Imported 19 towers, 5 units, 50 waves, 6 upgrade cards, ..." (Task 4)
- [ ] Atlas boundary EditMode test green (Task 5)
- [ ] Addressables manifest parity test green (Task 6)
- [ ] Galmuri11 SDF renders Korean text correctly in Editor preview (Task 7)
- [ ] `tokens.uss` parity test green (Task 8)

## Self-review

**Spec coverage:**
- SO catalog list from spec "Unity 프로젝트 디렉터리" → Task 3 (13 SOs)
- `JsonToSOImporter / AddressablesKeyAssigner / SpriteImportPostprocessor / ValidateDatabase` from spec Phase 1 deliverables → Tasks 4, 5, 6
- Atlas 10종 → Task 5
- Addressables Group table → Task 6
- Galmuri11 SDF (R5 risk mitigation via 완성형 subset) → Task 7
- `tokens.uss` 생성기 → Task 8
- Round-trip Vitest test → Task 2

**Open dependencies:**
- Task 1 agent consultations drive SO schema details. If Unity Architect recommends single-GameDatabase-SO vs flat-folder differently from this plan's assumption, revise Task 3.
- If Technical Artist recommends ASTC over DXT5 (iOS ASTC support), revise Task 5 Step 2.

**Not placeholders, but genuine design-stage decisions:** Tasks 3 and 5 list concrete file paths and import settings, but some specifics (e.g., whether to use `JsonUtility` or `Newtonsoft.Json` for nested union types) are flagged as Task 1 deliverables. This is honest sequencing: Unity-side JSON tooling has real tradeoffs only Unity Architect / Editor Tool Developer can surface.
