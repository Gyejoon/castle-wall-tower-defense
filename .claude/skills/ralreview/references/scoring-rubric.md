# Scoring Rubric

`ralreview`의 기준 점수는 7개 차원, 총 70점 만점이다. 통과선은 58/70.

## 1. Runtime Stability (Phase 2) — /10

Phaser 런타임 안정성, cleanup, 메모리 누수 위험, 핫 루프 품질.
diff에 Phaser 파일이 없으면 10/10.

| 점수 | 기준 |
|---|---|
| 10 | 위반 0건 또는 Phaser 변경 없음 |
| 8-9 | 경미한 위반 1-2건, 누수 위험 없음 |
| 6-7 | 위반 3-4건 또는 누수 위험 1건 |
| 4-5 | 누수 위험 다수 또는 `destroy()` 품질 부족 |
| 0-3 | cleanup 미구현, listener 누수, 시스템 경계 붕괴 |

### Critical 위반 (-2)

- `destroy()` 누락 또는 정리 미수행
- `shutdown` 등록 누락
- 익명 EventBus 리스너 사용
- `off()` 전에 `destroy()` 실행
- `setTimeout`/`setInterval` 미정리
- Web Audio 노드 미해제

### Non-critical 위반 (-1)

- Graphics destroy/recreate 패턴
- 핫 루프의 `filter()` / `Array.find()` 남용
- 시스템 간 직접 mutation
- `Phaser.Scene` 대신 구체 타입에 강결합

## 2. React Best Practices (Phase 3) — /10

React 컴포넌트 성능, Phaser-React 브릿지 패턴, Zustand 사용 품질.
diff에 React 파일이 없으면 10/10.

| 점수 | 기준 |
|---|---|
| 10 | 위반 0건 또는 React 변경 없음 |
| 8-9 | Non-critical 위반 1-2건 |
| 6-7 | Critical 위반 1건 또는 Non-critical 다수 |
| 4-5 | Critical 위반 2건 이상 |
| 0-3 | EventBus cleanup 누락 + selector 전체 구독 등 복합 |

### Critical 위반 (-2)

- EventBus 리스너 useEffect cleanup 누락
- Zustand 전체 store 구독
- 콜백 deps 불필요 리렌더 유발
- React-Phaser 경계 ref 불안정 콜백

### Non-critical 위반 (-1)

- useMemo 누락 (파생 게임 상태)
- 정적 JSX 미호이스팅
- `&&` 연산자로 falsy 0 렌더링
- barrel import 사용
- 무거운 컴포넌트 lazy loading 미적용
- 루프/콜백 마이크로 최적화 미흡

## 3. Design Quality (Phase 4) — /10

frontend-design 스킬 기준의 시각적 품질. Typography, Color, Layout, AI 양산형 패턴.
diff에 React 파일이 없으면 10/10.

| 점수 | 기준 |
|---|---|
| 10 | 위반 0건 또는 React 변경 없음 |
| 8-9 | Non-critical 위반 1-2건 |
| 6-7 | Critical 위반 1건 또는 Non-critical 다수 |
| 4-5 | Critical 위반 2건 이상 |
| 0-3 | AI 양산형 테스트 실패 + 다수 위반 |

### Critical 위반 (-2)

- 과사용 폰트 (Inter, Roboto, Arial, Open Sans, 시스템 기본 폰트)
- 하드코딩 색상값, CSS 변수/토큰 미사용
- AI 양산형 종합 테스트 실패

### Non-critical 위반 (-1)

- 타이포그래피 위계 부재
- 모노스페이스 장식적 남용
- AI 클리셰 팔레트
- 순수 #000/#fff 사용
- 카드 중첩/동일 그리드 반복
- 글래스모피즘/장식 남용
- 모달 남용

## 4. Spec Alignment (Phase 5) — /10

최신 스펙 대비 구현 충족도.

| 점수 | 기준 |
|---|---|
| 10 | 스펙 100% 충족 또는 스펙 문서 없음 |
| 8-9 | 경미한 차이, 네이밍 또는 비기능 차이 |
| 6-7 | 요구사항 1개 누락 또는 동작 차이 1건 |
| 4-5 | 요구사항 2개 이상 누락 |
| 0-3 | 핵심 요구사항 다수 불일치 |

감점: 요구사항 누락 -2, 동작 차이 -2, scope creep -1.

## 5. Test Coverage (Phase 6) — /10

필수 대상 테스트 존재 여부와 실행 통과 여부.

| 점수 | 기준 |
|---|---|
| 10 | 필수 대상 전부 테스트, 실행 통과 |
| 8-9 | 핵심 경로 커버, 엣지 케이스 일부 누락 |
| 6-7 | 주요 경로 테스트는 있으나 빈 구멍 존재 |
| 5 | 테스트는 있으나 현재 실패 |
| 3-4 | 핵심 테스트 누락 다수 |
| 0-2 | 테스트 거의 없음 |

커버 비율로 최대 8점, 실행 통과 시 +2, 실패 시 최대 5점 캡.

## 6. Independent Review (Phase 7) — /10

구현자와 분리된 독립 리뷰 결과.

| 점수 | 기준 |
|---|---|
| 10 | pass, 이슈 0건 |
| 9 | pass, informational only |
| 8 | pass, minor suggestion 위주 |
| 7 | reviewer unavailable, 대체 불가 |
| 5-6 | high severity 존재 |
| 0-4 | critical severity 존재 |

## 7. Adversarial Review (Phase 8) — /10

설계 가정, 상태 동기화, 반례, cleanup 반례를 깨보는 리뷰.

| 점수 | 기준 |
|---|---|
| 10 | 반례 검토 통과, 치명 이슈 없음 |
| 9 | informational only |
| 7-8 | medium 이슈만 존재 |
| 7 | reviewer unavailable, 수동 대체 불가 |
| 5-6 | high severity 존재 |
| 0-4 | critical severity 존재 |

## 판정

| 총점 | 판정 |
|---|---|
| 58-70 | PASS |
| 49-57 | FAIL, 자동 수정 후 재시도 가치 높음 |
| 35-48 | FAIL, 구조적 이슈 가능성 큼 |
| 0-34 | FAIL, 수동 개입 우선 |
