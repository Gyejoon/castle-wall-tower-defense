# Scoring Rubric

## 1. Runtime Stability (런타임 안정성) — /10

phaser-best-practices 스킬의 10개 핵심 패턴 준수 여부.

| 점수 | 기준 |
|------|------|
| 10 | 모든 패턴 준수. 위반 0건 |
| 8-9 | 경미한 위반 1-2건 (메모리 누수 위험 없음) |
| 6-7 | 위반 3-4건 또는 메모리 누수 위험 1건 |
| 4-5 | 메모리 누수 위험 2건 이상 또는 destroy() 누락 |
| 0-3 | cleanup 미구현, 다수 누수 위험, 아키텍처 패턴 무시 |

### 핵심 위반 (각 -2점)
- destroy() 메서드 미구현
- shutdown 이벤트 미등록
- EventBus 리스너 익명 람다 사용
- cleanup 순서 역전 (destroy → off)

### 경미한 위반 (각 -1점)
- Graphics destroy+recreate (clear+redraw 권장)
- 핫 루프에서 filter() 사용 (in-place 컴팩션 권장)
- Array.find() in hot loop (Map 권장)
- update()에서 직접 시스템 mutate (반환값 권장)

---

## 2. Spec Alignment (스펙 정합성) — /10

`docs/superpowers/specs/*.md` 최신 스펙 문서 대비 구현 충족도.

| 점수 | 기준 |
|------|------|
| 10 | 스펙 100% 충족 또는 스펙 문서 없음 |
| 8-9 | 경미한 차이 (네이밍, 비기능적) |
| 6-7 | 요구사항 1개 미충족 |
| 4-5 | 요구사항 2개 미충족 또는 주요 동작 차이 |
| 0-3 | 핵심 요구사항 다수 미충족 |

### 감점 기준
- 요구사항 누락: -2점/건
- Scope creep (스펙에 없는 기능): -1점/건
- 동작 차이 (스펙과 다른 동작): -2점/건

---

## 3. Test Coverage (테스트 커버리지) — /10

변경 코드의 테스트 필수 대상에 대한 테스트 존재 및 통과 여부.

| 점수 | 기준 |
|------|------|
| 10 | 모든 순수 함수 + 핵심 경로 테스트 존재 & 통과 |
| 8-9 | 테스트 존재 & 통과, 엣지 케이스 일부 누락 |
| 6-7 | 주요 함수 테스트 존재, 일부 누락 |
| 5 | 테스트 존재하지만 실패 |
| 3-4 | 핵심 순수 함수 테스트 누락 |
| 0-2 | 테스트 없음 또는 대부분 실패 |

### 점수 공식
```
base = (테스트된 필수 대상 수 / 전체 필수 대상 수) × 8
bonus = 전체 테스트 통과 ? +2 : 0
penalty = 테스트 실패 ? max(score, 5) : 0
final = min(base + bonus - penalty, 10)
```

### 테스트 필수 대상
- `export function` (시그니처에 `Phaser.*` 없음)
- 시스템 클래스의 `destroy()` 메서드
- 데이터 전용 시스템 전체
- `@gld/shared` 패키지의 모든 export

### 테스트 면제 대상
- 렌더링 코드 (Graphics draw calls)
- Input 핸들러 (Phaser input system)
- EventBus 와이어링 (on/off 등록)
- Scene 라이프사이클 메서드 (create, update)

---

## 4. Codex Review (Codex 리뷰) — /10

OpenAI Codex CLI의 코드 리뷰 결과.

| 점수 | 기준 |
|------|------|
| 10 | Codex pass, 이슈 0건 |
| 9 | Codex pass, informational 1-2건 |
| 8 | Codex pass, minor suggestion 1-3건 |
| 7 | Codex 미사용 (기본 점수) |
| 5-6 | Codex fail, high severity 1-2건 |
| 3-4 | Codex fail, high severity 3건 이상 |
| 0-2 | Codex fail, critical severity |

---

## 합계 판정

| 합계 | 판정 |
|------|------|
| 35-40 | PASS — 코드 품질 충분 |
| 30-34 | FAIL — 자동 수정 후 재시도 |
| 20-29 | FAIL — 구조적 이슈, 수동 확인 권장 |
| 0-19 | FAIL — 심각한 품질 문제, 즉시 중단 |
