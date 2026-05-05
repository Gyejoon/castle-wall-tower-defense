---
name: agency-unity-game-dev
description: Use when working with Unity game-development agents from msitarzewski/agency-agents in Codex, including Unity Architect, Unity Editor Tool Developer, Unity Multiplayer Engineer, Unity Shader Graph Artist, Unity 2D WebGL work under packages/unity-game, ScriptableObject architecture, editor tooling, multiplayer, shaders, URP, or requests that mention "agency-agents" Unity agents.
---

# Agency Unity Game Dev

This project keeps the original `msitarzewski/agency-agents` Claude subagent prompts in `.claude/agents/`. Codex does not route those files as native agent roles, so this skill is the Codex adapter: load the relevant original prompt, apply it as domain guidance, and keep repository rules in `AGENTS.md` above generic persona advice.

## Source Prompts

Read only the prompt needed for the task:

- Unity architecture, C# systems, ScriptableObjects, prefab/data flow: `.claude/agents/unity-architect.md`
- Unity Editor automation, import validation, custom inspectors, build checks: `.claude/agents/unity-editor-tool-developer.md`
- Netcode for GameObjects, Relay/Lobby, authority, sync, prediction: `.claude/agents/unity-multiplayer-engineer.md`
- Shader Graph, HLSL, URP/HDRP render passes, material/VFX budgets: `.claude/agents/unity-shader-graph-artist.md`

For source, import SHA, license, and scope notes, read `.claude/agents/README.md` when provenance or redistribution matters.

## Scope Rules

- For `packages/unity-game/`, use the Unity prompts directly for C#/ScriptableObject/URP/Editor-tool design and review.
- For `packages/phaser-game/` or `packages/web-shell/`, use Unity prompts only as architecture-pattern references. Do not emit Unity-specific implementation for Phaser/React runtime code.
- For `packages/shared/`, keep shared types engine-neutral. Use Unity prompts only to check how shared data would map to a ScriptableObject catalog.
- Repository game changes still start from `docs/game-spec/` and must update relevant spec docs after implementation.

## Codex Workflow

1. Classify the task by scope: Unity runtime, Unity editor tooling, multiplayer, rendering, shared data, or Phaser/web-shell reference-only.
2. Load the matching source prompt from `.claude/agents/`.
3. Inspect relevant repository files before editing. For Unity implementation, check nearby `.cs`, `.asmdef`, `Assets/Data/*.asset`, `Packages/manifest.json`, and applicable docs.
4. Apply the agent guidance conservatively:
   - Prefer ScriptableObject-driven data and Inspector-wired references for Unity runtime code.
   - Keep Editor API usage inside `Editor` folders or `#if UNITY_EDITOR`.
   - Keep multiplayer server-authoritative and validate all client input.
   - Keep Shader Graph/HLSL work tied to URP/HDRP pipeline constraints and mobile budgets.
5. Validate with the narrowest available command. If Unity batchmode is unavailable, report that explicitly and run static checks that are possible in this environment.

## Multi-Agent Use

If the user explicitly asks for multiple agents, parallel agents, delegation, or a review by specific Unity personas, use Codex subagents with the relevant source prompt content or path named in the delegated task. Otherwise, emulate the selected Unity persona locally in the current Codex session.
