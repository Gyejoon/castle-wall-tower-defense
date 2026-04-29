# Unity Migration Phase 0 Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land everything needed so that a user with Unity 6 LTS installed can open `packages/unity-game/`, build the WebGL target, and have it appear at `/unity/` on Vercel preview — without any further TypeScript/Node/CI/doc setup on their side.

**Architecture:** Add a new `packages/unity-game/` workspace sibling to `phaser-game` and `web-shell`. Phaser remains the primary bundle at `/`; Unity WebGL output lives at `/unity/` via a merge-build script that concatenates `packages/web-shell/dist/` with `packages/unity-game/Build/WebGL/` → `packages/web-shell/dist/unity/`. Missing Unity build is tolerated with a placeholder `unity/index.html` so Vercel deploys keep working during Phase 0a. Agent-usage rules (`AGENTS.md`, `.claude/agents/README.md`) are updated up front to scope Unity subagents appropriately once the Unity package exists.

**Tech Stack:** Unity 6 LTS (6000.0.x) · URP 2D · UI Toolkit · Addressables · GameCI (`game-ci/unity-builder@v4`) · bun scripts (TypeScript) · Vercel rewrites · Vitest.

---

## Scope boundary

This plan covers **Phase 0a only** — the Claude-executable bootstrap. A separate user-side runbook (`docs/unity-migration/phase-0b-runbook.md`, produced by Task 9) covers:
- `UNITY_LICENSE` / `UNITY_EMAIL` / `UNITY_PASSWORD` secret registration on GitHub
- Local Unity 6 LTS install via Unity Hub
- Running Unity once to generate `ProjectSettings/` and initial `Library/` artefacts
- Creating `Boot.unity` and `Root.unity` scenes, attaching `GLDPhase0Label` component
- First GameCI build success, first Vercel preview showing `/unity/` label

Phase 1 (data/asset pipeline) and onward are **separate plans**, not in this document. Each subsequent Phase (1-8) from the migration spec in `docs/superpowers/specs/` should get its own plan file once Phase 0 ships.

Current branch: `endurable-hurricane`. Base branch: `main`. All Phase 0a commits land as one PR at the end.

---

## File Structure

### Create
- `packages/unity-game/.gitignore`
- `packages/unity-game/README.md`
- `packages/unity-game/Packages/manifest.json`
- `packages/unity-game/Assets/Scripts/Core/GLD.Core.asmdef`
- `packages/unity-game/Assets/Scripts/Systems/GLD.Systems.asmdef`
- `packages/unity-game/Assets/Scripts/SceneRuntime/GLD.SceneRuntime.asmdef`
- `packages/unity-game/Assets/Scripts/UI/GLD.UI.asmdef`
- `packages/unity-game/Assets/Scripts/Data/GLD.Data.asmdef`
- `packages/unity-game/Assets/Scripts/Core/GLDPhase0Label.cs`
- `packages/unity-game/Assets/Scripts/Core/GameEvents.cs` (stub — full impl in Phase 3)
- `packages/unity-game/Assets/UI/Documents/Phase0Label.uxml`
- `packages/unity-game/Assets/UI/Styles/phase0.uss`
- `packages/unity-game/WebGLTemplates/GLDMobilePortrait/index.html`
- `packages/unity-game/WebGLTemplates/GLDMobilePortrait/style.css`
- `packages/unity-game/WebGLTemplates/GLDMobilePortrait/bridge.js`
- `packages/unity-game/WebGLTemplates/GLDMobilePortrait/service-worker.js`
- `packages/unity-game/WebGLTemplates/GLDMobilePortrait/manifest.webmanifest`
- `packages/unity-game/BuildScripts/Editor/WebGLBuilder.cs`
- `packages/unity-game/BuildScripts/Editor/GLD.BuildScripts.asmdef`
- `scripts/merge-build.ts`
- `scripts/merge-build.test.ts`
- `.github/workflows/unity-build.yml`
- `.github/workflows/unity-parity-gate.yml` (placeholder — always passes until Phase 3)
- `docs/unity-migration/phase-0b-runbook.md`
- `docs/unity-migration/README.md`

### Modify
- `AGENTS.md` — Unity runtime added, Unity-4 subagent dual-rule (unity-game scope = direct use, phaser scope = reference only)
- `.claude/agents/README.md` — same dual-rule; "Phaser-only" sentence replaced
- `README.md` — monorepo table adds `unity-game` row; roadmap row for Unity migration
- `package.json` — `scripts.build:all`, `scripts.merge-build`, `scripts.dev:unity-preview`
- `vercel.json` — `buildCommand` → `bun run build:all`; rewrites gain `/unity/:path*` → `/unity/index.html` before SPA fallback
- `.gitignore` — ignore `packages/unity-game/{Library,Temp,Logs,obj,Build,UserSettings,MemoryCaptures}/`

### Explicitly NOT in this plan (Phase 0b user tasks; see runbook)
- `packages/unity-game/ProjectSettings/*` (Unity generates)
- `packages/unity-game/Assets/_Project/Scenes/Boot.unity`, `Root.unity` (Unity generates)
- Any `.meta` files (Unity generates GUIDs)
- Any `.unity`, `.prefab`, `.asset` ScriptableObject
- `UNITY_LICENSE` GitHub secret registration

---

## Task 1: Agent docs dual-rule update

**Files:**
- Modify: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/AGENTS.md`
- Modify: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/.claude/agents/README.md`

Both files currently assert "본 저장소는 Phaser 3 런타임" and scope Unity-4 subagents to "architecture reference only". Once `packages/unity-game/` lands, Unity-4 agents should be usable for actual code within that scope, while Phaser scope stays reference-only.

- [ ] **Step 1: Read AGENTS.md section on subagents to confirm current wording**

Run: `rg -n "Unity 4종|Phaser 3 런타임" /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/AGENTS.md /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/.claude/agents/README.md`

Expected: matches around `AGENTS.md:75` and `.claude/agents/README.md:40,45`.

- [ ] **Step 2: Update AGENTS.md `Local Subagents` block**

Replace the block currently at `AGENTS.md:68-77` with:

```markdown
## Local Subagents

`.claude/agents/` 에 Claude Code 프로젝트 스코프 **subagent** 9종이 배치되어 있다
(`msitarzewski/agency-agents` 원문 그대로 임포트, MIT).
`/agents` 명령 또는 자동 라우팅으로 호출한다.

- 일반 5종: Game Designer / Game Audio Engineer / Level Designer / Narrative Designer / Technical Artist — 엔진 중립 설계 상담에 사용.
- Unity 4종: Unity Architect / Unity Editor Tool Developer / Unity Multiplayer Engineer / Unity Shader Graph Artist.

### Unity 4종 이중 사용 규칙

본 저장소는 **Phaser 3 + React 18 런타임(legacy)** 과 **Unity 2D WebGL 런타임(`packages/unity-game/`, 신규)** 을 병행 호스팅한다. 스코프에 따라 Unity 4종 subagent 사용 범위가 달라진다:

- **`packages/unity-game/` 스코프 작업**: Unity 4종을 **실제 C#/ScriptableObject/URP/Editor 툴 코드 설계·리뷰에 직접 활용 가능**. Unity Architect의 anti-pattern watchlist를 기본 체크리스트로 사용.
- **`packages/phaser-game/`, `packages/web-shell/` 스코프 작업**: Unity 4종은 **"아키텍처 패턴 레퍼런스"로만** 사용. Phaser 실제 구현은 기존 skill(`phaser-best-practices`, `game-ui-design`)을 우선.
- **공용 `packages/shared/` 스코프 작업**: 엔진 중립 타입/상수 편집은 일반 5종 우선. Unity 4종은 "이 변경이 ScriptableObject/SO 카탈로그에 어떻게 매핑되는가" 자문에만 사용.

출처/라이선스/세부 가이드: `.claude/agents/README.md`
```

Verify AGENTS.md section "프로젝트 스냅샷" mentions Phaser as "legacy" is not required — keep existing wording intact elsewhere. Only the `Local Subagents` block changes.

- [ ] **Step 3: Update `.claude/agents/README.md` `이 프로젝트에서의 사용 범위` block**

Replace the section at `.claude/agents/README.md:38-57` with:

```markdown
## 이 프로젝트에서의 사용 범위

본 저장소는 **Phaser 3 + React 18 런타임(legacy)** 과 **Unity 2D WebGL 런타임(`packages/unity-game/`, 신규)** 을 병행 호스팅한다. Unity 마이그레이션 로드맵은 `docs/superpowers/specs/unity-migration/`, 현행 Phase 문서는 `docs/unity-migration/`를 참조.

### 사용 가이드

- **일반 5종** (Game Designer / Audio / Level / Narrative / Technical Artist): 엔진 중립적인 설계 영역은 양 런타임 모두에 직접 활용. GDD, 밸런스, 레벨 페이싱, 오디오 설계, VFX/성능 예산 상담.
- **Unity 4종 (Unity Architect / Editor Tool Developer / Multiplayer Engineer / Shader Graph Artist)**: 스코프별로 사용 범위가 다르다.
  - `packages/unity-game/` 스코프: **실제 C#/ScriptableObject/URP/Editor 툴 코드 설계·리뷰에 직접 활용.** Anti-pattern watchlist(God class, `FindObjectOfType` 남용, 500+ LOC MonoBehaviour, SRP 위반 등)를 기본 체크리스트로 사용.
  - `packages/phaser-game/`, `packages/web-shell/` 스코프: **"아키텍처 패턴 레퍼런스"로만 사용.** 데이터 지향 설계(SO 패턴) → `shared/src/constants/` 모듈 설계 참고, 컴포넌트 단일 책임·이벤트 채널 디커플링 → `TypedEventBus` 설계 검토 참고 등.
  - `packages/shared/` 스코프: 엔진 중립 타입/상수 편집은 일반 5종 우선. Unity 4종은 "이 변경이 SO 카탈로그에 어떻게 매핑되는가" 자문에만.

### Phaser / 공용 실제 구현은 기존 skill을 우선

- `.claude/skills/phaser-best-practices/SKILL.md` — Phaser 씬/시스템/클린업 규약
- `.claude/skills/game-ui-design/SKILL.md` — Phaser+React 하이브리드 UI
- `.claude/skills/ralreview/SKILL.md` — 수렴 리뷰

Unity 4종 subagent가 Phaser 맥락을 모른다는 점에 유의. Phaser 스코프에서 Unity 전용 코드 산출물을 그대로 채택하지 말 것.
```

- [ ] **Step 4: Verify both files**

Run: `rg -n "legacy|unity-game" /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/AGENTS.md /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/.claude/agents/README.md`

Expected: both files reference `unity-game` and `legacy` at least once. The old sentence `본 저장소는 Phaser 3 + React 18 런타임이다 (Unity 아님 ...)` is gone from `.claude/agents/README.md`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add AGENTS.md .claude/agents/README.md
git commit -m "$(cat <<'EOF'
docs(agents): Unity 4종 subagent 스코프별 이중 사용 규칙 명시

Unity 2D WebGL 마이그레이션 Phase 0 선행 문서 업데이트. 기존 "Phaser 3 런타임"
전제는 `packages/unity-game/` 추가와 함께 무효화되므로, Unity 4종(Architect /
Editor Tool Developer / Multiplayer Engineer / Shader Graph Artist) 사용 범위를
스코프에 따라 구분한다:

- unity-game 스코프: 실제 코드 설계·리뷰에 직접 활용
- phaser/web-shell 스코프: 아키텍처 패턴 레퍼런스 전용 (기존 규칙 유지)
- shared 스코프: 일반 5종 우선, Unity 4종은 SO 매핑 자문만

본 커밋은 agent 정의 파일(.claude/agents/*.md)을 건드리지 않는다
(원문 MIT, 바이트 불변 유지).
EOF
)"
```

Expected: one commit on `endurable-hurricane`, only `AGENTS.md` and `.claude/agents/README.md` modified.

---

## Task 2: Unity package skeleton — directories, gitignore, README, UPM manifest

**Files:**
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/.gitignore`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/README.md`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Packages/manifest.json`
- Modify: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/.gitignore`

- [ ] **Step 1: Create `packages/unity-game/.gitignore`**

Write:

```
# Unity generated
[Ll]ibrary/
[Tt]emp/
[Oo]bj/
[Bb]uild/
[Bb]uilds/
[Ll]ogs/
[Uu]ser[Ss]ettings/
[Mm]emoryCaptures/
[Rr]ecordings/

# Never ignore meta files (Unity tracks GUIDs via .meta — commit them)
!/[Aa]ssets/**/*.meta
!/[Pp]ackages/**/*.meta
!/[Pp]roject[Ss]ettings/**/*.meta

# IDE / tooling
*.csproj
*.unityproj
*.sln
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
*.svd
*.pdb
*.mdb
*.opendb
*.VC.db
.vs/
.idea/
.vsconfig

# OS
.DS_Store
Thumbs.db

# Build output scanned by merge-build.ts
Build/WebGL/
```

- [ ] **Step 2: Append repo-root `.gitignore` with a pointer for non-Unity agents**

Modify `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/.gitignore` — append at the end:

```

# Unity generated (under packages/unity-game/)
packages/unity-game/Library/
packages/unity-game/Temp/
packages/unity-game/Logs/
packages/unity-game/obj/
packages/unity-game/Build/
packages/unity-game/Builds/
packages/unity-game/UserSettings/
packages/unity-game/MemoryCaptures/
```

Rationale: tooling that recursively scans (CI, biome, bun-run) should skip Unity-generated dirs without needing to cd into the package.

- [ ] **Step 3: Create `packages/unity-game/README.md`**

Write:

````markdown
# @gld/unity-game — Unity 2D WebGL port (Phase 0 bootstrap)

Unity 6 LTS (URP 2D + UI Toolkit + Addressables) port of Grid Line Defense. Hosted alongside the Phaser runtime — ships to `/unity/` on Vercel while `/` keeps serving the Phaser+React build.

## Status

**Phase 0a (scaffold)**: Directory, asmdefs, WebGLTemplate, build script, CI wiring all committed. No `.unity` scene, `ProjectSettings/`, or Unity build output yet — those are produced by opening the project in Unity Hub (see runbook).

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

CI: `.github/workflows/unity-build.yml` (GameCI). Output goes to `Build/WebGL/` then `scripts/merge-build.ts` copies to `packages/web-shell/dist/unity/`.

## Post-build routing

`vercel.json` rewrites:
- `/unity/:path*` → `/unity/index.html` (Unity handles deep links)
- `/(.*)` → `/index.html` (Phaser SPA fallback)

Physical files (`/unity/Build/*.wasm`, etc.) bypass rewrites and are served directly.
````

- [ ] **Step 4: Create `packages/unity-game/Packages/manifest.json`**

Write (Unity 6 LTS baseline versions; `packages-lock.json` will be generated by Unity on first open):

```json
{
  "dependencies": {
    "com.unity.addressables": "2.3.16",
    "com.unity.feature.2d": "2.0.1",
    "com.unity.inputsystem": "1.11.2",
    "com.unity.render-pipelines.universal": "17.0.4",
    "com.unity.test-framework": "1.4.5",
    "com.unity.textmeshpro": "3.2.0-pre.12",
    "com.unity.ugui": "2.0.0",
    "com.unity.ide.rider": "3.0.34",
    "com.unity.ide.visualstudio": "2.0.22",
    "com.unity.modules.ai": "1.0.0",
    "com.unity.modules.androidjni": "1.0.0",
    "com.unity.modules.animation": "1.0.0",
    "com.unity.modules.assetbundle": "1.0.0",
    "com.unity.modules.audio": "1.0.0",
    "com.unity.modules.imageconversion": "1.0.0",
    "com.unity.modules.imgui": "1.0.0",
    "com.unity.modules.jsonserialize": "1.0.0",
    "com.unity.modules.particlesystem": "1.0.0",
    "com.unity.modules.physics": "1.0.0",
    "com.unity.modules.physics2d": "1.0.0",
    "com.unity.modules.screencapture": "1.0.0",
    "com.unity.modules.terrain": "1.0.0",
    "com.unity.modules.ui": "1.0.0",
    "com.unity.modules.uielements": "1.0.0",
    "com.unity.modules.umbra": "1.0.0",
    "com.unity.modules.unityanalytics": "1.0.0",
    "com.unity.modules.unitywebrequest": "1.0.0",
    "com.unity.modules.unitywebrequestassetbundle": "1.0.0",
    "com.unity.modules.unitywebrequestaudio": "1.0.0",
    "com.unity.modules.unitywebrequesttexture": "1.0.0",
    "com.unity.modules.unitywebrequestwww": "1.0.0",
    "com.unity.modules.vehicles": "1.0.0",
    "com.unity.modules.video": "1.0.0",
    "com.unity.modules.vr": "1.0.0",
    "com.unity.modules.wind": "1.0.0",
    "com.unity.modules.xr": "1.0.0"
  }
}
```

Note: `sentry-unity` is NOT included — Phase 6 adds it via `io.sentry.unity`. Keeping Phase 0 surface minimal.

- [ ] **Step 5: Verify manifest.json parses as JSON**

Run: `bunx -- node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Packages/manifest.json','utf8')).dependencies).length)"`

Expected: prints `35` (total dependency count).

- [ ] **Step 6: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add packages/unity-game/.gitignore packages/unity-game/README.md packages/unity-game/Packages/manifest.json .gitignore
git commit -m "$(cat <<'EOF'
feat(unity-game): 패키지 스켈레톤 — .gitignore · README · UPM manifest

Phase 0a 스캐폴드의 첫 커밋. 디렉토리 껍데기와 Unity Package Manager
매니페스트만 추가. asmdef / C# / WebGLTemplate은 후속 커밋.

- Packages/manifest.json: Unity 6 LTS 기준 최소 구성 (URP 2D, UI Toolkit,
  Addressables, Input System, Test Framework, TMP). Sentry는 Phase 6에서 추가.
- .gitignore: Library/Temp/Build 등 Unity 생성물 제외. .meta 파일은 반드시 트래킹.
- 루트 .gitignore에도 packages/unity-game/ 생성물 중복 차단 (CI/biome 스캔 회피).
EOF
)"
```

---

## Task 3: Asmdef stubs + placeholder C# with Phase 0 label

**Files:**
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/Core/GLD.Core.asmdef`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/Systems/GLD.Systems.asmdef`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/SceneRuntime/GLD.SceneRuntime.asmdef`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/UI/GLD.UI.asmdef`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/Data/GLD.Data.asmdef`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/Core/GLDPhase0Label.cs`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/Core/GameEvents.cs`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/UI/Documents/Phase0Label.uxml`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/UI/Styles/phase0.uss`

Dependency graph target:
- `GLD.Core` → (none)
- `GLD.Data` → `GLD.Core`
- `GLD.Systems` → `GLD.Core`
- `GLD.SceneRuntime` → `GLD.Core`, `GLD.Systems`, `GLD.UI`
- `GLD.UI` → `GLD.Core`

- [ ] **Step 1: Write `GLD.Core.asmdef`**

File: `packages/unity-game/Assets/Scripts/Core/GLD.Core.asmdef`

```json
{
  "name": "GLD.Core",
  "rootNamespace": "GLD.Core",
  "references": [],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 2: Write `GLD.Data.asmdef`**

File: `packages/unity-game/Assets/Scripts/Data/GLD.Data.asmdef`

```json
{
  "name": "GLD.Data",
  "rootNamespace": "GLD.Data",
  "references": [
    "GLD.Core"
  ],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 3: Write `GLD.Systems.asmdef`**

File: `packages/unity-game/Assets/Scripts/Systems/GLD.Systems.asmdef`

```json
{
  "name": "GLD.Systems",
  "rootNamespace": "GLD.Systems",
  "references": [
    "GLD.Core"
  ],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 4: Write `GLD.UI.asmdef`**

File: `packages/unity-game/Assets/Scripts/UI/GLD.UI.asmdef`

```json
{
  "name": "GLD.UI",
  "rootNamespace": "GLD.UI",
  "references": [
    "GLD.Core",
    "Unity.TextMeshPro",
    "UnityEngine.UI"
  ],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 5: Write `GLD.SceneRuntime.asmdef`**

File: `packages/unity-game/Assets/Scripts/SceneRuntime/GLD.SceneRuntime.asmdef`

```json
{
  "name": "GLD.SceneRuntime",
  "rootNamespace": "GLD.SceneRuntime",
  "references": [
    "GLD.Core",
    "GLD.Systems",
    "GLD.UI",
    "Unity.InputSystem"
  ],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 6: Write `GLDPhase0Label.cs`** (the component the user attaches to Root.unity in Phase 0b; renders the "Unity Phase 0" label that satisfies the phase exit gate)

File: `packages/unity-game/Assets/Scripts/Core/GLDPhase0Label.cs`

```csharp
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Core
{
    /// <summary>
    /// Phase 0 exit-gate component. Attach to a GameObject in Root.unity alongside a UIDocument
    /// whose visualTreeAsset references Assets/UI/Documents/Phase0Label.uxml. Renders the
    /// "Unity Phase 0" label so the Vercel /unity/ preview can be verified end-to-end.
    /// Removed in Phase 2 when PoC vertical slice lands.
    /// </summary>
    [RequireComponent(typeof(UIDocument))]
    public sealed class GLDPhase0Label : MonoBehaviour
    {
        const string LabelElementName = "phase0-label";
        const string LabelText = "Unity Phase 0";

        void OnEnable()
        {
            var doc = GetComponent<UIDocument>();
            var root = doc != null ? doc.rootVisualElement : null;
            if (root == null) return;

            var label = root.Q<Label>(LabelElementName);
            if (label != null)
            {
                label.text = LabelText;
            }
        }
    }
}
```

- [ ] **Step 7: Write `GameEvents.cs` stub** (Phase 3 replaces with the full typed event class; Phase 0 just keeps the namespace alive so nothing else referencing `GLD.Core.GameEvents` breaks mid-migration)

File: `packages/unity-game/Assets/Scripts/Core/GameEvents.cs`

```csharp
using System;

namespace GLD.Core
{
    /// <summary>
    /// Typed event dispatch for Unity runtime. Phase 0 stub — full event surface
    /// (30+ events, mapping to existing Phaser TypedEventBus) lands in Phase 3.
    /// Do NOT add production events here until Phase 3 wiring — events added now
    /// may be renamed/removed without deprecation.
    /// </summary>
    public static class GameEvents
    {
        /// <summary>Fires once per session when Boot.unity completes initial load. Phase 0 sentinel.</summary>
        public static event Action OnBootComplete;

        internal static void RaiseBootComplete() => OnBootComplete?.Invoke();
    }
}
```

- [ ] **Step 8: Write `Phase0Label.uxml`**

File: `packages/unity-game/Assets/UI/Documents/Phase0Label.uxml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements"
         xsi="http://www.w3.org/2001/XMLSchema-instance"
         engine="UnityEngine.UIElements"
         editor="UnityEditor.UIElements"
         noNamespaceSchemaLocation="../../UIElementsSchema/UIElements.xsd">
  <ui:VisualElement name="phase0-root" class="phase0-root">
    <ui:Label name="phase0-label" text="Unity Phase 0" class="phase0-label" />
    <ui:Label name="phase0-subtitle" text="Bootstrap scaffold loaded." class="phase0-subtitle" />
  </ui:VisualElement>
</ui:UXML>
```

- [ ] **Step 9: Write `phase0.uss`**

File: `packages/unity-game/Assets/UI/Styles/phase0.uss`

```css
.phase0-root {
    flex-grow: 1;
    align-items: center;
    justify-content: center;
    background-color: #2a2010;
}

.phase0-label {
    color: #c8a04a;
    font-size: 32px;
    -unity-font-style: bold;
    margin-bottom: 12px;
    -unity-text-align: middle-center;
}

.phase0-subtitle {
    color: #b0a080;
    font-size: 14px;
    -unity-text-align: middle-center;
}
```

- [ ] **Step 10: Verify all asmdefs parse as JSON and dependency graph is acyclic**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
for f in packages/unity-game/Assets/Scripts/*/GLD.*.asmdef; do
  echo "=== $f ==="
  bunx -- node -e "const m=JSON.parse(require('fs').readFileSync('$f','utf8'));console.log(m.name,'->',JSON.stringify(m.references))"
done
```

Expected output:
```
=== packages/unity-game/Assets/Scripts/Core/GLD.Core.asmdef ===
GLD.Core -> []
=== packages/unity-game/Assets/Scripts/Data/GLD.Data.asmdef ===
GLD.Data -> ["GLD.Core"]
=== packages/unity-game/Assets/Scripts/SceneRuntime/GLD.SceneRuntime.asmdef ===
GLD.SceneRuntime -> ["GLD.Core","GLD.Systems","GLD.UI","Unity.InputSystem"]
=== packages/unity-game/Assets/Scripts/Systems/GLD.Systems.asmdef ===
GLD.Systems -> ["GLD.Core"]
=== packages/unity-game/Assets/Scripts/UI/GLD.UI.asmdef ===
GLD.UI -> ["GLD.Core","Unity.TextMeshPro","UnityEngine.UI"]
```

Visual check: no cycles, `Systems` does not reference `UI`.

- [ ] **Step 11: Verify C# files look syntactically plausible via grep**

Run:

```bash
rg -n "namespace GLD\.Core" /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/Assets/Scripts/Core/*.cs
```

Expected: matches in both `GLDPhase0Label.cs` and `GameEvents.cs`. (Full compilation verified by user in Phase 0b via Unity.)

- [ ] **Step 12: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add packages/unity-game/Assets/Scripts packages/unity-game/Assets/UI
git commit -m "$(cat <<'EOF'
feat(unity-game): asmdef 경계 5종 · Phase 0 label 컴포넌트

asmdef 의존 방향(단방향): Core ← Systems/UI/Data, Core+Systems+UI → SceneRuntime.
GLD.Systems는 GLD.UI를 참조하지 않음 (Unity Architect 권고).

GLDPhase0Label.cs + Phase0Label.uxml + phase0.uss는 Phase 0 exit gate 전용
("Unity Phase 0" 라벨 렌더). Phase 2 PoC 버티컬 슬라이스에서 제거 예정.

GameEvents.cs는 Phase 3까지 네임스페이스 자리만 유지하는 stub.
EOF
)"
```

---

## Task 4: WebGLTemplate — GLDMobilePortrait

**Files:**
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/WebGLTemplates/GLDMobilePortrait/index.html`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/WebGLTemplates/GLDMobilePortrait/style.css`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/WebGLTemplates/GLDMobilePortrait/bridge.js`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/WebGLTemplates/GLDMobilePortrait/service-worker.js`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/WebGLTemplates/GLDMobilePortrait/manifest.webmanifest`

Unity WebGL template variables (`{{{ WIDTH }}}`, `{{{ HEIGHT }}}`, `{{{ LOADER_URL }}}`, etc.) are substituted by Unity at build time. The HTML below uses these literally.

- [ ] **Step 1: Write `index.html`**

File: `packages/unity-game/WebGLTemplates/GLDMobilePortrait/index.html`

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#2a2010">
  <title>{{{ PRODUCT_NAME }}}</title>
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="{{{ THUMBNAIL }}}" type="image/png">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="unity-container">
    <canvas id="unity-canvas" width="{{{ WIDTH }}}" height="{{{ HEIGHT }}}" tabindex="-1"></canvas>
    <div id="unity-loading-bar" aria-hidden="true">
      <div id="unity-logo"></div>
      <div id="unity-progress-bar-empty">
        <div id="unity-progress-bar-full"></div>
      </div>
    </div>
    <div id="unity-warning"></div>
  </div>
  <button id="unity-sound-unlock" type="button" hidden>탭하여 사운드 켜기</button>
  <script src="bridge.js"></script>
  <script>
    (function () {
      const buildUrl = "Build";
      const config = {
        dataUrl: buildUrl + "/{{{ DATA_FILENAME }}}",
        frameworkUrl: buildUrl + "/{{{ FRAMEWORK_FILENAME }}}",
        codeUrl: buildUrl + "/{{{ CODE_FILENAME }}}",
#if MEMORY_FILENAME
        memoryUrl: buildUrl + "/{{{ MEMORY_FILENAME }}}",
#endif
#if SYMBOLS_FILENAME
        symbolsUrl: buildUrl + "/{{{ SYMBOLS_FILENAME }}}",
#endif
        streamingAssetsUrl: "StreamingAssets",
        companyName: "{{{ COMPANY_NAME }}}",
        productName: "{{{ PRODUCT_NAME }}}",
        productVersion: "{{{ PRODUCT_VERSION }}}",
        showBanner: (msg, type) => {
          const warn = document.getElementById("unity-warning");
          if (!warn) return;
          warn.textContent = msg;
          warn.className = "unity-warning unity-warning--" + (type || "info");
        }
      };

      const container = document.getElementById("unity-container");
      const canvas = document.getElementById("unity-canvas");
      const loadingBar = document.getElementById("unity-loading-bar");
      const progressBarFull = document.getElementById("unity-progress-bar-full");

      canvas.style.width = "100vw";
      canvas.style.height = "100vh";

      const script = document.createElement("script");
      script.src = buildUrl + "/{{{ LOADER_FILENAME }}}";
      script.onload = () => {
        createUnityInstance(canvas, config, (progress) => {
          progressBarFull.style.width = (100 * progress) + "%";
        }).then((unityInstance) => {
          loadingBar.style.display = "none";
          window.__gld = window.__gld || {};
          window.__gld.unityInstance = unityInstance;
          if (window.__gldBridge && typeof window.__gldBridge.onReady === "function") {
            window.__gldBridge.onReady(unityInstance);
          }
        }).catch((message) => {
          config.showBanner(message, "error");
        });
      };
      document.body.appendChild(script);
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: Write `style.css`**

File: `packages/unity-game/WebGLTemplates/GLDMobilePortrait/style.css`

```css
* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: #1a140a;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  font-family: 'Galmuri11', 'Press Start 2P', system-ui, -apple-system, sans-serif;
}

#unity-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a140a;
}

#unity-canvas {
  display: block;
  background: #000;
  /* 8:18 aspect ratio (512x1152 logical) — letterbox on wider viewports. */
  max-width: min(100vw, calc(100vh * 8 / 18));
  max-height: 100vh;
  aspect-ratio: 8 / 18;
  outline: none;
}

#unity-loading-bar {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: #c8a04a;
  pointer-events: none;
}

#unity-logo {
  width: 128px;
  height: 128px;
  background: #2a2010;
  border: 3px solid #4a3a20;
  border-radius: 8px;
}

#unity-progress-bar-empty {
  width: 60vw;
  max-width: 320px;
  height: 16px;
  background: #2a2010;
  border: 2px solid #4a3a20;
  border-radius: 4px;
  overflow: hidden;
}

#unity-progress-bar-full {
  height: 100%;
  width: 0%;
  background: #c8a04a;
  transition: width 120ms ease-out;
}

.unity-warning,
#unity-warning {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  background: rgba(42, 32, 16, 0.92);
  border: 1px solid #4a3a20;
  color: #e0d0a0;
  max-width: 86vw;
  text-align: center;
}

.unity-warning--error {
  background: rgba(96, 24, 16, 0.94);
  border-color: #c03020;
  color: #fff0e0;
}

#unity-sound-unlock {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  background: #c8a04a;
  color: #1a140a;
  border: 2px solid #4a3a20;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  z-index: 10;
}
```

- [ ] **Step 3: Write `bridge.js`** (minimal Phase 0 shim — Phase 6 replaces with AdService / Sentry / localStorage integration)

File: `packages/unity-game/WebGLTemplates/GLDMobilePortrait/bridge.js`

```javascript
// GLD WebGL bridge — Phase 0 shim.
// Phase 6 replaces with full AdService / Sentry / localStorage / URL-params integration.
// Keep this file tiny: it runs BEFORE the Unity loader, so anything heavy delays first paint.

(function () {
  "use strict";

  const bridge = {
    /** Called from index.html once createUnityInstance resolves. */
    onReady: function (unityInstance) {
      // Placeholder. Phase 6 wires SendMessage channels for AdService/Sentry here.
      // For Phase 0 we just expose the instance for smoke-test access.
      window.__gld = window.__gld || {};
      window.__gld.ready = true;
    },

    /** iOS Safari AudioContext unlock retry. Phase 6 expands; Phase 0 uses a one-shot tap. */
    armAudioUnlock: function () {
      const onFirstTap = function () {
        try {
          if (window.WEBAudio && window.WEBAudio.audioContext) {
            window.WEBAudio.audioContext.resume();
          }
        } catch (_) {}
        document.removeEventListener("pointerdown", onFirstTap, true);
        document.removeEventListener("touchstart", onFirstTap, true);
      };
      document.addEventListener("pointerdown", onFirstTap, true);
      document.addEventListener("touchstart", onFirstTap, true);
    }
  };

  bridge.armAudioUnlock();

  // Service worker registration is guarded behind HTTPS + user opt-in in Phase 7.
  // Phase 0 registers nothing — we want reload-for-fresh-build behavior during iteration.

  window.__gldBridge = bridge;
})();
```

- [ ] **Step 4: Write `service-worker.js`** (Phase 0 no-op that unregisters itself if previously registered — ensures Phase 0 preview always loads fresh bytes during iteration)

File: `packages/unity-game/WebGLTemplates/GLDMobilePortrait/service-worker.js`

```javascript
// Phase 0 no-op service worker. Explicitly unregisters itself so stale caches
// from any prior Phase experimentation do not serve outdated WebGL bytes.
// Phase 7 replaces with a real offline-first implementation.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
```

- [ ] **Step 5: Write `manifest.webmanifest`**

File: `packages/unity-game/WebGLTemplates/GLDMobilePortrait/manifest.webmanifest`

```json
{
  "name": "Grid Line Defense (Unity)",
  "short_name": "GLD Unity",
  "description": "Unity 2D WebGL port of Grid Line Defense — Phase 0 bootstrap.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#1a140a",
  "theme_color": "#2a2010",
  "lang": "ko"
}
```

- [ ] **Step 6: Verify all files parse**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
bunx -- node -e "JSON.parse(require('fs').readFileSync('packages/unity-game/WebGLTemplates/GLDMobilePortrait/manifest.webmanifest','utf8'));console.log('manifest OK')"
# HTML/CSS/JS are not machine-validated in Phase 0 — Unity consumes them at build time.
rg -n "Unity Phase 0|unity-canvas|__gldBridge" /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/WebGLTemplates/GLDMobilePortrait/
```

Expected: `manifest OK` prints; grep shows `unity-canvas` in `index.html` and `__gldBridge` in `bridge.js`.

- [ ] **Step 7: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add packages/unity-game/WebGLTemplates
git commit -m "$(cat <<'EOF'
feat(unity-game): WebGLTemplate GLDMobilePortrait (Phase 0)

Unity WebGL 빌드 시 사용할 커스텀 템플릿. 모바일 세로 고정 (aspect 8/18,
512x1152 논리 해상도 대응), 로딩바 + 에러 배너 + iOS AudioContext 해금 훅.

- index.html: Unity {{{ }}} 치환 변수 사용. Unity가 빌드 시 채움.
- style.css: letterbox 레이아웃, 디자인 토큰 색 (#c8a04a / #2a2010) 재사용.
- bridge.js: Phase 0 shim. Phase 6에서 AdService/Sentry/localStorage 브리지로 확장.
- service-worker.js: Phase 0 자기 해제 no-op (stale cache 방지).
- manifest.webmanifest: PWA 최소 메타.
EOF
)"
```

---

## Task 5: BuildScripts/Editor/WebGLBuilder.cs

**Files:**
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/BuildScripts/Editor/GLD.BuildScripts.asmdef`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/BuildScripts/Editor/WebGLBuilder.cs`

Unity WebGL build driver, invoked by GameCI via `-executeMethod BuildScripts.Editor.WebGLBuilder.Build`. Produces `Build/WebGL/` which `scripts/merge-build.ts` then copies under `/unity/`.

- [ ] **Step 1: Write `GLD.BuildScripts.asmdef`** (Editor-only asmdef — platform gated)

File: `packages/unity-game/BuildScripts/Editor/GLD.BuildScripts.asmdef`

```json
{
  "name": "GLD.BuildScripts",
  "rootNamespace": "GLD.BuildScripts",
  "references": [],
  "includePlatforms": [
    "Editor"
  ],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 2: Write `WebGLBuilder.cs`**

File: `packages/unity-game/BuildScripts/Editor/WebGLBuilder.cs`

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace GLD.BuildScripts.Editor
{
    /// <summary>
    /// WebGL build driver. Invoked from CLI:
    ///   Unity -batchmode -nographics -projectPath . \
    ///     -executeMethod GLD.BuildScripts.Editor.WebGLBuilder.Build -logFile -
    /// Output: packages/unity-game/Build/WebGL/ (consumed by scripts/merge-build.ts).
    /// </summary>
    public static class WebGLBuilder
    {
        const string DefaultOutputDir = "Build/WebGL";
        const string TemplateName = "PROJECT:GLDMobilePortrait";

        [MenuItem("GLD/Build/WebGL")]
        public static void BuildFromMenu() => Build();

        public static void Build()
        {
            string outputDir = Environment.GetEnvironmentVariable("GLD_WEBGL_OUTPUT_DIR") ?? DefaultOutputDir;
            string absOutput = Path.GetFullPath(outputDir);
            Directory.CreateDirectory(absOutput);

            var scenes = new List<string>();
            foreach (var s in EditorBuildSettings.scenes)
            {
                if (s.enabled && !string.IsNullOrEmpty(s.path))
                    scenes.Add(s.path);
            }

            if (scenes.Count == 0)
            {
                // Phase 0a: no scenes authored yet. Allow build to proceed with an empty
                // scene list so CI can at least smoke-test the toolchain. Phase 0b adds
                // Boot.unity + Root.unity.
                Debug.LogWarning("[WebGLBuilder] No scenes in EditorBuildSettings. Building with empty scene list (Phase 0a expected state).");
            }

            PlayerSettings.WebGL.template = TemplateName;
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
            PlayerSettings.WebGL.decompressionFallback = false;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.memorySize = 256;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL, ScriptingImplementation.IL2CPP);

            var options = new BuildPlayerOptions
            {
                scenes = scenes.ToArray(),
                locationPathName = absOutput,
                target = BuildTarget.WebGL,
                targetGroup = BuildTargetGroup.WebGL,
                options = BuildOptions.None
            };

            Debug.Log($"[WebGLBuilder] Building to {absOutput} ({scenes.Count} scenes, template={TemplateName})");
            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            if (summary.result == BuildResult.Succeeded)
            {
                Debug.Log($"[WebGLBuilder] Build succeeded: {summary.totalSize} bytes in {summary.totalTime}");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"[WebGLBuilder] Build failed: result={summary.result}, errors={summary.totalErrors}");
                EditorApplication.Exit(1);
            }
        }
    }
}
```

- [ ] **Step 3: Verify files**

Run:

```bash
rg -n "namespace GLD\.BuildScripts|BuildTarget\.WebGL|GLDMobilePortrait" /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/packages/unity-game/BuildScripts/
```

Expected: matches in `WebGLBuilder.cs` covering all three patterns.

- [ ] **Step 4: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add packages/unity-game/BuildScripts
git commit -m "$(cat <<'EOF'
feat(unity-game): BuildScripts WebGL 빌더 (Brotli + IL2CPP + 256MB heap)

GameCI가 -executeMethod GLD.BuildScripts.Editor.WebGLBuilder.Build 로 호출.
출력: packages/unity-game/Build/WebGL/ → scripts/merge-build.ts 가 /unity/ 로 복사.

- 템플릿: GLDMobilePortrait (Task 4의 WebGLTemplate)
- 압축: Brotli (Vercel 자동 decompression)
- 스크립팅: IL2CPP + WebAssembly
- 메모리: 256MB (R1 iOS Safari 예산)
- 씬 비어 있어도 워닝으로 진행 (Phase 0a 예상 상태).
EOF
)"
```

---

## Task 6: `scripts/merge-build.ts` + tests (test-first)

**Files:**
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/scripts/merge-build.ts`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/scripts/merge-build.test.ts`

Merges `packages/web-shell/dist/` + `packages/unity-game/Build/WebGL/` → output left at `packages/web-shell/dist/` with Unity files placed under `dist/unity/`. If the Unity build is missing (Phase 0a normal state), writes a placeholder `dist/unity/index.html` so Vercel deploys don't break.

- [ ] **Step 1: Write failing test**

File: `scripts/merge-build.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeBuild } from './merge-build';

async function fileExists(p: string): Promise<boolean> {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

describe('mergeBuild', () => {
  let root: string;
  let webShellDist: string;
  let unityBuild: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'gld-merge-'));
    webShellDist = join(root, 'dist');
    unityBuild = join(root, 'unity-build');
    await mkdir(webShellDist, { recursive: true });
    await writeFile(join(webShellDist, 'index.html'), '<html><body>phaser</body></html>');
    await writeFile(join(webShellDist, 'assets.js'), 'console.log("phaser");');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('emits placeholder /unity/index.html when unity build dir is absent', async () => {
    const result = await mergeBuild({ webShellDist, unityBuild });

    expect(result.unityMode).toBe('placeholder');
    const unityIndex = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    expect(unityIndex).toContain('Unity Phase 0');
    expect(unityIndex).toContain('pending build');
    // web-shell files untouched.
    expect(await readFile(join(webShellDist, 'index.html'), 'utf8')).toContain('phaser');
  });

  it('copies unity build files under /unity/ when unity build dir exists', async () => {
    await mkdir(join(unityBuild, 'Build'), { recursive: true });
    await writeFile(join(unityBuild, 'index.html'), '<html><body>unity</body></html>');
    await writeFile(join(unityBuild, 'Build', 'game.wasm'), 'wasm-bytes');
    await writeFile(join(unityBuild, 'Build', 'game.data'), 'data-bytes');

    const result = await mergeBuild({ webShellDist, unityBuild });

    expect(result.unityMode).toBe('copied');
    expect(result.filesCopied).toBe(3);
    const unityIndex = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    expect(unityIndex).toContain('<body>unity</body>');
    expect(await fileExists(join(webShellDist, 'unity', 'Build', 'game.wasm'))).toBe(true);
    expect(await fileExists(join(webShellDist, 'unity', 'Build', 'game.data'))).toBe(true);
    // web-shell files untouched.
    expect(await readFile(join(webShellDist, 'index.html'), 'utf8')).toContain('phaser');
  });

  it('is idempotent — running twice produces same output', async () => {
    await mergeBuild({ webShellDist, unityBuild });
    const first = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    await mergeBuild({ webShellDist, unityBuild });
    const second = await readFile(join(webShellDist, 'unity', 'index.html'), 'utf8');
    expect(second).toBe(first);
  });

  it('throws if webShellDist does not exist', async () => {
    await rm(webShellDist, { recursive: true });
    await expect(
      mergeBuild({ webShellDist, unityBuild }),
    ).rejects.toThrow(/web-shell.*dist/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane && bunx vitest run scripts/merge-build.test.ts 2>&1 | tail -30`

Expected: tests fail with module-not-found on `./merge-build` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

File: `scripts/merge-build.ts`

```typescript
#!/usr/bin/env bun
/**
 * Merges the Phaser web-shell build with the Unity WebGL build.
 *
 * - Phaser output at packages/web-shell/dist/ is left in place (served at `/`).
 * - Unity output (if present) at packages/unity-game/Build/WebGL/ is copied under
 *   packages/web-shell/dist/unity/ (served at `/unity/`).
 * - If the Unity build is missing (Phase 0a expected state), writes a placeholder
 *   dist/unity/index.html so Vercel deploys still produce a valid `/unity/` path.
 *
 * Invoked via `bun run build:all` (see root package.json).
 */

import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type MergeBuildOptions = {
  webShellDist: string;
  unityBuild: string;
};

export type MergeBuildResult = {
  unityMode: 'copied' | 'placeholder';
  filesCopied: number;
};

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unity Phase 0 — pending build</title>
  <style>
    body { margin: 0; display: grid; place-items: center; min-height: 100vh;
           background: #1a140a; color: #c8a04a;
           font-family: 'Galmuri11', 'Press Start 2P', system-ui, sans-serif; }
    .box { max-width: 480px; padding: 32px; text-align: center; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { margin: 6px 0; color: #b0a080; font-size: 14px; line-height: 1.5; }
    code { background: #2a2010; padding: 2px 6px; border-radius: 3px; color: #e0d0a0; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Unity Phase 0 — pending build</h1>
    <p>The Unity runtime has not produced a build yet. This placeholder page is emitted by
       <code>scripts/merge-build.ts</code> so the <code>/unity/</code> route stays healthy on Vercel.</p>
    <p>See <code>docs/unity-migration/phase-0b-runbook.md</code> for the steps to install Unity locally,
       register <code>UNITY_LICENSE</code>, and produce the first build.</p>
    <p><a href="/" style="color:#c8a04a">← back to Phaser build</a></p>
  </div>
</body>
</html>
`;

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  async function walk(d: string): Promise<void> {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(p);
      } else if (entry.isFile()) {
        count++;
      }
    }
  }
  await walk(dir);
  return count;
}

export async function mergeBuild(options: MergeBuildOptions): Promise<MergeBuildResult> {
  const { webShellDist, unityBuild } = options;

  if (!(await exists(webShellDist))) {
    throw new Error(`web-shell dist does not exist at ${webShellDist} — run \`bun run build:web\` first`);
  }

  const unityOut = join(webShellDist, 'unity');
  // Always rewrite /unity/ so merges are idempotent.
  await rm(unityOut, { recursive: true, force: true });
  await mkdir(unityOut, { recursive: true });

  if (await exists(unityBuild)) {
    await cp(unityBuild, unityOut, { recursive: true });
    const filesCopied = await countFiles(unityOut);
    return { unityMode: 'copied', filesCopied };
  }

  await writeFile(join(unityOut, 'index.html'), PLACEHOLDER_HTML, 'utf8');
  return { unityMode: 'placeholder', filesCopied: 1 };
}

async function main(): Promise<void> {
  const thisFile = fileURLToPath(import.meta.url);
  const repoRoot = resolve(dirname(thisFile), '..');
  const webShellDist = resolve(repoRoot, 'packages/web-shell/dist');
  const unityBuild = resolve(repoRoot, 'packages/unity-game/Build/WebGL');

  const result = await mergeBuild({ webShellDist, unityBuild });
  console.log(`[merge-build] unityMode=${result.unityMode} filesCopied=${result.filesCopied}`);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane && bunx vitest run scripts/merge-build.test.ts 2>&1 | tail -30`

Expected: all 4 tests pass.

- [ ] **Step 5: Smoke-run the script end-to-end**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
rm -rf packages/web-shell/dist/unity
bun run packages/web-shell/dist >/dev/null 2>&1 || true   # noop if dist empty
# Build Phaser first so the dist exists:
bun run build:web
bun run scripts/merge-build.ts
ls -la packages/web-shell/dist/unity/
cat packages/web-shell/dist/unity/index.html | head -20
```

Expected:
- `build:web` succeeds (existing passing build).
- `ls` shows `index.html` in `dist/unity/`.
- Head of `index.html` contains `Unity Phase 0 — pending build`.

- [ ] **Step 6: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add scripts/merge-build.ts scripts/merge-build.test.ts
git commit -m "$(cat <<'EOF'
feat(scripts): merge-build — phaser dist + unity WebGL 병합

packages/web-shell/dist/ 에 packages/unity-game/Build/WebGL/ 을 /unity/ 경로로
덮어쓴다. Unity 빌드가 없으면 (Phase 0a 기본 상태) placeholder /unity/index.html
을 출력해 Vercel 배포가 항상 건강한 /unity/ 응답을 유지하도록 한다.

idempotent (두 번 실행해도 동일 출력). web-shell dist 미존재 시 명시적 에러.
EOF
)"
```

---

## Task 7: Root `package.json` scripts + `vercel.json` rewrites

**Files:**
- Modify: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/package.json`
- Modify: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/vercel.json`

- [ ] **Step 1: Update root `package.json` scripts**

Edit `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/package.json`. Replace the `scripts` block with:

```json
  "scripts": {
    "dev:web": "bun run --filter web-shell dev",
    "dev:unity-preview": "bun run build:all && bun run --filter web-shell preview -- --port 8080",
    "build:web": "bun run --filter web-shell build",
    "build:unity": "cd packages/unity-game && Unity -batchmode -nographics -projectPath . -executeMethod GLD.BuildScripts.Editor.WebGLBuilder.Build -logFile -",
    "merge-build": "bun run scripts/merge-build.ts",
    "build:all": "bun run build:web && bun run merge-build",
    "test": "bun run --filter '*' test",
    "test:shared": "bun run --filter @gld/shared test",
    "test:phaser": "bun run --filter @gld/phaser-game test",
    "test:web": "bun run --filter web-shell test",
    "test:scripts": "bunx vitest run scripts",
    "lint": "bun run --filter '*' lint",
    "lint:check": "bunx biome check .",
    "generate:assets": "bun run scripts/generate-assets/generate-all.ts",
    "gld-pipe": "bun run scripts/gld-pipe/index.ts",
    "test:visual": "bun run --filter web-shell playwright",
    "test:visual:update": "bun run --filter web-shell playwright:update"
  },
```

Rationale:
- `build:all` chains web-shell build + merge-build. Vercel calls this.
- `build:unity` is documented but only runs on machines with Unity installed (local / GameCI).
- `dev:unity-preview` lets the user preview the merged output locally at port 8080 without running Unity itself (uses the placeholder).
- `test:scripts` runs the new scripts/ vitest suite.

- [ ] **Step 2: Update `vercel.json`**

Replace `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/vercel.json` with:

```json
{
  "buildCommand": "cd ../.. && bun run build:all",
  "outputDirectory": "dist",
  "installCommand": "cd ../.. && bun install",
  "framework": null,
  "rewrites": [
    { "source": "/unity/:path*", "destination": "/unity/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Key changes:
- `buildCommand` now runs `build:all` which emits `/unity/` content (either real Unity build or placeholder).
- Rewrite order matters: `/unity/*` virtual paths fall to `/unity/index.html` (Unity's router), everything else falls to `/` (React SPA router). Physical files bypass rewrites in Vercel.

- [ ] **Step 3: Smoke-test the wiring end-to-end**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
rm -rf packages/web-shell/dist
bun run build:all
test -f packages/web-shell/dist/index.html && echo "phaser OK"
test -f packages/web-shell/dist/unity/index.html && echo "unity placeholder OK"
bunx -- node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'));console.log('vercel.json parses')"
bunx -- node -e "
const p = require('./package.json');
const need = ['dev:web','dev:unity-preview','build:web','build:all','merge-build','test:scripts'];
const missing = need.filter(n => !p.scripts[n]);
if (missing.length) { console.error('missing:', missing); process.exit(1); }
console.log('scripts OK');
"
```

Expected output:
```
phaser OK
unity placeholder OK
vercel.json parses
scripts OK
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add package.json vercel.json
git commit -m "$(cat <<'EOF'
chore(build): build:all · merge-build 스크립트 + vercel /unity/ rewrite

- package.json: build:all = build:web + merge-build 체인. build:unity는 Unity
  설치 환경에서만 동작 (문서용). dev:unity-preview는 Unity 없이도 병합 결과를
  포트 8080에서 미리볼 수 있게 한다.
- vercel.json: buildCommand를 build:all 로 교체. rewrites에 /unity/:path* →
  /unity/index.html 을 SPA fallback보다 앞 순서로 추가. 실제 파일(/unity/Build/*.wasm)
  은 Vercel 기본 정책상 rewrite 이전에 직접 서빙된다.
EOF
)"
```

---

## Task 8: GitHub workflows — unity-build + unity-parity-gate stub

**Files:**
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/.github/workflows/unity-build.yml`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/.github/workflows/unity-parity-gate.yml`

- [ ] **Step 1: Write `unity-build.yml`**

File: `.github/workflows/unity-build.yml`

```yaml
name: Unity Build

on:
  push:
    branches: [main]
    paths:
      - 'packages/unity-game/**'
      - 'packages/shared/src/**'
      - '.github/workflows/unity-build.yml'
  pull_request:
    branches: [main]
    paths:
      - 'packages/unity-game/**'
      - 'packages/shared/src/**'
      - '.github/workflows/unity-build.yml'
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  skip-check:
    name: Skip on [skip-unity-build]
    runs-on: ubuntu-latest
    outputs:
      skip: ${{ steps.check.outputs.skip }}
    steps:
      - id: check
        run: |
          title="${{ github.event.pull_request.title }}"
          if [[ "$title" == *"[skip-unity-build]"* ]]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
          else
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi

  build-webgl:
    name: Build WebGL
    needs: skip-check
    if: needs.skip-check.outputs.skip != 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - name: Cache Unity Library
        uses: actions/cache@v4
        with:
          path: packages/unity-game/Library
          key: Library-WebGL-${{ hashFiles('packages/unity-game/Packages/manifest.json', 'packages/unity-game/ProjectSettings/ProjectVersion.txt') }}
          restore-keys: |
            Library-WebGL-
            Library-

      - name: Build with GameCI
        uses: game-ci/unity-builder@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
          UNITY_EMAIL: ${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
        with:
          projectPath: packages/unity-game
          targetPlatform: WebGL
          buildMethod: GLD.BuildScripts.Editor.WebGLBuilder.Build
          buildsPath: packages/unity-game/Build
          allowDirtyBuild: true

      - name: Report build size
        if: always()
        run: |
          if [ -d packages/unity-game/Build/WebGL ]; then
            size=$(du -sb packages/unity-game/Build/WebGL | cut -f1)
            echo "WebGL build size: $((size / 1024 / 1024)) MB"
            echo "webgl_size_bytes=$size" >> "$GITHUB_OUTPUT"
          else
            echo "::warning::WebGL build dir missing — build likely failed"
          fi

      - name: Upload WebGL artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: unity-webgl-${{ github.sha }}
          path: packages/unity-game/Build/WebGL
          retention-days: 30
          if-no-files-found: error
```

- [ ] **Step 2: Write `unity-parity-gate.yml`** (Phase 0a placeholder — always passes until Phase 3 adds the real parity harness)

File: `.github/workflows/unity-parity-gate.yml`

```yaml
name: Unity Parity Gate

# Placeholder workflow. Phase 3 wires the deterministic TS↔C# replay harness
# (packages/shared/src/testing/replay-runner.ts + Unity EditMode ReplayParityTests)
# and this workflow becomes required. Until then, this job is informational and
# always passes so PR status checks do not block Phase 0–2 work.

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  parity-gate-stub:
    name: Parity Gate (stub until Phase 3)
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - name: Announce placeholder status
        run: |
          cat <<'EOF'
          Unity Parity Gate is a Phase 0 placeholder.
          It will become required when Phase 3 adds the TS↔C# replay harness under
          packages/shared/src/testing/ and EditMode tests under
          packages/unity-game/Assets/Tests/EditMode/ParityAcceptance/.
          EOF
          echo "Stub status: PASS"
```

- [ ] **Step 3: Validate YAML parses**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
for f in .github/workflows/unity-build.yml .github/workflows/unity-parity-gate.yml; do
  bunx -- node -e "const yaml=require('fs').readFileSync('$f','utf8');const lines=yaml.split('\n').length;console.log('$f:', lines, 'lines')"
done
```

Expected: both files print their line counts without crashing (basic read smoke; structural validity is Unity/Actions-side).

Optional (if `actionlint` is installed):

```bash
which actionlint && actionlint .github/workflows/unity-build.yml .github/workflows/unity-parity-gate.yml || echo "actionlint not installed — skipping"
```

Expected: no errors, or the "not installed" fallback.

- [ ] **Step 4: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add .github/workflows/unity-build.yml .github/workflows/unity-parity-gate.yml
git commit -m "$(cat <<'EOF'
ci: Unity WebGL 빌드 워크플로 + parity-gate 스텁

- unity-build.yml: GameCI game-ci/unity-builder@v4 로 WebGL 빌드.
  paths 필터로 packages/unity-game/** 또는 shared/src/** 변경 시에만 트리거.
  Library/ 캐시로 재빌드 시간 단축. 산출물은 30일 보존 artifact.
  [skip-unity-build] PR 제목 키워드로 수동 skip.
  UNITY_LICENSE / UNITY_EMAIL / UNITY_PASSWORD secret 필요.

- unity-parity-gate.yml: Phase 3 전까지 항상 pass하는 플레이스홀더.
  Phase 3에서 TS↔C# replay 하네스와 EditMode ParityAcceptance 테스트가 붙으면
  required 승격.
EOF
)"
```

---

## Task 9: Phase 0b runbook + migration docs + README update

**Files:**
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/docs/unity-migration/README.md`
- Create: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/docs/unity-migration/phase-0b-runbook.md`
- Modify: `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/README.md`

- [ ] **Step 1: Create `docs/unity-migration/README.md`**

File: `docs/unity-migration/README.md`

````markdown
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
````

- [ ] **Step 2: Create `docs/unity-migration/phase-0b-runbook.md`**

File: `docs/unity-migration/phase-0b-runbook.md`

````markdown
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
git add packages/unity-game/Assets/Scripts packages/unity-game/Assets/UI packages/unity-game/BuildScripts
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
Unity -batchmode -nographics -projectPath "$PWD" \
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
````

- [ ] **Step 3: Update repo-root `README.md`**

Edit `/Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane/README.md`:

Find the block starting with ``` around line 25 (`packages/` / `shared/` / `phaser-game/` / `web-shell/`) and replace with:

```
packages/
  shared/           @gld/shared — TypeScript 타입, 상수, 이벤트 계약
  phaser-game/      @gld/phaser-game — Phaser 3 게임 엔진 (legacy 런타임)
  web-shell/        React SPA. Phaser 게임 임베드, 로비, 설정, 상태 관리
  unity-game/       Unity 2D WebGL 포트 (Phase 0 스캐폴드). /unity/ 경로로 병행 서빙

scripts/
  generate-assets/  @napi-rs/canvas 기반 절차적 픽셀 아트 생성 파이프라인
  merge-build.ts    web-shell dist + unity-game Build/WebGL 병합 → /unity/
```

Also replace the Roadmap table (at the bottom of the README, around line 72) with:

```markdown
## 로드맵

| 트랙 | 설명 | 상태 |
|------|------|------|
| R1 | 정식 모드 확정 — 소환/합성/가챠/보스/로그라이크/메타 shell + 4 안정화 픽스 | **완료** |
| R1 | 메타 루프 본 구현 — `metaProgressStore` 영속화, `globalAtkPct` 주입 | **shell 완료** |
| R1 | BM stub — `AdService` + `MockAdService`, 이어서 하기 (1회/런) | **완료** |
| R2 | 타워 강화 UX 확장 / 메타 퍽 선택 UI / 맵 2~3종 / FTUE 튜토리얼 | 계획 |
| Unity migration | Phase 0 스캐폴드 (unity-game 패키지 + CI + /unity/ 라우트) | **진행 중** |
| Unity migration | Phase 1~7 (데이터/에셋 → PoC → 코어 루프 → 합성/보스 → UI → 저장/오디오 → parity gate) | 계획 |
| Unity migration | Phase 8 (Unity default 승격, phaser freeze) | 계획 |
| R3 | 실광고 SDK 연결, LiveOps, 서버 동기화, BM 본격화 | 계획 |

자세한 트랙 정의는 `docs/game-spec/06-milestone.md` 참조. Unity 마이그레이션 플랜/런북은 `docs/unity-migration/` 참조.
```

Also update the command table (around line 46) — add `dev:unity-preview`:

```markdown
| `bun dev:web` | Vite 개발 서버 (port 3000) |
| `bun dev:unity-preview` | Unity 병합 빌드를 port 8080에서 미리보기 (Unity 미설치 환경도 placeholder로 동작) |
| `bun build:web` | TypeScript + Vite 프로덕션 빌드 |
| `bun build:all` | build:web + scripts/merge-build.ts 체인 (Vercel이 호출) |
| `bun test` | 전체 테스트 실행 |
| `bun test:shared` | @gld/shared 테스트 |
| `bun test:phaser` | @gld/phaser-game 테스트 |
| `bun test:web` | web-shell 테스트 |
| `bun test:scripts` | scripts/*.test.ts 테스트 (merge-build 등) |
| `bun lint` | 전체 lint |
| `bun lint:check` | Biome check |
| `bun generate:assets` | 픽셀 아트 에셋 전체 재생성 (생성 스크립트 변경 시에만 필요, 산출물은 git에 함께 커밋) |
```

- [ ] **Step 4: Verify docs coherence**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
rg -n "unity-game|dev:unity-preview|Unity Phase 0|Phase 0b" README.md docs/unity-migration/
```

Expected: matches in `README.md` and both new docs/unity-migration files.

- [ ] **Step 5: Commit**

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git add docs/unity-migration README.md
git commit -m "$(cat <<'EOF'
docs(unity-migration): Phase 0b 사용자 런북 + README 모노레포 · 로드맵 업데이트

- docs/unity-migration/README.md: 마이그레이션 중 현행 운영 문서 index.
- docs/unity-migration/phase-0b-runbook.md: UNITY_LICENSE secret 등록, Unity 6 LTS
  로컬 설치, Boot/Root 씬 생성, 첫 빌드까지 액션 리스트.
- README.md: packages/unity-game 행 추가, dev:unity-preview / build:all 명령 설명,
  로드맵 테이블에 Unity migration 트랙 3줄 추가.
EOF
)"
```

---

## Task 10: Final Phase 0a verification + PR prep

**Files:** no new files; verifies and summarises.

- [ ] **Step 1: Full test sweep**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
bun run test:shared
bun run test:phaser
bun run test:web
bunx vitest run scripts/merge-build.test.ts
```

Expected: all four suites pass. (Phaser/shared/web unchanged — Phase 0 is additive to them — so existing tests should still pass.)

- [ ] **Step 2: Lint**

Run: `bun run lint:check`

Expected: no Biome errors introduced by the new TS files. If `scripts/merge-build.ts` or `scripts/merge-build.test.ts` triggers style warnings, fix inline (prefer `bun run --filter '*' lint --write` to auto-fix, then re-run `lint:check`).

- [ ] **Step 3: End-to-end build smoke**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
rm -rf packages/web-shell/dist
bun run build:all
ls -la packages/web-shell/dist/unity/
bunx -- node -e "
const fs = require('fs');
const html = fs.readFileSync('packages/web-shell/dist/unity/index.html','utf8');
if (!html.includes('Unity Phase 0')) { console.error('missing label'); process.exit(1); }
console.log('placeholder OK:', html.length, 'bytes');
"
```

Expected:
- `dist/index.html` present (Phaser).
- `dist/unity/index.html` present, contains `Unity Phase 0`.

- [ ] **Step 4: Confirm git state**

Run:

```bash
cd /Users/jy/.superset/worktrees/castle-wall-tower-defense/endurable-hurricane
git status
git log --oneline main..HEAD
```

Expected:
- Working tree clean.
- 9 commits on `endurable-hurricane` ahead of main (one per Task 1–9; Task 10 creates no commit).

Commit subjects should read in order:
1. `docs(agents): Unity 4종 subagent 스코프별 이중 사용 규칙 명시`
2. `feat(unity-game): 패키지 스켈레톤 — .gitignore · README · UPM manifest`
3. `feat(unity-game): asmdef 경계 5종 · Phase 0 label 컴포넌트`
4. `feat(unity-game): WebGLTemplate GLDMobilePortrait (Phase 0)`
5. `feat(unity-game): BuildScripts WebGL 빌더 (Brotli + IL2CPP + 256MB heap)`
6. `feat(scripts): merge-build — phaser dist + unity WebGL 병합`
7. `chore(build): build:all · merge-build 스크립트 + vercel /unity/ rewrite`
8. `ci: Unity WebGL 빌드 워크플로 + parity-gate 스텁`
9. `docs(unity-migration): Phase 0b 사용자 런북 + README 모노레포 · 로드맵 업데이트`

- [ ] **Step 5: Announce handoff**

**No further commit.** Announce that Phase 0a is complete and request one of:
- Review the commits locally, then push to `origin/endurable-hurricane` and open a PR with the body from `docs/unity-migration/phase-0b-runbook.md` summary + a link to this plan. **Don't push without user approval.**
- Or: fix any issues the user surfaces before push.

After PR lands, the user executes Phase 0b (runbook), then commissions subsequent phase plans (Phase 1 data/asset pipeline first).

---

## Self-Review

**Spec coverage (Phase 0 deliverables from the migration spec):**
- `packages/unity-game/` 스캐폴드 → Tasks 2, 3
- UPM manifest → Task 2
- WebGLTemplate → Task 4
- `.github/workflows/unity-build.yml` (GameCI) → Task 8
- `scripts/merge-build.ts` → Task 6
- `vercel.json` rewrites → Task 7
- `.claude/agents/README.md` · `AGENTS.md` Unity 4종 이중 규칙 → Task 1
- Exit gate "`<preview>.vercel.app/unity/` 'Unity Phase 0' UXML 라벨 + iOS Safari 실기 로드" → Phase 0b (Task 9 runbook)

**Out of Phase 0 scope, deferred to later plans:**
- `scripts/export-shared-to-json.ts` → Phase 1
- `packages/shared/package.json` build:unity-json → Phase 1
- `Assets/_Project/Scenes/*.unity` → Phase 0b (user generates via Unity)
- `packages/unity-game/ProjectSettings/*` → Phase 0b
- `packages/unity-game/Assets/UI/Runtime/PanelSettings.asset` → Phase 0b (user creates in Editor)

**Placeholder scan:** no "TBD" / "implement later" / generic "add error handling" in task bodies. All code blocks are complete.

**Type consistency:** `mergeBuild({ webShellDist, unityBuild })` signature matches between test and implementation. `MergeBuildResult.unityMode` values (`'copied'` | `'placeholder'`) and `filesCopied` (number) match. `GLDPhase0Label` component name matches UXML `phase0-label` element reference (via `root.Q<Label>(LabelElementName)`). asmdef names (`GLD.Core`, `GLD.Systems`, `GLD.SceneRuntime`, `GLD.UI`, `GLD.Data`, `GLD.BuildScripts`) are consistent across files and commit messages.
