# Unity Migration Phase 8 — Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Plan quality caveat:** Phase 8 is **small in code** (spec size "S") but **high-risk in decisions**. This is the flag-day cutover: Unity becomes default at `/`, Phaser falls back to `?engine=legacy`. No new features. Requires user decisions on rollback policy and explicit go/no-go on the swap day. Most tasks are config changes + runbook authoring; the agent is **review-only** (Unity Architect on deprecation checklist).

**Goal:** Unity build serves as the default at `/` on production, Phaser build remains available as a fallback via `?engine=legacy` for 6 weeks. Rollback drill proves <5 minute reversion. Phaser package is marked frozen. 72h post-swap Sentry error rate for `unity-*` release stays <0.5%.

**Architecture:** `vercel.json` rewrites invert: `/` now serves Unity, `/legacy/` or `?engine=legacy` serves Phaser. `scripts/merge-build.ts` updated: Phaser output goes under `/legacy/`, Unity output at root. `?engine=legacy` URL param in both builds routes to the alternate. `release-smoke.yml` workflow runs post-deploy smoke on 8–12 real devices (BrowserStack) or Playwright emulation if no secret. `scripts/rollback-drill.sh` flips Vercel env flag and verifies recovery. `docs/unity-migration/rollback-runbook.md` is the operator manual.

**Tech Stack:** Vercel · GitHub Actions · Playwright (or BrowserStack) · Sentry · bun scripts.

---

## Scope boundary

**In:**
- `vercel.json` inverted rewrites
- `scripts/merge-build.ts` updated to place Phaser under `/legacy/` and Unity at root
- `packages/phaser-game/README.md` freeze notice
- `docs/unity-migration/rollback-runbook.md`
- `scripts/rollback-drill.sh` + scheduled CI run
- `release-smoke.yml` (new) — post-deploy smoke on real/emulated devices
- Sentry alert policy for `unity-*` release rate >0.5%
- 72h post-swap monitoring period declared successful before Phase 8 done

**Out:**
- Phaser package deletion (separate Phase 9 spec, 6 weeks post-swap)
- Any new gameplay
- A/B test infrastructure (spec says flag-day; A/B is the explicit alternate if risk surfaces)
- Supabase session migration (Phase 8 + 1 spec)
- Real ad SDK (R3 scope)

## Dependencies

- Phase 7 merged: all parity gates green, QA checklist 2-person pass, 7-night soak clean.
- Vercel project admin access.
- Sentry project admin access.
- `UNITY_LICENSE` stable on CI.

## Pre-plan: user decision checkpoints

Before any cutover task executes, user must confirm:

1. **Go/no-go**: Final QA evidence from Phase 7 reviewed, no outstanding blockers.
2. **Rollback policy**: In case of Sentry error rate >0.5% in 72h window, instant flip to Phaser via `rollback-runbook.md`; what's the on-call rotation?
3. **Phaser bake period duration**: Spec default = 6 weeks. Adjustable.
4. **Cutover timing**: Day of week / timezone. Low-traffic window recommended.

## Pre-plan agent consultation

- **Unity Architect** — review the deprecation checklist, sign off on "no tight coupling remaining between phaser-game and unity-game that would block freeze".

---

## File Structure

### Create
- `docs/unity-migration/rollback-runbook.md`
- `docs/unity-migration/phase-8-go-nogo-checklist.md`
- `scripts/rollback-drill.sh`
- `.github/workflows/release-smoke.yml`
- `.github/workflows/rollback-drill.yml` (scheduled run of rollback-drill.sh weekly)

### Modify
- `vercel.json` — invert `/` ↔ `/unity/`
- `scripts/merge-build.ts` — Phaser goes to `/legacy/`, Unity to root. Placeholder behavior now: if Unity build missing, Phaser still served at root (safety fallback during cutover iteration).
- `packages/phaser-game/README.md` — add "Feature freeze" banner + last-commit-before-freeze tag, maintenance policy
- `README.md` — update roadmap "Unity migration Phase 8 complete" when done
- `package.json` — no change expected; `build:all` already chains correctly
- Sentry project settings — environment alert rules (done outside code; documented in runbook)

---

## Tasks

### Task 1: Go/no-go checklist + Unity Architect deprecation review

**Files:**
- Create: `docs/unity-migration/phase-8-go-nogo-checklist.md`

- [ ] **Step 1**: Compile go/no-go checklist. Items: Phase 7 exit gates all green, last 7 nightly-soak clean, Sentry baseline captured, team/on-call ready.
- [ ] **Step 2**: Invoke Unity Architect agent with `packages/phaser-game/**` and `packages/unity-game/**` — ask: is there any remaining coupling that would break if phaser-game is frozen? List risks.
- [ ] **Step 3**: If Architect surfaces risks (e.g., shared code that's mutated only by Phaser-side tests), log them. Small risks → fix now; large risks → user decides to proceed or hold.
- [ ] **Step 4**: User acknowledges checklist.
- [ ] **Step 5**: Commit `docs(phase-8): go/no-go checklist + architect deprecation review`.

### Task 2: `merge-build.ts` inversion + `vercel.json` rewrites

**Files:**
- Modify: `scripts/merge-build.ts`
- Modify: `vercel.json`

- [ ] **Step 1**: Update `scripts/merge-build.ts`:
  - Treat Unity build as the primary output, copied to root of the output dir.
  - Treat Phaser build as secondary, copied under `legacy/`.
  - Safety fallback: if Unity build is missing (shouldn't happen in prod but defensive), fall back to serving Phaser at root.
  - Update tests to cover new behaviors.
- [ ] **Step 2**: Update `vercel.json`:
  ```json
  {
    "buildCommand": "cd ../.. && bun run build:all",
    "outputDirectory": "dist",
    "installCommand": "cd ../.. && bun install",
    "framework": null,
    "rewrites": [
      { "source": "/legacy/:path*", "destination": "/legacy/index.html" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- [ ] **Step 3**: Unity build's UrlParamRouter should honor `?engine=legacy` by redirecting the browser to `/legacy/` (preserving query params).
- [ ] **Step 4**: Phaser build's `App.tsx` should honor `?engine=unity` (or just if user lands on `/legacy/` and wants to switch back) by redirecting to `/`.
- [ ] **Step 5**: Update merge-build test to assert new output shape.
- [ ] **Step 6**: Local smoke: `bun run build:all`, verify `/` is Unity, `/legacy/` is Phaser.
- [ ] **Step 7**: Commit `feat(cutover): merge-build + vercel.json invert — Unity default at /`.

### Task 3: `rollback-runbook.md`

**Files:**
- Create: `docs/unity-migration/rollback-runbook.md`

- [ ] **Step 1**: Write runbook with exact Vercel steps to revert:
  - Option A (fastest, <5 min): Vercel project → Deployments → click the last green pre-cutover deploy → "Promote to Production". This puts Phaser-default back at `/`.
  - Option B (git revert): `git revert <cutover-commit>` → push → Vercel auto-deploys.
  - Both options preserve existing user localStorage (v8 and v9 both present).
- [ ] **Step 2**: Explicitly call out that v9 users remain on v9 data even after rollback — Phaser will load v8 via its migration path, v9 is ignored by Phaser (forward-compat concern raised here, mitigated by Phaser-side v9 ignore-with-warning).
- [ ] **Step 3**: On-call contact / escalation rules.
- [ ] **Step 4**: Commit `docs(phase-8): rollback runbook (<5min revert via Vercel promote)`.

### Task 4: `rollback-drill.sh` + automated weekly run

**Files:**
- `scripts/rollback-drill.sh`
- `.github/workflows/rollback-drill.yml`

- [ ] **Step 1**: Write `scripts/rollback-drill.sh` — safe drill (does NOT touch production): builds Unity + Phaser locally, simulates the Vercel env flag flip via local merge-build invocation with `ENGINE_DEFAULT=legacy`, verifies `http://localhost:8080/` responds 200 with Phaser bundle, and `http://localhost:8080/legacy/` serves the alternate.
- [ ] **Step 2**: Write `rollback-drill.yml` — cron weekly, runs drill script, uploads logs. Informational status.
- [ ] **Step 3**: On drill failure: Slack notification (if `SLACK_WEBHOOK_URL` secret present); otherwise annotation on workflow run.
- [ ] **Step 4**: Commit `ci(cutover): weekly rollback drill (safe, local-only)`.

### Task 5: `release-smoke.yml` (post-deploy real-device smoke)

**Files:**
- `.github/workflows/release-smoke.yml`
- `tests/smoke/release-smoke-suite.spec.ts` (Playwright)

- [ ] **Step 1**: Write `release-smoke.yml` — triggers on Vercel deployment webhook (or on successful push to `main`). Runs Playwright smoke against the production URL.
- [ ] **Step 2**: Matrix: if `BROWSERSTACK_USERNAME`/`ACCESS_KEY` secrets present, runs 8–12 real devices (iPhone 12/13/SE + Pixel 6 + Galaxy S20 + desktop Chrome/Safari/Firefox). Otherwise falls back to Playwright webkit + chromium mobile device descriptors.
- [ ] **Step 3**: Smoke assertions: first-paint <4s, `data-ready` attribute appears on the scene root within 15s, simulated touch tap fires a `window.__gld_events` log entry (add this test-only bridge to Unity build gated by `?smoke=1`).
- [ ] **Step 4**: Failure → revert runbook invoked by on-call (manual), Slack alert.
- [ ] **Step 5**: Commit `ci(cutover): release-smoke post-deploy matrix`.

### Task 6: Phaser freeze notice

**Files:**
- Modify: `packages/phaser-game/README.md`
- Modify: `README.md`

- [ ] **Step 1**: Add banner to `packages/phaser-game/README.md`:
  ```markdown
  > **⚠️ Feature freeze — Phase 8 of Unity migration.**
  >
  > Since <cutover date>, this package receives maintenance fixes only. New gameplay features land in `packages/unity-game/`. After 6 weeks of stable Unity production (no rollbacks, Sentry error rate <0.5%), this package will be deleted per Phase 9 spec.
  ```
- [ ] **Step 2**: Update root `README.md` roadmap — mark Unity migration Phase 8 "완료 <date>", note Phaser freeze status.
- [ ] **Step 3**: Commit `docs(phase-8): phaser-game feature freeze notice + roadmap update`.

### Task 7: Sentry alert policy + monitoring setup

**Files:**
- Modify: `docs/unity-migration/rollback-runbook.md` (append monitoring section)

- [ ] **Step 1**: In Sentry UI: configure alert rule — if `environment:web-unity` release `unity-*` error rate >0.5% in a 1h window, Slack-notify + email on-call.
- [ ] **Step 2**: Configure performance alert — if `p95 LCP` degrades by >20% vs baseline, alert.
- [ ] **Step 3**: Document alert URLs + runbook cross-link in rollback runbook monitoring section.
- [ ] **Step 4**: Commit `docs(phase-8): Sentry alert rules + monitoring links`.

### Task 8: Cutover deploy + 72h monitoring

**Files:**
- None new; this is the live swap.

- [ ] **Step 1**: On go-day (low traffic window per user decision): land the PR containing Tasks 2–7 commits. Vercel auto-deploys.
- [ ] **Step 2**: `release-smoke.yml` runs automatically on deploy → verify green.
- [ ] **Step 3**: Open production URL, verify `/` serves Unity, `/legacy/` serves Phaser. Spot-check: mobile Safari, Android Chrome, desktop.
- [ ] **Step 4**: Monitor Sentry dashboard for 72h. Error rate must stay <0.5% in `unity-*` release.
- [ ] **Step 5**: If any metric breaches threshold during 72h, invoke rollback runbook (Option A) — no heroics, revert first, analyze second.
- [ ] **Step 6**: After 72h clean: commit `chore(phase-8): cutover monitoring window passed — Unity default on production`.

### Task 9: Close-out

**Files:**
- Create: `docs/unity-migration/phase-8-close-out.md`

- [ ] **Step 1**: Summarize cutover evidence: Sentry metrics across 72h, release-smoke logs, user-facing regression reports (hopefully empty), rollback drill status.
- [ ] **Step 2**: Next-step plan: Phase 9 (phaser-game deletion) spec to be written +6 weeks post-cutover.
- [ ] **Step 3**: Commit `docs(phase-8): cutover close-out + Phase 9 scheduling`.

## Exit gate verification

From spec Phase 8 row:
- [ ] Default Unity state 72h Sentry error rate <0.5% (Task 8)
- [ ] Rollback drill <5 min success (Task 4 weekly — plus manual practice once before cutover)

## Self-review

**Spec coverage (Phase 8 deliverables):**
- `vercel.json` 역전 → Task 2
- `?engine=legacy` 회귀 → Task 2 Steps 3, 4
- `rollback-runbook.md` → Task 3
- phaser-game freeze 고지 → Task 6

**User decisions required (not executable by Claude alone):**
- Go/no-go (Task 1 checkpoint 4)
- Cutover timing (Task 8 depends on it)
- Sentry alert rule creation (Task 7 — requires Sentry admin UI access)

**Agent role in Phase 8:** Per spec, agents are **review-only** here (Unity Architect on deprecation checklist Task 1). No design authority is delegated.

**Deferred to Phase 9 (separate spec):**
- `packages/phaser-game/` deletion
- `packages/web-shell/` deletion or conversion
- Removal of `/legacy/` route
- Removal of `?engine=legacy` routing

**Safety-net decisions:**
- Phaser bake period default 6 weeks — shortens on exceptional stability, extends on incidents.
- Both v8 and v9 localStorage keys remain during bake — lets users flip back and forth without data loss.
- Rollback Option A (Vercel promote) is preferred over Option B (git revert) for speed.
