# Docs Refresh Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Target:** `README.md`, `AGENTS.md`, root `PLAN.md`

## 1. Problem Statement

The root documentation no longer matches what the repository actually ships today.

- `README.md` still reads like an earlier prototype summary and under-explains the current mobile-first vertical slice.
- `AGENTS.md` contains useful architecture notes, but it is too broad in some places and stale in others for an agent trying to make safe edits quickly.
- Root `PLAN.md` is a completed execution checklist from a past slice, and keeping it at the repo root makes it look like the current source of truth when planning now lives under `docs/superpowers/`.

## 2. Goals

1. Rewrite `README.md` around the current playable build, not the older prototype framing.
2. Keep long-term ambitions like networked PvP and payments visible, but only in roadmap sections.
3. Reshape `AGENTS.md` into a practical working guide for coding agents entering this repo now.
4. Remove root `PLAN.md` so the root only contains active entry-point docs.
5. Keep the edits factual, concise, and grounded in the current codebase.

## 3. Non-Goals

1. No product repositioning beyond what the current build already demonstrates.
2. No new planning system or replacement root planning file.
3. No speculative feature documentation for systems that do not exist yet.
4. No code changes, dependency changes, or gameplay changes as part of this task.

## 4. Recommended Approach

### Approach A, recommended: Current-build-first docs refresh

Lead both docs from the current mobile vertical slice and support contributors from that reality.

Why this is the right choice:
- A new reader should understand what happens when they run `bun dev:web` today.
- It reduces confusion between implemented features and roadmap intent.
- It keeps the repo root cleaner by removing an old completed plan artifact.

### Approach B: Vision-first narrative

Lead with the eventual 1:1 PvP product vision, then explain the current implementation underneath.

Trade-off:
- Better for pitching the long-term game direction.
- Worse for setup accuracy and day-one contributor clarity.

### Approach C: Equal split between current build and future vision

Give both current state and future direction equal weight throughout the docs.

Trade-off:
- More balanced on paper.
- Easier to become verbose and blur what is real versus planned.

## 5. Documentation Design

### 5.1 README.md

README should answer four questions quickly:

1. What is this repo right now?
2. What can I do when I run it?
3. How is the monorepo organized?
4. What is already built versus still planned?

Planned structure:

1. **Title + short summary**
   - Describe the game as a mobile-first vertical slice of Palace random tower defense.
2. **What’s in the current build**
   - Mention the three-tab lobby, AI battle flow, random tower purchase, drag merge, emotes, result overlay, and mobile shell.
3. **Tech stack**
   - Keep it short and factual: React, Phaser, Zustand, Vite, Bun workspaces, Vitest, PWA tooling, Sentry.
4. **Monorepo structure**
   - Explain `shared`, `phaser-game`, `web-shell`, and `scripts/generate-assets`.
5. **Getting started**
   - Use real root scripts from `package.json`.
6. **Available commands**
   - Include `dev`, `build`, `test`, `lint`, and asset generation commands that exist now.
7. **Gameplay and architecture highlights**
   - Briefly explain EventBus, run state flow, AI opponent loop, and asset pipeline without turning README into deep internal docs.
8. **Roadmap**
   - Keep networking, payments, and later production phases here.

### 5.2 AGENTS.md

AGENTS should be optimized for safe repo entry and quick orientation.

Planned structure:

1. **Project snapshot**
   - What the repo currently ships and what is still mocked or staged.
2. **Workspace map**
   - Which package owns shared contracts, game runtime, and React shell.
3. **Critical runtime flows**
   - EventBus contract, `runStatus` transitions, reset/lobby flow, tower selection and placement feedback.
4. **High-signal files**
   - Point agents to the exact files that usually matter first.
5. **Commands**
   - Real setup, test, build, and lint commands from the root.
6. **Edit guidance**
   - Warn that shared event/type changes require syncing both Phaser and React consumers.
   - Distinguish current implemented UI from mock lobby data where relevant.

### 5.3 PLAN.md removal

Delete the root `PLAN.md` because it is a completed checklist for an already-finished slice and no longer belongs as a root-level source of truth.

README and AGENTS may mention that active specs and plans live under `docs/superpowers/` when helpful, but they should not recreate the old file.

## 6. Data and Source of Truth

The refresh should rely on the current repository state:

- Root scripts in `package.json`
- Workspace package manifests
- `packages/web-shell/src/App.tsx`, `pages/LobbyPage.tsx`, `pages/GamePage.tsx`
- `packages/web-shell/src/stores/gameStore.ts`
- `packages/phaser-game/src/scenes/Game.ts`
- Shared tower, unit, and event definitions under `packages/shared/src/`
- Existing public assets and manifest files under `packages/web-shell/public/`

## 7. Risks and Mitigations

### Risk 1: Overstating fully shipped PvP

The UI frames the experience like a versus battle, but the current runtime is AI-driven.

Mitigation:
- README and AGENTS should call it an AI-opponent vertical slice or current battle implementation, while keeping full PvP in roadmap language.

### Risk 2: Mixing real systems with mock data

Some lobby data is still mock-driven.

Mitigation:
- AGENTS should explicitly note mock lobby/profile/collection data where it affects edits.

### Risk 3: Preserving stale commands

Old docs already missed current scripts like `test:phaser`, `lint`, `lint:check`, and `generate:assets`.

Mitigation:
- Copy command names directly from the current root `package.json` and only document existing ones.

## 8. Verification

After edits:

1. Re-read `README.md` and check that every command exists in `package.json`.
2. Re-read `AGENTS.md` and check each referenced file still exists.
3. Confirm root `PLAN.md` has been removed.
4. Ensure roadmap items are clearly separated from implemented features.
5. Ensure no section claims networked live PvP or production backend systems already exist.

## 9. Deliverables

1. Updated `README.md`
2. Updated `AGENTS.md`
3. Deleted root `PLAN.md`
