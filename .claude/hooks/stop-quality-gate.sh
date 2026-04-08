#!/bin/bash
set -euo pipefail

# Stop hook: mandatory quality gate
# Replaces stop-ralreview.sh with enforced lint + test + ralreview checks

HOOK_INPUT=$(cat)

# ──────────────────────────────────────
# Phase 0: Skip conditions
# ──────────────────────────────────────

# Skip if SKIP_GATE is active
if [[ -f .claude/.skip-gate ]]; then
  echo "Quality gate skipped (SKIP_GATE active)."
  exit 0
fi

# Skip if ralph-loop is running (has its own quality loop)
if [[ -f .claude/ralph-loop.local.md ]]; then
  exit 0
fi

# Skip if ralreview is in progress
if [[ -f .ralreview-state.json ]]; then
  STATUS=$(jq -r '.status // "unknown"' .ralreview-state.json 2>/dev/null || echo "unknown")
  if [[ "$STATUS" == "in_progress" ]]; then
    exit 0
  fi
fi

# Check for .ts/.tsx changes (staged + unstaged)
CODE_FILES=$(git diff --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
ALL_CODE_FILES="${CODE_FILES}${CODE_FILES:+$'\n'}${STAGED_FILES}"

if [[ -z "$ALL_CODE_FILES" ]]; then
  # No code changes, allow exit
  exit 0
fi

# ──────────────────────────────────────
# Phase 1: Lint verification
# ──────────────────────────────────────

LINT_OUTPUT=$(bunx biome check . 2>&1) || {
  cat >&2 <<EOF
QUALITY GATE BLOCKED: Lint
─────────────────────
$(echo "$LINT_OUTPUT" | tail -30)

Action: \`bunx biome check --write .\` 실행 후 재시도
EOF
  exit 2
}

# ──────────────────────────────────────
# Phase 2: Test verification
# ──────────────────────────────────────

TEST_OUTPUT=$(timeout 180 bun run test 2>&1) || {
  cat >&2 <<EOF
QUALITY GATE BLOCKED: Test
─────────────────────
$(echo "$TEST_OUTPUT" | tail -30)

Action: 실패 테스트 수정 후 재시도
EOF
  exit 2
}

# ──────────────────────────────────────
# Phase 3: Ralreview verification
# ──────────────────────────────────────

if [[ ! -f .ralreview-state.json ]]; then
  cat >&2 <<EOF
QUALITY GATE BLOCKED: Ralreview
─────────────────────
ralreview가 실행되지 않았습니다.

Action: /ralreview 실행 후 재시도
EOF
  exit 2
fi

SCORE=$(jq -r '.score // 0 | floor' .ralreview-state.json 2>/dev/null || echo "0")
STATUS=$(jq -r '.status // "unknown"' .ralreview-state.json 2>/dev/null || echo "unknown")

if [[ "$STATUS" != "pass" ]] || [[ "$SCORE" -lt 58 ]]; then
  cat >&2 <<EOF
QUALITY GATE BLOCKED: Ralreview
─────────────────────
ralreview 점수 미달 (현재: ${SCORE}/70, 필요: 58/70, 상태: ${STATUS})

Action: /ralreview 재실행
EOF
  exit 2
fi

# ──────────────────────────────────────
# All phases passed — trigger learning loop
# ──────────────────────────────────────

bash .claude/hooks/update-quality-tracker.sh 2>/dev/null || true

echo "Quality Gate PASSED (lint + test + ralreview ${SCORE}/70)"
exit 0
