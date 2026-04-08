#!/bin/bash
set -euo pipefail

# PostToolUse hook (Edit|Write): auto-fix lint on .ts/.tsx files

HOOK_INPUT=$(cat)

# Extract file_path from tool_input
FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only process .ts/.tsx files
case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Skip gate check
if [[ -f .claude/.skip-gate ]]; then
  exit 0
fi

# Auto-fix lint (non-blocking)
bunx biome check --write "$FILE_PATH" 2>&1 || true

exit 0
