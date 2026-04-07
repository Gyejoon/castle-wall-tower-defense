---
name: plan-review
description: |
  프로젝트 전용 Plan 리뷰 파이프라인. gstack autoplan(CEO+Design+Eng 순차 리뷰)과
  frontend-design(AI slop 방지 미학 기준), game-ui-design(Phaser+React 하이브리드 패턴)을
  결합하여 전략-디자인-엔지니어링을 한 번에 리뷰한다.
  autoplan의 Design 페이즈에 프로젝트 고유의 미학 평가 축 6개를 주입하고,
  모든 페이즈에서 docs/game-spec 문서를 근거로 스펙 정합성을 검증한다.
  스펙 충돌(CONFLICT)은 하드 블로커로 처리하여 구현 전에 정합성을 보장한다.
  Use when asked to "plan review", "plan-review", "플랜 리뷰", "리뷰해줘",
  "계획 리뷰", "전체 리뷰", "구현 전 리뷰", or when a plan file exists and
  the user wants a comprehensive review before implementation.
  Proactively suggest when the user has written a plan and is about to start coding,
  even if they don't explicitly ask for a review.
user-invocable: true
argument-hint: "[plan file path]"
---

# /plan-review — 통합 Plan 리뷰 파이프라인

autoplan(CEO → Design → Eng 순차 리뷰)을 실행하되, 두 가지 프로젝트 고유 레이어를 추가한다:

1. **스펙 검증 (하드 게이트)**: 모든 Phase에서 `docs/game-spec/` 문서를 근거로 Plan의 정합성을 검증한다. 스펙과 직접 모순(CONFLICT)되면 다음 Phase로 진행할 수 없다.
2. **미학 평가 (어드바이저리)**: Design Phase에서 `.impeccable.md` + `game-ui-design` 기준으로 미학을 점수화한다. 블로킹하지 않는다.

autoplan만으로는 "전략적으로 타당한가"는 점검하지만 "게임 스펙 문서와 일치하는가"는
점검하지 않는다. Plan 단계에서 스펙 정합성과 미학 방향을 확정해야 구현자가
잘못된 수치나 AI slop에 빠지지 않고 일관된 결과물을 만들 수 있다.

---

## 실행 흐름

```
Step 0: 컨텍스트 수집 (Plan 파일 + .impeccable.md + UI 스코프 + 스펙 스코프)
    ↓
Step 1: autoplan Phase 1 (CEO) → CEO 스펙 검증
    ↓ (CONFLICT → STOP, 사용자 해소 후 재검증)
Step 2: Phase 2 (Design) + 미학 리뷰 + 디자인 스펙 검증
    ↓ (CONFLICT → STOP, 사용자 해소 후 재검증)
Step 3: Phase 3 (Eng) + Eng 스펙 검증
    ↓ (CONFLICT → STOP, 사용자 해소 후 재검증)
Step 4: Final Gate (스펙 정합성=하드 게이트 + 미학=어드바이저리)
```

---

## Step 0: 컨텍스트 수집

### 0-1. Plan 파일 찾기

사용자가 경로를 지정했으면 읽는다. 아니면 자동 탐색:

```bash
# 최근 plan 파일
ls -t docs/superpowers/plans/*.md 2>/dev/null | head -3
# plan 모드에서 열린 파일
git diff --name-only HEAD~5 2>/dev/null | grep -iE 'plan|spec' | head -3
```

못 찾으면 사용자에게 경로를 묻는다.

### 0-2. 디자인 컨텍스트 로드

```bash
[ -f .impeccable.md ] && echo "IMPECCABLE: found" || echo "IMPECCABLE: not found"
[ -f .claude/skills/game-ui-design/SKILL.md ] && echo "GAME_UI: found" || echo "GAME_UI: not found"
```

`.impeccable.md`가 있으면 읽어서 미학 리뷰의 기준으로 사용한다.
없으면 사용자에게 `/teach-impeccable`을 제안한다 (강제하지 않음).

### 0-3. UI 스코프 감지

Plan 파일에서 아래 키워드를 검색한다:

| 카테고리 | 키워드 |
|----------|--------|
| 게임 UI | HUD, dock, panel, overlay, canvas, phaser, sprite, tile, tower, wave, tutorial-overlay |
| 웹 UI | component, screen, form, button, modal, layout, sidebar, tab, settings |
| 공통 | UI, UX, 화면, 인터페이스, 디자인 |

**2개 이상 매치 → UI 스코프 ON** (Phase 2 실행 + 미학 리뷰 추가)
**0-1개 매치 → UI 스코프 OFF** (Phase 2는 autoplan이 판단, 미학 리뷰만 스킵)

UI 스코프 결과를 출력한다:
> "UI scope: ON (매치: [키워드 목록])" 또는 "UI scope: OFF — 미학 리뷰 스킵"

### 0-4. 스펙 스코프 (Game Spec Alignment)

Plan 파일 전문에서 키워드를 검색하여 관련 스펙 문서만 선택적으로 로드한다.
전체 8개 문서를 매번 읽지 않는다.

#### 키워드 → 문서 매핑

| 문서 | 키워드 (2개 이상 매치 시 로드) |
|------|------|
| `01-GDD.md` | core loop, meta loop, tower, enemy, wave, boss, element, energy, deck, combat, placement, lobby, collection, tutorial, session, spawn, win condition, lose condition, 타워, 적, 웨이브, 보스, 에너지, 배치, 속성, 코어 루프, 메타 루프 |
| `02-balance-sheet.md` | diamond, gold, gacha, pity, odds, rate, mission, daily, weekly, economy, cost, reward, bounty, armor, pierce, DPS, hp, damage, stat, level, tier, scale, 다이아, 골드, 확률, 미션, 보상, 밸런스, 수치 |
| `03-business-model.md` | monetization, IAP, ads, shop, offer, sku, subscription, premium, cosmetic, conversion, KPI, retention, revenue, ARPPU, LiveOps, BM, 수익화, 상점, 광고, 과금 |
| `04-data-structure.md` | save data, schema, localStorage, telemetry, event map, profile, collection data, progress, settings sync, registry, Zustand, store, migration, 저장, 스키마, 텔레메트리 |
| `05-operations.md` | deploy, Vercel, Sentry, PostHog, monitoring, analytics, error tracking, LiveOps cadence, ops, 배포, 모니터링, 운영 |
| `06-milestone.md` | phase, sprint, roadmap, milestone, launch, timeline, schedule, deadline, 마일스톤, 로드맵, 출시, 스프린트 |
| `07-asset-definition.md` | asset, sprite, spritesheet, tileset, pixel art, VFX, pipeline, manifest, generate-assets, PNG, WebP, resolution, naming convention, 에셋, 스프라이트, 타일셋 |
| `08-architecture.md` | package, monorepo, system init, update loop, EventBus, state management, depth, render, GridManager, TowerSystem, UnitSystem, WaveSystem, EnergySystem, DeckSystem, cleanup, Game.ts, 아키텍처, 시스템, 패키지 |

#### 매칭 로직

1. Plan 파일 전문을 소문자로 변환한다 (한글 키워드는 원문 그대로 매칭)
2. 각 문서별 키워드 매치 수를 카운트한다
3. **2개 이상 매치 → 해당 문서 선택**
4. 매치가 0-1개인 문서는 로드하지 않는다

#### Phase별 문서 할당

선택된 문서를 Phase에 할당한다. 한 문서가 여러 Phase에 할당될 수 있다.

| Phase | 기본 할당 문서 | 역할 |
|-------|-------------|------|
| Phase 1 (CEO) | 01-GDD, 03-business-model, 06-milestone | 전략·방향성·타임라인 정합 |
| Phase 2 (Design) | 01-GDD §8, 02-balance-sheet, 07-asset-definition | UI·밸런스·에셋 정합 |
| Phase 3 (Eng) | 04-data-structure, 05-operations, 08-architecture | 아키텍처·스키마·운영 정합 |

**교차 할당**: 키워드 매칭으로 선택된 문서가 기본 할당 Phase와 다른 Phase에도 해당하면 양쪽 모두에 할당한다. 예: Plan에 "EventBus" + "energy" + "wave"가 있으면 08-architecture는 Phase 3(기본)뿐 아니라 Phase 1(CEO)에도 할당.

#### 출력

```
Spec scope:
  Phase 1 (CEO): 01-GDD (5 matches), 03-business-model (3 matches)
  Phase 2 (Design): 01-GDD §8 (5 matches), 02-balance-sheet (4 matches)
  Phase 3 (Eng): 08-architecture (7 matches), 04-data-structure (3 matches)
  Skipped: 05-operations (0 matches), 06-milestone (1 match)
```

**문서는 아직 읽지 않는다.** 각 Phase 시작 시점에 해당 Phase에 할당된 문서만 읽는다.

---

## Step 1: autoplan Phase 1 (CEO) + CEO 스펙 검증

### 1-1. Phase 1 실행

autoplan 스킬을 읽고 전체 파이프라인을 실행한다:

```
Read ~/.claude/skills/gstack/autoplan/SKILL.md
```

autoplan의 모든 섹션(Preamble, 6 Decision Principles, Decision Audit Trail,
Dual Voices 등)을 그대로 따른다. 이 스킬이 수정하는 부분은 Phase 1 이후 검증, Phase 2 미학 리뷰, Phase 3 이후 검증이다.

**Phase 1 (CEO)**: autoplan 그대로 실행.

### 1-2. CEO 스펙 검증

Phase 1 완료 후, Step 0-4에서 Phase 1에 할당된 스펙 문서를 `docs/game-spec/`에서 읽고 검증한다.

#### CEO 검증 차원

| 차원 | 대조 문서 | 검증 내용 |
|------|---------|---------|
| 코어 루프 정합 | 01-GDD §3 (Core Loop / Meta Loop) | Plan이 코어 루프(배치→웨이브→보상)나 메타 루프(성장→도전)를 변경/확장하는가? 변경 시 GDD의 정의와 충돌하지 않는가? |
| 시스템 범위 | 01-GDD §4 (Core Systems) | Plan이 새 시스템을 추가하거나 기존 시스템의 역할을 변경하는가? 7대 코어 시스템과 충돌하지 않는가? |
| 수익화 원칙 | 03-BM §1 (BM 구조) | Plan이 BM 금지선(진입장벽, pay-to-win, 강제 광고, 밸런스 영향 코스메틱)을 위반하는가? |
| 타임라인 정합 | 06-milestone (출시 전) | Plan의 작업이 현재 Phase 위치와 맞는가? 미래 Phase 기능을 선행하고 있지 않은가? |
| 게임 정체성 | 01-GDD §10 (Edge Point) | Plan이 게임의 Edge Point(세로형 single-field, 즉시 시작, 10웨이브 밀도, 4타워 에너지 관리)를 희석하는가? |

#### 판정 기준

각 차원에 대해:
- **PASS**: Plan이 스펙과 일치하거나 스펙이 다루지 않는 영역
- **CONFLICT**: Plan이 스펙에 명시된 내용과 직접 모순
- **DRIFT**: Plan이 스펙의 의도에서 벗어나지만 직접 모순은 아님

#### 충돌 리포트

검증 결과를 다음 형식으로 Plan 파일에 기록한다:

```markdown
## 스펙 검증: Phase 1 (CEO)

| 차원 | 대조 문서 | 결과 |
|------|---------|------|
| 코어 루프 정합 | 01-GDD §3 | ✅ PASS |
| 시스템 범위 | 01-GDD §4 | ❌ CONFLICT |
| ... | ... | ... |
```

CONFLICT가 있으면 상세 리포트를 추가한다 (리포트 형식은 Step 4 참조).

**❌ CONFLICT가 1건 이상이면 Phase 2로 진행할 수 없다.**
사용자에게 두 선택지를 제시한다:
- **A) Plan 수정**: 해당 부분을 스펙에 맞게 수정
- **B) 스펙 업데이트**: 스펙이 낡았다면 스펙 문서를 먼저 업데이트

어느 쪽이든 수정 후 해당 Phase의 스펙 검증만 재실행한다 (전체 재실행 불필요).

⚠️ DRIFT는 경고로 기록하되 진행을 막지 않는다.

---

## Step 2: Phase 2 (Design) + 미학 리뷰

autoplan의 Phase 2(plan-design-review)를 실행한 뒤, 미학 리뷰를 **별도 섹션으로 추가**한다.

순서:
1. plan-design-review의 Pass 1-7 실행 (autoplan이 지시하는 대로)
2. Pass 7 완료 후, 아래 미학 리뷰를 실행
3. 미학 리뷰 결과를 Plan 파일에 기록

### 미학 리뷰: 6개 차원

Plan의 UI 관련 섹션을 `.impeccable.md`와 `game-ui-design` 기준으로 평가한다.
각 차원 0-10 점수. 평가 시 `.claude/skills/frontend-design/SKILL.md`의 안티패턴 목록을 참조한다.

#### 1. AI Slop 위험도 (0=위험 10=안전)

Plan이 구현 시 AI 양산형 결과물을 유도하는 패턴을 포함하는지 검사한다.

**레드 플래그** (frontend-design 기준):
- "적절한 UI", "깔끔한 디자인" 등 모호한 지시 → 구현자가 기본값에 의존
- 모든 것을 카드 그리드로 구성
- 글래스모피즘, 그라데이션 텍스트, 뻔한 드롭 섀도
- "모달로 표시" (더 나은 대안 검토 없이)

**그린 플래그**:
- 구체적 색상 토큰 명시 (예: accent #c8a04a)
- 특정 폰트/크기 지정
- 차별화된 레이아웃 설명 (비대칭, 의도적 그리드 파괴 등)

#### 2. 타이포그래피

- 폰트가 구체적으로 지정되었는가? (.impeccable.md 기준: Press Start 2P)
- 제목/본문/캡션 간 시각적 위계가 Plan에 명시되었는가?
- 게임 UI와 웹 UI에서 폰트 일관성 계획이 있는가?
- 깊이 평가 필요 시 → `.claude/skills/frontend-design/reference/typography.md` 참조

#### 3. 색상 전략

- 팔레트가 구체적 hex 값으로 정의되었는가?
- .impeccable.md의 Color Tokens과 일치하는가?
- DOM(React)과 Canvas(Phaser) 간 색상 토큰 공유 계획이 있는가?
- 상태별 색상 사용 (success/danger/info)이 일관되는가?
- 깊이 평가 필요 시 → `.claude/skills/frontend-design/reference/color-and-contrast.md` 참조

#### 4. 레이아웃 의도성

- 게임 UI: HUD 투명도, 페이즈별 UI 전환(빌드↔전투)이 명시되었는가?
- 8px/32px 간격 리듬(.impeccable.md 기준)을 따르는가?
- 반응형 전략이 "축소"가 아닌 "적응"인가?
- 모바일 퍼스트(390x844) 제약을 인지하고 있는가?
- 깊이 평가 필요 시 → `.claude/skills/frontend-design/reference/spatial-design.md` 참조

#### 5. 모션/인터랙션

- 상태 전환(페이즈 변경, 타워 배치 피드백, 결과 화면)의 모션이 정의되었는가?
- transform/opacity 기반인가? (layout 속성 애니메이션은 60fps를 깨뜨림)
- 즉각적 피드백(.impeccable.md 원칙 #2)이 반영되었는가?
- 깊이 평가 필요 시 → `.claude/skills/frontend-design/reference/motion-design.md` 참조

#### 6. 게임-웹 경계 (game-ui-design 기준)

- DOM(React)과 Canvas(Phaser)의 역할 분리가 명확한가?
  - React: 메뉴, 설정, 로비, 텍스트 패널, 오버레이, 상태바
  - Phaser: 게임 시각 피드백, 체력바, VFX, 타일맵
- EventBus 통신 패턴을 따르는가? (request-* → Phaser, 서술적 이름 → React)
- 터치 타겟 44x44px 최소 기준을 인지하는가?
- 엄지 도달 영역(하단 2/3)에 핵심 인터랙션이 배치되는가?

### 미학 리뷰 출력

Plan 파일에 다음 섹션을 추가한다:

```markdown
## 미학 리뷰 (frontend-design + game-ui-design)

| 차원 | 점수 | 소견 | 개선안 |
|------|------|------|--------|
| AI Slop 위험도 | X/10 | [구체적 근거] | [구체적 개선 — 파일명, 토큰명 수준] |
| 타이포그래피 | X/10 | ... | ... |
| 색상 전략 | X/10 | ... | ... |
| 레이아웃 의도성 | X/10 | ... | ... |
| 모션/인터랙션 | X/10 | ... | ... |
| 게임-웹 경계 | X/10 | ... | ... |

**미학 종합: X.X/10**

### 개선 필요 항목
[7점 미만 항목만. 각 항목에 대해:]
- **[차원명]** (X/10): [문제] → [구체적 개선안]
```

**점수 해석:**
- 8-10: 구현 시 미학적으로 차별화될 준비가 됨
- 5-7: 방향은 있지만 구체성 부족 → 개선안을 taste decision으로
- 0-4: AI slop 위험 → Plan 수정 강력 권고

---

## Step 3: Phase 3 (Eng)

autoplan 그대로 실행. 변경 없음.

Phase 3.5 (DX)는 이 프로젝트가 게임이므로 기본 스킵한다.
(DX 키워드가 2개 이상 감지되면 autoplan이 자동으로 실행함)

---

## Step 4: Final Gate 확장

autoplan의 Phase 4 (Final Approval Gate) 출력에 다음을 추가한다:

```markdown
### 미학 리뷰 결과
- **미학 종합**: X.X/10
- **AI Slop 위험도**: X/10 (10=안전, 낮을수록 위험)
- **가장 약한 차원**: [이름] (X/10)
- [7점 미만 항목이 있으면:] ⚠️ 미학 개선 필요 — 아래 taste decision 참조
```

7점 미만 항목은 autoplan의 taste decision 목록에 추가된다.
미학 점수는 블로킹하지 않는다 — 사용자가 Final Gate에서 판단한다.

---

## 참조 파일

이 스킬이 실행 중 읽는 파일들:

| 파일 | 경로 | 시점 |
|------|------|------|
| autoplan | `~/.claude/skills/gstack/autoplan/SKILL.md` | Step 1 시작 |
| .impeccable.md | 프로젝트 루트 | Step 0 (디자인 컨텍스트) |
| game-ui-design | `.claude/skills/game-ui-design/SKILL.md` | Step 2 (게임-웹 경계 평가) |
| frontend-design | `.claude/skills/frontend-design/SKILL.md` | Step 2 (안티패턴 참조) |
| frontend-design/reference/* | `.claude/skills/frontend-design/reference/` | Step 2 (차원별 깊이 평가 시) |

---

## 핵심 규칙

1. **autoplan이 기반.** 이 스킬은 autoplan에 미학 레이어를 얹는 래퍼다. autoplan의 6 Decision Principles, 순차 실행, Decision Audit Trail, Dual Voices를 모두 유지한다.

2. **미학 리뷰는 Phase 2 완료 후 1회.** Plan-design-review의 Pass 1-7이 끝난 뒤 미학 리뷰를 추가한다. Phase 1, 3에는 개입하지 않는다.

3. **미학 점수는 블로킹하지 않는다.** 7점 미만은 taste decision으로 Final Gate에 올린다. 자동 거부하지 않는다 — 사용자가 최종 판단한다.

4. **reference 파일은 필요할 때만.** 특정 차원을 깊이 평가해야 할 때만 frontend-design/reference/ 하위 파일을 읽는다. 모든 차원에 대해 매번 전부 읽지 않는다.

5. **.impeccable.md가 진실의 원천.** 이 프로젝트의 디자인 방향(색상 토큰, 폰트, 간격 리듬, 원칙)은 .impeccable.md에 정의되어 있다. 미학 리뷰의 "올바른 방향"은 .impeccable.md가 결정한다.
