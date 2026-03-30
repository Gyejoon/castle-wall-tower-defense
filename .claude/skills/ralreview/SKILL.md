---
name: ralreview
description: |
  프로젝트 전용 수렴 코드 리뷰. ralph-loop으로 반복하며 6단계 검증 파이프라인을 실행한다:
  Simplify → Phaser 런타임 안정성 → 스펙 정합성 → 테스트 커버리지 → Codex 리뷰 → 최종 Simplify.
  4개 차원 각 /10 점수를 매겨 합계 35/40 이상이면 PASS.
  "ralreview", "ral review", "quality review", "전체 리뷰", "품질 검수",
  "landing review", "pre-merge review" 등의 요청 시 사용.
---

# RAL Review — 수렴 품질 리뷰

프로젝트 코드 변경에 대해 6단계 파이프라인을 실행하고, 4개 차원 점수가 합계 35/40 이상이 될 때까지 반복한다.

---

## 실행 방법

이 스킬은 ralph-loop을 활용하여 수렴할 때까지 반복한다:

```
/ralph-loop "Run the ralreview pipeline on current branch changes. Follow the 6-phase workflow defined in the ralreview skill. Fix issues found in each phase. When all scores are acceptable (total >= 35/40), output RALREVIEW PASS." --completion-promise "RALREVIEW PASS" --max-iterations 5
```

---

## Phase 0: Init

1. base 브랜치 감지: `git log --oneline --decorate -1` → `origin/main` 또는 `origin/master`
2. 변경 파일 확인: `git diff origin/{base}...HEAD --stat`
3. `.ts`/`.tsx` 변경이 없으면 즉시 `RALREVIEW PASS` 출력하고 종료

---

## Phase 1: Simplify

`/simplify` 스킬을 실행한다.

- 변경된 코드의 중복, 품질, 효율성을 검토
- 불필요한 복잡성 제거
- 기존 유틸리티 재사용 기회 식별

---

## Phase 2: Phaser 런타임 안정성 검사

프로젝트의 `phaser-best-practices` 스킬을 기준으로 변경된 코드를 검증한다.

### 체크리스트 (각 항목 위반 시 -1점, 기본 10점)

| # | 검사 항목 | 위반 예시 |
|---|----------|----------|
| 1 | Scene `create()`에서 `shutdown` 이벤트 등록 | `this.events.on('shutdown', ...)` 누락 |
| 2 | 시스템 생성자가 `Phaser.Scene` 사용 (NOT `GameScene`) | 구체 타입 의존 |
| 3 | 모든 시스템에 `destroy()` 메서드 존재 | destroy 미구현 |
| 4 | EventBus 리스너에 named function reference 사용 | 익명 람다로 on() 등록 |
| 5 | cleanup에서 EventBus.off() → system.destroy() 순서 | 순서 역전 |
| 6 | Graphics 객체 `clear()` + redraw (NOT destroy+recreate) | 매 프레임 destroy |
| 7 | 핫 루프에서 `Array.find()` 미사용, Map 사용 | entities를 배열에서 find |
| 8 | `update()` 반환값으로 시스템 간 통신 | 직접 다른 시스템 mutate |
| 9 | 배열 in-place 컴팩션 (filter 대신) | 핫 루프에서 `filter()` |
| 10 | React useEffect cleanup에서 3계층 정리 | removeAllListeners 누락 |

### 점수 계산
- 10 - (위반 수) = 점수 (최소 0)
- 해당 항목이 변경 코드에 적용되지 않으면 위반으로 세지 않음

---

## Phase 3: 스펙 정합성 검사

1. 최신 스펙 파일 탐색: `ls -t docs/superpowers/specs/*.md 2>/dev/null | head -1`
2. **스펙 파일이 없으면**: 10/10 점수 부여 + "스펙 문서 없음" 노트
3. **스펙 파일이 있으면**:
   - 스펙의 요구사항/기능 목록 추출
   - 변경된 코드가 각 요구사항을 충족하는지 확인
   - 스펙에 없는 기능이 추가되었는지 확인 (scope creep)
   - 누락된 요구사항 수 기반으로 감점

### 점수 계산
- 10 - (누락 요구사항 수 × 2) - (scope creep 항목 수 × 1) = 점수 (최소 0)

---

## Phase 4: 테스트 커버리지 검사

1. 변경된 `.ts` 파일 목록 수집 (`.test.ts` 제외)
2. 각 파일에서 **테스트 필수 대상** 식별:
   - `export function` — 순수 함수 (시그니처에 `Phaser.*` 없음)
   - 시스템 클래스의 `destroy()` 메서드
   - 데이터 전용 시스템 (생성자에 `Phaser.Scene` 없음)
3. 대응하는 테스트 파일 존재 확인: `tests/*.test.ts` 또는 `__tests__/*.test.ts`
4. `bun test` 실행하여 전체 테스트 통과 확인

### 테스트 불필요 대상 (감점하지 않음)
- 렌더링 코드 (Graphics draw)
- Input 핸들러
- EventBus 와이어링
- 함수 시그니처에 `Phaser.*` 타입이 포함된 코드

### 점수 계산
- 테스트 필수 함수 중 테스트가 존재하는 비율 × 8 + 전체 테스트 통과 시 +2 (최대 10)
- 테스트 실패 시 최대 5점

---

## Phase 5: Codex 리뷰

`/codex review` 스킬을 실행한다.

- Codex가 diff를 리뷰하고 pass/fail 판정
- **Codex를 사용할 수 없는 경우**: 7/10 기본 점수 부여 + "Codex 미사용" 노트

### 점수 매핑
| Codex 결과 | 점수 |
|-----------|------|
| Pass (이슈 없음) | 10 |
| Pass (informational only) | 9 |
| Pass (minor suggestions) | 8 |
| Fail (high severity) | 5-7 |
| Fail (critical severity) | 0-4 |

---

## Phase 6: 최종 Simplify

`/simplify`를 한 번 더 실행하여 Phase 2-5에서 발생한 수정사항을 정리한다.

---

## Phase 7: 점수 집계 및 판정

모든 Phase 완료 후 다음 형식으로 리포트를 출력한다:

```
╔══════════════════════════════════════╗
║        RAL REVIEW SCORECARD          ║
╠══════════════════════════════════════╣
║  Runtime Stability:      X/10       ║
║  Spec Alignment:         X/10       ║
║  Test Coverage:          X/10       ║
║  Codex Review:           X/10       ║
╠══════════════════════════════════════╣
║  TOTAL:                 XX/40       ║
║  STATUS:           PASS / FAIL      ║
╚══════════════════════════════════════╝
```

### 판정 기준
- **PASS** (총 35/40 이상): `RALREVIEW PASS` 출력 → ralph-loop 종료
- **FAIL** (총 35/40 미만):
  1. 최저 점수 차원 식별
  2. 해당 차원의 구체적 이슈 나열
  3. 자동 수정 가능한 이슈 수정
  4. 비즈니스 로직 변경이 필요한 이슈는 REPORT로 분류 (수정하지 않음)
  5. 다음 반복으로 계속

### 수렴 실패 시 (5회 반복 후에도 35점 미만)
- 최종 스코어카드 출력
- 미해결 이슈 목록 출력
- 수동 확인 필요 항목 표시
- ralph-loop이 자동 종료됨

---

## 자동 수정 범위

비즈니스 로직을 변경하지 않는 범위에서만 자동 수정한다:

| 자동 수정 (AUTO) | 보고만 (REPORT) |
|-----------------|----------------|
| unused import 제거 | 새 기능 구현 |
| named reference로 변환 | 아키텍처 변경 |
| destroy() 메서드 추가 | 게임 밸런스 조정 |
| cleanup 순서 수정 | 스펙 요구사항 추가 구현 |
| 누락된 테스트 작성 | 기존 테스트 로직 변경 |
| Graphics clear+redraw 패턴 적용 | 시스템 간 통신 구조 변경 |
| in-place 컴팩션 변환 | |
| Map 기반 저장 변환 | |

---

## Lint 연동

ralreview 완료 후 (PASS든 FAIL이든) biome lint를 1회 실행한다:

```bash
bunx biome check .
```

이 결과는 점수에 포함하지 않으며 별도 보고한다. Lint는 ralreview 루프에 포함되지 않는다.
