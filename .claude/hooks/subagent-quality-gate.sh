#!/bin/bash
set -euo pipefail

# SubagentStop hook: lightweight quality gate for subagents
# Checks lint + changed-package tests only (no ralreview)

HOOK_INPUT=$(cat)

# Phase 0: Skip conditions
if [[ -f .claude/.skip-gate ]]; then
  exit 0
fi

# Check for .ts/.tsx changes
CODE_FILES=$(git diff --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
ALL_CODE_FILES="${CODE_FILES}${CODE_FILES:+$'\n'}${STAGED_FILES}"

if [[ -z "$ALL_CODE_FILES" ]]; then
  exit 0
fi

# Phase 1: Lint verification
LINT_OUTPUT=$(bunx biome check . 2>&1) || {
  cat >&2 <<EOF
SUBAGENT GATE BLOCKED: Lint
─────────────────────
$(echo "$LINT_OUTPUT" | tail -20)

Action: \`bunx biome check --write .\` 실행 후 재시도
EOF
  exit 2
}

# Phase 2: Changed-package tests
CHANGED_PKGS=$(echo "$ALL_CODE_FILES" | grep -oE 'packages/[^/]+' | sort -u || true)

if [[ -z "$CHANGED_PKGS" ]]; then
  exit 0
fi

TEST_FAILED=0
TEST_ERRORS=""

# Helper function for timeout (compatible with macOS)
run_with_timeout() {
  local timeout_seconds=$1
  shift
  
  if command -v timeout >/dev/null 2>&1; then
    timeout "$timeout_seconds" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$timeout_seconds" "$@"
  else
    "$@"
  fi
}

while IFS= read -r pkg; do
  case "$pkg" in
    packages/shared)
      PKG_FILTER="@gld/shared"
      ;;
    packages/phaser-game)
      PKG_FILTER="@gld/phaser-game"
      ;;
    packages/web-shell)
      PKG_FILTER="web-shell"
      ;;
    *)
      continue
      ;;
  esac

  PKG_OUTPUT=$(run_with_timeout 120 bun run --filter "$PKG_FILTER" test 2>&1) || {
    TEST_FAILED=1
    TEST_ERRORS="${TEST_ERRORS}
--- ${pkg} ---
$(echo "$PKG_OUTPUT" | tail -15)"
  }
done <<< "$CHANGED_PKGS"

if [[ "$TEST_FAILED" -eq 1 ]]; then
  cat >&2 <<EOF
SUBAGENT GATE BLOCKED: Test
─────────────────────
${TEST_ERRORS}

Action: 실패 테스트 수정 후 재시도
EOF
  exit 2
fi

echo "Subagent Gate PASSED (lint + package tests)"
exit 0
