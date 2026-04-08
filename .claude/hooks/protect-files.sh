#!/bin/bash
set -euo pipefail

# PreToolUse hook (Edit|Write): protect critical files from unintended modification

HOOK_INPUT=$(cat)

# Skip gate check
if [[ -f .claude/.skip-gate ]]; then
  exit 0
fi

# Extract file_path from tool_input
FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Normalize to relative path
REL_PATH="${FILE_PATH#"$(pwd)/"}"

# Protected file patterns
block_message() {
  echo "$1" >&2
  exit 2
}

case "$REL_PATH" in
  docs/game-spec/*.md|docs/game-spec/*)
    block_message "PROTECTED FILE: $REL_PATH
스펙 문서(docs/game-spec/)는 진실의 원천입니다.
Action: 프롬프트에 '스펙 업데이트'를 명시하세요"
    ;;
  package.json|*/package.json)
    block_message "PROTECTED FILE: $REL_PATH
Action: package.json 수정은 명시적 요청이 필요합니다"
    ;;
  .claude/settings.json)
    block_message "PROTECTED FILE: $REL_PATH
Action: hook 설정 파일은 직접 수정하세요"
    ;;
  biome.json)
    block_message "PROTECTED FILE: $REL_PATH
Action: lint 설정 변경은 명시적 요청이 필요합니다"
    ;;
esac

exit 0
