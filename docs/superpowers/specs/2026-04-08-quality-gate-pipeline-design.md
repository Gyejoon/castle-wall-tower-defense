# Quality Gate Pipeline — 다중 게이트 자동 품질 보장 시스템

## Context

최근 30 커밋 중 50%가 fix 커밋. 반복 패턴:
- 테스트 fixture 연쇄 깨짐 (기능 추가 후 테스트 데이터 불일치)
- ralreview 피드백이 별도 fix 커밋으로 후처리
- lint/formatting 후처리
- 마이그레이션 타입 가드 누락

현재 `stop-ralreview.sh`는 안내만 할 뿐 강제하지 않음.
사람 개입 없이 같은 실수를 반복하지 않는 시스템을 구축한다.

## 설계 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 자동화 수준 | 강제 게이트 | 안내만으로는 무시됨 |
| 게이트 시점 | 다중 (5개 hook) | 실수를 조기에 잡음 |
| 우회 방법 | 프롬프트 키워드 | 턴별 제어로 안전 |
| 학습 루프 | 룰 자동 생성 | 시스템이 스스로 강화 |

## 아키텍처

```
사용자 프롬프트
    │
    ▼
[UserPromptSubmit] ─── SKIP_GATE / 실험 모드 키워드 → .claude/.skip-gate 생성
    │
    ▼
  작업 수행 중...
    │
    ├─ [PreToolUse: Edit|Write] ─── 위험 파일 보호
    │
    ├─ [PostToolUse: Edit|Write] ─── .ts/.tsx: 자동 biome fix
    │
    ▼
  서브에이전트 완료 시
    │
    ▼
[SubagentStop] ─── 경량 게이트 (lint + 패키지 테스트)
    │
    ▼
  메인 작업 완료 시도
    │
    ▼
[Stop] ─── 강제 게이트 (test + lint + ralreview 58/70)
    │
    ├─ 통과 → approve → 학습 루프 실행
    └─ 실패 → block + 구체적 수정 지시
```

---

## Hook 1: UserPromptSubmit — SKIP_GATE 감지

**파일**: `.claude/hooks/skip-gate-detect.sh`
**타입**: Command hook
**매처**: `""` (모든 프롬프트)

### 동작
1. stdin에서 `user_prompt` 읽기
2. `SKIP_GATE` 또는 `실험 모드` 키워드 포함 여부 확인
3. 포함 시 `.claude/.skip-gate` 파일 생성 (내용: 타임스탬프)
4. 미포함 시 `.claude/.skip-gate` 삭제

### 설계 근거
- 환경변수가 아닌 파일 플래그: 다른 hook 스크립트에서 쉽게 확인
- 턴마다 리셋: SKIP_GATE가 없는 프롬프트에서 자동 삭제되므로 영구 우회 불가
- `.gitignore`에 추가: 커밋되면 안 됨

---

## Hook 2: PreToolUse (Edit|Write) — 위험 파일 보호

**파일**: `.claude/hooks/protect-files.sh`
**타입**: Command hook
**매처**: `"Edit|Write"`

### 보호 대상

| 경로 패턴 | 보호 이유 | 차단 메시지 |
|-----------|----------|------------|
| `docs/game-spec/*.md` | 스펙 = 진실의 원천 | "스펙 문서 수정은 의도적이어야 합니다. 프롬프트에 '스펙 업데이트'를 명시하세요" |
| `package.json` | 의존성 무분별 변경 방지 | "package.json 수정은 명시적 요청이 필요합니다" |
| `.claude/settings.json` | hook 설정 보호 | "hook 설정 파일은 직접 수정하세요" |
| `biome.json` | lint 규칙 보호 | "lint 설정 변경은 명시적 요청이 필요합니다" |

### 동작
1. stdin에서 `tool_input.file_path` 파싱
2. `.claude/.skip-gate` 존재 시 → 즉시 통과
3. 보호 목록과 매칭 → 매칭 시 `exit 2` + stderr에 차단 메시지
4. 비매칭 → `exit 0`

---

## Hook 3: PostToolUse (Edit|Write) — 자동 Lint Fix

**파일**: `.claude/hooks/auto-lint-fix.sh`
**타입**: Command hook
**매처**: `"Edit|Write"`

### 동작
1. stdin에서 `tool_input.file_path` 파싱
2. 확장자가 `.ts` 또는 `.tsx`가 아니면 → 즉시 종료
3. `.claude/.skip-gate` 존재 시 → 즉시 종료
4. `bunx biome check --write <파일경로>` 실행
5. 결과를 stdout으로 출력 (비차단, 정보성)
6. 항상 `exit 0` (lint 실패해도 차단하지 않음)

### 설계 근거
- **단일 파일만**: 전체 프로젝트 lint는 Stop에서 처리
- **비차단**: 매 편집마다 차단하면 작업 흐름 방해
- **자동 fix**: `--write` 옵션으로 간단한 이슈는 즉시 수정

---

## Hook 4: Stop — 강제 품질 게이트 (핵심)

**파일**: `.claude/hooks/stop-quality-gate.sh`
**타입**: Command hook
**매처**: `""` (모든 Stop)

기존 `stop-ralreview.sh`를 대체한다.

### 검증 단계

```
Phase 0: Skip 조건 확인
├─ .claude/.skip-gate 존재 → approve (exit 0)
├─ .claude/ralph-loop.local.md 존재 → approve
└─ .ts/.tsx 변경 없음 → approve

Phase 1: Lint 검증
├─ bunx biome check . 실행
└─ 실패 → block ("lint 실패. `bunx biome check --write .` 실행 후 재시도")

Phase 2: 테스트 검증
├─ bun run test 실행
└─ 실패 → block ("테스트 실패. 실패 테스트 수정 후 재시도")

Phase 3: Ralreview 검증
├─ .ralreview-state.json 존재 확인
├─ 미존재 → block ("/ralreview 실행 후 재시도")
├─ status == "pass" && score >= 58 → approve
└─ 그 외 → block ("ralreview 점수 미달. /ralreview 재실행")
```

### 차단 메시지 형식
```
QUALITY GATE BLOCKED: <phase>
─────────────────────
<구체적 실패 내용>

Action: <수정 지시>
```

### 차단 방식
- `exit 2` + stderr에 차단 메시지
- Claude에 피드백되어 자동으로 수정 시도

### Phase 3 이후: 학습 루프 트리거
- 모든 Phase 통과 시 `update-quality-tracker.sh` 호출
- `.ralreview-state.json`의 이슈 목록을 `quality-tracker.json`에 집계

---

## Hook 5: SubagentStop — 경량 품질 게이트

**파일**: `.claude/hooks/subagent-quality-gate.sh`
**타입**: Command hook
**매처**: `""` (모든 SubagentStop)

### 검증 단계

```
Phase 0: Skip 조건 확인
├─ .claude/.skip-gate 존재 → approve
└─ .ts/.tsx 변경 없음 → approve

Phase 1: Lint 검증
├─ bunx biome check . 실행
└─ 실패 → block

Phase 2: 변경 패키지 테스트
├─ git diff로 변경된 패키지 감지
├─ 해당 패키지만 테스트: bun run --filter <pkg> test
└─ 실패 → block
```

### Stop과의 차이
| 항목 | Stop | SubagentStop |
|------|------|-------------|
| Lint | 전체 | 전체 |
| 테스트 | 전체 (`bun run test`) | 변경 패키지만 |
| Ralreview | 필수 (58/70) | 생략 |
| 학습 루프 | 실행 | 생략 |

---

## 학습 루프: 룰 자동 생성

### 데이터 흐름

```
ralreview 완료 → .ralreview-state.json
    │
    ▼
[update-quality-tracker.sh] (Stop 통과 후 실행)
    │
    ├─ .ralreview-state.json에서 이슈 카테고리 추출
    ├─ .claude/quality-tracker.json 업데이트
    │   {
    │     "cleanup-missing": { "count": 3, "files": ["Game.ts","BossSystem.ts"], "last_seen": "2026-04-08" },
    │     "test-fixture-mismatch": { "count": 5, "files": [...], "last_seen": "2026-04-07" },
    │     "unused-import": { "count": 12, "files": [...], "last_seen": "2026-04-08" }
    │   }
    │
    ├─ count >= 3인 카테고리 → .claude/learned-rules.md에 룰 추가
    └─ 이미 룰이 존재하면 last_seen만 업데이트
```

### quality-tracker.json 스키마
```json
{
  "<카테고리>": {
    "count": number,
    "files": string[],
    "last_seen": "YYYY-MM-DD",
    "rule_generated": boolean
  }
}
```

### 카테고리 매핑 (ralreview Phase → 카테고리)

| ralreview Phase | 카테고리 예 |
|-----------------|-----------|
| Phase 2 (Runtime) | `cleanup-missing`, `listener-leak`, `timer-not-cleared` |
| Phase 3 (React) | `zustand-selector-broad`, `callback-deps-missing`, `key-prop-timing` |
| Phase 4 (Design) | `ai-slop-pattern`, `color-token-missing`, `font-hardcoded` |
| Phase 6 (Test) | `test-fixture-mismatch`, `ghost-test`, `coverage-gap` |
| Lint | `unused-import`, `explicit-any`, `double-equals` |

### learned-rules.md 형식
```markdown
# 자동 학습 룰

> 이 파일은 반복 이슈에서 자동 생성됩니다. 수동 편집도 가능합니다.
> 생성 임계값: 동일 카테고리 3회 반복

## cleanup-missing
Phaser 씬/시스템에 destroy() 추가 시 반드시 EventBus.off()를 선행한다.
- 발견 빈도: 3회 (2026-04-05 ~ 2026-04-08)
- 관련 파일: Game.ts, BossSystem.ts, ArrowSystem.ts

## test-fixture-mismatch
새 시스템/컴포넌트 추가 시 기존 테스트 fixture의 mock 데이터도 함께 업데이트한다.
- 발견 빈도: 5회 (2026-04-03 ~ 2026-04-07)
- 관련 파일: combatVfx.test.ts, migration.test.ts
```

### AGENTS.md 연결
```markdown
## 자동 학습 룰
반복 실수에서 자동 생성된 프로젝트 룰이 있다. 작업 전 확인 필수:
→ `.claude/learned-rules.md`
```

---

## .gitignore 추가 항목

```
# Quality gate runtime files
.claude/.skip-gate
.claude/quality-tracker.json
.ralreview-state.json
```

`learned-rules.md`는 **커밋 대상** (팀 공유 가치 있음).

---

## settings.json 최종 설정

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/skip-gate-detect.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/protect-files.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/auto-lint-fix.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/stop-quality-gate.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/subagent-quality-gate.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 수정 대상 파일 목록

| 파일 | 작업 |
|------|------|
| `.claude/settings.json` | hooks 설정 전면 교체 |
| `.claude/hooks/skip-gate-detect.sh` | 신규 생성 |
| `.claude/hooks/protect-files.sh` | 신규 생성 |
| `.claude/hooks/auto-lint-fix.sh` | 신규 생성 |
| `.claude/hooks/stop-quality-gate.sh` | 신규 (기존 stop-ralreview.sh 대체) |
| `.claude/hooks/subagent-quality-gate.sh` | 신규 생성 |
| `.claude/hooks/update-quality-tracker.sh` | 신규 생성 |
| `.claude/learned-rules.md` | 신규 (초기 빈 템플릿) |
| `.claude/hooks/stop-ralreview.sh` | 삭제 (stop-quality-gate.sh로 대체) |
| `AGENTS.md` | 자동 학습 룰 섹션 추가 |
| `.gitignore` | runtime 파일 제외 추가 |

---

## 검증 방법

### 단위 검증
1. 각 hook 스크립트에 모의 stdin 주입하여 개별 테스트
2. `SKIP_GATE` 키워드 유무에 따른 분기 확인
3. 보호 파일 편집 시 차단/허용 확인

### 통합 검증
1. 새 세션에서 .ts 파일 수정 후 작업 완료 시도 → Stop 게이트 동작 확인
2. `SKIP_GATE` 프롬프트로 우회 가능한지 확인
3. 서브에이전트 작업 시 SubagentStop 게이트 동작 확인
4. ralreview 실행 후 quality-tracker.json 업데이트 확인
5. 임계값 도달 시 learned-rules.md 자동 생성 확인

### 회귀 검증
- 기존 글로벌 hooks (kb-context, kb-detector, superset notify) 영향 없음 확인
- ralph-loop 활성 시 Skip 동작 확인
