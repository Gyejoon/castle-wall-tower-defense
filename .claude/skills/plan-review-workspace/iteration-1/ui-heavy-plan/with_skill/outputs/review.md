# 미학 리뷰 (frontend-design + game-ui-design)

**대상 Plan:** `ui-heavy-plan.md` — HUD 리디자인 + 가챠 UI Implementation Plan

**UI scope: ON** (매치: HUD, dock, panel, overlay, canvas, phaser, tower, wave, component, button, modal, layout)

---

## 6개 차원 평가

| 차원 | 점수 | 소견 | 개선안 |
|------|------|------|--------|
| AI Slop 위험도 | 2/10 | **레드 플래그 3건 적발.** (1) "적절한 폰트와 색상으로 디자인" — 구현자가 시스템 기본값에 의존하게 만드는 모호한 지시. (2) "깔끔한 카드 형태의 레이아웃" — AI 양산형 카드 그리드 패턴. (3) "모달로 세부 정보 표시" — 전투 중 모달은 game-ui-design 안티패턴 #1에 해당. 대안 검토 없음. | "적절한 폰트" → `fontFamily: "'Press Start 2P', cursive"`, 제목 12px, 본문 8px, 캡션 6px 명시. "깔끔한 카드" → 삭제하고 구체적 레이아웃 기술(예: 상단바 높이 40px, 하단독 높이 64px, 32px 그리드 정렬). "모달" → 인라인 확장 패널 또는 하단 시트(bottom sheet)로 대체. 전투 중에는 모달 절대 금지. |
| 타이포그래피 | 1/10 | 폰트 이름이 Plan 어디에도 명시되지 않음. `.impeccable.md`는 Press Start 2P를 지정하지만 Plan이 이를 참조하지 않음. 제목/본문/캡션 간 시각적 위계 정의 없음. DOM과 Canvas 폰트 일관성 계획 없음. "적절한 폰트"라는 표현은 구현자에게 아무 가이드도 제공하지 않는다. | `fontFamily: "'Press Start 2P', cursive"` 명시. 위계 정의: 웨이브 카운터(14px bold accent), HP/골드 숫자(10px bold), 타워 비용(8px), 플레이버 텍스트(8px textSecondary). Phaser 텍스트에도 동일 폰트 `setFontFamily('Press Start 2P')` 명시. |
| 색상 전략 | 3/10 | "적색 바", "금색 아이콘"이라는 서술적 표현만 있고 hex 토큰이 없음. `.impeccable.md`의 Color Tokens(`danger: #c03020`, `gold: #f0d060`, `accent: #c8a04a` 등)을 전혀 참조하지 않음. 가챠 등급별 파티클 색상도 "금빛 폭발"이라는 모호한 표현. DOM-Canvas 색상 공유 계획 없음. | HP바: `danger (#c03020)`, 골드: `gold (#f0d060)`, 웨이브 카운터: `accent (#c8a04a)`, 배경: `panel (#2a2010)`, 테두리: `border (#4a3a20)`. 가챠 등급별: SSR `gold (#f0d060)` + 파티클, SR `accent (#c8a04a)`, R `info (#5bc8e8)`. `tokens.ts`의 토큰을 Phaser에서 `0xc03020` 형태로 공유. |
| 레이아웃 의도성 | 4/10 | DOM/Canvas 영역 분리는 서술되어 있으나 구체적 수치 없음. 32px 그리드 언급 없음. 8px 간격 리듬 없음. 상단바/하단독의 높이, 여백, 터치 영역 크기 미정의. 모바일 퍼스트(390x844) 제약 인식 없음. HUD 투명도 언급 없음. 빌드↔전투 페이즈별 레이아웃 전환은 서술되었으나 구체적 치수가 없어 구현자 재량. | 상단바: 높이 40px (8px 패딩), `rgba(26, 18, 8, 0.85)` 배경. 하단독: 높이 64px (빌드), 40px (전투). 타워 슬롯: 48x48px (44px 터치 타겟 충족). 전체 max-width: 460px. 간격: 요소 간 8px, 섹션 간 16px, 32px = 1 타일. 가챠 화면: 카드 영역 상단 1/3, 뽑기 버튼 하단 엄지 영역. |
| 모션/인터랙션 | 3/10 | 가챠 연출(화면 전환, 카드 공개, 파티클)은 언급되었으나 구체적 속성 없음 (duration, easing, 대상 속성 미정의). HUD 페이즈 전환 모션은 완전히 누락. 데미지 넘버 "떠오르며 사라짐"은 있으나 timing 미정의. `.impeccable.md` 원칙 #2(즉각적 피드백)를 구현할 구체적 모션 계획 없음. | 페이즈 전환: 독 높이 `transition: height 200ms ease-out`. 골드 변화: 숫자 `scale(1.2)` 후 복귀 150ms. HP 감소: 바 색상 `danger` 깜빡임 + 숫자 흔들림 100ms. 데미지 넘버: `translateY(-30px)` + `opacity 0` over 800ms. 가챠 카드 공개: `rotateY(180deg)` 400ms `ease-in-out`. 모든 애니메이션은 `transform`/`opacity`만 사용 (layout 속성 금지). |
| 게임-웹 경계 | 5/10 | DOM(React)과 Canvas(Phaser) 역할 분리는 명시되어 있고 방향은 올바름. 상태바/독 = React, 범위표시/체력바/데미지넘버 = Phaser. 그러나 EventBus 통신 패턴(`request-*` 접두사 등)이 누락. 가챠 파티클을 Phaser로 처리한다고 했으나 가챠 화면 자체의 DOM/Canvas 경계가 불명확. 터치 타겟 44px 기준 미언급. 엄지 도달 영역 배치 계획 없음(웨이브 카운터가 상단 중앙 — 문제를 인식했으나 해결책이 다시 상단 배치). | 통신: 타워 선택 `EventBus.emit('request-select-tower', { towerId })`, 배치 `EventBus.emit('request-place-tower', { x, y })`. 가챠: 결과 카드 표시 = React DOM, 파티클 배경 = Phaser Canvas (z-index로 겹침). 터치 타겟: 모든 버튼/슬롯 최소 44x44px 명시. 웨이브 카운터를 상단에 두되, 주요 인터랙션(타워 선택, 스킬, 뽑기 버튼)은 하단 2/3에 배치. |

---

## 미학 종합: 3.0/10

---

## 개선 필요 항목

모든 차원이 7점 미만이다. Plan 수정을 강력 권고한다.

- **AI Slop 위험도** (2/10): 레드 플래그 3건 — "적절한 폰트", "깔끔한 카드", "모달" — 모두 구현자가 AI 기본 생성물에 의존하게 만드는 모호한 지시. → 각 표현을 구체적 토큰/수치/대안으로 교체. 특히 "모달로 세부 정보 표시"는 game-ui-design 안티패턴(전투 중 모달 금지)에 직접 위배되므로 인라인 확장 패널 또는 하단 시트로 대체.

- **타이포그래피** (1/10): 폰트 이름, 크기, 위계가 전혀 없음. → Press Start 2P 명시 + 4단계 크기 위계(14/10/8/6px) 정의. DOM과 Phaser 양쪽에서 동일 폰트 사용 명시.

- **색상 전략** (3/10): hex 토큰 0건. → `.impeccable.md`의 Color Tokens를 Plan에 직접 인용하고 각 UI 요소에 어떤 토큰을 사용하는지 매핑.

- **레이아웃 의도성** (4/10): 구체적 치수 없이 서술만 존재. → px 단위 높이/너비/여백 명시. 390x844 뷰포트 기준 레이아웃 도식 추가. 32px 그리드 정렬 확인.

- **모션/인터랙션** (3/10): HUD 전환 모션 누락, 가챠 연출 구체성 부족. → 각 상태 전환에 대상 속성(transform/opacity), duration, easing 명시. 60fps 보장을 위해 layout 속성 애니메이션 금지 원칙 추가.

- **게임-웹 경계** (5/10): 역할 분리 방향은 맞으나 통신 패턴과 터치 기준 누락. → EventBus 이벤트명 예시, 터치 타겟 44px 최소 기준, 엄지 영역 배치 원칙을 Plan에 추가.

---

## 핵심 레드 플래그 요약

| 레드 플래그 | Plan 원문 | 위반 기준 | 수정 방향 |
|-------------|-----------|-----------|-----------|
| 모호한 폰트 지시 | "적절한 폰트와 색상으로 디자인" | AI Slop 패턴: 구현자가 기본값에 의존 | `Press Start 2P` + hex 토큰 명시 |
| 카드 그리드 | "깔끔한 카드 형태의 레이아웃" | AI Slop 패턴: 모든 것을 카드 그리드로 구성 | 구체적 레이아웃(상단바+하단독+게임영역) 기술 |
| 전투 중 모달 | "모달로 세부 정보 표시" | game-ui-design 안티패턴 #1: 전투 중 모달 금지 | 인라인 확장 패널 또는 하단 시트 |

---

*이 리뷰는 `.impeccable.md`(디자인 컨텍스트)와 `game-ui-design/SKILL.md`(게임 UI 패턴)를 기준으로 평가되었다.*
