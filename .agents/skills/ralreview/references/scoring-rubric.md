# Scoring Rubric

`ralreview`의 기준 점수는 5개 차원, 총 50점 만점이다. 통과선은 42/50.

## 1. Runtime Stability — /10

Phaser 런타임 안정성, cleanup, 메모리 누수 위험, 핫 루프 품질.

| 점수 | 기준 |
|---|---|
| 10 | 위반 0건 |
| 8-9 | 경미한 위반 1-2건, 누수 위험 없음 |
| 6-7 | 위반 3-4건 또는 누수 위험 1건 |
| 4-5 | 누수 위험 다수 또는 `destroy()` 품질 부족 |
| 0-3 | cleanup 미구현, listener 누수, 시스템 경계 붕괴 |

### 핵심 위반

- `destroy()` 누락 또는 정리 미수행
- `shutdown` 등록 누락
- 익명 EventBus 리스너 사용
- `off()` 전에 `destroy()` 실행

### 경미한 위반

- Graphics destroy/recreate 패턴
- 핫 루프의 `filter()` / `Array.find()` 남용
- 시스템 간 직접 mutation

## 2. Spec Alignment — /10

최신 스펙 대비 구현 충족도.

| 점수 | 기준 |
|---|---|
| 10 | 스펙 100% 충족 또는 스펙 문서 없음 |
| 8-9 | 경미한 차이, 네이밍 또는 비기능 차이 |
| 6-7 | 요구사항 1개 누락 또는 동작 차이 1건 |
| 4-5 | 요구사항 2개 이상 누락 |
| 0-3 | 핵심 요구사항 다수 불일치 |

### 감점

- 요구사항 누락: -2
- 동작 차이: -2
- scope creep: -1

## 3. Test Coverage — /10

필수 대상 테스트 존재 여부와 실행 통과 여부.

| 점수 | 기준 |
|---|---|
| 10 | 필수 대상 전부 테스트, 실행 통과 |
| 8-9 | 핵심 경로 커버, 엣지 케이스 일부 누락 |
| 6-7 | 주요 경로 테스트는 있으나 빈 구멍 존재 |
| 5 | 테스트는 있으나 현재 실패 |
| 3-4 | 핵심 테스트 누락 다수 |
| 0-2 | 테스트 거의 없음 |

### 계산 원칙

- 커버 비율로 최대 8점
- 테스트 실행 통과 시 +2
- 테스트 실패 시 최종 점수는 최대 5점

## 4. Independent Review — /10

구현자 본인과 분리된 독립 리뷰의 결과.

| 점수 | 기준 |
|---|---|
| 10 | pass, 이슈 0건 |
| 9 | pass, informational only |
| 8 | pass, minor suggestion 위주 |
| 7 | reviewer unavailable, 대체 불가 |
| 5-6 | high severity 존재 |
| 0-4 | critical severity 존재 |

## 5. Adversarial Review — /10

설계 가정, 상태 동기화, 반례, 레이스, cleanup 반례를 깨보는 리뷰.

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
| 42-50 | PASS |
| 35-41 | FAIL, 자동 수정 후 재시도 가치 높음 |
| 25-34 | FAIL, 구조적 이슈 가능성 큼 |
| 0-24 | FAIL, 수동 개입 우선 |
