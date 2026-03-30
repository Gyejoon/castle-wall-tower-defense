#!/bin/bash
set -euo pipefail

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Check for code changes (.ts/.tsx only)
CODE_FILES=$(git diff --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' || true)

# Also check staged changes
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' || true)

# Combine
ALL_CODE_FILES="${CODE_FILES}${STAGED_FILES}"

if [[ -z "$ALL_CODE_FILES" ]]; then
  # No code changes, allow exit
  exit 0
fi

# Guard: skip if ralph-loop is already active
if [[ -f ".claude/ralph-loop.local.md" ]]; then
  exit 0
fi

# Guard: skip if ralreview is currently in progress
if [[ -f ".ralreview-state.json" ]]; then
  STATUS=$(python3 -c "import json,sys; print(json.load(open('.ralreview-state.json')).get('status','unknown'))" 2>/dev/null || echo "unknown")
  if [[ "$STATUS" == "in_progress" ]]; then
    exit 0
  fi
fi

# Code changes detected — trigger ralreview + lint
cat <<'EOF'
Code changes detected in .ts/.tsx files. Before completing:

1. Run /ralreview for quality review
2. After ralreview completes, run: bunx biome check . (one-shot lint, do not loop on failures)
EOF
