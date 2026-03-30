# impeccable 게임 UI 스킬 설치 및 커스터마이징

## Context

현재 프로젝트의 React + Phaser 하이브리드 UI는 inline 스타일과 수동 토큰 관리로 구성되어 있다. 로비, 게임, 매치 결과 등 화면 간 시각적 통일감이 부족하고, UI 품질을 체계적으로 검증할 도구가 없다. impeccable 디자인 스킬 시스템을 설치하고 게임 UI에 맞게 커스터마이징하여, `/audit`, `/polish` 등의 명령어로 디자인 품질을 관리할 수 있게 한다.

## 접근법

**Full Install + Game Overlay** — impeccable 21개 스킬 전체 설치 + 게임 UI 전용 오버레이 스킬(`game-ui-design`) 추가 + `.impeccable.md` 디자인 컨텍스트 작성.

## 설치 구조

```
.claude/
├── skills/
│   ├── frontend-design/          ← impeccable 핵심 (SKILL.md + reference/ 7개)
│   ├── audit/                    ← 기존 20개 명령어 스킬들
│   ├── polish/
│   ├── animate/
│   ├── arrange/
│   ├── teach-impeccable/
│   ├── adapt/
│   ├── bolder/
│   ├── clarify/
│   ├── colorize/
│   ├── critique/
│   ├── delight/
│   ├── distill/
│   ├── extract/
│   ├── harden/
│   ├── normalize/
│   ├── onboard/
│   ├── optimize/
│   ├── overdrive/
│   ├── quieter/
│   ├── typeset/
│   └── game-ui-design/          ← 새로 작성할 게임 UI 오버레이 스킬
│       ├── SKILL.md
│       └── reference/
│           ├── phaser-ui-patterns.md
│           ├── game-hud-design.md
│           └── tower-defense-ui.md
.impeccable.md                    ← 프로젝트 디자인 컨텍스트
```

## .impeccable.md 디자인 컨텍스트

프로젝트 루트에 생성. 모든 impeccable 명령어가 이 파일을 참조한다.

```markdown
# Design Context

## Users & Purpose
모바일 게이머 (캐주얼~미드코어). 타워 디펜스 PvP 게임.
짧은 세션(5-10분)에 전략적 깊이를 제공.
빠른 피드백 루프: 타워 배치 → 전투 관전 → 결과 확인.

## Brand Personality
**중세 자연 판타지** — 따뜻하고 유기적, 픽셀아트 레트로 감성.
참고: 킹덤 러쉬, 라인 디펜스, 클래시 로얄의 UI 느낌.
피할 것: 사이버펑크/네온, 과도한 그라디언트, AI스러운 제너릭 UI.

## Aesthetic Direction
- 다크 모드 기본 (배경 #1a1208 중세 다크 브라운)
- 골드 액센트 (#c8a04a) — 주요 액션/강조
- Press Start 2P 픽셀 폰트 — 일관된 레트로 타이포그래피
- 32px 그리드 기반 — 게임 타일과 UI 간격 조화
- 인라인 스타일 (CSS 파일 없음, React style prop)

## Tech Constraints
- React 18 + Phaser 3 하이브리드 (DOM UI + Canvas 게임)
- Zustand 상태 관리 + TypedEventBus 통신
- 모바일 퍼스트 (390x844, max-width: 460px)
- 성능 우선: 60fps 게임 루프와 공존하는 가벼운 DOM UI

## Guiding Principles
1. **게임 몰입 우선** — UI는 게임플레이를 방해하지 않는다
2. **즉각적 피드백** — 모든 액션에 시각적/청각적 반응
3. **한 손 조작** — 엄지로 닿는 영역에 핵심 인터랙션
4. **일관된 픽셀 미학** — 모든 UI 요소가 32px 그리드와 조화
5. **정보 계층** — 가장 중요한 정보(HP, 골드)가 가장 눈에 띄게
```

## game-ui-design 스킬

### SKILL.md 내용

**1. Game UI 디자인 원칙**
- DOM UI와 Canvas 게임의 시각적 통일감 — 같은 색상 토큰, 같은 폰트
- HUD는 투명~반투명, 게임 영역을 최대한 확보
- 전투 중 UI 최소화, 빌드 페이즈에서 UI 확장
- 터치 타겟 최소 44px, 엄지 도달 영역 우선

**2. React↔Phaser UI 경계 가이드**
- DOM (React): 메뉴, 패널, 오버레이, 텍스트 무거운 UI
- Canvas (Phaser): 게임 내 피드백, 체력바, 범위 표시, 이펙트
- EventBus 통한 상태 동기화 패턴

**3. 타워디펜스 UI 패턴**
- 타워 선택 독: 하단 고정, 빠른 선택+배치 플로우
- 웨이브 정보: 프로그레스 바 + 미리보기
- 자원(골드/HP): 항상 보이는 상단 HUD
- 페이즈 전환: 빌드→전투 시 UI 모드 전환 애니메이션

**4. 안티패턴 (게임 UI 특화)**
- 게임 위를 덮는 모달/오버레이 (전투 중)
- 스크롤 필요한 정보 패널 (모바일 게임에서)
- Canvas와 DOM 간 시각적 단절 (폰트, 색상 불일치)
- 타워 배치 시 손가락이 그리드를 가리는 UI

### Reference 모듈

**phaser-ui-patterns.md**
- Phaser 텍스트 vs DOM 텍스트 사용 기준
- Canvas 위 체력바/범위/하이라이트 렌더링 패턴
- React↔Phaser 상태 동기화 (EventBus, Zustand)
- 씬 전환 시 UI 정리 패턴
- 게임 루프 60fps와 DOM 리렌더 최소화

**game-hud-design.md**
- 상태바(HP, 골드, 웨이브) 레이아웃 가이드
- 정보 계층: 1차(HP/골드) > 2차(웨이브/카운트다운) > 3차(페이즈)
- 숫자 변경 시 피드백 애니메이션 (골드±, HP 감소)
- 반투명 HUD 배경 패턴
- 픽셀 폰트 가독성 최적 크기

**tower-defense-ui.md**
- 타워 선택 독(dock) 디자인 — 아이콘+비용+쿨타임
- 타워 배치 플로우: 선택→그리드 호버→확인
- 웨이브 미리보기 UI 패턴
- 빌드/전투 페이즈 전환 UI
- 고스트 배틀 PvP 전용 UI (프레셔 선택, 매치 결과)

## 워크플로우

### 초기 셋업 (1회)
1. impeccable GitHub repo를 임시 clone 후 `dist/claude-code/.claude/skills/` → 프로젝트 `.claude/skills/`로 복사 (clone 후 임시 디렉토리 삭제)
2. `.impeccable.md` 생성 (위 내용)
3. `game-ui-design/` 스킬 디렉토리 + SKILL.md + reference 3개 작성
4. `.gitignore`에 `.superpowers/` 추가 확인

### 일상 사용
| 명령어 | 용도 |
|--------|------|
| `/audit` | UI 품질 5개 차원 점검 (접근성, 성능, 테마, 반응형, 안티패턴) |
| `/normalize` | 디자인 시스템 표준에 맞춤 (tokens.ts 일관성) |
| `/arrange` | 레이아웃, 간격, 구성 수정 |
| `/game-ui-design` | 게임 UI 가이드라인 참조하며 작업 |
| `/polish` | 작업 완료 후 최종 품질 패스 |
| `/animate` | 의미 있는 모션 추가 (CSS 애니메이션 위주) |
| `/colorize` | 전략적 색상 적용 (tokens.ts 기반) |
| `/typeset` | 픽셀 폰트 계층, 크기 일관성 수정 |

## 핵심 파일

| 파일 | 역할 |
|------|------|
| `.impeccable.md` | 프로젝트 디자인 컨텍스트 |
| `.claude/skills/game-ui-design/SKILL.md` | 게임 UI 오버레이 스킬 |
| `.claude/skills/game-ui-design/reference/*.md` | 게임 UI 참조 모듈 3개 |
| `.claude/skills/frontend-design/SKILL.md` | impeccable 핵심 스킬 |
| `packages/web-shell/src/styles/tokens.ts` | 기존 색상/폰트 토큰 |
| `packages/web-shell/src/components/ui/` | 기존 UI 컴포넌트 (PixelButton, PixelPanel) |

## Verification

1. `.claude/skills/` 디렉토리에 21개 impeccable 스킬 + 1개 game-ui-design 존재 확인
2. `.impeccable.md` 파일이 프로젝트 루트에 존재 확인
3. `/audit` 명령어 실행 시 .impeccable.md 컨텍스트를 참조하는지 확인
4. `/game-ui-design` 명령어 실행 시 reference 모듈 3개를 로드하는지 확인
5. 기존 빌드 (`bun run build`) 정상 동작 확인 — 새 파일이 빌드를 깨뜨리지 않음
