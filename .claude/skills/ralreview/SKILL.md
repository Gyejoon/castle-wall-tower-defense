---
name: ralreview
description: Use when reviewing non-trivial code changes in this repository before landing, or when the user asks for "ralreview", "ral review", "quality review", "전체 리뷰", "품질 검수", "landing review", or "pre-merge review".
---

# RAL Review

이 스킬은 이 저장소 전용 수렴형 코드 리뷰 프로토콜이다. 목표는 "한 번 훑어보기"가 아니라, 변경 diff를 여러 차례 좁혀 가며 런타임 안정성, 스펙 정합성, 테스트, 외부 시각 검증까지 통과시키는 것이다.

핵심은 도구가 아니라 절차다. Claude Code에서는 slash command를 써도 되고, Codex에서는 같은 의도를 네이티브 셸, 서브에이전트, 리뷰 스킬로 수행하면 된다.

## 플랫폼 적응

플랫폼마다 도구 이름은 달라도 아래 의미를 유지한다.

| 의도 | Claude Code | Codex |
|---|---|---|
| 반복 수렴 루프 | `/ralph-loop` | 현재 세션에서 최대 5회 명시적 반복 |
| 단순화 패스 | `/simplify` | 변경 파일을 직접 읽고 안전한 정리 수행 |
| 독립 리뷰 | `/codex review` | 별도 리뷰 서브에이전트 또는 리뷰 스킬 |
| 적대적 리뷰 | `/codex:adversarial-review` | 두 번째 리뷰 서브에이전트 또는 명시적 반대 검토 |

중요: 특정 명령이 없다고 스킬을 건너뛰지 말 것. 같은 검증 목적을 다른 도구로 달성하면 된다.

## 실행 원칙

1. 현재 브랜치의 변경 코드만 본다.
2. 한 번에 끝내려 하지 말고, 최대 5회까지 수렴시킨다.
3. 자동 수정은 안전한 범위만 한다.
4. 비즈니스 로직, 밸런스, 기능 범위를 바꾸는 수정은 보고만 한다.
5. 루프가 끝나면 점수와 미해결 이슈를 남긴다.

## 빠른 시작

### Claude Code

```text
/ralph-loop "Run the ralreview pipeline on current branch changes. Follow the ralreview skill exactly. Fix only AUTO issues. When the total score reaches 42/50 or higher, output RALREVIEW PASS." --completion-promise "RALREVIEW PASS" --max-iterations 5
```

### Codex

현재 세션에서 아래 Phase 0-7을 수행한다. 한 번 끝난 뒤 총점이 42/50 미만이면 같은 절차를 다시 돌린다. 최대 5회까지 반복한다.

## Phase 0: Init

1. base 브랜치를 정한다.
   - 우선순위: 현재 PR base -> `origin/main` -> `origin/master`
2. diff 범위를 정한다.
   - 권장: `git diff --name-only <base>...HEAD`
3. `.ts`/`.tsx` 변경이 없으면 즉시 PASS 처리한다.
4. 이번 반복의 대상 파일 목록과 메모를 남긴다.

## Phase 1: Simplify

변경 파일에서 안전한 정리 작업을 먼저 한다.

- 중복 분기, 죽은 코드, 불필요한 임시 변수 제거
- 기존 유틸리티/상수 재사용
- 이름 명확화
- 과한 중첩 완화
- 테스트에서만 필요한 보조 코드가 런타임 코드에 섞여 있는지 점검

여기서는 동작을 바꾸지 않는 수정만 한다.

### Tailwind 마이그레이션 정밀도 (변경 파일에 Tailwind 클래스가 있을 때만)

Tailwind v4 마이그레이션이 포함된 변경이면 아래를 추가로 본다.

- **의미 차이 유틸리티**: `h-dvh` vs `h-full`, `bg-none` vs `bg-transparent`, `rounded-sm` vs 정확한 값 — 의도와 다른 유틸리티를 쓰고 있으면 교정한다
- **픽셀 정확도**: Tailwind 기본 스텝값(`.5` = 2px, `1` = 4px)이 원래 임의값(`3px`, `5px`)과 다르면 `gap-[3px]`처럼 임의값으로 교정한다
- **하드코딩된 색상**: `#4a3a20` 등 리터럴 색상이 `var(--color-*)` 토큰으로 교체 가능하면 교체한다
- **`@keyframes` 이름 충돌**: `pulse`, `spin`, `bounce` 등 Tailwind 내장 이름과 겹치면 고유 이름으로 바꾼다
- **이징 함수 정확도**: `ease-out`이 원래 `ease` 또는 커스텀 `cubic-bezier`였으면 `ease-[ease]`처럼 명시한다

## Phase 2: Phaser 런타임 안정성 검사

프로젝트의 [`phaser-best-practices`](../phaser-best-practices/SKILL.md) 기준으로 변경 코드를 본다. 해당 항목이 변경 코드에 실제로 적용될 때만 점수에 반영한다.

### 체크리스트

| # | 검사 항목 | 위반 예시 |
|---|---|---|
| 1 | Scene `create()`에서 `shutdown` 정리 등록 | `this.events.on('shutdown', ...)` 누락 |
| 2 | 시스템 생성자가 `Phaser.Scene`에만 의존 | 특정 `GameScene` 타입에 강결합 |
| 3 | 시스템에 `destroy()`가 있고 실제 정리 수행 | destroy 껍데기만 있거나 누락 |
| 4 | EventBus 리스너 해제 가능한 named reference 사용 | 익명 함수로 등록 |
| 5 | 정리 순서가 `off()` 후 `destroy()` | 순서 역전 |
| 6 | Graphics는 `clear()` 후 재사용 | 매 프레임 destroy/recreate |
| 7 | 핫 루프에서 선형 탐색 최소화 | `Array.find()` 남용 |
| 8 | 시스템 간 통신이 직접 mutation 대신 반환값/이벤트 기반 | 다른 시스템 내부를 직접 수정 |
| 9 | 핫 루프 배열 정리가 in-place | `filter()` 반복 |
| 10 | React 쪽 unmount cleanup 완전성 | Phaser destroy 후 listener 잔존 |
| 11 | `useEffect` 의존성 배열에 모든 외부 참조 포함 | `selectedMapId` 캡처 후 deps 누락 → 맵 변경 무시 |
| 12 | `setTimeout`/`setInterval` 반환값을 저장하고 `destroy()`에서 clearTimeout/clearInterval | 매 게임마다 타이머 누적 |
| 13 | Web Audio API 노드(`OscillatorNode`, `GainNode`)가 `disconnect()` 후 참조 해제 | 발사 이벤트마다 노드 누적 → 메모리 누수 |

### 점수

- 기본 10점
- 핵심 위반은 -2
- 경미한 위반은 -1
- 최소 0점

## Phase 3: 스펙 정합성 검사

1. 최신 스펙 파일을 찾는다.
   - `docs/superpowers/specs/*.md`
2. 스펙이 없으면 10/10과 `"스펙 문서 없음"` 노트를 남긴다.
3. 스펙이 있으면 아래를 본다.
   - 요구사항 누락
   - 의도와 다른 동작
   - 스펙에 없는 scope creep

### 점수

- 기본 10점
- 요구사항 누락: -2/건
- 동작 차이: -2/건
- scope creep: -1/건
- 최소 0점

## Phase 4: 테스트 커버리지 검사

1. 변경된 소스 파일 중 테스트 필수 대상을 식별한다.
2. 대응 테스트 파일 존재 여부를 본다.
3. 전체 테스트 또는 관련 패키지 테스트를 실행한다.

### 테스트 필수 대상

- `export function` 중 시그니처에 `Phaser.*`가 없는 순수 함수
- 시스템 클래스의 `destroy()`
- 데이터 전용 시스템
- `@gld/shared` 패키지의 변경 export

### 감점하지 않는 대상

- draw call 중심 렌더링 코드
- Phaser input 핸들러
- 단순 EventBus 와이어링
- Scene lifecycle 메서드 자체

### 테스트 검증 정확도

테스트가 존재해도 실제 시나리오를 검증하지 않는 경우 감점한다.

- 테스트명이 "더블탭 방지"인데 싱글클릭만 발생시키는 경우
- emit 이벤트 검증 없이 함수 호출 여부만 확인하는 경우
- 테스트가 예상 frameCount/tilesets 배열 등 에셋 메타데이터를 검증하지 않는 경우

### 점수

- 필수 대상 커버 비율로 최대 8점
- 테스트 실행 통과 시 +2
- 테스트 실패 시 최종 점수는 최대 5점으로 캡
- 테스트 검증 부정확 (명칭과 동작 불일치): -1/건

## Phase 5: 독립 리뷰

현재 세션의 구현자 시각과 분리된 리뷰를 반드시 한 번 받는다.

### Claude Code

- `/codex review` 같은 외부 리뷰 경로 사용 가능

### Codex

- 리뷰 서브에이전트를 띄워 현재 diff만 검토하게 하거나
- 프로젝트/글로벌 리뷰 스킬을 사용해 독립 판정을 받는다

### 점수

| 결과 | 점수 |
|---|---|
| pass, 이슈 없음 | 10 |
| pass, informational only | 9 |
| pass, minor suggestion | 8 |
| reviewer unavailable | 7 |
| fail, high severity | 5-6 |
| fail, critical severity | 0-4 |

## Phase 5.5: 적대적 리뷰

이번엔 "무엇이 틀렸는가"가 아니라 "이 설계 가정이 어디서 깨지는가"를 본다.

- 이벤트 emit/listen 쌍이 정말 맞물리는지
- 캐시/파생 상태 동기화가 어긋나지 않는지
- cleanup 순서가 반례에서 깨지지 않는지
- 테스트가 happy path만 덮고 있지 않은지
- 사용자의 실제 행동에서 state drift가 나는지
- 루프 종료 조건이 경계값(예: `maxWaves < TOTAL_WAVES`)에서 도달 불가해 데드락이 나는지

Codex에서는 두 번째 리뷰 서브에이전트를 띄워도 되고, 직접 반대 입장에서 검토해도 된다. 다만 동일한 근거를 재진술하는 수준이면 안 된다.

### 점수

| 결과 | 점수 |
|---|---|
| pass, 이슈 없음 | 10 |
| pass, informational only | 9 |
| needs-attention, medium only | 7-8 |
| needs-attention, high severity | 5-6 |
| reviewer unavailable | 7 |
| fail, critical severity | 0-4 |

## Phase 6: 최종 Simplify

Phase 2-5.5에서 생긴 수정 이후, 한 번 더 코드 모양을 정리한다.

- 중복 제거
- naming 정리
- 테스트 헬퍼 정리
- 리뷰 대응 중 생긴 임시 분기 제거

## Phase 7: 점수 집계와 판정

출력 형식은 아래를 따른다.

```text
RAL REVIEW SCORECARD
Runtime Stability:   X/10
Spec Alignment:      X/10
Test Coverage:       X/10
Independent Review:  X/10
Adversarial Review:  X/10
Total:              XX/50
Status:             PASS | FAIL
```

### 통과 기준

- `PASS`: 총점 42/50 이상
- `FAIL`: 총점 42 미만

### FAIL일 때

1. 최저 점수 차원을 먼저 고친다.
2. AUTO 수정 가능한 항목만 수정한다.
3. REPORT 항목은 남긴다.
4. 다음 반복으로 넘어간다.

### 루프 중단 조건

- 총점 42/50 이상
- 5회 반복 도달
- 두 번 연속으로 유의미한 개선이 없고 남은 이슈가 REPORT뿐일 때

## AUTO / REPORT 경계

| AUTO | REPORT |
|---|---|
| 미사용 import 제거 | 새 기능 추가 |
| 안전한 이름 정리 | 시스템 구조 재설계 |
| `destroy()` 누락 보완 | 게임 밸런스 변경 |
| listener 해제 누락 수정 | 스펙 자체 변경 |
| cleanup 순서 수정 | 프로토콜 재정의 |
| 누락 테스트 추가 | 대규모 성능 리팩토링 |
| 핫 루프의 명백한 비효율 완화 | 사용자 경험 정책 변경 |

## Lint 연동

ralreview가 끝나면 PASS/FAIL과 무관하게 lint를 한 번 실행한다.

```bash
bunx biome check .
```

lint는 별도 보고 대상이다. 점수에는 포함하지 않는다.

## 참고 문서

- [`scoring-rubric.md`](./references/scoring-rubric.md)
- [`phaser-best-practices`](../phaser-best-practices/SKILL.md)
