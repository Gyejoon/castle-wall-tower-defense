# 모바일 세로형 싱글 버티컬 슬라이스 실행 체크리스트

## 목표

- [x] 기존 Phaser + React 프로토타입을 모바일 세로형 싱글 플레이 버티컬 슬라이스로 재구성한다.
- [x] 데스크톱에서도 같은 세로 프레임을 중앙 정렬해 동일한 플레이 표면을 유지한다.
- [x] 기본 타워 4종만 노출하고 건설 단계와 전투 단계를 분리한다.
- [x] `PLAN.md`와 `.logs/`에 구현 및 검증 결과를 남긴다.

## 비목표

- [x] PvP, 유닛 전송, 합성 타워, 네트워크, 결제, 계정 시스템은 이번 범위에서 제외한다.
- [x] 대규모 밸런스 리워크는 하지 않는다.

## 마일스톤

### 1. 모바일 세로형 UI 셸

- [x] 로비를 네온 택티컬 SF 분위기의 세로형 모바일 프레임으로 재구성했다.
- [x] 게임 화면을 상단 상태바, 중앙 정사각형 보드, 하단 전술 도크 3단 구조로 재구성했다.
- [x] `App.tsx`에서 `GamePage`를 지연 로딩해 초기 로비 진입 시 Phaser 번들을 분리했다.

### 2. 상태 흐름과 플레이 규칙

- [x] 스토어를 `runStatus` 중심으로 재구성하고 `resetRun`, `enterLobby`, `placementFeedback`, `runId`를 추가했다.
- [x] 결과 처리 흐름을 로비 강제 복귀에서 승리/패배 오버레이 + 재시작 CTA로 바꿨다.
- [x] Phaser 인스턴스는 `runId` 변경 시 새로 마운트되도록 정리했다.
- [x] 전투 단계 배치는 `combat_phase` 실패 사유와 함께 명시적으로 거부한다.
- [x] 타워 선택은 센티널 좌표 패턴 대신 `request-select-tower` / `request-clear-tower-selection` 이벤트로 분리했다.

### 3. 이벤트 / 타입 계약

- [x] 공유 `PlacementFailureReason` 타입을 추가했다.
- [x] `tower-placed` payload를 `reason` 지원 형태로 확장했다.
- [x] `packages/shared/src/types/events.ts`와 `packages/phaser-game/src/EventBus.ts`를 현재 사용 이벤트 기준으로 다시 맞췄다.

### 4. 기존 자산 통합

- [x] `Preloader`에서 타일, 스폰/출구 마커, 기본 타워 스프라이트를 실제로 로드한다.
- [x] `TowerSystem`은 타워 본체를 이미지 스프라이트로 렌더링한다.
- [x] `UnitSystem`은 유닛을 애니메이션 스프라이트 + HP 바로 렌더링한다.
- [x] 보드 배경은 기존 타일 자산을 Phaser 타일 스프라이트로 깐다.
- [x] UI 버튼 아이콘은 기존 타워 PNG를 재사용한다.
- [x] 누락된 AI 생성 UI 아트는 이번 세션에서 생성하지 못했고, 프롬프트 초안은 `.logs/2026-03-29-mobile-vertical-slice.md`에 기록했다.

## 공개 인터페이스 변경

- [x] `request-select-tower: { towerDefId: string }`
- [x] `request-clear-tower-selection: undefined`
- [x] `tower-placed: { col, row, towerId, success, reason? }`
- [x] `PlacementFailureReason = 'combat_phase' | 'insufficient_gold' | 'occupied' | 'blocked_path' | 'out_of_bounds'`
- [x] `gameStore` 확장: `runStatus`, `placementFeedback`, `runId`, `resetRun()`, `enterLobby()`

## QA 체크리스트

- [x] `bun test`
- [x] `bun build:web`
- [x] 모바일 390x844에서 로비 첫 화면, 보드, 도크, CTA가 모두 초기 뷰포트 안에 보인다.
- [x] 데스크톱 1600x900에서 세로형 쉘이 중앙에 유지되고 스크롤이 생기지 않는다.
- [x] 건설 단계에서 타워 배치가 가능하다.
- [x] 전투 단계에서 선택된 타워로 보드를 눌렀을 때 실패 피드백이 표시된다.
- [x] 승패 결과를 오버레이로 처리하고 재시작/로비 복귀가 가능하다.
- [x] 파비콘 404를 제거해 브라우저 콘솔 에러를 없앴다.

## 완료 정의

- [x] 테스트와 빌드가 최신 코드 기준으로 통과한다.
- [x] 모바일 세로형 UX가 플레이 가능한 수준으로 정리됐다.
- [x] 이벤트 계약, 스토어 상태, Phaser 런타임 규칙이 서로 일관된다.
- [x] 증적 스크린샷과 작업 로그가 `.logs/` 아래에 저장됐다.
