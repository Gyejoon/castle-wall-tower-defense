#!/bin/bash
set -euo pipefail

# Learning loop: parse ralreview results, update quality tracker, auto-generate rules

TRACKER_FILE=".claude/quality-tracker.json"
RULES_FILE=".claude/learned-rules.md"
STATE_FILE=".ralreview-state.json"
THRESHOLD=3

# Require ralreview state file
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Use python3 for complex JSON manipulation + markdown generation
python3 << 'PYEOF'
import json
import os
from datetime import date

STATE_FILE = ".ralreview-state.json"
TRACKER_FILE = ".claude/quality-tracker.json"
RULES_FILE = ".claude/learned-rules.md"
THRESHOLD = 3

# Load ralreview state
try:
    with open(STATE_FILE) as f:
        state = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    exit(0)

issues = state.get("issues", [])
if not issues:
    exit(0)

# Load or init tracker
try:
    with open(TRACKER_FILE) as f:
        tracker = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    tracker = {}

today = date.today().isoformat()

# Update tracker with new issues
for issue in issues:
    cat = issue.get("category", "unknown")
    file_name = issue.get("file", "unknown")

    if cat not in tracker:
        tracker[cat] = {
            "count": 0,
            "files": [],
            "first_seen": today,
            "last_seen": today,
            "rule_generated": False
        }

    entry = tracker[cat]
    entry["count"] += 1
    entry["last_seen"] = today
    if file_name not in entry["files"]:
        entry["files"].append(file_name)
    # Keep files list manageable
    if len(entry["files"]) > 10:
        entry["files"] = entry["files"][-10:]

# Save tracker
with open(TRACKER_FILE, "w") as f:
    json.dump(tracker, f, indent=2, ensure_ascii=False)

# Generate rules for categories at threshold
new_rules = []
for cat, entry in tracker.items():
    if entry["count"] >= THRESHOLD and not entry["rule_generated"]:
        new_rules.append(cat)
        entry["rule_generated"] = True

if not new_rules:
    exit(0)

# Re-save tracker with rule_generated flags
with open(TRACKER_FILE, "w") as f:
    json.dump(tracker, f, indent=2, ensure_ascii=False)

# Read existing rules to check for duplicates
try:
    with open(RULES_FILE) as f:
        existing_rules = f.read()
except FileNotFoundError:
    existing_rules = ""

# Append new rules
with open(RULES_FILE, "a") as f:
    for cat in new_rules:
        # Skip if rule header already exists
        if f"\n## {cat}" in existing_rules:
            continue

        entry = tracker[cat]
        files_str = ", ".join(entry["files"][:5])
        f.write(f"\n## {cat}\n")
        f.write(f"이 패턴이 반복적으로 발견됩니다. 관련 코드 작성 시 주의하세요.\n")
        f.write(f"- 발견 빈도: {entry['count']}회 ({entry.get('first_seen', '?')} ~ {entry['last_seen']})\n")
        f.write(f"- 관련 파일: {files_str}\n")

print(f"Quality tracker updated. {len(new_rules)} new rule(s) generated.")
PYEOF

exit 0
