# Unity Migration Phase 5 — UI/UX Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** The 13 UXML documents + 6 DS primitives + lobby + meta forge are large surface area. Task 1 agent consultation on UIController/System decoupling and the `RunState.OnChanged` binding pattern is a critical structural decision. The `tokens.uss` generator from Phase 1 is the foundation; Phase 5 builds the full UI atop it.

**Goal:** All 13 overlays, the lobby screen, and MetaForge screen are fully functional in Unity using UI Toolkit. Unity alone can complete a full lobby → game → victory/defeat → lobby cycle without touching the Phaser build, and Playwright pair screenshots vs the Phaser version show visual parity within acceptable diff thresholds.

**Architecture:** Six DS primitives (`GLDButton`, `GLDCard`, `GLDBadge`, `GLDPanel`, `GLDOverlay`, `GLDSheet`) as `VisualElement` subclasses with `UxmlFactory`/`UxmlTraits`, matching React DS class names for USS reuse. All 13 overlays = UXML doc + `*Controller` C# component with `RunState` event subscription. Lobby and MetaForge are full scenes/subscenes with their own state. `DesignTokensSO → tokens.uss` regeneration is built into the CI pre-Unity step. PanelSettings: Scale With Screen Size 512×1152, Screen Match width, Sort Order 10 over the game camera. Adaptive UXML loading via Addressables `optional` label.

**Tech Stack:** Unity 6 LTS · UI Toolkit (UXML + USS) · Addressables · DOTween (subtle overlay transitions only) · TMP SDF · Playwright (visual regression).

---

## Scope boundary

**In:**
- 6 DS primitives (`GLDButton`, `GLDCard`, `GLDBadge`, `GLDPanel`, `GLDOverlay`, `GLDSheet`) as VisualElement classes
- 13 overlay UXML + controllers:
  1. `GameHud` (bottom action bar + top badges)
  2. `TopHud` (if separate from GameHud per current React structure)
  3. `TowerActionSheet` (merge/move/sell sheet)
  4. `SummonRevealOverlay`
  5. `UpgradePickOverlay` (polish Phase 4 minimal)
  6. `PauseModal`
  7. `BossHpBar`
  8. `BossWarningOverlay`
  9. `GameOverScreen`
  10. `ToastNotification`
  11. `TutorialOverlay` (placeholder; full FTUE is Phase 7)
  12. `Lobby`
  13. `MetaForge`
- `LobbyController.cs` + Lobby scene / screen
- `MetaForgeController.cs` + UI
- `RunState` observable pattern — HUD binding via `INotifyValueChanged` / custom change events
- Adaptive UXML loading: HUD / overlays via Addressables `optional` label (prefetched after game entry)
- Visual regression CI hooks (Playwright webkit + chromium, 13-overlay screenshot matrix, informational only)

**Out:**
- FTUE (full tutorial flow) → Phase 7
- Settings screen polish (basic version here)
- Credits / acknowledgements (out of scope)
- Save hooks from UI (Phase 6; Phase 5 reads from in-memory state)

## Dependencies

- Phase 4 merged: all runtime overlays have events to subscribe to; UpgradePickOverlay minimal exists.
- Phase 1: `tokens.uss` generator working.

## Pre-plan agent consultations

1. **Unity Architect** — UIController ↔ System decoupling. Specifically: `RunState` as pure C# with `OnChanged` events, subscribed by each overlay controller. Avoid having controllers `FindObjectOfType<X>()`. Propose injection method (ServiceLocator vs passed reference).
2. **Unity Editor Tool Developer** — `DesignTokensSO → USS` generator: how to extend Phase 1's `TokensUssGenerator.cs` to cover all token categories (palette, spacing, radius, motion, typography) and emit CSS custom properties at `:root`.
3. **Technical Artist** — UI Toolkit vs uGUI tradeoff review for hot elements (R11 — HUD frame drop). Identify any overlay that may need uGUI/WorldSpace TMP fallback.
4. **Narrative Designer** — Galmuri11 Korean text review for all overlay copy. Catch awkward translations of React copy in Korean.

---

## File Structure

### Create (packages/unity-game/Assets/Scripts/UI/Primitives/)
- `GLDButton.cs`
- `GLDCard.cs`
- `GLDBadge.cs`
- `GLDPanel.cs`
- `GLDOverlay.cs`
- `GLDSheet.cs`
- One shared `PrimitiveStyles.uss` importing generated `tokens.uss`

### Create (packages/unity-game/Assets/UI/Documents/) — 13 UXML
- `GameHud.uxml`, `TopHud.uxml` (or merged — decide in Task 1)
- `TowerActionSheet.uxml`
- `SummonRevealOverlay.uxml`
- `UpgradePickOverlay.uxml` (replace Phase 4 minimal)
- `PauseModal.uxml`
- `BossHpBar.uxml`
- `BossWarningOverlay.uxml`
- `GameOverScreen.uxml`
- `ToastNotification.uxml`
- `TutorialOverlay.uxml` (placeholder)
- `Lobby.uxml`
- `MetaForge.uxml`

### Create (packages/unity-game/Assets/UI/Styles/)
- `primitives.uss` (DS6 internals)
- `hud.uss`, `lobby.uss`, `overlays.uss` (per-screen styles)
- `tokens.uss` (generated, gitignored)

### Create (packages/unity-game/Assets/Scripts/UI/Controllers/) — 13
- `GameHudController.cs`, `TopHudController.cs` (or merged), `TowerActionSheetController.cs`, `SummonRevealOverlayController.cs`, `UpgradePickOverlayController.cs`, `PauseModalController.cs`, `BossHpBarController.cs`, `BossWarningOverlayController.cs`, `GameOverScreenController.cs`, `ToastNotificationController.cs`, `TutorialOverlayController.cs`, `LobbyController.cs`, `MetaForgeController.cs`

### Create (packages/unity-game/Assets/Scripts/SceneRuntime/)
- `RunState.cs` — observable pure C# state aggregate
- `UISystem.cs` — central UI controller instantiation + lifecycle (or one PanelSettings per active doc — decide in Task 1)

### Create (Tests)
- `PlayMode/UI/UIToolkitSmokeTest.cs` — 13 overlays × "open → button click → expected event fires" per overlay
- `Tools/visual-regression/` — Playwright setup for `/unity/?screen=lobby` etc

### Create (.github/workflows/)
- `visual-regression.yml` (new, informational)

### Modify
- `packages/unity-game/Assets/UI/Runtime/PanelSettings.asset` — updated to Scale With Screen Size 512×1152, Sort Order 10
- `Assets/Scripts/SceneRuntime/GameSceneController.cs` — wire full UI suite
- `Assets/Scripts/SceneRuntime/Slice2/*` — mark deprecated (kept for `?slice=poc` route for parity-testing only)
- `packages/unity-game/Assets/Scripts/Data/Editor/TokensUssGenerator.cs` — expand to all token categories
- `scripts/morning-briefing.ts` (Phase 3 added this) — include visual regression summary

---

## Tasks

### Task 1: Agent consultations

**Files:**
- Create: `docs/unity-migration/phase-5-design-decisions.md`

- [ ] **Step 1**: Unity Architect — `RunState` observable pattern, controller injection, avoid-FindObjectOfType.
- [ ] **Step 2**: Unity Editor Tool Developer — TokensUssGenerator expansion.
- [ ] **Step 3**: Technical Artist — uGUI fallback candidates review.
- [ ] **Step 4**: Narrative Designer — Korean copy audit for all overlay text.
- [ ] **Step 5**: Consolidate. Adjust following tasks per recommendations.
- [ ] **Step 6**: Commit `docs(phase-5): UI/UX design decisions`.

### Task 2: `RunState` observable + injection wiring

**Files:**
- `Assets/Scripts/SceneRuntime/RunState.cs`
- `Tests/EditMode/SceneRuntime/RunStateTests.cs`

- [ ] **Step 1**: Write `RunState.cs` — pure C#, holds `RunId`, `RunStatus`, `Energy`, `Lives`, `Wave`, `WavePhase`, `Countdown`, `SpeedMultiplier`, `BossHp`. `OnChanged` event fires whenever any field changes. Explicit setter API with `InvokeChanged()`.
- [ ] **Step 2**: EditMode tests — field set → OnChanged fires exactly once; no change → no fire.
- [ ] **Step 3**: Refactor Phase 3's `GameStateManager` to publish changes via `RunState` (don't duplicate state).
- [ ] **Step 4**: Commit `feat(unity-game): RunState observable aggregate`.

### Task 3: Expand `TokensUssGenerator` to all token categories

**Files:**
- Modify: `Assets/Scripts/Data/Editor/TokensUssGenerator.cs`
- Expand: `DesignTokensSO.cs` fields

- [ ] **Step 1**: Review Phaser `packages/web-shell/src/styles/tokens.ts` for the full token vocabulary (palette, spacing, radius, motion, typography, shadow approximation).
- [ ] **Step 2**: Extend `DesignTokensSO.cs` fields to cover all of them.
- [ ] **Step 3**: Extend `TokensUssGenerator.cs` to emit CSS custom props at `:root` for every token.
- [ ] **Step 4**: Phase 1 parity test expanded — every field in `DesignTokensSO` round-trips to tokens.uss.
- [ ] **Step 5**: Commit `feat(unity-game): TokensUssGenerator full token surface`.

### Task 4: Build 6 DS primitives

**Files:**
- `Assets/Scripts/UI/Primitives/GLD{Button,Card,Badge,Panel,Overlay,Sheet}.cs`
- `Assets/UI/Styles/primitives.uss`

- [ ] **Step 1**: For each primitive: VisualElement subclass + `UxmlFactory<GLDButton>` + `UxmlTraits`. USS class naming matches React: `.gld-btn`, `.gld-btn--primary`, `.gld-btn--tier-3`, `.gld-btn--element-fire`, etc.
- [ ] **Step 2**: `primitives.uss` — imports tokens.uss, defines base styles using custom props. Box-shadow → border-bottom + translate trick per spec (USS lacks box-shadow).
- [ ] **Step 3**: Test harness UXML `Assets/UI/Documents/_DebugPrimitivesGallery.uxml` showing all primitives in all variants. Used for manual visual review.
- [ ] **Step 4**: EditMode test `GLDPrimitivesTest.cs` — each primitive instantiates from UXML with traits applied correctly.
- [ ] **Step 5**: Commit `feat(unity-game): 6 DS primitives (GLDButton/Card/Badge/Panel/Overlay/Sheet)`.

### Task 5: Overlay batch 1 — HUD + TowerActionSheet + SummonReveal + UpgradePick + Pause (5 overlays)

**Files:**
- UXML + Controller for each

- [ ] **Step 1**: `GameHud.uxml` + `GameHudController.cs`. Bottom action bar: Summon + 3 gacha + Menu buttons. Top badges: energy / wave / HP. Subscribes `RunState.OnChanged` to update labels. Uses `GLDButton`, `GLDBadge`.
- [ ] **Step 2**: `TowerActionSheet.uxml` + controller — floating sheet near selected tower. Merge / Move / Sell buttons. Subscribes `OnTowerSelected` / `OnTowerDeselected`.
- [ ] **Step 3**: `SummonRevealOverlay.uxml` + controller — reveals summoned tower with tier/family badge. Subscribes `OnTowerSummoned`.
- [ ] **Step 4**: `UpgradePickOverlay.uxml` + controller — polish Phase 4 minimal. 3 cards + reroll button. DOTween entry animation (subtle slide-up).
- [ ] **Step 5**: `PauseModal.uxml` + controller — dim backdrop, Resume + Quit buttons. Subscribes `OnGameResumed`.
- [ ] **Step 6**: PlayMode test per overlay: open → button click → expected event/state change observed.
- [ ] **Step 7**: Commit `feat(unity-game): overlays 1/3 (HUD + sheet + summon + upgrade + pause)`.

### Task 6: Overlay batch 2 — Boss HP bar + Boss warning + Game over + Toast + Tutorial (5 overlays)

**Files:**
- UXML + Controller for each

- [ ] **Step 1**: `BossHpBar.uxml` + controller — top-center bar, tracks boss HP. Subscribes `OnBossHpUpdate`.
- [ ] **Step 2**: `BossWarningOverlay.uxml` + controller — pre-boss warning flash with countdown. Subscribes `OnBossWarning`.
- [ ] **Step 3**: `GameOverScreen.uxml` + controller — victory / defeat variants. "이어서 하기" button (AdService stub, wired Phase 6).
- [ ] **Step 4**: `ToastNotification.uxml` + controller — transient bottom-center toast. Queues messages. DOTween fade.
- [ ] **Step 5**: `TutorialOverlay.uxml` + controller — stub, Phase 7 extends. Just renders "Tutorial step N" with advance button if `?tutorial=1` URL param active.
- [ ] **Step 6**: PlayMode test per overlay.
- [ ] **Step 7**: Commit `feat(unity-game): overlays 2/3 (boss HP/warning + game over + toast + tutorial stub)`.

### Task 7: Lobby + MetaForge screens

**Files:**
- `Assets/UI/Documents/Lobby.uxml` + `LobbyController.cs`
- `Assets/UI/Documents/MetaForge.uxml` + `MetaForgeController.cs`
- `Assets/_Project/Scenes/Lobby.unity` (or additive subscene)

- [ ] **Step 1**: Port Lobby UI from Phaser+React `LobbyPage.tsx`. Sections: hero (title + enter game), profile (mock — Phase 6 wires real), collection (mock), meta forge entry. Subscribes no events (static; navigation triggers scene transition).
- [ ] **Step 2**: `LobbyController.cs` — Enter Game button → transitions to Root.unity (game scene).
- [ ] **Step 3**: Port MetaForge UI from React `metaProgressStore` consumers. Forge panel showing meta perks (globalAtkPct etc). "Upgrade" buttons stub-wire to metaProgressStore (full wiring Phase 6).
- [ ] **Step 4**: `MetaForgeController.cs` — reads mock meta state, renders perks.
- [ ] **Step 5**: PlayMode test `LobbyFlowTest.cs` — start at Lobby → click Enter Game → Root.unity loads → game systems initialize.
- [ ] **Step 6**: Commit `feat(unity-game): overlays 3/3 — Lobby + MetaForge + navigation`.

### Task 8: Visual regression CI (informational)

**Files:**
- `.github/workflows/visual-regression.yml`
- `tests/visual/baselines/*.png` (git-lfs)
- `tests/visual/playwright.config.ts` (if not present)

- [ ] **Step 1**: Write `visual-regression.yml`. Triggers: PR label `visual-regression`, nightly. Steps: build, deploy to preview or `bun run dev:unity-preview`, run Playwright webkit + chromium on a matrix of URLs (`/unity/?screen=lobby`, `/unity/?screen=hud-mid-wave`, `/unity/?screen=game-over`, etc.) with deterministic fixture seeds.
- [ ] **Step 2**: Add `?screen=…` URL param router entries invoking deterministic scene states (e.g., `?screen=game-over` loads Root scene, sets `RunState.RunStatus = Defeat`, skips gameplay).
- [ ] **Step 3**: Capture initial baselines, commit to `tests/visual/baselines/` via git-lfs.
- [ ] **Step 4**: Playwright compares via pixelmatch. Diff >5% → informational warning + 3-way artifact.
- [ ] **Step 5**: Commit `ci(visual): visual regression informational workflow`.

### Task 9: Exit gate integration

**Files:**
- None new; full-suite verification.

- [ ] **Step 1**: `bun run build:all` → `dev:unity-preview` → manually click through: Lobby → Enter Game → see HUD → place tower → see action sheet → pause → resume → boss warning → boss HP bar → game over → "Retry" → back to Lobby.
- [ ] **Step 2**: Run all PlayMode UI tests in CI.
- [ ] **Step 3**: Run visual regression workflow, confirm baselines stable.
- [ ] **Step 4**: `schedule.Execute` HUD profile: 60s run, UI Toolkit redraw count <100/frame target (R11 guard).
- [ ] **Step 5**: Commit `chore(phase-5): full UI/UX parity exit gate verification`.

## Exit gate verification

From spec Phase 5 row:
- [ ] Unity 단독 lobby → game → victory/defeat → lobby 왕복 (Task 7 + Task 9)
- [ ] Playwright 페어 스크린샷 — visual regression informational workflow green (Task 8 + Task 9)
- [ ] 13 UXML + Controllers 전부 구현 (Tasks 5, 6, 7)
- [ ] UI/Primitives/GLD* 6종 구현 (Task 4)

## Self-review

**Spec coverage (Phase 5 deliverables):**
- 13 UXML + Controllers → Tasks 5–7
- DS 프리미티브 6개 → Task 4
- `tokens.uss` generated → Task 3
- `LobbyController` / `MetaForgeController` → Task 7

**Risk engaged:**
- R11 (HUD frame drop) — Task 9 Step 4 measures.
- R5 (Galmuri11 quality) — Task 1 Narrative Designer review + visual regression screenshots catch illegible Korean.
- R3 (touch lag) — batch 1 overlays tested on emulated iOS in Task 9.

**Deferred to Phase 6:**
- GameOverScreen "이어서 하기" actually hits AdService.
- Lobby profile/collection real data (currently mock).

**Deferred to Phase 7:**
- TutorialOverlay full FTUE content.
- MetaForge real upgrade flow (if it requires persistence).

**Not in scope:**
- Settings screen beyond minimum (volume + language).
- Credits / acknowledgements screens.
