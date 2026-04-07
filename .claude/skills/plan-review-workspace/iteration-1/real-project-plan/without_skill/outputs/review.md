# Phase 4: 참여 시스템 — 미학 리뷰

**Plan:** `docs/superpowers/plans/2026-04-06-phase4-engagement-systems.md`
**Design Context:** `.impeccable.md`
**Date:** 2026-04-07

---

## 6차원 미학 점수 테이블

| 차원 | 점수 (0-10) | 평가 | 10점이 되려면 |
|------|:-----------:|------|--------------|
| **브랜드 일관성** | 6 | 중세 판타지 픽셀 미학과 부분적으로 정렬되나, TailwindCSS 클래스(`className`)가 다수 등장하여 `.impeccable.md`의 "인라인 스타일만 사용 (CSS 파일, Tailwind 없음)" 원칙에 정면으로 위배. `font-pixel`, `text-text`, `bg-panel` 등 Tailwind 유틸리티 클래스가 코드 전반에 사용됨. | 모든 UI 코드에서 Tailwind 클래스를 인라인 `style` prop으로 교체. 색상은 `.impeccable.md`의 Color Tokens(`#c8a04a`, `#2a2010` 등)을 직접 참조. |
| **색상 체계 준수** | 7 | `bg-panel`, `border-gold`, `text-gold` 등으로 Color Tokens를 간접 참조하고 있으나, `.impeccable.md`에 정의된 hex 값(`accent: #c8a04a`, `panel: #2a2010`)이 코드에 직접 등장하지 않음. `rgba(26, 18, 8, 0.8)` 같은 직접 값은 bg(`#1a1208`)와 정렬됨. | Tailwind 제거 후 Color Tokens hex 값을 인라인 스타일에 직접 사용. 새 UI(MissionsTab, TutorialOverlay)에서 accent/gold/danger 토큰을 명시적으로 할당. |
| **타이포그래피** | 5 | `font-pixel`로 Press Start 2P를 의도하나, Tailwind 클래스 기반이라 실제 적용 보장 불확실. `text-xs`, `text-[11px]`, `text-sm` 등 크기 지정이 32px 그리드와의 조화를 고려하지 않음. 픽셀 폰트는 특정 배수 크기에서만 선명한데, 11px 같은 비정수 크기 사용. | 픽셀 폰트 크기를 8px 배수(8, 16, 24, 32)로 제한. `style={{ fontFamily: "'Press Start 2P'" }}` 명시. 모든 텍스트 크기를 32px 그리드 체계와 조화시킴. |
| **게임 몰입감** | 7 | TutorialOverlay의 스포트라이트/메시지 패널 구조는 게임 몰입을 유지하면서 안내하는 좋은 접근. Amendment K에서 Canvas 하이라이트를 Phaser로 분리한 것도 적절. 다만 MissionsTab/GachaScreen이 로비 UI인데 게임 중 피드백 루프와의 연결 연출(미션 완료 토스트 등)이 플랜에 없음. | 게임 중 미션 완료 시 인게임 토스트/배지 연출 추가. 가챠 결과 reveal에 Phaser 파티클이나 화면 효과 연동. 전투 종료 → 로비 전환 시 획득 보상 요약 오버레이. |
| **한 손 조작 (모바일 UX)** | 5 | SliderRow의 `<input type="range">`는 모바일에서 엄지 조작이 어려움 (터치 타겟이 작고, 정밀 드래그 필요). SelectRow의 `<select>` 드롭다운은 네이티브 OS picker를 호출하여 게임 몰입을 깨뜨림. 10연차 카드 뒤집기(Amendment J)의 터치 인터랙션 상세가 부족. | 볼륨 슬라이더를 세그먼트 버튼(0/25/50/75/100) 또는 큰 터치 타겟(최소 44px 높이) 커스텀 슬라이더로 교체. 색각이상 선택을 커스텀 라디오 버튼 그룹으로 구현. 모든 탭 타겟 최소 44x44px 보장. |
| **정보 계층** | 6 | 가챠 비용(다이아몬드)과 pity 카운터(Amendment G)를 상단에 배치하는 것은 적절. 미션의 일일/주간 시각 구분(Amendment H)도 좋음. 다만 전체적으로 가장 중요한 정보(보유 다이아몬드, 미수령 보상 수)의 글로벌 표시가 없음. 로비 탭 간 이동 시 현재 재화 상태를 항상 볼 수 없음. | 로비 상단에 항시 표시되는 재화 바(골드 + 다이아몬드) 추가. 미션 탭 아이콘에 미수령 보상 뱃지(빨간 점). 가챠 화면에서 보유/필요 다이아몬드를 대비적으로 표시(보유 < 필요 시 danger 색상). |

---

## 종합 평가

**평균 점수: 6.0 / 10**

### 핵심 문제 3가지

1. **Tailwind 사용이 디자인 컨텍스트와 직접 충돌.** `.impeccable.md`는 "인라인 스타일만 사용 (CSS 파일, Tailwind 없음)"을 명시하는데, 플랜의 모든 UI 코드가 Tailwind 클래스 기반이다. Tech Stack에도 "TailwindCSS"가 명시되어 있어, 프로젝트 디자인 원칙과 정면 모순. 이대로 구현하면 기존 인라인 스타일 코드베이스와 스타일링 방식이 혼재된다.

2. **모바일 퍼스트 원칙 미준수.** `.impeccable.md`는 "한 손 조작 -- 엄지로 닿는 영역에 핵심 인터랙션"을 명시하지만, `<input type="range">`와 `<select>` 같은 네이티브 HTML 컨트롤은 모바일 게임 UI로서 부적절하다. 터치 타겟 크기, 게임적 느낌, 조작 편의성 모두 부족.

3. **32px 그리드 체계 무시.** 타이포그래피와 간격에서 32px 그리드 기반 설계가 반영되지 않았다. `text-[11px]`, `py-2.5`, `px-3` 같은 임의 크기가 사용되어 게임 타일과 UI 간격의 조화가 깨진다.

### 잘된 점

- Amendment K (Canvas 스포트라이트를 Phaser로 분리)는 하이브리드 아키텍처에 적절한 역할 분리.
- 가챠 순수 함수 분리 (shared 패키지), rng 주입 패턴은 테스트 용이성과 아키텍처 일관성이 좋음.
- Save Migration v1->v2 설계가 체계적이고, soundEnabled 레거시 호환 처리가 세심함.
- Amendment A~M의 리뷰 반영이 구체적이고 실행 가능.

### 디자인 컨텍스트 위반 사항 요약

| `.impeccable.md` 원칙 | 플랜 위반 내용 |
|------------------------|---------------|
| 인라인 스타일만 사용 | Tailwind 클래스 전면 사용 |
| 32px 그리드 기반 | 임의 크기/간격 사용 (11px, 2.5, px-3) |
| 한 손 조작 | 네이티브 range/select 사용 |
| Press Start 2P 픽셀 폰트 | Tailwind `font-pixel` 간접 참조만 |
| Color Tokens 직접 참조 | Tailwind 시맨틱 클래스로 간접 참조 |
| 게임 몰입 우선 | 네이티브 OS picker가 몰입 파괴 |
