# doc-validate 스킬 설계

> 문서 교차참조 정합성 검증 + 자동 수정 스킬

## 문제

game-spec이 단일 진실 원천이지만, 같은 내용이 plan-review SKILL.md, AGENTS.md, README.md에 복제된다. 복제본을 수동으로 동기화하므로 불일치가 누적된다.

실례: GDD §4에 8대 코어 시스템이 정의되었지만, plan-review는 "7대"로 표기하고 코드 레벨 시스템명(Grid, Pathfinding)을 나열함. PR 리뷰 봇이 발견할 때까지 아무도 모름.

## 해결

`doc-validate` — PR 리뷰 시 자동 실행되는 문서 정합성 검증 스킬. game-spec을 기준으로 모든 소비자 파일의 교차참조를 대조하고, 불일치를 리포트 + 자동 수정한다.

## 트리거

ralreview와 동일한 proactive 패턴. 다음 파일이 PR diff에 포함될 때 자동 트리거:

- `docs/game-spec/**`
- `.claude/skills/*/SKILL.md`
- `AGENTS.md`
- `README.md`

수동 호출: `/doc-validate` 또는 "문서 검증", "doc validate", "교차참조 체크"

## 실행 흐름

```
Step 0: diff 분석 → 영향 문서 식별
Step 1: game-spec 원본 로드 (영향받는 섹션만)
Step 2: Phase 1 — 교차참조 정합성 (하드 체크)
Step 3: Phase 2 — 내용 일치 (소프트 체크)
Step 4: Phase 3 — 마크다운 헬스
Step 5: 리포트 출력 → 자동 수정 → 사용자 확인
```

## Step 0: 영향 문서 식별

PR diff를 읽고 변경된 파일을 분류한다:

- **소스 변경**: `docs/game-spec/*.md`가 변경됨 → 이 스펙을 참조하는 모든 소비자 파일 검증
- **소비자 변경**: SKILL.md, AGENTS.md, README.md가 변경됨 → 해당 파일의 교차참조를 game-spec과 대조
- **양쪽 변경**: 소스와 소비자가 함께 변경됨 → 동기화 여부 검증

영향 문서가 없으면 스킵.

## 참조 매핑 테이블

스킬 내부에 유지. 새 교차참조 추가 시 이 테이블도 갱신해야 한다.

| 소스 (game-spec) | 소비자 파일 | 참조 유형 | 검증 내용 |
|---|---|---|---|
| 01-GDD §4 (Core Systems) | plan-review (CEO 검증) | 시스템 목록, 개수 | 8대 시스템 이름·수 일치 |
| 01-GDD §5 (Content Plan) | plan-review (콘텐츠 범위), README, AGENTS | 수치 | 18타워×5티어, 5적, 3맵, 10웨이브 |
| 01-GDD §6 (Balance 요약) | plan-review (밸런스), README | 수치, 메커니즘 | 웨이브 스케일링, 난이도 배수 |
| 01-GDD §8 (UI/UX) | plan-review (UI 구조) | UI 요소 목록 | HUD, Sell Panel, Exit Modal 등 |
| 01-GDD §10 (Edge Point) | plan-review (게임 정체성) | 체크리스트 | 4항목 일치 |
| 02-balance-sheet §1-8 | plan-review (밸런스 수치) | 구체적 수치 | 에너지, 가챠, armor, WAVE_SCALING |
| 03-BM §1 | plan-review (수익화 원칙) | 금지선 목록 | BM 금지선 4항목 |
| 07-asset-def §1,3,4,10,11 | plan-review (에셋 규격, 색상) | 규격, hex 값 | 64×80, #e74c3c 등 |
| 08-arch §1-5 | plan-review (Eng 검증 9차원) | 순서, 패턴, depth | 초기화 순서, EventBus 네이밍 |
| 전체 game-spec | AGENTS.md (프로젝트 스냅샷) | 기능 목록 요약 | 구현 완료/미구현 목록 |
| 전체 game-spec | README.md (현재 빌드) | 기능 설명 | 빌드 기능 목록 |

## Phase 1: 교차참조 정합성 (하드 체크)

game-spec 원본을 읽고, 소비자 파일의 참조가 정확한지 대조한다.

검증 항목:
1. **§ 번호 유효성** — 참조된 § 번호가 실제 섹션에 존재하는가
2. **수치 일치** — 개수, 배율, 비용 등 구체적 숫자가 원본과 동일한가
3. **목록 일치** — 시스템명, UI 요소, 기능 목록이 누락/초과 없이 일치하는가
4. **이름 일치** — 시스템/메커니즘 이름이 원본과 동일한가 (코드명 vs 개념명 혼동 방지)

판정:
- **MATCH**: 원본과 일치
- **MISMATCH**: 원본과 직접 모순 (수치, 목록, 이름 불일치)
- **STALE**: 원본에 없는 참조 (삭제된 섹션, 변경된 이름)

## Phase 2: 내용 일치 (소프트 체크)

요약/인용 텍스트가 원본의 의도를 정확히 반영하는지 검증한다.

검증 항목:
1. **인용 정확성** — 따옴표로 인용된 텍스트가 원본과 동일한가
2. **요약 정합** — 요약 텍스트가 원본의 핵심 의미를 왜곡하지 않는가
3. **맥락 보존** — 원본에서 조건부인 내용을 무조건으로 기술하지 않는가

판정:
- **ALIGNED**: 의미적으로 일치
- **DRIFTED**: 의미가 벗어남 (왜곡, 누락, 과장)

## Phase 3: 마크다운 헬스

문서의 구조적 품질을 검증한다.

검증 항목:
1. **코드펜스 균형** — ``` 열림/닫힘 쌍이 맞는가
2. **테이블 구조** — 모든 행의 칼럼 수가 헤더와 일치하는가
3. **내부 링크** — 파일 경로 참조가 실제 파일을 가리키는가
4. **섹션 연속성** — §1, §2, §3... 순서가 건너뛰지 않는가
5. **frontmatter** — SKILL.md의 YAML frontmatter가 유효한가

판정:
- **HEALTHY**: 이슈 없음
- **ISSUE(N건)**: 구조적 문제 N건

## 리포트 형식

```markdown
## Doc Validation Report

**Trigger**: PR #N diff — `docs/game-spec/01-GDD.md`, `.claude/skills/plan-review/SKILL.md`
**Scope**: 3 files checked, 2 game-spec sources loaded

| 파일 | Phase 1 | Phase 2 | Phase 3 | 총 이슈 |
|------|---------|---------|---------|---------|
| plan-review SKILL.md | 2 MISMATCH | 0 DRIFTED | 0 ISSUE | 2 |
| AGENTS.md | 1 MISMATCH | 1 DRIFTED | 0 ISSUE | 2 |
| README.md | 0 | 0 | 0 | 0 |

### MISMATCH-1: 코어 시스템 개수
- **원본**: `docs/game-spec/01-GDD.md` §4 — 8개 시스템 (Combat, Movement, Placement, Tower Sell, Element, Gacha/Box, Upgrade, Boss/Encounter)
- **불일치**: `.claude/skills/plan-review/SKILL.md:164` — "7대 코어 시스템"
- **수정**: "7대" → "8대", 시스템 목록을 GDD §4와 동기화

### DRIFTED-1: 프로젝트 스냅샷 누락
- **원본**: `docs/game-spec/01-GDD.md` §4 — Tower Sell 시스템 추가됨
- **AGENTS.md:47**: "구현 완료" 목록에 타워 판매 미기재
- **권고**: 타워 판매(50% 에너지 환급) 추가

**Doc Health: 2 MISMATCH, 1 DRIFTED, 0 ISSUE**
```

## 자동 수정

MISMATCH에 대해:
1. game-spec 원본에서 정확한 값을 추출
2. 소비자 파일의 해당 위치를 수정안과 함께 제시
3. 사용자가 수정안을 확인하면 적용 + 커밋

DRIFTED에 대해:
- 경고로 리포트. 자동 수정하지 않음 — 요약 텍스트의 의미적 수정은 사용자 판단.

ISSUE에 대해:
- 코드펜스/테이블 구조 문제는 자동 수정. 링크 깨짐은 리포트만.

## ralreview와의 관계

| | ralreview | doc-validate |
|---|---|---|
| 대상 | 코드 변경 (.ts, .tsx) | 문서 변경 (.md, SKILL.md) |
| 기준 | 코딩 표준, 아키텍처 패턴 | game-spec 원본 |
| 트리거 | 코드 diff 포함 PR | 문서 diff 포함 PR |
| 출력 | 코드 리뷰 리포트 | 문서 정합성 리포트 |

둘 다 PR 리뷰 시점에 독립 실행. 겹치지 않는다.

## 스킬 위치

`.claude/skills/doc-validate/SKILL.md`

참조 매핑 테이블은 스킬 파일 내부에 마크다운으로 유지. 별도 설정 파일 불필요.
