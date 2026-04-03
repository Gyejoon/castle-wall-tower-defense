# Skill Progression Map

업데이트: 2026-04-03

## 최근 근거 요약

### PR #24: 필드 에셋 도입 + 런타임 안정화
- 머지: `098e522` (2026-04-01)
- 주제: 필드 에셋 파이프라인 교체, shared/phaser/web 에셋 계약 재정리, 게임 런타임 정리
- 리뷰/후속 수정:
  - `cec2c55`: `WAVE_DEFS.find()` 핫루프 제거, dead code 제거, pressure guard 추가
  - `30cde3d`: delta cap 추가, `EventBus.removeAllListeners()` 도입, 미구현 특수효과 제거
  - `ce95edd`: `maxWaves < TOTAL_WAVES`일 때 WaveSystem 종료 누락 수정

### PR #24 이후 메인 브랜치 후속 수정
- `f26b7aa` (2026-04-02): `assetManifest`를 shared/phaser/generator 계약으로 재정리하고 테스트 보강
- `1192ca7` (2026-04-02): 모바일 로비 아트를 `.webp`로 전환
- `6fac042` (2026-04-02): `removeAllListeners()`가 `game-ready` 리스너까지 날리던 회귀 수정, `PhaserGame.test.tsx` 회귀 테스트 추가

### PR #26: rex drag 입력 전환
- 머지: `25d17b2` (2026-04-02)
- 주제: 타워 드래그 입력을 rex drag 기반으로 전환
- 리뷰/후속 수정:
  - `bb5a952`: rex drag plugin 재등록 경고 제거, config/GameScene 테스트 보강

### PR #27: 게임 UI 정리 + QA 후속 수정
- 머지: `5c7fbe0` (2026-04-02)
- 주제: GamePage를 로비 비주얼 언어에 맞추고 모바일 화면 비율 대응
- 리뷰/후속 수정:
  - `27b0f10`: 경기 이탈 전에 확인 다이얼로그 추가, `GamePage.regression-1.test.tsx` 생성
  - `e0de7ee`: tall-screen에서 비정상적으로 커지던 컨트롤 간격 축소, 같은 회귀 테스트 확장

## 다음에 더 깊게 훈련할 스킬

### 1. EventBus/플러그인/씬 초기화의 소유권 분리

근거:
- `30cde3d`는 깨끗한 재시작을 위해 `EventBus.removeAllListeners()`를 넣었다.
- 바로 뒤 `6fac042`에서 React가 설치한 `game-ready` 리스너까지 제거해 부트 완료 신호를 끊는 회귀가 생겼다.
- `bb5a952`도 rex drag plugin을 다시 등록하면서 경고가 나지 않도록 등록 지점을 재조정했다.

부족한 스킬의 정체:
- "초기화는 해야 한다"는 감각은 있는데, 무엇이 scene-owned이고 무엇이 app-owned인지 경계가 흐리다.
- 특히 EventBus 리스너, Phaser plugin, scene boot 코드를 같은 계층으로 취급하는 버릇이 보인다.

다음 PR에서 바로 할 일:
- `packages/phaser-game/src/scenes/Game.ts`, [`packages/web-shell/src/game/PhaserGame.tsx`](/Users/lio/.codex/worktrees/f181/grid-line-defense-pvp/packages/web-shell/src/game/PhaserGame.tsx), `packages/phaser-game/src/config.ts` 변경 전 `resource / owner / install point / teardown point / survives restart?` 표를 먼저 적는다.
- `removeAllListeners()` 같은 전역 해제는 기본 금지로 두고, 이름 있는 handler 해제 또는 scene-local emitter 해제로 좁힌다.
- plugin 등록은 "config 1회 등록"과 "scene create 재진입"을 분리해 테스트로 고정한다.
- 최소 회귀 테스트 3개를 먼저 쓴다.
  - 첫 mount에서 `game-ready` 1회 수신
  - restart 뒤 중복 리스너 없음
  - drag plugin 관련 warning 재발 없음

다음 두 PR에서 봐야 할 신호:
- lifecycle PR 뒤에 "listener too broad", "plugin re-registration", "boot signal lost" 류 보정 커밋이 다시 붙으면 아직 미흡하다.

### 2. Wave/전투 상태기계의 종료 조건과 큰 delta 반례 설계

근거:
- `ce95edd`는 슬롯 파이프라인이 먼저 고갈되면 phase가 영원히 `running`에 머무는 버그를 고쳤다.
- `30cde3d`는 background tab 복귀 시 큰 delta 때문에 여러 슬롯이 한 번에 소비되는 문제를 막으려고 delta cap을 추가했다.
- `cec2c55`는 pressure expiry가 중복 호출되지 않도록 guard를 추가했다.

부족한 스킬의 정체:
- 정상 흐름 구현은 빠르지만, 종료 조건과 once-only side effect는 리뷰가 먼저 찾고 있다.
- "업데이트 루프가 큰 delta를 받으면 어떻게 깨지나"를 구현 전에 시뮬레이션하는 습관이 약하다.

다음 PR에서 바로 할 일:
- `WaveSystem`이나 phase 전이를 건드리면 구현 전에 아래 4개를 먼저 문장으로 적는다.
  - phase가 시작되는 조건
  - phase가 끝나는 조건
  - 자원/슬롯이 소비되는 순간
  - 재호출되면 안 되는 side effect
- 테스트도 happy path보다 반례를 먼저 쓴다.
  - slot 고갈 시 `ended` 전이
  - 5000ms 이상 delta 입력에도 슬롯 1회만 소비
  - expiry류 콜백은 1회만 실행
- `packages/phaser-game/tests/runtimeSafety.test.ts`와 `WaveSystem` 인접 테스트 파일에 반례를 붙이고, 새 상태 분기마다 동일 패턴으로 확장한다.

다음 두 PR에서 봐야 할 신호:
- 리뷰가 다시 stuck phase, double fire, repeated expiry를 잡으면 이 훈련이 아직 부족하다.

### 3. 에셋 생성기, manifest, 소비자 코드를 하나의 계약으로 운영

근거:
- `f26b7aa`는 `packages/shared/src/assets/manifest.ts`, `packages/phaser-game/src/assets/assetManifest.ts`, `scripts/generate-assets/generate-all.ts`, `packages/web-shell/public/assets/asset-manifest.json`을 다시 한 줄 계약으로 묶었다.
- `1192ca7`는 모바일 로비 아트를 `.webp`로 바꾸면서 `packages/web-shell/src/assets/uiMobileArt.ts`까지 함께 조정했다.
- PR #24 자체가 에셋 대규모 교체 후 런타임/테스트 보정 커밋을 여러 개 낳았다.

부족한 스킬의 정체:
- 에셋 작업을 "파일 추가"로 보고, 타입/manifest/소비 코드는 뒤에서 맞추는 경향이 있다.
- 그래서 생성기 변경이 런타임 계약 변경이라는 감각이 늦게 들어온다.

다음 PR에서 바로 할 일:
- 에셋 관련 작업은 항상 아래 순서로 진행한다.
  1. generator 출력 키와 파일명 스키마 정의
  2. shared manifest 타입 반영
  3. phaser/web 소비자 반영
  4. 실제 산출물 또는 manifest 스냅샷 테스트 갱신
- 포맷 변경 시 `source asset -> emitted file -> import path -> runtime consumer` 표를 PR 설명에 남긴다.
- 검토 파일 범위를 의도적으로 좁힌다.
  - `packages/shared/src/assets/manifest.ts`
  - `packages/phaser-game/src/assets/assetManifest.ts`
  - `packages/web-shell/src/assets/uiMobileArt.ts`
  - `scripts/generate-assets/generate-all.ts`

다음 두 PR에서 봐야 할 신호:
- 에셋 PR 뒤에 "manifest가 모른다", "소비자가 포맷 변경을 못 따라갔다" 류 후속 커밋이 붙으면 아직 부족하다.

### 4. UI 회귀를 레이아웃 규칙과 사용자 이탈 규칙으로 먼저 고정

근거:
- `27b0f10`은 경기 중 뒤로 나가기에서 확인 절차가 빠진 UX 회귀를 수정했다.
- `e0de7ee`는 tall-screen에서 하단 컨트롤 영역이 과도하게 벌어지는 레이아웃 회귀를 수정했다.
- 두 수정 모두 `GamePage.regression-1.test.tsx`에 사용자 행동과 화면 조건을 다시 고정하는 방식으로 처리됐다.

부족한 스킬의 정체:
- 비주얼 리팩터링은 잘 진행되지만, 화면 비율 변화나 "실수로 경기 이탈" 같은 사용자 규칙이 사후 QA 이슈로 흘러간다.
- UI를 컴포넌트 단위로만 보고, 플레이 세션 규칙 단위로 테스트하지 않는 경향이 있다.

다음 PR에서 바로 할 일:
- `packages/web-shell/src/pages/GamePage.tsx`를 건드릴 때는 코드보다 먼저 회귀 시나리오 2개를 적는다.
  - 사용자가 세션을 실수로 끊지 않아야 한다.
  - tall-screen/short-screen 모두에서 조작 밀도가 유지돼야 한다.
- CSS/레이아웃 수정은 숫자 변경 전에 "어떤 viewport band를 보호하는가"를 메모로 남긴다.
- `GamePage`류 화면은 스냅샷보다 행동 테스트를 우선한다.
  - leave action에 확인 단계가 있는지
  - viewport 높이 변화에도 핵심 컨트롤 간격이 과도하게 늘지 않는지

다음 두 PR에서 봐야 할 신호:
- QA가 다시 tall-screen spacing, accidental exit, control density 문제를 올리면 이 훈련이 아직 부족하다.

### 5. 리뷰 전에 핫패스와 방어 분기를 먼저 냄새 맡는 습관

근거:
- `cec2c55`는 per-frame `find()` 제거, dead code 제거, redundant copy 제거, once-only guard 추가를 한 번에 처리했다.
- 이 수정들은 기능 추가가 아니라 "리뷰가 먼저 찾아낸 비용/방어 문제"였다.

부족한 스킬의 정체:
- 시스템은 동작하지만, 프레임 루프 비용과 guard 누락을 작성자가 먼저 잡는 단계까지는 아직 아니다.

다음 PR에서 바로 할 일:
- Phaser 시스템 PR을 열기 전에 바뀐 파일에 대해 아래 문자열을 먼저 grep한다.
  - `find(`
  - `filter(`
  - `map(`
  - `...`
  - `removeAllListeners(`
- `update()`나 tick 경로에서 발견되면 "왜 이 비용이 괜찮은가"를 설명 못하면 수정한다.
- once-only side effect에는 guard 이름을 명시적으로 둔다. `expired`, `registered`, `initialized` 같은 불린이 필요한지 먼저 판단한다.

다음 두 PR에서 봐야 할 신호:
- 후속 fix 커밋 메시지에 hot loop, redundant copy, repeated call 문구가 다시 나오면 아직 부족하다.

## 지금 바로 집중할 순서

1. EventBus/플러그인/씬 초기화 소유권 분리
2. Wave/전투 상태기계 반례 설계
3. 에셋 계약 운영
4. GamePage 회귀 규칙 선고정
5. 핫패스/guard 사전 점검

## 다음 2개 PR에서 확인할 체크포인트

- lifecycle 변경 뒤 listener/plugin cleanup 보정 커밋이 다시 붙지 않는가
- WaveSystem 변경 뒤 phase stuck이나 large-delta 버그가 재발하지 않는가
- 에셋 작업 뒤 manifest/consumer follow-up이 없이 한 번에 끝나는가
- GamePage 리팩터링 뒤 QA 이슈가 새 regression test 없이 발생하지 않는가
- 리뷰 후속 커밋 메시지에서 hot loop, redundant copy, repeated expiry가 사라지는가
