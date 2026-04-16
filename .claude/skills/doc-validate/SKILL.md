---
name: doc-validate
description: |
  문서 교차참조 정합성 검증. `docs/game-spec/`을 단일 진실 원천으로,
  스킬 파일·AGENTS.md·README.md의 교차참조가 정확한지 3-Phase로 검증한다.
  MISMATCH는 game-spec 기준 자동 수정, DRIFTED는 경고, 마크다운 구조 이슈는 자동 교정.
  Use when: "doc-validate", "문서 검증", "교차참조 체크", "doc validate",
  "문서 정합성", "스펙 일치 확인", "docs 검증해줘".
  Proactively use when PR diff includes docs/game-spec/**, .claude/skills/*/SKILL.md,
  AGENTS.md, or README.md — especially after game-spec changes that may invalidate
  cross-references in other files. Run this BEFORE claiming docs are consistent.
user-invocable: true
argument-hint: "[file path or 'all']"
---

# /doc-validate — 문서 교차참조 정합성 검증

`docs/game-spec/`이 이 프로젝트의 단일 진실 원천이다. 같은 내용이 plan-review SKILL.md,
AGENTS.md, README.md에 반복되지만, 수동 동기화만 존재하여 불일치가 누적된다.

이 스킬은 game-spec 원본과 소비자 파일의 교차참조를 대조하여 불일치를 찾고,
game-spec을 기준으로 자동 수정을 제안한다.

---

## 실행 흐름

```
Step 0: 영향 문서 식별 (diff 분석 또는 전체 스캔)
    ↓
Step 1: game-spec 원본 로드 (영향받는 섹션만)
    ↓
Step 2: Phase 1 — 교차참조 정합성 (하드 체크)
Step 3: Phase 2 — 내용 일치 (소프트 체크)
Step 4: Phase 3 — 마크다운 헬스
    ↓
Step 5: 리포트 출력 → 자동 수정 → 사용자 확인
```

---

## Step 0: 영향 문서 식별

### PR 컨텍스트가 있을 때

PR diff를 읽고 변경된 파일을 분류한다:

```bash
git diff --name-only origin/main...HEAD | grep -E '\.(md)$'
```

- **소스 변경**: `docs/game-spec/*.md`가 diff에 포함 → 이 스펙을 참조하는 모든 소비자 파일 검증
- **소비자 변경**: SKILL.md, AGENTS.md, README.md가 diff에 포함 → 해당 파일의 교차참조를 game-spec과 대조
- **양쪽 변경**: 소스와 소비자가 함께 변경됨 → 동기화 여부 검증

영향 문서가 없으면 스킵하고 "No doc files in diff — skipping." 출력.

### 수동 호출 시

인자가 있으면 해당 파일만, `all`이면 모든 소비자 파일을 전수 검증.

### 소비자 파일 목록

검증 대상이 되는 파일들:

| 파일 | 역할 |
|------|------|
| `.claude/skills/plan-review/SKILL.md` | 스펙 검증 스킬 — § 참조, 수치, 시스템 목록 다수 |
| `AGENTS.md` | 에이전트 가이드 — 프로젝트 스냅샷, 기능 목록 |
| `README.md` | 공개 문서 — 기능 설명, 로드맵 |
| `docs/superpowers/plans/*.md` | 구현 플랜 — 스펙 참조 인용 |

---

## Step 1: game-spec 원본 로드

Step 0에서 식별된 영향 범위에 해당하는 game-spec 파일만 읽는다.
전체 8개를 매번 로드하지 않는다.

| game-spec 파일 | 주요 소비자 |
|---|---|
| `01-GDD.md` | plan-review (§3 루프, §4 시스템, §5 콘텐츠, §8 UI, §10 정체성), AGENTS, README |
| `02-balance-sheet.md` | plan-review (밸런스 수치) |
| `03-business-model.md` | plan-review (수익화 원칙) |
| `04-data-structure.md` | plan-review (Eng 스키마) |
| `05-operations.md` | plan-review (Eng 배포) |
| `06-milestone.md` | plan-review (CEO 타임라인) |
| `07-asset-definition.md` | plan-review (에셋 규격, 색상) |
| `08-architecture.md` | plan-review (Eng 초기화, EventBus, depth) |

---

## Step 2: Phase 1 — 교차참조 정합성 (하드 체크)

game-spec 원본을 읽고, 소비자 파일의 참조가 정확한지 대조한다.

### 검증 항목

1. **§ 번호 유효성**: 참조된 §N이 실제 섹션에 존재하는가
2. **수치 일치**: 개수(N대, N종, N개), 배율(Nx), 비용 등이 원본과 동일한가
3. **목록 일치**: 시스템명, UI 요소, 기능 목록이 누락/초과 없이 일치하는가
4. **이름 일치**: 시스템/메커니즘 이름이 원본과 동일한가

이름 일치가 특히 중요하다. GDD §4의 개념 시스템(Combat, Movement, Placement...)과
08-architecture의 코드 시스템(GridManager, TowerSystem, UnitSystem...)은 서로 다른 것이다.
소비자 파일이 어느 쪽을 참조하는지 맥락을 확인하고, 혼용하면 MISMATCH로 판정한다.

### 판정

- **MATCH**: 원본과 일치
- **MISMATCH**: 원본과 직접 모순 (수치, 목록, 이름 불일치)
- **STALE**: 원본에 없는 참조 (삭제된 섹션, 변경된 이름)

### 참조 매핑 테이블

이 테이블이 검증의 핵심이다. 새 교차참조가 추가되면 이 테이블도 갱신해야 한다.

| 소스 (game-spec) | 소비자 위치 | 검증 내용 |
|---|---|---|
| 01-GDD §4 (Core Systems) | plan-review CEO 검증 "시스템 범위" | 시스템 목록·수 — GDD의 개념 시스템과 일치하는가 |
| 01-GDD §5 (Content Plan) | plan-review "콘텐츠 범위", README, AGENTS | 18타워×5티어, 적 9종+보스 3종, 3월드×8스테이지=24스테이지, 10웨이브 |
| 01-GDD §6 (Balance) | plan-review, README | WAVE_SCALING, difficultyHpMult |
| 01-GDD §8 (UI/UX) | plan-review "UI 구조", "디자인 토큰" | UI 요소 목록, 색상 토큰, 터치 기준 |
| 01-GDD §10 (Edge Point) | plan-review "게임 정체성" | 4항목 체크리스트 |
| 02-balance §1-8 | plan-review "밸런스 수치" | 에너지, 가챠, armor, MAX_TOWER_LEVEL |
| 03-BM §1 | plan-review "수익화 원칙" | BM 금지선 4항목 |
| 07-asset §1,3,4,10,11 | plan-review "에셋 규격", "속성/등급 색상" | 64×80, hex 값, 네이밍 |
| 08-arch §1-5 | plan-review Eng 검증 9차원 | 초기화 순서, EventBus 네이밍, depth 테이블 |
| 전체 | AGENTS "프로젝트 스냅샷" | 구현 완료/미구현 기능 목록 |
| 전체 | README "현재 빌드" | 빌드 기능 목록 |

---

## Step 3: Phase 2 — 내용 일치 (소프트 체크)

요약/인용 텍스트가 원본의 의도를 정확히 반영하는지 검증한다.

### 검증 항목

1. **인용 정확성**: 따옴표로 인용된 텍스트가 원본과 동일한가
2. **요약 정합**: 요약이 원본의 핵심 의미를 왜곡하지 않는가
3. **맥락 보존**: 원본에서 조건부인 내용을 무조건으로 기술하지 않는가

### 판정

- **ALIGNED**: 의미적으로 일치
- **DRIFTED**: 의미가 벗어남 (왜곡, 누락, 과장)

---

## Step 4: Phase 3 — 마크다운 헬스

문서의 구조적 품질을 검증한다.

### 검증 항목

1. **코드펜스 균형**: 열림/닫힘 쌍이 맞는가 (짝수여야 함)
2. **테이블 구조**: 모든 행의 칼럼 수가 헤더와 일치하는가
3. **내부 링크**: 파일 경로 참조가 실제 파일을 가리키는가
4. **섹션 연속성**: §1, §2, §3... 순서가 건너뛰지 않는가
5. **frontmatter**: SKILL.md의 YAML frontmatter가 유효한가

### 판정

- **HEALTHY**: 이슈 없음
- **ISSUE(N건)**: 구조적 문제 N건

---

## Step 5: 리포트 & 자동 수정

### 리포트 형식

```markdown
## Doc Validation Report

**Trigger**: PR #N diff — [변경된 파일 목록]
**Scope**: N files checked, N game-spec sources loaded

| 파일 | Phase 1 | Phase 2 | Phase 3 | 총 이슈 |
|------|---------|---------|---------|---------|
| plan-review SKILL.md | N MISMATCH | N DRIFTED | N ISSUE | N |
| AGENTS.md | ... | ... | ... | ... |
| README.md | ... | ... | ... | ... |
```

### MISMATCH 리포트

```markdown
### MISMATCH-N: [제목]
- **원본**: `docs/game-spec/[파일명]` §N — [원본 내용]
- **불일치**: `[소비자 파일:줄번호]` — "[현재 텍스트]"
- **수정**: [원본 기준 수정안]
```

### DRIFTED 리포트

```markdown
### DRIFTED-N: [제목]
- **원본**: `docs/game-spec/[파일명]` §N — [원본 의도]
- **현재**: `[소비자 파일:줄번호]` — "[현재 텍스트]"
- **권고**: [조정 제안]
```

### 자동 수정 규칙

| 판정 | 행동 |
|------|------|
| MISMATCH | game-spec에서 정확한 값을 추출하여 수정안 제시 → 사용자 확인 후 적용 |
| STALE | 삭제된 참조 경고 → 사용자 판단 |
| DRIFTED | 경고로 리포트. 자동 수정하지 않음 — 의미적 수정은 사용자 판단 |
| ISSUE | 코드펜스/테이블 구조 → 자동 수정. 깨진 링크 → 리포트만 |

수정 후 커밋 메시지: `fix(docs): doc-validate — [수정 요약]`

---

## 핵심 규칙

1. **game-spec이 항상 옳다.** 불일치 발견 시 소비자 파일을 수정한다. game-spec이 틀렸다고 판단되면 사용자에게 알리되, 이 스킬이 game-spec을 수정하지 않는다.

2. **개념 시스템과 코드 시스템을 구분한다.** GDD §4의 시스템(Combat, Movement...)과 08-architecture의 시스템(GridManager, TowerSystem...)은 서로 다른 추상화 레벨이다. 소비자 파일이 어느 쪽을 참조하는지 맥락을 확인한다.

3. **영향 범위만 검증한다.** diff에 포함된 파일과 그 파일의 교차참조만 검증한다. 전체 스캔은 `all` 인자로 명시적 요청 시에만.

4. **Phase 1이 핵심이다.** 수치·목록·이름 불일치가 가장 위험하고 가장 빈번하다. Phase 2, 3은 보조적이다.

5. **참조 매핑 테이블을 최신 상태로 유지한다.** 새 교차참조가 추가되면 이 테이블에도 반영한다. 테이블이 낡으면 검증에 누락이 생긴다.
