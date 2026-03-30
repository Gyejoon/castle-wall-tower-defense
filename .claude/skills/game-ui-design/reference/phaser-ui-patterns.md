# Phaser UI Patterns

React + Phaser 3 하이브리드 아키텍처에서 UI를 구현할 때의 패턴과 가이드라인.

## Phaser 텍스트 vs DOM 텍스트

### Phaser 텍스트 사용
- 게임 오브젝트에 부착된 텍스트 (유닛 체력, 데미지 숫자)
- 게임 월드 좌표에 고정되어야 하는 텍스트
- 짧은 수명의 피드백 텍스트 ("+50G", "-10 HP")
- 타일/그리드 위의 라벨

### DOM 텍스트 사용
- 고정 위치 HUD (상태바, 독)
- 여러 줄 텍스트, 목록 (웨이브 미리보기)
- 사용자 인터랙션이 필요한 텍스트 (버튼 라벨)
- 접근성이 중요한 텍스트

### Phaser 텍스트 스타일 일관성
```typescript
// Phaser 텍스트도 tokens.ts와 동일한 값 사용
const GAME_TEXT_STYLE = {
  fontFamily: "'Press Start 2P'",
  fontSize: '10px',    // Canvas에서의 기본 크기
  color: '#f0e8d8',    // colors.text
};
```

## Canvas 렌더링 패턴

### 체력바
- `Phaser.GameObjects.Graphics`로 렌더링
- 배경: `0x1a1208` (colors.bg), 전경: HP 비율에 따라 `0x7ab648`(높음) → `0xf0d060`(중간) → `0xc03020`(낮음)
- 유닛 스프라이트 위에 고정, 카메라 스크롤에 따라 이동
- 너비: 유닛 스프라이트 너비와 동일, 높이: 3-4px

### 타일 하이라이트
- 호버 시: `0xc8a04a` (colors.accent) 반투명 사각형
- 배치 가능: 초록 틴트, 불가능: 빨간 틴트
- `Graphics.fillStyle(color, alpha)` 사용, alpha 0.3-0.4

### 타워 범위 표시
- 선택된 타워 주변 원형/사각형 범위
- `Graphics.lineStyle(1, 0xc8a04a, 0.5)` + `strokeCircle`
- 배치 시와 기존 타워 선택 시 모두 표시

## React↔Phaser 상태 동기화

### EventBus 패턴
```
[React UI] --request-*--> [EventBus] --> [Phaser Scene]
[Phaser Scene] --event--> [EventBus] --> [Zustand Store] --> [React UI re-render]
```

### DOM 리렌더 최소화
- Zustand selector로 개별 값 구독: `useGameStore(s => s.gold)`
- 배열/객체는 shallow comparison: `useGameStore(s => s.wavePreview, shallow)`
- 게임 루프(60fps)에서 매 프레임 이벤트 발생 금지 — 값 변경 시에만 emit

### 씬 전환 시 UI 정리
- `scene.events.on('shutdown', cleanup)` 에서 이벤트 리스너 해제
- Graphics 객체 destroy
- Tween/Timer 정리
- Zustand store에서 `resetRun()` 호출하여 UI 상태 초기화

## 성능 가이드라인

### 60fps와 DOM 공존
- CSS 애니메이션은 `transform`, `opacity`만 사용 (GPU 가속)
- `will-change` 속성은 애니메이션 직전에만 적용, 상시 적용 금지
- React 리렌더가 게임 프레임에 영향 주지 않도록 — 무거운 컴포넌트는 `React.memo`
- DOM 레이아웃 계산(`offsetHeight` 등)을 게임 루프 내에서 호출 금지
