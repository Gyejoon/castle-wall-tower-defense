# Aesthetic Review: HUD Redesign + Gacha UI Plan

**Plan:** `ui-heavy-plan.md`
**Design Context:** `.impeccable.md`
**Review Basis:** game-ui-design principles + .impeccable.md 6 aesthetic dimensions

---

## Score Table

| Dimension | Score (0-10) | Verdict |
|-----------|:---:|---------|
| 1. Brand Consistency (중세 자연 판타지 미학) | 3 | Weak |
| 2. Color & Token Usage | 2 | Missing |
| 3. Typography & Pixel Grid | 2 | Missing |
| 4. Mobile-First & Touch Ergonomics | 6 | Partial |
| 5. Game Immersion & Information Hierarchy | 5 | Partial |
| 6. Animation & Feedback Quality | 4 | Vague |

**Overall Aesthetic Score: 3.7 / 10**

---

## Dimension-by-Dimension Analysis

### 1. Brand Consistency (중세 자연 판타지 미학) — 3/10

**What the plan says:** "적절한 폰트와 색상으로 디자인", "깔끔한 카드 형태의 레이아웃"

**Problem:** .impeccable.md는 명확한 브랜드 방향을 정의한다 — "중세 자연 판타지, 따뜻하고 유기적, 픽셀아트 레트로 감성". 하지만 플랜에는 이 브랜드 언어가 전혀 반영되지 않았다. "깔끔한 카드 형태"는 어떤 SaaS 대시보드에도 쓸 수 있는 제네릭한 표현이다. "적절한 폰트와 색상"은 디자인 결정이 아니라 placeholder다.

**What would make it a 10:** 플랜이 중세 판타지 UI 언어를 명시적으로 사용해야 한다. 예: "HP바는 고딕 프레임 안에 적색 바, 골드 표시는 코인 아이콘에 픽셀아트 스타일", "카드 슬롯은 양피지 텍스처 느낌의 panel(#2a2010) 배경에 border(#4a3a20) 테두리".

### 2. Color & Token Usage — 2/10

**What the plan says:** "적색 바", "금색 아이콘", "투명 녹색"

**Problem:** .impeccable.md에 Color Tokens가 명확히 정의되어 있다 (bg: #1a1208, accent: #c8a04a, danger: #c03020, gold: #f0d060 등). 플랜은 이 토큰을 단 하나도 참조하지 않는다. "적색"이 danger(#c03020)인지 임의의 빨간색인지 알 수 없다. "금색"이 accent(#c8a04a)인지 gold(#f0d060)인지 불명확하다.

**What would make it a 10:** 모든 색상 언급에 토큰명을 명시. "HP: danger(#c03020) 바", "골드: gold(#f0d060) 아이콘 + text(#f0e8d8) 숫자", "타워 범위: success(#7ab648) 15% opacity".

### 3. Typography & Pixel Grid — 2/10

**What the plan says:** "적절한 폰트", "Wave 3/10" 형태

**Problem:** .impeccable.md는 "Press Start 2P 픽셀 폰트 — 일관된 레트로 타이포그래피"와 "32px 그리드 기반"을 명시한다. 플랜에는 폰트 지정이 없고 그리드 정렬 언급도 없다. HUD 요소의 크기가 32px 그리드와 어떻게 맞아떨어지는지, 데미지 넘버의 폰트 크기는 어떤지 전혀 없다.

**What would make it a 10:** "모든 HUD 텍스트는 Press Start 2P, HP/골드 숫자는 16px, 웨이브 카운터는 12px", "상단 바 높이 32px (1그리드 유닛), 하단 독 높이 64px (2그리드 유닛)", "데미지 넘버는 Press Start 2P 10px, 떠오르며 fade-out".

### 4. Mobile-First & Touch Ergonomics — 6/10

**What the plan says:** 엄지 도달 문제 인식, 하단 독에 타워 슬롯 배치, 전투 시 독 축소

**Positive:** 문제 인식이 있고 하단 독 패턴은 올바른 방향이다. .impeccable.md의 "한 손 조작 — 엄지로 닿는 영역에 핵심 인터랙션" 원칙을 부분적으로 반영했다.

**Problem:** 그러나 웨이브 카운터를 "중앙 상단"에 배치하면서 원래 "엄지 도달 불가" 문제를 지적했는데, 해결책이 같은 위치(상단)이다. 가챠 화면의 터치 타겟 크기, 390x844 기준 레이아웃, max-width: 460px 제약이 언급되지 않는다.

**What would make it a 10:** 390x844 기준 구체적 레이아웃 수치, 터치 타겟 최소 44px, 웨이브 카운터의 위치 재고 (상단이 정보 표시에 적합하다면 그 근거), 가챠 화면의 뽑기 버튼 위치를 하단 엄지 영역에 명시.

### 5. Game Immersion & Information Hierarchy — 5/10

**What the plan says:** React DOM과 Phaser Canvas 분리, HP/골드/웨이브 위치 지정

**Positive:** React-Phaser 하이브리드 아키텍처를 이해하고, DOM UI(HUD)와 Canvas(게임 이펙트)를 올바르게 분리했다. .impeccable.md의 "정보 계층 — 가장 중요한 정보(HP, 골드)가 가장 눈에 띄게" 원칙을 구조적으로 반영했다.

**Problem:** "게임 몰입 우선 — UI는 게임플레이를 방해하지 않는다" 원칙에 대한 구체적 실행이 부족하다. 상단 바의 불투명도, HUD가 게임 캔버스를 얼마나 가리는지, 전투 중 최소 HUD 모드 등이 없다. 유닛 체력바와 데미지 넘버가 게임 정보 계층에서 어떤 우선순위인지 정의되지 않았다.

**What would make it a 10:** HUD 오버레이 투명도 정책, 전투 중 자동 페이드 동작, 정보 계층 우선순위 명시 (HP > 골드 > 웨이브 > 유닛 체력 > 데미지 넘버), 게임 영역 가림 비율 제한.

### 6. Animation & Feedback Quality — 4/10

**What the plan says:** 데미지 넘버 "떠오르며 사라짐", 가챠 "화면 전환 효과", "카드 공개 애니메이션", "등급별 파티클 이펙트 (SSR은 금빛 폭발)"

**Problem:** .impeccable.md의 "즉각적 피드백 — 모든 액션에 시각적/청각적 반응" 원칙이 있지만, 플랜의 전투 HUD 섹션에는 피드백 애니메이션이 거의 없다. 타워 배치 시 피드백, HP 감소 시 바 애니메이션, 골드 획득 시 플라이 효과 등이 빠져 있다. 가챠 연출은 언급되었으나 "화면 전환 효과"같은 표현은 구체성이 부족하다. 60fps 게임 루프와의 공존 전략도 없다.

**What would make it a 10:** 전투 HUD의 모든 상태 변화에 대한 피드백 정의 (HP 감소 시 바 쉐이크 + 붉은 비네팅, 골드 획득 시 +N 플라이 텍스트, 웨이브 전환 시 카운터 펄스), 가챠 연출의 타임라인 (0ms: 암전, 200ms: 카드 뒤집기 시작, 800ms: 등급 파티클 발사), 퍼포먼스 가드레일 (DOM 애니메이션은 CSS transform only, 파티클은 최대 50개).

---

## Summary

이 플랜은 **기능적 구조는 합리적이나, 디자인 명세가 거의 없다.** .impeccable.md에 정의된 중세 판타지 브랜드, 컬러 토큰, 픽셀 폰트, 32px 그리드, 모바일 퍼스트 제약 중 어느 것도 플랜에 구체적으로 반영되지 않았다.

### Critical Gaps

1. **Color tokens 미참조** — .impeccable.md의 8개 토큰이 존재하지만 플랜에서 단 하나도 사용하지 않음
2. **Typography 미지정** — Press Start 2P 언급 없음, 폰트 크기 없음
3. **Grid alignment 미언급** — 32px 그리드 기반 정렬 전략 부재
4. **Brand language 부재** — "깔끔한", "적절한" 같은 제네릭 표현이 디자인 결정을 대체
5. **Feedback loop 불완전** — 전투 HUD의 상태 변화 피드백 정의 없음
6. **Performance guardrails 부재** — 60fps 게임 루프와 DOM UI 공존 전략 없음

### Recommendation

이 플랜은 **디자인 패스를 한 번 더 거쳐야 한다.** .impeccable.md의 토큰, 폰트, 그리드 체계를 플랜에 명시적으로 바인딩하고, 각 UI 요소의 시각적 사양을 구체화해야 구현 시 AI slop(제네릭한 기본값으로 대충 채우는 현상)을 방지할 수 있다.
