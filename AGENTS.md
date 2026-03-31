# AGENTS.md

AI 코딩 에이전트가 이 저장소에서 안전하게 작업하기 위한 실무 가이드.

## 프로젝트 스냅샷

Palace 개랜타디 — 모바일 우선 1:1 랜덤 타워디펜스 버티컬 슬라이스. AI 상대와 20웨이브 생존 대전.

**구현 완료:** 12×8 그리드, 타워 18종(5티어) 배치·판매·합성, 유닛 5종, A* 경로탐색, 빌드/전투 페이즈, AI 상대, 이모트, 결과 오버레이, 모바일 세로형 셸, 절차적 픽셀 아트 에셋 파이프라인, Sentry 에러 추적.

**아직 구현되지 않은 것:** 실시간 네트워크 PvP, 백엔드 서버, 결제, 매치메이킹. 로비의 프로필·컬렉션 데이터는 현재 목(mock) 데이터다.

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
lobby → building ⇄ combat → victory | defeat → lobby
```

`gameStore.ts`의 `runStatus`가 전체 런 상태를 관리. `runId` 변경 시 Phaser 인스턴스가 새로 마운트된다.

### 타워 배치 피드백

전투 페이즈 배치 시도는 `PlacementFailureReason`(`combat_phase | insufficient_gold | occupied | blocked_path | out_of_bounds`)과 함께 거부된다.

### AI 상대

`AIOpponent` 시스템이 타워 배치, 유닛 이동, 킬 트랜스퍼를 시뮬레이션. 실제 네트워크 상대가 아니다.

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
| `GridManager.ts` | 12×8 그리드, 타일 점유, 좌표 변환 |
| `PathfindingSystem.ts` | A* 경로탐색, 패스 캐싱 |
| `TowerSystem.ts` | 타워 배치·판매, 범위 공격, Slow/Splash/Boost |
| `MergeSystem.ts` | 동일 타워 합성 (같은 defId + tier < 5 → 다음 티어 랜덤) |
| `UnitSystem.ts` | 유닛 스폰, 경로 이동, HP/아머/슬로우 |
| `WaveSystem.ts` | 20웨이브, 빌드/전투 페이즈 전환, 웨이브 미리보기 |
| `AIOpponent.ts` | AI 상대 시뮬레이션 |
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
- **runStatus 전이를 임의로 건너뛰지 말 것.** `lobby → building → combat → victory|defeat` 순서를 따른다.

활성 스펙과 플랜은 `docs/superpowers/` 아래에서 관리된다.
