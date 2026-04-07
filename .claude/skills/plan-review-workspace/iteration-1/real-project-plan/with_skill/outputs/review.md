# 미학 리뷰 (frontend-design + game-ui-design)

**Plan:** `docs/superpowers/plans/2026-04-06-phase4-engagement-systems.md`
**평가 기준:** `.impeccable.md` Color Tokens, Typography, Layout, Guiding Principles
**평가 일시:** 2026-04-07

---

## UI 스코프 감지

UI scope: **ON**

매치 키워드: HUD, overlay, panel, dock, component, button, tab, modal, layout, UI, UX, 화면, 디자인, tutorial-overlay, phaser, tile, tower, wave

---

## 6차원 평가표

| 차원 | 점수 | 소견 | 개선안 |
|------|------|------|--------|
| AI Slop 위험도 | 5/10 | Plan에 구체적 색상 토큰 참조가 거의 없다. Task 4 SliderRow/SelectRow에서 `bg-border`, `accent-gold`, `text-text-secondary` 등 Tailwind 클래스를 사용하지만, 이는 `.impeccable.md`의 hex 토큰(`#c8a04a`, `#1a1208`)이 아닌 추상 이름이다. Task 7 MissionsTab, Task 12 TutorialOverlay에서 "금색 배경 패널", "accent 색상 보더" 등 모호한 지시가 다수. 구현자가 Tailwind 기본 팔레트에 의존할 위험이 높다. Task 9 GachaScreen 재작성은 시각 연출을 3단계로 명시했으나 구체적 색상/모션 값이 없다. | 1) 모든 UI Task에 `.impeccable.md` Color Tokens 섹션의 hex 값을 인라인 스타일로 명시. 예: `style={{ background: '#2a2010', border: '1px solid #4a3a20' }}`. 2) Task 4의 SliderRow/SelectRow에서 Tailwind 클래스 제거, `tokens.ts`의 색상 토큰 직접 참조. 3) Task 7 MissionSection 카드의 프로그레스바 색상을 `accent: #c8a04a` (미완료), `success: #7ab648` (완료)로 명시. 4) Task 9 GachaScreen reveal 연출에서 tier별 색상 매핑 명시 (tier5 → `gold: #f0d060`, tier4 → `accent: #c8a04a`, tier3 → `info: #5bc8e8`). |
| 타이포그래피 | 4/10 | `.impeccable.md`는 **Press Start 2P** 픽셀 폰트를 일관된 레트로 타이포그래피로 지정한다. Plan에서 `font-pixel`, `text-xs`, `text-sm`, `text-[11px]` 등 Tailwind 유틸리티를 사용하지만, 제목/본문/캡션 간 시각적 위계(hierarchy)가 Plan 수준에서 정의되지 않았다. MissionsTab의 섹션 제목, 미션 카드 내 라벨, 보상 텍스트, TutorialOverlay의 메시지 텍스트가 모두 같은 `font-pixel text-xs`로 표현되어 계층이 평탄하다. GachaScreen의 타워 이름/tier 표시, pity 카운터의 타이포 위계도 미정의. | 1) Plan 상단에 타이포그래피 위계 정의 추가: Heading(`Press Start 2P`, 14px), Body(`Press Start 2P`, 10px), Caption(`Press Start 2P`, 8px), Number(`Press Start 2P`, 12px, `color: #f0d060`). 2) Task 7 MissionsTab: 섹션 제목은 Heading, 미션 라벨은 Body, 보상 수치는 Number 스타일. 3) Task 12 TutorialOverlay: 메시지를 Body로, 스텝 번호(1/5)를 Caption으로 분리. 4) Task 9 GachaScreen: 타워 이름 Heading, tier 라벨 Caption, "전설 확정" 배너는 Heading + `gold: #f0d060`. 5) `.impeccable.md`에 "인라인 스타일만 사용" 제약이 있으므로, Tailwind 클래스(`text-xs` 등) 대신 `style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}` 형태로 전환. |
| 색상 전략 | 6/10 | `.impeccable.md`의 Color Tokens(bg `#1a1208`, panel `#2a2010`, border `#4a3a20`, accent `#c8a04a`, success `#7ab648`, danger `#c03020`, gold `#f0d060`, info `#5bc8e8`, text `#f0e8d8`, textSecondary `#a09070`)가 정의되어 있다. Plan은 일부에서 이를 참조한다: Task 4 `rgba(26, 18, 8, 0.8)` (bg 기반), Task 12 `bg-panel border border-gold`. 하지만 DOM(React)과 Canvas(Phaser) 간 색상 토큰 공유 계획이 없다. Task 11 TutorialSystem의 Phaser Graphics overlay 색상이 미정의. Task 9 GachaScreen의 tier별 색상, 상태별 색상(no_diamond, cooldown)이 미정의. Amendment H에서 일일/주간 시각 구분을 언급하지만 구체적 hex 값 없음. | 1) Plan 상단 또는 File Structure 섹션에 "모든 UI 컴포넌트는 `packages/web-shell/src/styles/tokens.ts`의 색상 토큰을 import하여 사용" 명시. 2) Task 11 TutorialSystem Phaser overlay: 어둡게 = `0x1a1208` alpha 0.7, 하이라이트 타일 = `0xc8a04a` alpha 0.3. 3) Task 9 tier별 색상 매핑 테이블 추가: `{ 1: '#a09070', 2: '#5bc8e8', 3: '#c8a04a', 4: '#c03020', 5: '#f0d060' }`. 4) Amendment H 보강: 일일 헤더 `accent: #c8a04a`, 주간 헤더 `gold: #f0d060`. 5) Amendment L no_diamond 상태: `danger: #c03020` 텍스트 + `textSecondary: #a09070` 안내. |
| 레이아웃 의도성 | 6/10 | `.impeccable.md`는 32px 그리드, 모바일 퍼스트(390x844, max-width: 460px)를 지정한다. Plan의 MissionsTab, SettingsTab은 `px-3 py-2.5`, `p-4 gap-4` 등 Tailwind 간격을 사용하는데, 이는 `.impeccable.md`의 8px 단위 리듬(8, 16, 24, 32)과 정확히 맞지 않는다(`px-3` = 12px, `py-2.5` = 10px). TutorialOverlay는 `bottom-24 max-w-[280px]`로 위치를 지정했으나, 엄지 도달 영역(하단 2/3)과의 관계가 불명확하다. GachaScreen의 10연차 카드 레이아웃(10장 배치 방식)이 미정의. Task 7 MissionsTab의 미션 카드 높이, 프로그레스바 크기가 44px 터치 타겟 기준으로 검토되지 않았다. | 1) 모든 간격을 8px 단위로 정렬: `p-2`(8px), `p-4`(16px), `gap-4`(16px) 또는 인라인 `padding: 8px`, `padding: 16px`. `px-3`(12px), `py-2.5`(10px) 제거. 2) Task 7 미션 카드: 최소 높이 48px (44px 터치 타겟 + 4px 여백), 수령 버튼 44x44px 명시. 3) Task 12 TutorialOverlay: `bottom: 96px` (32px * 3, 독 높이 위)로 명시, 메시지 패널 폭 `max-width: 320px` (390px - 32px*2 여백). 4) Task 9 10연차 레이아웃: 2행 5열 그리드, 각 카드 64x96px (32px * 2 x 32px * 3), 간격 8px. 5) `.impeccable.md`에 "인라인 스타일만" 제약이 있으므로, Tailwind 유틸리티 대신 `style={{ padding: 16, gap: 8 }}` 형태로 전환할 것을 Task 전반에 명시. |
| 모션/인터랙션 | 3/10 | `.impeccable.md` 원칙 #2 "즉각적 피드백 — 모든 액션에 시각적/청각적 반응"이 핵심이나, Plan에서 모션이 정의된 곳이 극히 적다. Task 9 GachaScreen의 3단계 연출(select → opening → reveal)과 Amendment J의 카드 뒤집기만 언급. 미션 보상 수령, 다이아몬드 증가, 설정 슬라이더 조작, 튜토리얼 스텝 전환, 페이즈 전환 시 UI 모드 변경 등에 대한 모션 정의가 전무하다. `transform`/`opacity` 기반 애니메이션 원칙(60fps 보장)도 언급되지 않았다. | 1) 미션 보상 수령: 다이아몬드 아이콘 `scale(1→1.3→1)` + 숫자 카운트업 애니메이션 (200ms, `transform` only). 2) 가챠 카드 뒤집기: `rotateY(0→180deg)` transform, 400ms ease-out. tier5 시 `gold: #f0d060` 글로우 펄스 (`opacity: 0.5→1→0.5`, 1s loop). 3) 튜토리얼 스텝 전환: 메시지 패널 `opacity: 0→1` + `translateY(8px→0)`, 200ms. 4) 설정 슬라이더: 값 변경 시 숫자 `color` flash (`#f0d060` → `#f0e8d8`, 300ms). 5) Plan 상단에 모션 원칙 추가: "모든 애니메이션은 `transform`/`opacity`만 사용. 최대 300ms. `will-change` 속성으로 합성 레이어 힌트." 6) 미션 완료("오늘의 임무 완료!") 상태: 체크마크 `scale(0→1)` bounce + confetti-like 파티클 (Phaser Canvas 측). |
| 게임-웹 경계 | 8/10 | Plan은 DOM(React)과 Canvas(Phaser)의 역할을 대체로 잘 분리한다. 튜토리얼은 Amendment K에서 "React는 텍스트/메시지만, 타일 하이라이트는 Phaser Graphics"로 명확히 분리. EventBus 통신 패턴도 `request-*` (React→Phaser), 서술적 이름(Phaser→React)을 따른다(`request-tutorial-advance`, `tutorial-step`, `tower-placed`). Zustand store가 단일 진실 소스. useMissionTracker 훅이 EventBus 이벤트를 구독하여 store 업데이트. GachaScreen, MissionsTab, SettingsTab은 모두 React DOM. 다만 GachaScreen의 타워 reveal 연출이 DOM에서만 이루어지는데, 타워 스프라이트 프리뷰를 Canvas로 보여줄지 DOM img로 보여줄지 미정의. | 1) Task 9 GachaScreen reveal: 타워 프리뷰는 DOM `<img>` (스프라이트시트에서 추출한 PNG)로 표시. Canvas 게임 씬과 독립. 이를 Plan에 명시. 2) Task 12 TutorialOverlay의 z-index가 Phaser Canvas 위에 올바르게 렌더링되는지 확인 스텝 추가 (`z-index: 20`, Canvas는 `z-index: 0`). 3) 튜토리얼 완료 시 Phaser→React 통신 후 metaStore 저장 흐름을 시퀀스 다이어그램으로 명시하면 구현자 혼동 방지. |

---

## 미학 종합: 5.3/10

### 점수 해석
- 8-10: 구현 시 미학적으로 차별화될 준비가 됨
- 5-7: 방향은 있지만 구체성 부족 -- 개선안을 taste decision으로
- 0-4: AI slop 위험 -- Plan 수정 강력 권고

**현재 상태:** 방향은 있지만 구체성이 부족하다. 특히 모션/인터랙션과 타이포그래피에서 AI slop 위험이 높다.

---

## 개선 필요 항목 (7점 미만)

### 1. 모션/인터랙션 (3/10)
**문제:** `.impeccable.md` 원칙 #2 "즉각적 피드백"이 Plan에 거의 반영되지 않았다. 미션 보상 수령, 다이아몬드 증가, 튜토리얼 전환, 가챠 연출 외 모든 인터랙션에 모션 정의가 없다. 구현자가 정적 UI를 만들거나, 반대로 layout 속성 애니메이션으로 60fps를 깨뜨릴 위험.

**개선안:**
- Plan 상단에 **모션 가이드라인** 섹션 추가: `transform`/`opacity` only, max 300ms, `will-change` 힌트
- 각 Task의 UI 컴포넌트에 상태 전환 모션을 명시 (위 평가표의 구체안 참조)
- 특히 Task 7 (미션 보상 수령), Task 9 (가챠 reveal), Task 12 (튜토리얼 전환)에 모션 스펙 추가

### 2. 타이포그래피 (4/10)
**문제:** Press Start 2P 폰트 사용은 암시되어 있으나(`font-pixel`), 제목/본문/캡션/숫자 간 시각적 위계가 Plan에서 정의되지 않았다. 모든 텍스트가 `text-xs` 수준으로 평탄하다. `.impeccable.md`의 "인라인 스타일만 사용" 제약과 Tailwind 클래스 사용이 충돌한다.

**개선안:**
- Plan 상단에 **타이포 위계 테이블** 추가: Heading(14px), Body(10px), Caption(8px), Number(12px, `#f0d060`)
- Tailwind `font-pixel text-xs` 대신 인라인 `style={{ fontFamily: "'Press Start 2P'", fontSize: '10px' }}` 패턴으로 전환
- 각 Task의 코드 예시에서 타이포 위계 적용

### 3. AI Slop 위험도 (5/10)
**문제:** `.impeccable.md`의 구체적 hex 토큰이 Plan 코드 예시에서 거의 사용되지 않는다. 대신 Tailwind 추상 클래스(`text-text`, `bg-panel`, `accent-gold`)에 의존. `.impeccable.md`는 "인라인 스타일 (CSS 파일 없음, React style prop)"을 명시하는데, Plan의 모든 코드 예시가 Tailwind/className 기반이다. 이 불일치가 구현자를 혼란시키고 AI slop으로 이끌 수 있다.

**개선안:**
- **Tech Stack에서 TailwindCSS 제거** 또는 `.impeccable.md`와의 관계를 명확히 정의 (Tailwind가 tokens.ts 기반 커스텀 설정인지, 아니면 인라인 스타일로 전환해야 하는지)
- 모든 코드 예시를 `style={{ }}` 인라인 패턴으로 재작성하되, `tokens.ts` import 참조
- GachaScreen tier별, 미션 상태별 색상을 `.impeccable.md` Color Tokens의 hex 값으로 명시

### 4. 색상 전략 (6/10)
**문제:** Color Tokens는 `.impeccable.md`에 잘 정의되어 있으나, Plan이 이를 일관되게 참조하지 않는다. DOM/Canvas 간 토큰 공유 계획이 없다. tier별 색상, 상태별 색상이 미정의.

**개선안:**
- Plan에 `tokens.ts` 활용 규칙 명시
- Phaser 측 색상은 `0x` prefix hex로 변환하여 동일 토큰 사용
- tier별 색상 매핑 테이블, 미션 상태별 색상 매핑 테이블 추가

### 5. 레이아웃 의도성 (6/10)
**문제:** 8px/32px 간격 리듬이 Plan의 코드 예시에서 깨져 있다 (`px-3`=12px, `py-2.5`=10px). 터치 타겟 44px 기준 미검증. 10연차 카드 레이아웃 미정의.

**개선안:**
- 간격을 8px 단위로 정렬 (8, 16, 24, 32)
- 터치 타겟 44px 최소 기준을 각 인터랙티브 요소에 명시
- 10연차 카드 그리드 레이아웃 스펙 추가 (2x5, 각 카드 64x96px)

---

## 핵심 구조적 문제: Tailwind vs 인라인 스타일 충돌

`.impeccable.md` Tech Constraints에 **"인라인 스타일만 사용 (CSS 파일, Tailwind 없음)"**이 명시되어 있다.
그런데 Plan의 Tech Stack에 **"TailwindCSS"**가 포함되어 있고, 모든 코드 예시가 `className` 기반이다.

이 충돌을 해결하지 않으면 구현자가 어느 방향을 따를지 혼란스러워진다. 이는 6개 차원 모두에 영향을 미치는 근본 문제다.

**권고:** Plan의 Tech Stack에서 TailwindCSS를 제거하고, 코드 예시를 인라인 스타일 + `tokens.ts` import 패턴으로 재작성. 또는 프로젝트가 실제로 Tailwind를 사용 중이라면 `.impeccable.md`를 업데이트하여 "Tailwind with custom tokens.ts config" 방식을 명시.
