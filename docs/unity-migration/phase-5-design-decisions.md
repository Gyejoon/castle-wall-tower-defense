# Unity Migration Phase 5 Design Decisions

> Date: 2026-05-05
> Scope: UI/UX parity foundation for `packages/unity-game/`

## Consultation Summary

Codex applied the local `agency-unity-game-dev` skill and used the Unity Architect guidance directly. Separate Codex subagents were not spawned because this turn did not explicitly request parallel agents.

## Decisions

### RunState and Controller Decoupling

- `RunState` is a pure C# observable aggregate under `GLD.SceneRuntime`.
- Runtime systems continue to own gameplay logic. UI controllers read `RunState` and emit `GameEvents` requests; they do not hold direct references to `EnergySystem`, `WaveSystem`, `TowerSystem`, or `UnitSystem`.
- `GameSceneController` is the composition root for Phase 5. It constructs `RunState`, injects it into `GameStateManager`, and maps existing `GameEvents` updates into the state snapshot.
- UI controllers should receive dependencies by explicit `Bind(...)` calls or serialized `UIDocument` references from the composition root. They should not use `FindObjectOfType`, `GameObject.Find`, or singleton discovery.
- `RunState.OnChanged` is coarse-grained by design for Phase 5. Controllers can update their own labels from one snapshot. If redraw cost shows up in R11 profiling, add field-specific events without changing the controller dependency direction.

### TokensUssGenerator Expansion

- `DesignTokensSO` remains the Unity representation of shared design tokens.
- `TokensUssGenerator` should emit custom properties at `:root` and keep generated `tokens.uss` as a build artifact, not hand-authored UI styling.
- Phase 5 UI styles should import generated tokens and keep screen-specific USS in `hud.uss`, `overlays.uss`, and `lobby.uss`.

### UI Toolkit vs uGUI

- UI Toolkit remains the default for all Phase 5 overlays and screens.
- World-space combat labels and damage numbers stay outside this UI pass.
- If profiling shows high redraw cost, likely fallback candidates are boss HP/warning animation and transient toast effects, not the static top/bottom HUD.

### Korean Copy Baseline

- Use short command labels that match the current React surface: `소환`, `T2`, `T3`, `T4`, `메뉴`, `합성`, `이동`, `판매`, `재개`, `포기`, `다시 시작`.
- Tutorial text remains placeholder-only in Phase 5; full FTUE copy is Phase 7.
- Avoid long explanatory strings inside compact buttons.

## Implementation Order

1. Add `RunState` and tests.
2. Wire `GameSceneController`/`GameStateManager` to publish runtime state.
3. Expand tokens and DS primitives.
4. Replace IMGUI HUD with UI Toolkit overlays in batches.
