# AGENTS.md

AI 코딩 에이전트가 이 저장소에서 안전하게 작업하기 위한 실무 가이드.

## Cross-Agent Operating Rules

이 섹션은 `claude-token-efficient`의 핵심 규칙을 이 저장소의 `AGENTS.md`에 맞게 옮긴 공용 운영 규칙이다.
Claude Code, Codex, 그 외 `AGENTS.md`/`CLAUDE.md`를 읽는 에이전트 모두에 동일하게 적용한다.

### 작업 전

- 관련 파일을 먼저 읽고 수정할 것. 블라인드 수정 금지.
- 요구사항과 영향 범위를 이해한 뒤에만 변경할 것.
- 이미 확인한 파일은 변경이나 새 맥락이 없으면 불필요하게 다시 읽지 말 것.

### 작업 중

- 가장 단순하게 동작하는 해법을 우선할 것. 과한 추상화 금지.
- 전체 파일 재작성보다 필요한 부분만 수정하는 편집을 우선할 것.
- 요청 범위를 벗어난 제안, 기능 추가, 리팩터링은 하지 말 것.
- 확실하지 않으면 추측하지 말고 모른다고 말할 것.
- 실패한 테스트, 빌드, 린트는 넘기지 말고 원인을 확인한 뒤 진행할 것.

### 완료 전

- 완료 주장 전에 관련 검증 명령을 직접 다시 실행할 것.
- 테스트나 빌드가 필요한 변경은 통과 증거 없이 완료로 보고하지 말 것.
- 수정 사항이 요구사항을 실제로 충족하는지 마지막으로 다시 확인할 것.

### 출력 규칙

- 응답 첫 줄부터 본론만 말할 것. 과한 인사, 맞장구, 마무리용 문구 금지.
- 사용자 질문을 불필요하게 되풀이하지 말 것.
- 설명은 짧고 직접적으로 작성할 것. 요청하지 않은 대안 제시는 하지 말 것.
- 코드, 명령, 로그, 식별자는 복사 가능한 평문 형식을 유지할 것.
- 한국어 응답은 유지하되, 코드와 기계가 읽는 텍스트는 ASCII-safe 표기를 우선할 것.

### 우선순위

- 사용자의 직접 지시가 항상 이 문서보다 우선한다.
- 저장소의 구체 규칙이 공용 규칙보다 우선한다.

## 프로젝트 스냅샷

Palace 개랜타디 — 모바일 우선 PVE 타워디펜스 버티컬 슬라이스. 10웨이브 솔로 생존.

**구현 완료:** 8×18 세로 그리드, 타워 18종(5티어) 배치·합성, 유닛 5종, A* 경로탐색, 에너지 기반 랜덤 롤 경제, 이벤트 기반 10웨이브 진행, 결과 오버레이, 모바일 세로형 셸, 절차적 픽셀 아트 에셋 파이프라인, Sentry 에러 추적.

**아직 구현되지 않은 것:** 속성 시스템, 보스 페이즈, 4타워 덱, 메타 성장/저장, 멀티 스테이지. 로비의 프로필·컬렉션 데이터는 현재 목(mock) 데이터다.

## Local Skills

- Claude Code용 수렴 리뷰 스킬: `.claude/skills/ralreview/SKILL.md`
- Codex용 수렴 리뷰 스킬: `.agents/skills/ralreview/SKILL.md`
- 런타임 안정성 체크 기준: `.claude/skills/phaser-best-practices/SKILL.md`

## 워크스페이스 맵

| 패키지 | 역할 |
|---------|------|
| `packages/shared/` (`@gld/shared`) | TypeScript 타입, 상수, 이벤트 계약. 다른 패키지가 의존. |
| `packages/phaser-game/` (`@gld/phaser-game`) | Phaser 3 게임 엔진. 그리드, 타워, 유닛, AI, 렌더링. |
| `packages/web-shell/` | React 18 SPA. Phaser 임베드, 로비(3탭), 설정, Zustand 상태 관리. |
| `scripts/generate-assets/` | @napi-rs/canvas 기반 절차적 픽셀 아트 생성 파이프라인. |

## 핵심 런타임 흐름

### TypedEventBus

React↔Phaser 양방향 typed 이벤트 통신.

```
React → EventBus.emit('request-place-tower', { col, row, towerDefId })
     → Game scene 실행
     → EventBus.emit('tower-placed', { col, row, towerId, success, reason? })
     → React useEffect → Zustand store 업데이트
```

| 방향 | 접두사 | 예시 |
|------|--------|------|
| React → Game | `request-*` | `request-place-tower`, `request-sell-tower`, `request-select-tower` |
| Game → React | 서술형 | `tower-placed`, `tower-sold`, `wave-preview` |

이벤트 타입을 추가/변경하면 `shared/src/types/events.ts`와 `phaser-game/src/EventBus.ts`의 `GameEventMap`을 반드시 함께 업데이트해야 한다.

### runStatus 전이

```
lobby → building → running → victory | defeat → lobby
```

`gameStore.ts`의 `runStatus`가 전체 런 상태를 관리. `runId` 변경 시 Phaser 인스턴스가 새로 마운트된다. PVE에서는 전투 중 자유 배치 허용 (빌드/전투 구분 없음).

### 타워 배치 피드백

게임 종료 후 배치 시도는 `PlacementFailureReason`(`combat_phase | insufficient_energy | occupied | blocked_path | out_of_bounds`)과 함께 거부된다. 전투 중에는 항상 배치 가능.

### 에너지 경제

에너지가 초당 1씩 자동 축적된다 (최대 100). 타워 랜덤 롤에 에너지 10을 소비. 킬 보상은 에너지로 변환되지 않음 (순수 시간 기반 경제).

## 하이시그널 파일

에이전트가 가장 먼저 확인해야 할 파일들:

| 파일 | 역할 |
|------|------|
| `packages/shared/src/types/events.ts` | 이벤트 타입 계약 |
| `packages/phaser-game/src/EventBus.ts` | typed EventEmitter (GameEventMap) |
| `packages/phaser-game/src/scenes/Game.ts` | 메인 게임 씬, 시스템 초기화 |
| `packages/web-shell/src/stores/gameStore.ts` | Zustand 상태 — runStatus, gold, lives, wave 등 |
| `packages/web-shell/src/game/PhaserGame.tsx` | React 측 Phaser 마운트 |
| `packages/web-shell/src/App.tsx` | 상태 기반 라우팅 (lobby ↔ game) |
| `packages/web-shell/src/pages/LobbyPage.tsx` | 3탭 로비 (home, collection, settings) |
| `packages/web-shell/src/pages/GamePage.tsx` | 게임 UI, HUD, 이모트 |
| `packages/web-shell/src/styles/tokens.ts` | 중세 색상 팔레트 토큰 |

게임 시스템 파일 (`packages/phaser-game/src/systems/`):

| 파일 | 역할 |
|------|------|
| `GridManager.ts` | 8×18 세로 그리드, 타일 점유, 좌표 변환 |
| `PathfindingSystem.ts` | A* 경로탐색, 패스 캐싱 |
| `TowerSystem.ts` | 타워 배치·판매, 범위 공격, Slow/Splash/Boost |
| `MergeSystem.ts` | 동일 타워 합성 (같은 defId + tier < 5 → 다음 티어 랜덤) |
| `UnitSystem.ts` | 유닛 스폰, 경로 이동, HP/아머/슬로우 |
| `WaveSystem.ts` | 10웨이브, 이벤트 기반 진행 (combat→waiting→next), 보스 경고 |
| `EnergySystem.ts` | 에너지 축적 (1/sec), 타워 롤 비용 관리 |
| `RandomTowerSystem.ts` | 랜덤 타워 롤 |

## 커맨드

```bash
bun install                                        # 의존성 설치
bun run scripts/generate-assets/generate-all.ts    # 에셋 생성 (최초 1회)
bun dev:web                                        # Vite 개발 서버 (port 3000)
bun build:web                                      # 프로덕션 빌드
bun test                                           # 전체 테스트
bun test:shared                                    # @gld/shared 테스트
bun test:phaser                                    # @gld/phaser-game 테스트
bun test:web                                       # web-shell 테스트
bun lint                                           # 전체 lint
bun lint:check                                     # Biome check
bun generate:assets                                # 에셋 전체 생성
```

Node >= 22, bun 필수. 단일 테스트: `cd packages/<pkg> && bunx vitest run tests/<file>.test.ts`

## 편집 가이드

- **shared 이벤트/타입 변경 시** Phaser(`EventBus.ts`, `GameEventMap`)와 React(`gameStore`, UI 컴포넌트) 양쪽 소비자를 반드시 동기화할 것.
- **로비 프로필/컬렉션 데이터는 현재 mock.** 이 영역을 수정할 때 실제 API가 없음을 인지할 것.
- **에셋은 gitignored.** `packages/web-shell/public/assets/`는 `generate-assets`로 생성된다. 에셋 관련 변경은 생성 스크립트를 수정.
- **Phaser 씬 클린업 순서:** EventBus off → system destroy. shutdown 시 역순 정리 필수.
- **runStatus 전이를 임의로 건너뛰지 말 것.** `lobby → building → running → victory|defeat` 순서를 따른다.

활성 스펙과 플랜은 `docs/superpowers/` 아래에서 관리된다.
