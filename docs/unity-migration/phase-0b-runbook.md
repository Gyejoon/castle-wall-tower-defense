# Phase 0b User Runbook — local Unity setup + first build

Phase 0a (Claude-side scaffold) is committed on `endurable-hurricane`. Phase 0b closes the phase by installing Unity locally, registering CI secrets, creating the first two scenes, and producing the first green GameCI build.

**Estimated time:** 60–90 min (most of it is Unity's first-open asset import).

**Prerequisites:**
- Repo cloned, on `endurable-hurricane` with Phase 0a commits applied.
- GitHub repo admin access (to register secrets).
- Vercel project linked to the GitHub repo.

---

## 1. Register GameCI secrets on GitHub

CI needs `UNITY_LICENSE` + `UNITY_EMAIL` + `UNITY_PASSWORD` to activate Unity headlessly. Personal license flow:

1. Follow [GameCI's activation guide](https://game.ci/docs/github/activation) to generate `Unity_v*.x.ulf` locally.
2. Base64-encode it: `base64 -i Unity_v*.x.ulf | pbcopy` (macOS).
3. GitHub → repo → Settings → Secrets and variables → Actions → **New repository secret**. Add three:
   - `UNITY_LICENSE` — paste the base64 payload.
   - `UNITY_EMAIL` — the Unity ID email.
   - `UNITY_PASSWORD` — the Unity ID password.

**Verify:** open Actions tab → manually run `Unity Build` workflow (workflow_dispatch). It will fail until Phase 0b step 4 lands scenes — that's expected. We only want to see GameCI check out the license successfully (look for `Activating Unity License` in logs).

---

## 2. Install Unity 6 LTS locally

1. Install [Unity Hub](https://unity.com/unity-hub).
2. In Unity Hub → Installs → **Install Editor** → pick the latest **6000.0.x LTS** → modules: WebGL Build Support, IL2CPP, iOS Build Support (optional).
3. In Unity Hub → Projects → **Open** → select `packages/unity-game/`.
4. Unity prompts about missing `ProjectSettings/` / `Assets/` — accept creating project structure.
5. First open runs 5–15 min of package import. Watch for errors in the console.

**Verify:** Unity opens the empty scene. Package Manager (Window → Package Manager) shows the list from `Packages/manifest.json`. `Assets/Scripts/`, `Assets/UI/`, `Assets/BuildScripts/` are visible in the Project tab.

**Commit generated files:**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git status packages/unity-game/ProjectSettings/ packages/unity-game/Packages/packages-lock.json packages/unity-game/Assets/**/*.meta
git add packages/unity-game/ProjectSettings packages/unity-game/Packages/packages-lock.json
git add packages/unity-game/Assets/Scripts packages/unity-game/Assets/UI packages/unity-game/Assets/BuildScripts
# add ONLY .meta files for existing committed sources (do not add Library/ or Temp/).
git commit -m "chore(unity-game): Unity 6 LTS 초기 생성 — ProjectSettings · .meta · packages-lock"
```

---

## 3. Set WebGL target + Pixel Perfect Camera defaults

In Unity Editor:

1. **File → Build Profiles** (Unity 6 renamed Build Settings) → switch platform to **Web** (WebGL). Wait for IL2CPP switch (5–10 min).
2. **Edit → Project Settings → Player → WebGL**: confirm
   - Template = `PROJECT:GLDMobilePortrait` (set automatically by `WebGLBuilder.cs` during build; just verify available in dropdown)
   - Compression Format = `Brotli`
   - Decompression Fallback = off
   - Memory Size = 256 MB
3. **Edit → Project Settings → Quality**: disable all but one quality level, rename to "WebGL", disable v-sync.
4. **Edit → Project Settings → Graphics**: Scriptable Render Pipeline Settings = URP asset (2D Renderer).

Commit:

```bash
git add packages/unity-game/ProjectSettings
git commit -m "chore(unity-game): WebGL 타겟 + URP 2D + Brotli 256MB 기본값"
```

---

## 4. Create Boot.unity + Root.unity + Phase0 label scene

In Unity Editor:

1. **File → New Scene → 2D (Built-in)** → Save As `Assets/_Project/Scenes/Boot.unity`. Leave empty (one Main Camera).
2. **File → New Scene → 2D (Built-in)** → Save As `Assets/_Project/Scenes/Root.unity`:
   - Add an empty GameObject named `Phase0Root`.
   - Add Component → `UI Document` (from `com.unity.ui`).
     - **Panel Settings**: click "New" → save as `Assets/UI/Runtime/PhaseZeroPanelSettings.asset`.
     - **Visual Tree Asset**: drag `Assets/UI/Documents/Phase0Label.uxml`.
   - Add Component → `GLDPhase0Label`.
   - In PanelSettings.asset: Scale Mode = `Scale With Screen Size`, Reference Resolution = `512 × 1152`, Screen Match Mode = `Match Width Or Height` with `Match = 0`.
   - On the UIDocument, under Style Sheets, add `Assets/UI/Styles/phase0.uss`.
3. **File → Build Profiles → Scene List** → add `Boot.unity` (index 0) and `Root.unity` (index 1).
4. Save all scenes and commit:

```bash
git add packages/unity-game/Assets/_Project/Scenes \
        packages/unity-game/Assets/UI/Runtime \
        packages/unity-game/ProjectSettings/EditorBuildSettings.asset
git commit -m "feat(unity-game): Phase 0 label 씬 (Boot · Root) + PanelSettings 512x1152"
```

---

## 5. First local build

```bash
cd packages/unity-game
# macOS Unity Hub 기본 경로 자동 탐색. 다른 위치면 UNITY_PATH 환경변수로 override.
UNITY="${UNITY_PATH:-/Applications/Unity/Hub/Editor/$(ls /Applications/Unity/Hub/Editor | sort | tail -1)/Unity.app/Contents/MacOS/Unity}"
"$UNITY" -batchmode -nographics -projectPath "$PWD" \
  -executeMethod GLD.BuildScripts.Editor.WebGLBuilder.Build -logFile -
```

Takes 15–30 min for IL2CPP first build. Look for `[WebGLBuilder] Build succeeded` in the log tail.

**Verify:** `ls packages/unity-game/Build/WebGL/` shows `Build/`, `StreamingAssets/`, `TemplateData/`, `index.html`.

**Merge + preview:**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
bun run build:all
bun run dev:unity-preview
# Open http://localhost:8080/unity/ in Safari on iOS simulator or real device.
```

Expected: Unity splash → `Unity Phase 0` label renders centered on the gold-on-brown background.

---

## 6. First CI green build

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git push origin endurable-hurricane
# Watch GitHub Actions → Unity Build workflow.
```

First cached build: ~40 min. Subsequent: 15–20 min. On success, the `unity-webgl-<SHA>` artifact is downloadable for 30 days.

---

## 7. Vercel preview verification

Push triggers Vercel preview deployment. Once the deploy finishes:

1. Open the preview URL → `/` loads Phaser build (unchanged).
2. Open `<preview>/unity/` → should serve the **placeholder** (Vercel doesn't run Unity; CI does). If Unity artifact bytes should ship to Vercel, set up Vercel Build Hooks that pull the latest GameCI artifact — **out of scope for Phase 0b**, tracked as an open question in the migration spec.

For Phase 0b, the exit gate is satisfied by:
- ✅ Local build produces `Unity Phase 0` label rendered in iOS Safari via `bun run dev:unity-preview`.
- ✅ CI green on `unity-build.yml`.
- ✅ Vercel preview still deploys (placeholder at `/unity/` is OK).

Real Unity bytes served by Vercel lands in Phase 0c (out of this Phase spec) or is addressed by Phase 8 rollout planning.

---

## Rollback

Phase 0 is additive — nothing in `packages/phaser-game/`, `packages/web-shell/`, or `packages/shared/` changes behaviour. To roll back entirely:

```bash
git revert <merge-commit-of-phase-0-PR>
```

Or to keep the scaffold but disable CI:

```bash
# Mark the workflow disabled — a PR touching only this line is low-risk.
gh workflow disable "Unity Build"
```
