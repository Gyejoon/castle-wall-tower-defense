# Unity Migration Phase 6 — Save, Audio, BM, Sentry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** Four semi-independent subsystems in one phase. Each gets its own task cluster. The shared theme is "external world integration" — browser localStorage, Web Audio, ad network, Sentry telemetry — all via the 4-boundary `.jslib` bridge (AdService / Sentry / URL params / localStorage). Task 1 kicks off with Game Audio Engineer consultation since audio has the most surface area and the highest risk (R4 iOS AudioContext).

**Goal:** Unity runtime persists save data, plays BGM and SFX, integrates the mocked AdService for "이어서 하기" reward flow, and reports errors to Sentry with `web-unity` environment tag. Save v8 (Phaser) users migrate to v9 (Unity) with zero progress loss across a 100-payload fuzz corpus.

**Architecture:** `SaveRepository` (pure C#) + `SaveMigratorV8ToV9` port Phaser's save schema. `bridge.jslib` expands with 4 boundary functions: `gldLocalStorageGet(key) → string`, `gldLocalStorageSet(key, value)`, `gldShowRewardedAd()`, `gldSentryReport(payload)`. Audio: `AudioMixer` 3-group (master / bgm / sfx) with exposed volume. `BgmService` loads BGM Addressables group, fades on scene transition. `SfxService` uses a pooled `AudioSource` pool + pre-baked .wav files (Node-baked in Phase 1-asset pipeline — recheck or produce here). `WebGLAudioUnlocker.cs` handles iOS AudioContext via `bridge.js` + visibilitychange retry. Sentry: `io.sentry.unity` package with shared DSN, `environment: web-unity`.

**Tech Stack:** Unity 6 LTS · WebGL `.jslib` · Unity AudioMixer · Addressables · `io.sentry.unity` · bun/TypeScript fuzzer · NUnit.

---

## Scope boundary

**In:**
- `SaveDataV9.cs` schema + `SaveMigratorV8ToV9.cs` converter + `SaveRepository.cs` read/write
- `bridge.jslib` expanded: localStorage get/set, rewarded ad, sentry report, URL params (URL params may already exist from Phase 2 `UrlParamRouter`)
- Save Migration Fuzzer (`save-migration-fuzz.yml` CI) — 100 synthetic v8 payloads
- `SfxService.cs` + `BgmService.cs` + `AudioMixer.mixer` with 3 groups + `WebGLAudioUnlocker.cs`
- Procedural SFX pre-baked .wav integration (24 SFX)
- BGM (Gates of the Waning Moon) Addressables group + load
- `IAdService` interface + `MockAdService` + `WebGLBridgeAdService` (jslib-backed)
- `AdServiceContractTest.cs` (PlayMode) + `AudioSmokeTest.cs`
- `io.sentry.unity` package install + config + DSN
- Intentional warning on first boot to verify Sentry wiring
- `save-migration-fuzz.yml` CI workflow (required from this phase onward)

**Out:**
- Real ad network SDK (R3 scope — Unity bundle stays stub here)
- Server sync (R3 scope)
- LiveOps (R3 scope)
- Supabase session sharing (R10 risk; still Phaser-side in Phase 6; Phase 8 decision)

## Dependencies

- Phase 5 merged: UI overlays exist with "이어서 하기" button hook.
- Phase 1: SOs include config (e.g., SFX id list in `DesignTokensSO` or a new `SfxConfigSO`).
- Phase 3: `DeterministicRng`, RunState exist.
- Phase 0a: `bridge.js` exists (expanded here).

## Pre-plan agent consultations

1. **Game Audio Engineer** — `AudioMixer` group structure, BGM fade curve, pre-baked vs runtime synthesis tradeoff (plan commits to pre-baked per spec — confirm), mobile WebGL audio latency budget, duck-during-dialogue policy (none in GLD currently, but reserve hook).
2. **Unity Architect** — `SaveRepository` SO pattern (singleton MB vs plain class), `IAdService` DI, cancelled-cache save persistence.
3. **Unity Editor Tool Developer** — Sentry config SO, scripted DSN injection from env var at build time.

---

## File Structure

### Create (packages/unity-game/Assets/Scripts/Core/Save/)
- `SaveDataV9.cs` — [Serializable] fields mirror Phaser v8 + Phase 3/4 additions
- `SaveMigratorV8ToV9.cs` — static `static SaveDataV9 FromV8(v8Json)`
- `SaveRepository.cs` — Get/Set via bridge, auto-upgrade v8→v9 on load

### Create (packages/unity-game/Assets/Scripts/Core/Bridge/)
- `bridge.jslib` (Unity plugin format, sits in `Assets/Plugins/WebGL/bridge.jslib`)
- `BridgeInterop.cs` — `[DllImport("__Internal")]` declarations + C# wrapper API

### Create (packages/unity-game/Assets/Scripts/Audio/)
- `AudioService.cs` (base)
- `BgmService.cs`
- `SfxService.cs`
- `WebGLAudioUnlocker.cs`
- `Assets/Audio/AudioMixer.mixer` — 3 groups (master / bgm / sfx) with exposed volume params

### Create (packages/unity-game/Assets/Scripts/Core/Services/)
- `IAdService.cs`
- `MockAdService.cs`
- `WebGLBridgeAdService.cs`

### Create (packages/unity-game/Assets/Scripts/Core/Telemetry/)
- `SentryBootstrap.cs` — activates Sentry at boot
- `SentryConfigSO.cs` — DSN, environment, release name

### Create (packages/unity-game/Assets/Editor/)
- `SentryDsnInjector.cs` — reads env var `SENTRY_DSN` at build time, writes into `SentryConfigSO`

### Create (.github/workflows/)
- `save-migration-fuzz.yml` — required

### Create (scripts/)
- `scripts/save-fuzz-corpus.ts` — generates 100 synthetic v8 payloads
- `scripts/save-fuzz-corpus.test.ts`

### Create (Tests)
- `EditMode/Save/SaveMigratorV8ToV9Tests.cs`
- `PlayMode/Integration/AdServiceContractTest.cs`
- `PlayMode/Integration/AudioSmokeTest.cs`
- `PlayMode/Integration/SentryBootstrapTest.cs`
- `EditMode/Save/SaveFuzzCorpusTest.cs` (loads JSON from scripts/save-fuzz-corpus output, iterates all 100)

### Modify
- `packages/unity-game/WebGLTemplates/GLDMobilePortrait/bridge.js` — add the 4 boundary functions referenced by `bridge.jslib`
- `packages/unity-game/Packages/manifest.json` — add `io.sentry.unity`
- `Assets/Scripts/UI/Controllers/GameOverScreenController.cs` — wire "이어서 하기" to `IAdService`
- `Assets/Scripts/Core/Events/GameEvents.cs` — add `OnAdRewardedGranted`, `OnSaveLoaded`, `OnSaveMigrated`, `OnAudioUnlocked`

---

## Tasks

### Task 1: Agent consultations

**Files:**
- Create: `docs/unity-migration/phase-6-design-decisions.md`

- [ ] **Step 1**: Game Audio Engineer — AudioMixer, BGM fade, latency budget, ducking policy.
- [ ] **Step 2**: Unity Architect — SaveRepository shape, IAdService DI pattern.
- [ ] **Step 3**: Unity Editor Tool Developer — SentryConfigSO, DSN build-time injection.
- [ ] **Step 4**: Consolidate. Revise subsequent tasks if any recommendation contradicts.
- [ ] **Step 5**: Commit `docs(phase-6): design decisions (audio, save, ad, sentry)`.

### Task 2: `bridge.jslib` — 4 boundary functions

**Files:**
- Create: `Assets/Plugins/WebGL/bridge.jslib`
- Create: `Assets/Scripts/Core/Bridge/BridgeInterop.cs`
- Modify: `WebGLTemplates/GLDMobilePortrait/bridge.js`

- [ ] **Step 1**: Write `bridge.jslib` (Unity jslib format, mergeInto UnityLibrary). Functions: `gldLocalStorageGet`, `gldLocalStorageSet`, `gldShowRewardedAd`, `gldSentryReport`.
- [ ] **Step 2**: Write `BridgeInterop.cs` — `[DllImport("__Internal")]` declarations matching jslib names, plus Editor-mode fallbacks (using `File.ReadAllText`/`PlayerPrefs` for editor-testing).
- [ ] **Step 3**: Modify `bridge.js` to export the implementation functions called by jslib (e.g., `window.__gldBridge.localStorageGet(key)`).
- [ ] **Step 4**: EditMode test `BridgeInteropEditorTest.cs` — set/get via editor fallback, assert roundtrip.
- [ ] **Step 5**: PlayMode (WebGL build only) test — deferred to Task 10 E2E smoke.
- [ ] **Step 6**: Commit `feat(unity-game): bridge.jslib + BridgeInterop (localStorage + ad + sentry)`.

### Task 3: `SaveDataV9` + `SaveMigratorV8ToV9`

**Files:**
- `Assets/Scripts/Core/Save/SaveDataV9.cs`
- `Assets/Scripts/Core/Save/SaveMigratorV8ToV9.cs`
- `Assets/Scripts/Core/Save/SaveRepository.cs`
- `Tests/EditMode/Save/SaveMigratorV8ToV9Tests.cs`

- [ ] **Step 1**: Write `SaveDataV9.cs` — [Serializable]. Fields: `schemaVersion=9`, `metaProgress` (globalAtkPct, family perks, unlockedContent), `collection`, `profile`, `deck`, `lastRunState` (optional). Mirror Phaser v8 schema exactly, plus any Phase 3/4 Unity additions.
- [ ] **Step 2**: Write `SaveMigratorV8ToV9.cs` — `static SaveDataV9 FromV8(string v8Json)`. Field-by-field mapping with explicit renames (if any). Fail-loud on unrecognized fields.
- [ ] **Step 3**: Write `SaveRepository.cs` — `Load() → SaveDataV9`, `Save(data)`. On Load: try v9 key `gld-save-v9`; if absent, try v8 key `gld-save-data`, migrate, store v9 (keep v8 30 days for rollback). Uses `BridgeInterop` for localStorage.
- [ ] **Step 4**: EditMode tests: valid v8 → v9 round-trip (10 samples per spec), missing fields → defaults, corrupt JSON → null + warning log, v9 already present → direct load.
- [ ] **Step 5**: Wire SaveRepository into GameSceneController boot + pause-exit auto-save.
- [ ] **Step 6**: Commit `feat(unity-game): SaveDataV9 + SaveMigratorV8ToV9 + SaveRepository`.

### Task 4: Save Fuzz Corpus + CI gate

**Files:**
- `scripts/save-fuzz-corpus.ts`
- `scripts/save-fuzz-corpus.test.ts`
- `Tests/EditMode/Save/SaveFuzzCorpusTest.cs`
- `.github/workflows/save-migration-fuzz.yml`

- [ ] **Step 1**: Write `scripts/save-fuzz-corpus.ts` — generates 100 synthetic v8 payloads covering: boundary values (energy=0, energy=200), null optional fields, max deck sizes, extreme metaProgress values, intentionally-out-of-range but parseable data.
- [ ] **Step 2**: Write Vitest for the generator — deterministic (seed 42), always emits exactly 100, schema valid.
- [ ] **Step 3**: Commit generator + corpus JSONL to `packages/shared/src/testing/fixtures/save-fuzz-corpus-v8.jsonl`.
- [ ] **Step 4**: Write `SaveFuzzCorpusTest.cs` — loads corpus, runs each through `SaveMigratorV8ToV9.FromV8`, asserts invariants: `energy ∈ [0, 200]`, all towers' `tier ∈ [1, 6]`, `globalAtkPct >= 0`, `deck size ≤ MAX_DECK`, no progress loss vs v8 original.
- [ ] **Step 5**: Write `save-migration-fuzz.yml` — triggers PR (save-touching) + weekly + manual dispatch. Runs the EditMode test. Failure → fuzz-failures/$SHA/*.json artifact.
- [ ] **Step 6**: Commit `ci(save): migration fuzzer (100 payload corpus) + required status`.

### Task 5: AudioMixer + SfxService + BgmService

**Files:**
- `Assets/Audio/AudioMixer.mixer`
- `Assets/Scripts/Audio/{AudioService,BgmService,SfxService}.cs`
- `Tests/PlayMode/Integration/AudioSmokeTest.cs`

- [ ] **Step 1**: Create `AudioMixer.mixer` with 3 groups: `Master`, `BGM`, `SFX`. Expose volume params `masterVolume`, `bgmVolume`, `sfxVolume` for runtime control.
- [ ] **Step 2**: Write `SfxService.cs` — manages `AudioSource` pool (16 sources). `Play(id, volume)` picks a free source, fetches clip from `Assets/Audio/SFX/{id}.wav` (Addressable load), plays on `SFX` group. Clip references per-id registered via `SfxConfigSO` or direct Addressables key.
- [ ] **Step 3**: Write `BgmService.cs` — loads the BGM clip via Addressables `bgm` label, plays on `BGM` group with fade-in. Track current BGM for fade-out/crossfade.
- [ ] **Step 4**: PlayMode `AudioSmokeTest.cs` — BGM play → `AudioSource.isPlaying == true`. SFX play → transient isPlaying + correct output group. Pause → volume fades to 0.
- [ ] **Step 5**: Commit `feat(unity-game): AudioMixer + SfxService + BgmService`.

### Task 6: `WebGLAudioUnlocker` (R4 risk mitigation)

**Files:**
- `Assets/Scripts/Audio/WebGLAudioUnlocker.cs`
- Modify: `WebGLTemplates/GLDMobilePortrait/bridge.js` (first-touch unlock hook — may already exist from Phase 0a — confirm)

- [ ] **Step 1**: Write `WebGLAudioUnlocker.cs`. On `Awake`: set `AudioListener.volume = 0` to suppress pre-unlock audio. Subscribe via BridgeInterop to first-touch event; on fire, call `AudioListener.volume = 1` and emit `OnAudioUnlocked`.
- [ ] **Step 2**: Confirm `bridge.js` has `armAudioUnlock` from Phase 0a. Ensure it also resolves a promise that jslib can await. If needed, extend jslib `gldAudioIsUnlocked() → bool`.
- [ ] **Step 3**: Add visibilitychange retry — if page becomes visible again and AudioContext is suspended, retry resume.
- [ ] **Step 4**: PlayMode test in WebGL build: simulate pointerdown via jslib bridge, verify `OnAudioUnlocked` fires and `AudioContext.state === 'running'`.
- [ ] **Step 5**: Commit `feat(unity-game): WebGLAudioUnlocker with visibilitychange retry`.

### Task 7: `IAdService` + Mock + WebGLBridge implementation

**Files:**
- `Assets/Scripts/Core/Services/IAdService.cs`
- `Assets/Scripts/Core/Services/MockAdService.cs`
- `Assets/Scripts/Core/Services/WebGLBridgeAdService.cs`
- `Tests/PlayMode/Integration/AdServiceContractTest.cs`
- Modify: `Assets/Scripts/UI/Controllers/GameOverScreenController.cs`

- [ ] **Step 1**: Write `IAdService.cs` — API: `ShowRewardedAsync() → Task<AdOutcome>` where `AdOutcome ∈ {Rewarded, Skipped, Error}`.
- [ ] **Step 2**: Write `MockAdService.cs` — returns `Rewarded` deterministically, once-per-run enforced via in-memory counter.
- [ ] **Step 3**: Write `WebGLBridgeAdService.cs` — calls jslib `gldShowRewardedAd()`, awaits promise that resolves with outcome. Editor falls back to `MockAdService`.
- [ ] **Step 4**: Modify `GameOverScreenController.cs` — "이어서 하기" button calls `IAdService.ShowRewardedAsync`. On `Rewarded`, restore HP + continue run. On other outcomes, stay in defeat screen.
- [ ] **Step 5**: `AdServiceContractTest.cs` — verify once-per-run constraint with `MockAdService`, verify `WebGLBridgeAdService` dispatches correctly under injected JS mock.
- [ ] **Step 6**: Commit `feat(unity-game): IAdService + MockAdService + WebGLBridgeAdService`.

### Task 8: Sentry integration

**Files:**
- Modify: `Packages/manifest.json` (add `io.sentry.unity` latest stable)
- `Assets/Scripts/Core/Telemetry/SentryBootstrap.cs`
- `Assets/Scripts/Core/Telemetry/SentryConfigSO.cs`
- `Assets/Editor/SentryDsnInjector.cs`
- `Tests/PlayMode/Integration/SentryBootstrapTest.cs`

- [ ] **Step 1**: Install `io.sentry.unity` via Package Manager. Confirm import compiles.
- [ ] **Step 2**: Write `SentryConfigSO.cs` — fields: `dsn`, `environment` (default `web-unity`), `releaseName` (defaults to `unity-$SHA`), `tracesSampleRate`.
- [ ] **Step 3**: Write `SentryBootstrap.cs` — on Boot scene `Awake`, reads `SentryConfigSO`, configures Sentry SDK with the DSN. Includes `engine: unity` tag to enable dedup vs Phaser.
- [ ] **Step 4**: Write Editor `SentryDsnInjector.cs` — reads `SENTRY_DSN` env var at build time, writes into a build-time-generated `SentryConfigSO` (don't commit DSN). CI sets env via GitHub secret.
- [ ] **Step 5**: Wire boot-time intentional `Sentry.CaptureMessage("unity-boot-ok", SentryLevel.Info)` so the first build smoke confirms Sentry receives events.
- [ ] **Step 6**: `SentryBootstrapTest.cs` — verifies Sentry SDK is initialized with correct environment/release after Bootstrap.
- [ ] **Step 7**: Confirm `unity-build.yml` passes `SENTRY_DSN` env var into Unity build step.
- [ ] **Step 8**: Commit `feat(unity-game): io.sentry.unity integration with web-unity environment`.

### Task 9: Meta progression persistence wiring

**Files:**
- Modify: `Assets/Scripts/UI/Controllers/LobbyController.cs`, `MetaForgeController.cs`
- Modify: `Assets/Scripts/Core/Events/GameEvents.cs`

- [ ] **Step 1**: `LobbyController` — on enter, call `SaveRepository.Load()` → hydrate lobby view with metaProgress values. No more mock data (still mock for collection — deferred to R3 if requires server).
- [ ] **Step 2**: `MetaForgeController` — meta perk purchase buttons call a local mutation then `SaveRepository.Save()`.
- [ ] **Step 3**: Boot flow: if `Load()` succeeds with a v8→v9 migration, fire `OnSaveMigrated` toast.
- [ ] **Step 4**: PlayMode test `SavePersistenceFlowTest.cs` — simulate purchase, save, kill scene, relaunch, confirm purchase persisted.
- [ ] **Step 5**: Commit `feat(unity-game): meta progression persistence via SaveRepository`.

### Task 10: E2E smoke + exit gate

**Files:**
- None new; verification.

- [ ] **Step 1**: Full build + deploy, open iOS Safari, run full cycle: lobby with persisted meta → game → boss defeat with "이어서 하기" → save flush on visibility change → close tab → reopen → persistence verified → Sentry dashboard shows `unity-$SHA` release received → audio played on tap.
- [ ] **Step 2**: Verify `save-migration-fuzz.yml` green on CI.
- [ ] **Step 3**: Capture evidence in `docs/unity-migration/phase-6-e2e-evidence.md` (screenshots, Sentry event id, audio latency measurements).
- [ ] **Step 4**: Commit `chore(phase-6): E2E smoke + evidence`.

## Exit gate verification

From spec Phase 6 row:
- [ ] v8 user progress loss = 0 across fuzz corpus (Task 4)
- [ ] iOS/Android BGM+SFX normal (Tasks 5, 6, 10)
- [ ] "이어서 하기" 1회/런 enforced (Task 7)
- [ ] Sentry web-unity session received (Task 8, 10)

## Self-review

**Spec coverage (Phase 6 deliverables):**
- `SaveSystem/SaveMigratorV8ToV9` → Task 3
- `bridge.jslib` localStorage → Task 2
- `SfxService`/`BgmService`/`WebGLAudioUnlocker` → Tasks 5, 6
- `IAdService`/`MockAdService`/`WebGLBridgeAdService` → Task 7
- `sentry-unity` 설정 → Task 8

**Risks engaged:**
- R4 (iOS AudioContext) — Task 6.
- R10 (Supabase session sharing) — flagged as deferred (still Phaser-side).

**Procedural SFX assumption:** Plan assumes SFX are pre-baked .wav files committed to repo under `Assets/Audio/SFX/`. If Phase 1 asset pipeline did not bake them, add a sub-task to Task 5 to run the Node pre-bake script.

**BGM license:** Spec blocker 2 confirms Gates of the Waning Moon redistribution OK. Include the LICENSE attribution snippet in `Assets/Audio/BGM/README.md`.
