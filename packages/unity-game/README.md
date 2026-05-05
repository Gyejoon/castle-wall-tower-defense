# @gld/unity-game — Unity 2D WebGL port (Phase 0 bootstrap)

Unity 6 LTS (URP 2D + UI Toolkit + Addressables) port of Grid Line Defense. Hosted alongside the Phaser runtime — ships to `/unity/` on Vercel while `/` keeps serving the Phaser+React build.

## Status

**Unity WebGL preview**: `Build/WebGL/` contains the committed preview snapshot used by Vercel. `scripts/merge-build.ts` copies it into `packages/web-shell/dist/unity/`, so every Vercel Preview deployment exposes the Unity runtime at `/unity`.

**Phase 0b (user handoff)**: See [`docs/unity-migration/phase-0b-runbook.md`](../../docs/unity-migration/phase-0b-runbook.md) for local Unity install, `UNITY_LICENSE` secret setup, first scene authoring, and first GameCI build.

## Opening in Unity

Requires **Unity 6 LTS (6000.0.x or newer 6000.x LTS)**. Via Unity Hub:

1. Open Unity Hub → Add → select `packages/unity-game/` directory.
2. Unity Hub prompts to install 6000.0.x LTS if missing — accept.
3. First open populates `Library/`, `Temp/`, `UserSettings/` (all gitignored), and `ProjectSettings/` (tracked — commit after first open).
4. Package Manager will fetch UPM deps from `Packages/manifest.json`.

## UPM packages (`Packages/manifest.json`)

- `com.unity.feature.2d` — 2D Renderer, Sprite, Tilemap, Pixel Perfect, SpriteShape, Animation.
- `com.unity.render-pipelines.universal` — URP 2D Renderer.
- `com.unity.addressables` — asset delivery groups (preload / optional / boss / bgm in Phase 1).
- `com.unity.inputsystem` — Enhanced Touch for WebGL mobile.
- `com.unity.ugui` — TextMeshPro + PanelSettings runtime.
- `com.unity.test-framework` — EditMode + PlayMode tests.

Versions pinned in `Packages/manifest.json`. Unity may auto-resolve to newer compatible versions; if so, commit the updated `manifest.json` and `packages-lock.json`.

## Asmdef layout

```
Assets/Scripts/
  Core/          GLD.Core         — events, save, bridge, service locator, common utils
  Systems/       GLD.Systems      — grid, pathfinding, towers, units, waves, energy, merge, gacha, orchestrator (depends on Core)
  SceneRuntime/  GLD.SceneRuntime — scene controller, input, render, runtime mediators (depends on Core + Systems)
  UI/            GLD.UI           — UI Toolkit controllers + primitives (depends on Core only)
  Data/          GLD.Data         — ScriptableObject catalogs + Editor importers (depends on Core)
```

Dependency rule: **strictly one-directional**. `Systems` never references `UI`. Enforced by `.asmdef` `references` arrays.

## WebGL build

Local (requires Unity installed):

```bash
cd packages/unity-game
Unity -batchmode -nographics -projectPath . -executeMethod BuildScripts.Editor.WebGLBuilder.Build -logFile -
```

Output goes to `Build/WebGL/` then `scripts/merge-build.ts` copies it to `packages/web-shell/dist/unity/`.

## Post-build routing

`vercel.json` rewrites:
- `/unity/:path*` → `/unity/index.html` (Unity handles deep links)
- `/(.*)` → `/index.html` (Phaser SPA fallback)

Physical files (`/unity/Build/*.wasm`, etc.) bypass rewrites and are served directly. Brotli files are served with explicit Vercel headers:

- `/unity/Build/WebGL.data.br` → `Content-Encoding: br`, `application/octet-stream`
- `/unity/Build/WebGL.framework.js.br` → `Content-Encoding: br`, `application/javascript`
- `/unity/Build/WebGL.wasm.br` → `Content-Encoding: br`, `application/wasm`
