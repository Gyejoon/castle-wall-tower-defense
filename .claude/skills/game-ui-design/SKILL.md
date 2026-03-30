---
name: game-ui-design
description: Phaser + React 하이브리드 타워디펜스 게임 UI 디자인 가이드. DOM UI와 Canvas 게임 간 시각적 통일감, HUD 설계, 타워디펜스 UI 패턴, 게임 UI 안티패턴을 다룬다. 게임 UI 작업, HUD 수정, 새 UI 컴포넌트 추가 시 참조.
user-invocable: true
argument-hint: "[component or area to focus on]"
---

게임 UI 작업 시 이 가이드를 참조한다. `.impeccable.md`의 디자인 컨텍스트와 함께 사용하며, impeccable의 `/audit`, `/polish` 등 명령어가 게임 UI 맥락에서도 올바르게 동작하도록 보완한다.

## 1. Game UI 디자인 원칙

### DOM과 Canvas의 시각적 통일감
- **같은 색상 토큰 사용**: `packages/web-shell/src/styles/tokens.ts`의 색상을 DOM과 Canvas 양쪽에서 공유. Phaser에서 `0x` 접두사 hex로 변환하여 사용.
- **같은 폰트**: Press Start 2P를 DOM(`fontFamily`)과 Phaser 텍스트(`setFontFamily`) 양쪽에서 일관 사용.
- **같은 간격 리듬**: 8px 단위 간격 (8, 16, 24, 32). 32px = 1 게임 타일.

### HUD 투명도와 게임 영역
- HUD 배경은 반투명(`rgba(26, 18, 8, 0.85)`) 또는 불투명 최소 높이.
- 게임 캔버스 영역을 최대한 확보 — 상태바와 독(dock)은 최소 높이로.
- 전투 중에는 UI를 더 축소하여 게임에 집중.

### 페이즈 기반 UI
- **빌드 페이즈**: 타워 선택 독 확장, 웨이브 미리보기 표시, 골드/비용 강조.
- **전투 페이즈**: 독 축소 또는 숨김, 웨이브 프로그레스 표시, 체력 변화 강조.
- 페이즈 전환 시 UI 모드를 부드럽게 전환 (CSS transition 사용).

### 터치와 모바일
- 터치 타겟 최소 44x44px.
- 핵심 인터랙션(타워 선택, 배치)은 엄지 도달 영역(하단 2/3)에 배치.
- 타워 배치 시 손가락이 그리드를 가리지 않도록 — 선택 후 터치 포인트 위에 프리뷰 표시 고려.

## 2. React↔Phaser UI 경계 가이드

### DOM (React)에서 처리할 것
- 메뉴, 설정, 로비 화면
- 텍스트가 많은 패널 (웨이브 미리보기, 타워 정보)
- 오버레이 (매치 결과, 일시정지)
- 버튼, 입력 (PixelButton, PixelPanel 컴포넌트)
- 상태바 (HP, 골드, 웨이브 카운터)

### Canvas (Phaser)에서 처리할 것
- 게임 내 시각 피드백 (타워 범위, 타일 하이라이트)
- 유닛 체력바, 상태 이펙트
- 투사체, VFX, 애니메이션
- 타일맵 렌더링
- 실시간 게임 오브젝트 상호작용

### 통신 패턴
- **React → Phaser**: `EventBus.emit('request-*', payload)` — 항상 `request-` 접두사
- **Phaser → React**: `EventBus.emit('event-name', payload)` — 서술적 이름
- **상태 동기화**: Zustand store가 단일 진실 소스. Phaser 이벤트 → store 업데이트 → React 리렌더.
- DOM 리렌더를 최소화: Zustand selector로 필요한 값만 구독.

### 참고 파일
- `packages/phaser-game/src/EventBus.ts` — TypedEventBus
- `packages/web-shell/src/stores/gameStore.ts` — Zustand store
- `packages/shared/src/types/events.ts` — 이벤트 타입 정의

## 3. 타워디펜스 UI 패턴

### 상단 상태바
- 왼쪽: 게임 제목/페이즈 표시
- 중앙~우측: HP(danger 색상), 골드(gold 색상), 웨이브 카운터
- 카운트다운 타이머: 빌드 페이즈에서만 표시, 긴급함을 색상 변화로 표현

### 하단 타워 선택 독
- 수평 스크롤 없는 고정 그리드 (4개 기본 타워 = 1행)
- 각 슬롯: 타워 아이콘 + 비용 텍스트 + 선택 하이라이트
- 비용이 골드보다 크면 비활성 스타일 (opacity 0.5)
- 선택된 타워: accent 색상 보더 + 미세한 스케일업

### 웨이브 미리보기
- 다음 웨이브 유닛 목록: 아이콘 + 이름 + 수량
- 빌드 페이즈에서만 표시
- 간결하게 — 스크롤 불필요한 높이

### 매치 결과 오버레이
- 전체 화면 오버레이 (게임 위)
- 승리/패배/무승부 상태별 색상 (success/danger/accent)
- 핵심 통계 표시 후 로비 복귀 버튼

## 4. 안티패턴

### 피해야 할 것
- **전투 중 모달**: 게임 진행을 막는 팝업. 전투 중에는 인라인 피드백만.
- **스크롤 패널**: 모바일 게임에서 스크롤은 의도치 않은 게임 조작을 유발.
- **DOM/Canvas 시각 단절**: React UI는 깔끔한 현대 폰트인데 게임은 픽셀 — 통일 필수.
- **손가락 가림**: 타워 배치 시 터치 포인트가 정확히 배치 위치와 겹침.
- **과도한 정보**: 모든 타워 스탯을 한 번에 표시. 점진적 공개(progressive disclosure) 사용.
- **느린 UI 전환**: 페이즈 전환 애니메이션이 300ms 이상이면 게임 흐름을 끊음.
- **60fps 방해**: CSS 애니메이션으로 layout thrashing 유발. `transform`/`opacity`만 애니메이션.

### 검증 질문
UI 작업 완료 시 스스로 확인:
1. DOM UI와 Canvas 게임이 같은 색상 팔레트를 쓰는가?
2. 전투 중 불필요한 UI 요소가 보이지 않는가?
3. 모든 터치 타겟이 44px 이상인가?
4. 숫자 변경(골드, HP)에 시각적 피드백이 있는가?
5. 페이즈 전환이 자연스러운가?
