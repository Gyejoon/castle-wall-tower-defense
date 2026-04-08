#!/bin/bash
set -euo pipefail

# UserPromptSubmit hook: detect SKIP_GATE / 실험 모드 keyword
# Creates .claude/.skip-gate flag file for current turn only

HOOK_INPUT=$(cat)

# Extract user_prompt from JSON
USER_PROMPT=$(echo "$HOOK_INPUT" | jq -r '.user_prompt // empty' 2>/dev/null || true)

if [[ -z "$USER_PROMPT" ]]; then
  rm -f .claude/.skip-gate
  exit 0
fi

# Check for skip keywords (case-insensitive)
if printf '%s' "$USER_PROMPT" | grep -iqE 'SKIP_GATE|실험 모드|실험모드'; then
  date +%s > .claude/.skip-gate
  echo "SKIP_GATE activated for this turn."
else
  rm -f .claude/.skip-gate
fi

exit 0
