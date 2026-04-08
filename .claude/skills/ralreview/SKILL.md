---
name: ralreview
description: Use when reviewing non-trivial code changes in this repository before landing. Triggers on "ralreview", "ral review", "quality review", "전체 리뷰", "품질 검수", "landing review", "pre-merge review", "코드 검수", "리뷰 돌려", "머지 전 검토", "코드 리뷰해줘". Also use proactively before creating PRs when the diff touches game systems, React components, or shared packages.
---

# RAL Review

이 저장소 전용 수렴형 코드 리뷰 프로토콜. 변경 diff를 여러 차례 좁혀 가며 런타임 안정성, React 품질, 스펙 정합성, 테스트, 외부 시각 검증까지 통과시킨다.

## 실행 원칙

1. 현재 브랜치의 변경 코드만 본다.
2. 한 번에 끝내려 하지 말고, 최대 5회까지 수렴시킨다.
3. 자동 수정은 안전한 범위(AUTO)만 한다. 비즈니스 로직, 밸런스, 기능 범위를 바꾸는 수정은 보고(REPORT)만 한다.
4. 루프가 끝나면 점수와 미해결 이슈를 남긴다.

## 빠른 시작

```text
/ralph-loop "Run the ralreview pipeline on current branch changes. Follow the ralreview skill exactly. Fix only AUTO issues. When the total score reaches 58/70 or higher, output RALREVIEW PASS." --completion-promise "RALREVIEW PASS" --max-iterations 5
```

ralph-loop이 없으면 아래 Phase 0-9를 수동으로 수행한다. 총점 58/70 미만이면 같은 절차를 다시 돈다. 최대 5회.

## Phase 0: Init

1. base 브랜치를 정한다.
   - 우선순위: 현재 PR base → `origin/main` → `origin/master`
2. diff 범위를 정한다.
   ```bash
   git diff --name-only <base>...HEAD
   ```
3. 변경 파일을 분류한다.
   - **Phaser 파일**: `packages/phaser-game/src/**/*.ts` (`.tsx` 제외)
   - **React 파일**: `packages/web-shell/src/**/*.tsx`
   - **Shared 파일**: `packages/shared/src/**/*.ts`
4. `.ts`/`.tsx` 변경이 없으면 즉시 PASS 처리한다.
5. diff에 `docs/game-spec/**`, `.claude/skills/*/SKILL.md`, `AGENTS.md`, `README.md`가 포함되면 `/doc-validate` 실행을 권고한다. ralreview는 코드 품질만 검증하고, 문서 교차참조 정합성은 doc-validate가 담당한다.
6. 이번 반복의 대상 파일 목록과 메모를 남긴다.

## Phase 1: Simplify

변경 파일에서 안전한 정리 작업을 먼저 한다. 여기서는 동작을 바꾸지 않는 수정만 한다.

- 중복 분기, 죽은 코드, 불필요한 임시 변수 제거
- 기존 유틸리티/상수 재사용
- 이름 명확화, 과한 중첩 완화
- 테스트에서만 필요한 보조 코드가 런타임 코드에 섞여 있는지 점검
- **공유 타입 속성 접근**: `@gld/shared` 타입의 속성을 사용할 때 추측하지 않고 실제 타입 정의를 확인한다. dev 서버에선 에러가 안 나도 CI `tsc`에서 터진다

### Tailwind 정밀도 (변경 파일에 Tailwind 클래스가 있을 때만)

- **의미 차이 유틸리티**: `h-dvh` vs `h-full`, `bg-none` vs `bg-transparent` — 의도와 다른 유틸리티 교정
- **픽셀 정확도**: Tailwind 기본 스텝값이 원래 임의값과 다르면 `gap-[3px]`처럼 임의값으로 교정
- **하드코딩 색상**: `#4a3a20` 등 → `var(--color-*)` 토큰 교체
- **`@keyframes` 이름 충돌**: `pulse`, `spin`, `bounce` 등 Tailwind 내장 이름 회피
- **이징 함수 정확도**: CSS `ease` ≠ `ease-out` — 명시적 값으로 교정

### 에셋 경로 컨벤션 (변경 파일에 에셋 참조가 있을 때만)

- **경로 형식 일관성**: 프로젝트 내 기존 에셋 경로 패턴(상대 `assets/` vs 절대 `/assets/`)을 확인하고 통일한다. 새 파일에서 다른 형식을 쓰면 base URL 변경 시 일부만 깨진다
- **에셋 존재 여부**: `src="assets/ui/icon-*.webp"` 등 참조하는 파일이 실제로 `public/assets/` 하위에 존재하는지 확인한다. 생성 스크립트를 돌리지 않으면 빠질 수 있다
- **webp 변환 누락**: PNG만 생성하고 webp 변환을 안 했거나, 코드에서 `.webp`를 참조하는데 `.png`만 있으면 404
- **형제 컴포넌트 스타일 패리티**: 유사 컴포넌트(CoinIcon/DiamondIcon, LockIcon/UnlockIcon 등)가 존재하면 display, verticalAlign 등 구조적 CSS 속성이 동일한지 확인한다
- **에셋 스펙 정합성**: generate-assets 스크립트가 생성하는 에셋 크기(width × height)가 `docs/game-spec/`의 스펙 정의와 일치하는지 확인한다

### 문서 구조 정합성 (변경 파일에 .md가 있을 때만)

- **섹션 번호 연속성**: `## N.` 형식에서 N이 중복 없이 단조증가하는지 확인. 충돌 병합에서 duplicate §가 흔히 발생한다
- **테이블 헤더 중복**: 동일 테이블에 헤더 행(`|---|`)이 두 번 나오지 않는지
- **앵커/참조 정합성**: 문서 내 `§N` 상호참조가 실제 섹션 번호와 일치하는지

## Phase 2: Phaser 런타임 안정성 검사

[`phaser-best-practices`](../phaser-best-practices/SKILL.md) 기준으로 변경 코드를 본다.

### 조건부 활성화

- diff에 Phaser 파일이 없으면 10/10과 `"Phaser 변경 없음"` 노트를 남긴다.
- Phaser 파일이 있으면 아래 체크리스트를 적용한다.

### 체크리스트

| # | 검사 항목 | 위반 예시 | 감점 |
|---|---|---|---|
| 1 | Scene `create()`에서 `shutdown` 정리 등록 | `this.events.on('shutdown', ...)` 누락 | -2 |
| 2 | 시스템 생성자가 `Phaser.Scene`에만 의존 | 특정 `GameScene` 타입에 강결합 | -1 |
| 3 | 시스템에 `destroy()`가 있고 실제 정리 수행 | destroy 껍데기만 있거나 누락 | -2 |
| 4 | EventBus 리스너 해제 가능한 named reference | 익명 함수로 등록 | -2 |
| 5 | 정리 순서가 `off()` 후 `destroy()` | 순서 역전 | -2 |
| 6 | Graphics `clear()` 후 재사용 | 매 프레임 destroy/recreate | -1 |
| 7 | 핫 루프에서 선형 탐색 최소화 | `Array.find()` 남용 | -1 |
| 8 | 시스템 간 통신이 반환값/이벤트 기반 | 다른 시스템 내부를 직접 mutation | -1 |
| 9 | 핫 루프 배열 정리가 in-place | `filter()` 반복 | -1 |
| 10 | `setTimeout`/`setInterval` 정리 | 매 게임마다 타이머 누적 | -2 |
| 11 | Web Audio 노드 `disconnect()` 후 참조 해제 | 발사 이벤트마다 노드 누적 | -2 |
| 12 | `game.registry.events` 리스너도 named ref + cleanup off() | 익명 함수로 `changedata-*` 등록 → 씬 재시작마다 누적 | -2 |
| 13 | 산술 연산에서 0 나눗셈 가드 | `Math.floor(dist / N)`이 0일 때 `i / steps`가 NaN | -1 |
| 14 | tween 중복 방지 | pointer in/out에서 `killTweensOf` 없이 `tweens.add` 반복 → jitter | -1 |
| 15 | 인터랙티브 요소 간 겹침 | 버튼/텍스트가 동일 좌표에 배치되어 클릭 충돌 | -1 |
| 16 | 상태 리셋 함수가 Phaser 동기 이벤트를 emit | `resetRun()`이 `gameSpeed=1` 설정하면서 `request-set-speed` 미emit → Phaser timeScale 불일치 | -2 |
| 17 | 대체 실행 경로도 동일 이벤트 emit | boss leak 즉사 경로가 `base-hp-changed` 미emit → UI 미갱신 | -2 |
| 18 | 타이머 산술이 실제 호출 주기와 일치 | update()가 throttle 간격으로 실행되는데 매 프레임 `delta` 누적 → 타이머 18배 느림 | -1 |

기본 10점, 위반별 감점, 최소 0점.

## Phase 3: React 성능 & 패턴 검사

[`vercel-react-best-practices`](../vercel-react-best-practices/SKILL.md) 기준으로 변경 코드를 본다.

### 조건부 활성화

- diff에 React 파일(`web-shell/**/*.tsx`)이 없으면 10/10과 `"React 변경 없음"` 노트를 남긴다.
- React 파일이 있으면 아래 체크리스트를 적용한다.

### 체크리스트

| # | 검사 항목 | 위반 예시 | 감점 |
|---|---|---|---|
| 1 | EventBus 리스너 useEffect cleanup | `EventBus.on()` 후 return에서 `off()` 누락 | -2 |
| 2 | Zustand selector 세분화 | `useGameStore(s => s)` 전체 구독 | -2 |
| 3 | 콜백 deps 불필요 리렌더 | 인라인 arrow가 deps에 영향 | -2 |
| 4 | React-Phaser 경계 ref 안정성 | 매 렌더 재생성 콜백을 EventBus에 등록 | -2 |
| 5 | 비싼 연산 memoization | useMemo 누락 파생 게임 상태 | -1 |
| 6 | 정적 JSX 호이스팅 | 상수 JSX 렌더 내부 재생성 | -1 |
| 7 | 조건부 렌더 ternary 사용 | `&&` 연산자로 falsy 0 렌더링 | -1 |
| 8 | barrel import 회피 | `import { X } from '@gld/shared'` | -1 |
| 9 | 무거운 컴포넌트 lazy loading | React.lazy 미사용 | -1 |
| 10 | 루프/콜백 마이크로 최적화 | EventBus 핸들러 내 Array.find 남용 | -1 |
| 11 | StrictMode phantom cleanup 안전성 | `useEffect` cleanup에서 구독 해제가 `isConnected` 가드 밖에 있으면 StrictMode 재마운트 시 구독 유실 | -2 |
| 12 | `key` prop으로 인한 DOM 재생성과 useEffect 불일치 | `key={runId}`로 DOM이 바뀌는데 effect deps가 안정적이라 Phaser 재초기화 안 됨 | -2 |

기본 10점, 항목 1-4,11-12 Critical(-2), 항목 5-10 Non-critical(-1), 최소 0점.

## Phase 4: Design Quality 검사

[`frontend-design`](../frontend-design/SKILL.md) 기준으로 변경 코드의 시각적 품질을 본다.

### 조건부 활성화

- diff에 React 파일(`web-shell/**/*.tsx`)이 없으면 10/10과 `"React 변경 없음"` 노트를 남긴다.
- React 파일이 있으면 아래 체크리스트를 적용한다.

### 체크리스트

| # | 검사 항목 | 위반 예시 | 감점 |
|---|---|---|---|
| 1 | 과사용 폰트 회피 | Inter, Roboto, Arial, Open Sans, 시스템 기본 폰트 사용 | -2 |
| 2 | 타이포그래피 위계 존재 | 모든 텍스트가 비슷한 크기/굵기, 시각적 위계 없음 | -1 |
| 3 | 모노스페이스 남용 금지 | "기술적 느낌"용으로 모노스페이스를 장식적으로 사용 | -1 |
| 4 | 하드코딩 색상 금지 | `#4a3a20` 등 리터럴 색상값, CSS 변수/토큰 미사용. generate-assets 스크립트·인라인 SVG fill 포함 | -2 |
| 5 | AI 클리셰 팔레트 회피 | 다크 배경 + 시안/네온, 퍼플-투-블루 그라데이션 | -1 |
| 6 | 순수 #000/#fff 회피 | 색조 없는 순수 흑백 사용 | -1 |
| 7 | 카드 중첩 금지 | 카드 안에 카드, 동일 카드 그리드 반복 | -1 |
| 8 | 글래스모피즘/장식 남용 금지 | 목적 없는 blur, 글로우 보더, 장식용 스파크라인 | -1 |
| 9 | 모달 남용 금지 | 더 나은 대안이 있는데 모달로 처리 | -1 |
| 10 | AI 양산형 종합 테스트 | "AI가 만들었다"고 하면 즉시 믿을 수 있는 수준 | -2 |

기본 10점, 항목 1,4,10 Critical(-2), 항목 2,3,5,6,7,8,9 Non-critical(-1), 최소 0점.

## Phase 5: 스펙 정합성 검사

1. 최신 스펙 파일을 찾는다: `docs/superpowers/specs/*.md`
2. 스펙이 없으면 10/10과 `"스펙 문서 없음"` 노트를 남긴다.
3. 스펙이 있으면 검사한다:
   - 요구사항 누락: -2/건
   - 의도와 다른 동작: -2/건
   - 스펙에 없는 scope creep: -1/건

기본 10점, 최소 0점.

## Phase 6: 테스트 커버리지 검사

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

테스트가 존재해도 실제 시나리오를 검증하지 않으면 감점한다.

- 테스트명이 "더블탭 방지"인데 싱글클릭만 발생시키는 경우
- emit 이벤트 검증 없이 함수 호출 여부만 확인하는 경우
- 에셋 메타데이터(frameCount, tilesets 배열 등)를 검증하지 않는 경우
- **동어반복 테스트** (-1): expected 값을 production 코드와 같은 함수로 계산하면 regression을 잡지 못한다. 하드코딩된 스냅샷 값으로 assert한다
- **유령 테스트** (-1): 테스트명이 엣지 케이스 X를 검증한다고 하지만 setup이 조건 X를 실제로 트리거하지 않는 경우
- **경로 커버리지** (-1): 코드에 N개 분기(if/else, switch)가 있으면 테스트가 default/happy path만 덮고 있지 않은지 확인

### 기존 테스트 깨짐 검사

변경 코드가 기존 테스트의 가정을 깨뜨리는지 반드시 확인한다.

- **렌더 텍스트 변경**: 이모지/텍스트를 img 태그로 교체하면 `getByText('⚡60')` 같은 매처가 깨진다. 변경 파일과 관련된 기존 테스트를 grep하여 매처를 동기화한다.
- **상태 흐름 변경**: `runStatus` 등 enum 값이나 상태 전환 순서가 바뀌면 기존 테스트의 기대값이 틀어진다.
- **컴포넌트 구조 변경**: 버튼 텍스트, DOM 구조, role 속성이 바뀌면 `getByText`, `getByRole` 매처가 깨진다.
- **검증 방법**: 변경한 컴포넌트의 테스트 파일을 실행하여 통과 여부를 확인한 뒤에 점수를 매긴다.

### 점수

- 필수 대상 커버 비율로 최대 8점
- 테스트 실행 통과 시 +2
- 테스트 실패 시 최종 점수는 최대 5점으로 캡
- 테스트 검증 부정확: -1/건

## Phase 7: 독립 리뷰

현재 세션의 구현자 시각과 분리된 리뷰를 반드시 한 번 받는다. 리뷰어는 diff만 보고 판단해야 하며, 이전 Phase의 결과를 참조하지 않는다.

### 리뷰 실행 방법

다음 중 하나를 사용한다 (위에서부터 우선):

1. **`/codex review`** — Codex CLI가 있으면 독립 diff 리뷰
2. **Agent tool** — `subagent_type: "pr-review-toolkit:code-reviewer"`로 서브에이전트 실행
3. **`/review`** — 프로젝트 내장 리뷰 스킬

특정 도구가 없다고 Phase를 건너뛰지 말 것. 가용한 도구로 독립 판정을 받는다.

### 점수

| 결과 | 점수 |
|---|---|
| pass, 이슈 없음 | 10 |
| pass, informational only | 9 |
| pass, minor suggestion | 8 |
| reviewer unavailable | 7 |
| fail, high severity | 5-6 |
| fail, critical severity | 0-4 |

## Phase 8: 적대적 리뷰

"무엇이 틀렸는가"가 아니라 "이 설계 가정이 어디서 깨지는가"를 본다. Phase 7과 다른 관점이어야 하며, 동일한 근거를 재진술하는 수준이면 안 된다.

검증 대상:

- 이벤트 emit/listen 쌍이 정말 맞물리는지
- 캐시/파생 상태 동기화가 어긋나지 않는지
- cleanup 순서가 반례에서 깨지지 않는지
- 테스트가 happy path만 덮고 있지 않은지
- 사용자의 실제 행동에서 state drift가 나는지
- 루프 종료 조건이 경계값에서 도달 불가해 데드락이 나는지
- 상태 리셋 함수(resetRun, enterLobby 등)가 리셋하는 모든 속성에 대해 Phaser 측 동기 이벤트를 emit하는지
- 정상 경로(happy path)와 대체 경로(에러, 엣지 케이스)가 동일한 이벤트 세트를 emit하는지

### 점수

| 결과 | 점수 |
|---|---|
| pass, 이슈 없음 | 10 |
| pass, informational only | 9 |
| needs-attention, medium only | 7-8 |
| needs-attention, high severity | 5-6 |
| reviewer unavailable | 7 |
| fail, critical severity | 0-4 |

## Phase 9: 최종 정리 & 판정

### 최종 Simplify

Phase 2-8에서 생긴 수정 이후 한 번 더 정리한다: 중복 제거, naming 정리, 리뷰 대응 중 생긴 임시 분기 제거.

### 스코어카드

```text
RAL REVIEW SCORECARD
Runtime Stability:     X/10
React Best Practices:  X/10
Design Quality:        X/10
Spec Alignment:        X/10
Test Coverage:         X/10
Independent Review:    X/10
Adversarial Review:    X/10
Total:                XX/70
Status:               PASS | FAIL
```

### 통과 기준

- `PASS`: 총점 58/70 이상
- `FAIL`: 총점 58 미만

### FAIL일 때

1. 최저 점수 차원을 먼저 고친다.
2. AUTO 수정 가능한 항목만 수정한다.
3. REPORT 항목은 남긴다.
4. 다음 반복으로 넘어간다.

### 루프 중단 조건

- 총점 58/70 이상
- 5회 반복 도달
- 두 번 연속으로 유의미한 개선이 없고 남은 이슈가 REPORT뿐일 때

### Lint

PASS/FAIL과 무관하게 lint를 한 번 실행한다. 별도 보고 대상이며 점수에 포함하지 않는다.

```bash
bunx biome check .
```

## AUTO / REPORT 경계

| AUTO (안전하게 수정) | REPORT (보고만) |
|---|---|
| 미사용 import 제거 | 새 기능 추가 |
| 안전한 이름 정리 | 시스템 구조 재설계 |
| `destroy()` 누락 보완 | 게임 밸런스 변경 |
| listener 해제 누락 수정 | 스펙 자체 변경 |
| cleanup 순서 수정 | 프로토콜 재정의 |
| 누락 테스트 추가 | 대규모 성능 리팩토링 |
| 핫 루프 비효율 완화 | 사용자 경험 정책 변경 |
| memoization 추가 | 컴포넌트 구조 재설계 |
| Zustand selector 세분화 | 새 store 도입 |
| barrel → 직접 import 교체 | 패키지 구조 변경 |
| 하드코딩 색상 → CSS 변수 교체 | 폰트 체계 전면 교체 |
| 순수 #000/#fff → 색조 입힌 값 교체 | 레이아웃 구조 재설계 |
| 문서 섹션 번호/헤더 중복 수정 | 디자인 톤/컨셉 변경 |
| 상태 리셋 함수에 동기 이벤트 emit 추가 | |

## 참고 문서

- [`scoring-rubric.md`](./references/scoring-rubric.md)
- [`phaser-best-practices`](../phaser-best-practices/SKILL.md)
- [`vercel-react-best-practices`](../vercel-react-best-practices/SKILL.md)
- [`frontend-design`](../frontend-design/SKILL.md)
