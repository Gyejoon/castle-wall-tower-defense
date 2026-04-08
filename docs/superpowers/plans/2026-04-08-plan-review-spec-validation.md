# plan-review 스킬: game-spec 기반 스펙 검증 추가

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** plan-review 스킬이 모든 리뷰 Phase에서 `docs/game-spec/` 문서를 근거로 plan의 스펙 정합성을 검증하고, 충돌 시 하드 블로커로 처리하도록 개선한다.

**Architecture:** 기존 래퍼 패턴 유지. autoplan 코어 미수정. Step 0에 키워드→문서 매핑 로직 추가, Step 1/2/3 각각 Phase 완료 후 스펙 검증 섹션 주입, Step 4 Final Gate에 스펙 정합성 하드게이트 추가.

**Tech Stack:** Markdown skill file (`.claude/skills/plan-review/SKILL.md`) 단일 파일 수정. `/skill-creator` 스킬 사용.

---

## File Structure

- **Modify:** `.claude/skills/plan-review/SKILL.md` — 유일한 수정 대상

현재 파일 구조 (252줄):
```
L1-16:   frontmatter (name, description, user-invocable)
L17-28:  소개 + 실행 흐름 다이어그램
L45-84:  Step 0 (0-1 Plan 찾기, 0-2 디자인 컨텍스트, 0-3 UI 스코프)
L86-99:  Step 1 (CEO — autoplan 그대로)
L100-198: Step 2 (Design + 미학 리뷰 6차원)
L199-208: Step 3 (Eng — autoplan 그대로)
L209-225: Step 4 (Final Gate + 미학 점수)
L226-238: 참조 파일 테이블
L239-252: 핵심 규칙 5개
```

---

### Task 1: frontmatter description 업데이트

**Files:**
- Modify: `.claude/skills/plan-review/SKILL.md:1-16`

- [ ] **Step 1: description에 스펙 검증 역할 추가**

```markdown
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
```

old_string (교체 대상): 기존 frontmatter L1-16 전체.

- [ ] **Step 2: 소개 문단 업데이트**

기존 L18-25의 소개를 다음으로 교체:

```markdown
# /plan-review — 통합 Plan 리뷰 파이프라인

autoplan(CEO → Design → Eng 순차 리뷰)을 실행하되, 두 가지 프로젝트 고유 레이어를 추가한다:

1. **스펙 검증 (하드 게이트)**: 모든 Phase에서 `docs/game-spec/` 문서를 근거로 Plan의 정합성을 검증한다. 스펙과 직접 모순(CONFLICT)되면 다음 Phase로 진행할 수 없다.
2. **미학 평가 (어드바이저리)**: Design Phase에서 `.impeccable.md` + `game-ui-design` 기준으로 미학을 점수화한다. 블로킹하지 않는다.

autoplan만으로는 "전략적으로 타당한가"는 점검하지만 "게임 스펙 문서와 일치하는가"는
점검하지 않는다. Plan 단계에서 스펙 정합성과 미학 방향을 확정해야 구현자가
잘못된 수치나 AI slop에 빠지지 않고 일관된 결과물을 만들 수 있다.
```

- [ ] **Step 3: 실행 흐름 다이어그램 업데이트**

기존 L29-41의 다이어그램을 다음으로 교체:

```markdown
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
```

- [ ] **Step 4: 커밋**

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "feat(plan-review): frontmatter·소개·흐름도에 스펙 검증 역할 반영"
```

---

### Task 2: Step 0에 스펙 스코프 서브스텝 추가

**Files:**
- Modify: `.claude/skills/plan-review/SKILL.md:45-84` (Step 0 섹션 끝에 추가)

- [ ] **Step 1: 0-4. 스펙 스코프 섹션 작성**

기존 Step 0의 `0-3. UI 스코프 감지` 섹션 뒤 (`UI scope: OFF — 미학 리뷰 스킵"` 줄 뒤)에 다음을 추가:

```markdown
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
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "feat(plan-review): Step 0에 스펙 스코프 키워드→문서 매핑 추가"
```

---

### Task 3: Step 1에 CEO 스펙 검증 주입

**Files:**
- Modify: `.claude/skills/plan-review/SKILL.md` (Step 1 섹션)

- [ ] **Step 1: 기존 Step 1 교체**

기존 Step 1 (L86-99, `## Step 1: autoplan 실행` ~ `**Phase 1 (CEO)**: autoplan 그대로 실행. 변경 없음.`) 을 다음으로 교체:

```markdown
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
| 시스템 범위 | 01-GDD §4 (Core Systems) | Plan이 새 시스템을 추가하거나 기존 시스템의 역할을 변경하는가? 8대 코어 시스템(Combat, Movement, Placement, Tower Sell, Element, Gacha/Box, Upgrade, Boss/Encounter)과 충돌하지 않는가? |
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
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "feat(plan-review): Step 1에 CEO 스펙 검증 5차원 주입"
```

---

### Task 4: Step 2에 디자인 스펙 검증 추가

**Files:**
- Modify: `.claude/skills/plan-review/SKILL.md` (Step 2 섹션)

- [ ] **Step 1: Step 2 헤더 및 순서 업데이트**

기존 Step 2 시작부 (L100-109) 를 다음으로 교체:

```markdown
## Step 2: Phase 2 (Design) + 미학 리뷰 + 디자인 스펙 검증

autoplan의 Phase 2(plan-design-review)를 실행한 뒤, 미학 리뷰와 스펙 검증을 **별도 섹션으로 추가**한다.

순서:
1. plan-design-review의 Pass 1-7 실행 (autoplan이 지시하는 대로)
2. Pass 7 완료 후, 미학 리뷰 실행 (아래 6개 차원)
3. 미학 리뷰 완료 후, 디자인 스펙 검증 실행 (아래)
```

- [ ] **Step 2: 미학 리뷰 출력 섹션 뒤에 디자인 스펙 검증 추가**

기존 미학 리뷰 출력 마크다운 (`**점수 해석:**` 블록 끝) 바로 뒤에 다음을 추가:

```markdown
### 디자인 스펙 검증

Step 0-4에서 Phase 2에 할당된 스펙 문서를 `docs/game-spec/`에서 읽고, Plan의 UI/디자인 제안을 대조한다.

#### Design 검증 차원

| 차원 | 대조 문서 | 검증 내용 |
|------|---------|---------|
| 디자인 토큰 | 01-GDD §8 (UI/UX — 디자인 시스템) | Plan이 지정하는 색상, 폰트, 간격이 GDD의 13개 색상 토큰·5단계 타이포·44px 터치 기준과 일치하는가? 존재하지 않는 토큰을 사용하는가? |
| 밸런스 수치 | 02-balance-sheet §1-8 | Plan이 참조하는 수치(에너지 비용, 가챠 확률, 미션 보상, 타워 스탯, 적 스탯, armor/pierce)가 밸런스 시트와 일치하는가? |
| 에셋 규격 | 07-asset-def §1 (공통 제작 사양), §3 (타워), §10 (네이밍) | Plan이 제안하는 에셋이 공통 규격(64×80 타워, 40×48 유닛, 8-frame 스프라이트시트, center pivot, PNG+WebP)을 따르는가? |
| 속성/등급 색상 | 07-asset-def §4 (색상 정책), §11 (등급 토큰) | Plan이 사용하는 속성 색상(fire #e74c3c, water #3498db, lightning #f39c12, neutral #c8a04a)과 등급 색상이 에셋 정의와 일치하는가? |
| UI 구조 | 01-GDD §8 (UI 구조) | Plan이 추가하는 UI 요소가 기존 UI 구조(HUD, ProfileBar, Lobby 4탭, WorldMap, StageDetail, Deck, Result, Tutorial)와 충돌하지 않는가? |
| 콘텐츠 범위 | 01-GDD §5 (Content Plan) | Plan이 참조하는 타워·적·스테이지·웨이브 수가 콘텐츠 플랜(18타워×5티어, 5적, 3스테이지, 10웨이브)과 일치하는가? |

판정 기준과 충돌 리포트 형식은 Step 1과 동일하다.

**❌ CONFLICT가 1건 이상이면 Phase 3으로 진행할 수 없다.**
미학 점수(기존)는 여전히 블로킹하지 않는다 — 스펙 검증만 블로킹한다.
```

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "feat(plan-review): Step 2에 디자인 스펙 검증 6차원 추가"
```

---

### Task 5: Step 3에 Eng 스펙 검증 주입

**Files:**
- Modify: `.claude/skills/plan-review/SKILL.md` (Step 3 섹션)

- [ ] **Step 1: 기존 Step 3 교체**

기존 Step 3 (L199-208) 을 다음으로 교체:

```markdown
## Step 3: Phase 3 (Eng) + Eng 스펙 검증

### 3-1. Phase 3 실행

autoplan 그대로 실행.

Phase 3.5 (DX)는 이 프로젝트가 게임이므로 기본 스킵한다.
(DX 키워드가 2개 이상 감지되면 autoplan이 자동으로 실행함)

### 3-2. Eng 스펙 검증

Phase 3 완료 후, Step 0-4에서 Phase 3에 할당된 스펙 문서를 `docs/game-spec/`에서 읽고 검증한다.

#### Eng 검증 차원

| 차원 | 대조 문서 | 검증 내용 |
|------|---------|---------|
| 패키지 의존 방향 | 08-arch §1 (패키지 구조) | Plan이 단방향 의존성(`@gld/shared` → `@gld/phaser-game` → `web-shell`)을 위반하는 import를 제안하는가? |
| 시스템 초기화 순서 | 08-arch §2 (시스템 의존성 및 생명주기) | Plan이 새 시스템을 추가할 때 기존 초기화 순서(Grid→Pathfinding→Tower→Unit→Wave→Deck→DamageNumber→Energy→Tutorial)에 맞게 위치를 지정했는가? |
| update() 루프 순서 | 08-arch §2 | Plan이 update 루프에 새 로직을 추가할 때 기존 6단계 순서(Wave→Energy→processCombatField→DamageNumber→exit→victory/defeat)를 인지하고 올바른 위치에 배치했는가? |
| EventBus 패턴 | 08-arch §3 (TypedEventBus) | Plan이 새 이벤트를 추가할 때 네이밍 규칙(React→Phaser: `request-*`, Phaser→React: 서술형)을 따르는가? GameEventMap에 타입을 추가해야 한다는 것을 인지하는가? |
| 상태 관리 계층 | 08-arch §4 (상태 관리) | Plan이 상태를 올바른 계층에 배치하는가? (gameStore: 런 단위, metaStore: 영속+localStorage, game.registry: 초기값 전달용, 시스템 내부: 시스템 로컬) |
| 렌더링 depth | 08-arch §5 (렌더링 파이프라인) | Plan이 새 시각 요소를 추가할 때 기존 depth 테이블(0 Ground ~ 150 Tutorial)과 충돌하지 않는가? |
| 데이터 스키마 | 04-data §1 (Save Data), §5 (Enum) | Plan이 새 데이터 필드를 추가할 때 기존 스키마 구조를 따르는가? Tower ID, Stage ID, Grade 등 Enum 값이 유효한가? |
| 설정 동기화 | 04-data §7 (React ↔ Phaser 설정 동기화) | Plan이 새 설정을 추가할 때 동기화 경로(Zustand → game.registry.set → Phaser changedata 이벤트)를 따르는가? |
| 배포/운영 호환 | 05-ops §1 (운영 스택), §5 (배포) | Plan이 새 인프라 의존성을 추가하는가? 기존 운영 스택(Vercel, Sentry, PostHog, Supabase, Upstash)과 호환되는가? |

판정 기준과 충돌 리포트 형식은 Step 1과 동일하다.

**❌ CONFLICT가 1건 이상이면 Final Gate로 진행할 수 없다.**
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "feat(plan-review): Step 3에 Eng 스펙 검증 9차원 주입"
```

---

### Task 6: Step 4 Final Gate 확장 + 충돌 리포트 형식

**Files:**
- Modify: `.claude/skills/plan-review/SKILL.md` (Step 4 섹션)

- [ ] **Step 1: 기존 Step 4 교체**

기존 Step 4 (L209-225) 를 다음으로 교체:

```markdown
## Step 4: Final Gate 확장

autoplan의 Phase 4 (Final Approval Gate) 출력에 다음을 추가한다:

### 스펙 정합성 결과 (하드 게이트)

```markdown
### 스펙 정합성 (Game Spec Alignment) — 하드 게이트

| Phase | 검증 문서 수 | PASS | DRIFT | CONFLICT |
|-------|-----------|------|-------|----------|
| CEO   | N         | N    | N     | 0        |
| Design| N         | N    | N     | 0        |
| Eng   | N         | N    | N     | 0        |

**스펙 정합성: ✅ ALL PASS** (또는 **❌ BLOCKED — N건의 CONFLICT 미해결**)
```

CONFLICT가 1건이라도 남아 있으면 Final Gate에 도달할 수 없다 (해당 Phase에서 이미 블로킹됨).

### 미학 리뷰 결과 (어드바이저리 — 기존과 동일)

```markdown
### 미학 리뷰 결과

- **미학 종합**: X.X/10
- **AI Slop 위험도**: X/10 (10=안전, 낮을수록 위험)
- **가장 약한 차원**: [이름] (X/10)
- [7점 미만 항목이 있으면:] ⚠️ 미학 개선 필요 — 아래 taste decision 참조
```

7점 미만 항목은 autoplan의 taste decision 목록에 추가된다.
미학 점수는 블로킹하지 않는다 — 사용자가 Final Gate에서 판단한다.

### 충돌 리포트 공통 형식

모든 Phase의 CONFLICT/DRIFT는 아래 형식을 따른다:

```markdown
### ❌ CONFLICT-N: [제목]
- **스펙 문서**: `docs/game-spec/[파일명]` §[섹션번호] [섹션명]
- **스펙 내용**: "[해당 섹션에서 관련 내용 직접 인용]"
- **Plan 내용**: "[Plan에서 충돌하는 부분 직접 인용]"
- **충돌 설명**: [어떤 점에서 모순인지 구체적 설명]
- **수정 방안**:
  - A) Plan 수정: [스펙을 따르려면 Plan을 어떻게 수정해야 하는지]
  - B) 스펙 업데이트: [스펙이 낡아서 Plan이 맞다면, 어떤 스펙 파일의 어떤 섹션을 어떻게 수정해야 하는지]

### ⚠️ DRIFT-N: [제목]
- **스펙 문서**: `docs/game-spec/[파일명]` §[섹션번호]
- **스펙 의도**: "[의도 설명]"
- **이탈 방향**: "[어떻게 벗어나는지]"
- **권고**: [조정 제안]
```
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "feat(plan-review): Step 4 Final Gate에 스펙 정합성 하드게이트 + 충돌 리포트 형식 추가"
```

---

### Task 7: 참조 파일 테이블 + 핵심 규칙 업데이트

**Files:**
- Modify: `.claude/skills/plan-review/SKILL.md` (참조 파일 테이블 + 핵심 규칙 섹션)

- [ ] **Step 1: 참조 파일 테이블 교체**

기존 참조 파일 테이블 (L226-238) 을 다음으로 교체:

```markdown
## 참조 파일

이 스킬이 실행 중 읽는 파일들:

| 파일 | 경로 | 시점 |
|------|------|------|
| autoplan | `~/.claude/skills/gstack/autoplan/SKILL.md` | Step 1 시작 |
| .impeccable.md | 프로젝트 루트 | Step 0 (디자인 컨텍스트) |
| game-ui-design | `.claude/skills/game-ui-design/SKILL.md` | Step 2 (게임-웹 경계 평가) |
| frontend-design | `.claude/skills/frontend-design/SKILL.md` | Step 2 (안티패턴 참조) |
| frontend-design/reference/* | `.claude/skills/frontend-design/reference/` | Step 2 (차원별 깊이 평가 시) |
| 01-GDD | `docs/game-spec/01-GDD.md` | Phase 1 (CEO), Phase 2 (Design) — 키워드 매칭 시 |
| 02-balance-sheet | `docs/game-spec/02-balance-sheet.md` | Phase 2 (Design) — 키워드 매칭 시 |
| 03-business-model | `docs/game-spec/03-business-model.md` | Phase 1 (CEO) — 키워드 매칭 시 |
| 04-data-structure | `docs/game-spec/04-data-structure.md` | Phase 3 (Eng) — 키워드 매칭 시 |
| 05-operations | `docs/game-spec/05-operations.md` | Phase 3 (Eng) — 키워드 매칭 시 |
| 06-milestone | `docs/game-spec/06-milestone.md` | Phase 1 (CEO) — 키워드 매칭 시 |
| 07-asset-definition | `docs/game-spec/07-asset-definition.md` | Phase 2 (Design) — 키워드 매칭 시 |
| 08-architecture | `docs/game-spec/08-architecture.md` | Phase 3 (Eng) — 키워드 매칭 시 |
```

- [ ] **Step 2: 핵심 규칙 교체**

기존 핵심 규칙 5개 (L239-252) 를 다음으로 교체:

```markdown
## 핵심 규칙

1. **autoplan이 기반.** 이 스킬은 autoplan에 스펙 검증 + 미학 레이어를 얹는 래퍼다. autoplan의 6 Decision Principles, 순차 실행, Decision Audit Trail, Dual Voices를 모두 유지한다.

2. **미학 리뷰는 Phase 2 완료 후 1회.** Plan-design-review의 Pass 1-7이 끝난 뒤 미학 리뷰를 추가한다. 미학은 Phase 2에서만 평가한다.

3. **미학 점수는 블로킹하지 않는다.** 7점 미만은 taste decision으로 Final Gate에 올린다. 자동 거부하지 않는다 — 사용자가 최종 판단한다.

4. **reference 파일은 필요할 때만.** 특정 차원을 깊이 평가해야 할 때만 frontend-design/reference/ 하위 파일을 읽는다. 모든 차원에 대해 매번 전부 읽지 않는다.

5. **.impeccable.md가 미학의 원천.** 이 프로젝트의 디자인 방향(색상 토큰, 폰트, 간격 리듬, 원칙)은 .impeccable.md에 정의되어 있다. 미학 리뷰의 "올바른 방향"은 .impeccable.md가 결정한다.

6. **스펙 검증은 모든 Phase에서 실행한다.** Step 0-4에서 키워드 매칭으로 선택된 `docs/game-spec/` 문서만 각 Phase 시작 시점에 읽는다. 전체 8개를 매번 로드하지 않는다.

7. **스펙 CONFLICT는 하드 블로커다.** CONFLICT(직접 모순)가 해소되지 않으면 다음 Phase로 진행할 수 없다. DRIFT(방향 이탈)는 경고로 기록하되 진행을 막지 않는다. 미학(어드바이저리)과 스펙(블로커)은 완전히 별개의 게이트다.

8. **스펙 문서 업데이트도 유효한 해결책이다.** CONFLICT 발생 시 "Plan이 틀렸다"만이 아니라 "스펙이 낡았다"도 가능하다. 어느 쪽을 수정할지는 사용자가 결정한다. 수정 후 해당 Phase의 스펙 검증만 재실행한다.
```

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "feat(plan-review): 참조 파일에 game-spec 추가, 핵심 규칙 5→8개 확장"
```

---

### Task 8: 스킬 검증 — 실제 plan으로 dry-run

**Files:**
- Read only: 최근 plan 파일, `.claude/skills/plan-review/SKILL.md`

- [ ] **Step 1: 수정된 SKILL.md 전체 읽기**

```bash
cat .claude/skills/plan-review/SKILL.md
```

전체 내용이 일관되고, 마크다운 구문 오류가 없는지 확인.

- [ ] **Step 2: 기존 plan 파일로 키워드 매칭 시뮬레이션**

```bash
ls -t docs/superpowers/plans/*.md | head -1
```

최근 plan 파일을 읽고, Step 0-4의 키워드 매칭 로직을 수동 적용:
- 각 문서별 매치 키워드 수 확인
- Phase별 문서 할당 결과 확인
- 예상 출력 형식 확인

Expected: 최소 2-3개 문서가 선택되고, Phase별 할당이 올바르게 출력됨.

- [ ] **Step 3: CONFLICT 시나리오 검증**

Plan에 "에너지 시작값 20" 같은 스펙 충돌 내용이 있다면 CONFLICT로 잡히는지 논리적 검증.
없다면 가상 시나리오로 검증:
- 02-balance-sheet에 "시작 에너지 10" 정의
- Plan에 "시작 에너지 20으로 변경" 기술
- → CONFLICT 판정 + 리포트 형식 확인

- [ ] **Step 4: 최종 커밋 (필요 시)**

검증 중 발견된 오타/구문 오류 수정 후 커밋.

```bash
git add .claude/skills/plan-review/SKILL.md
git commit -m "fix(plan-review): 스펙 검증 dry-run 후 수정"
```
