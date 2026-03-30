# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

왕국의 방어선 (Grid Line Defense PvP) — 20x20 그리드 기반 중세 판타지 타워 디펜스 PvP 게임. Phaser 3 + React 프론트엔드를 bun 모노레포로 구성. Phase 1 완료.

## Theme

**중세 자연 판타지** — 잔디 그리드, 돌/나무 타워, 마물 유닛, 2.5D 픽셀 아트.
- 타워 이름: 궁수 탑, 투석기, 서리 마탑, 성기사 제단 (한글)
- 유닛 이름: 고블린 정찰병, 오크 전사, 돌 트롤, 그림자 암살자, 고대 드래곤 (한글)
- UI: 갈색/금빛/초록 따뜻한 색감, Press Start 2P 픽셀 폰트
- 에셋 팔레트: 잔디(#7ab648), 흙길(#b8956a), 돌(#8c8c8c), 나무(#8b5e3c), 얼음(#a8def0), 황금(#f0d060)

## Commands

```bash
# Development
bun dev:web          # Vite dev server (port 3000)
bun build:web        # TypeScript + Vite production build

# Testing (Vitest)
bun test             # Run all tests
bun test:shared      # @gld/shared tests only
bun test:web         # web-shell tests only

# Single test file
cd packages/shared && bunx vitest run tests/types.test.ts
cd packages/phaser-game && bunx vitest run tests/GridManager.test.ts
cd packages/web-shell && bunx vitest run tests/gameStore.test.ts

# Asset generation
bun run scripts/generate-assets/generate-all.ts
```

Node >=22 required (.nvmrc). bun으로 패키지 관리.

## Architecture

```
packages/
├── shared/         (@gld/shared) — TypeScript 타입 + 상수. 다른 패키지가 의존.
├── phaser-game/    (@gld/phaser-game) — Phaser 3 게임 엔진. 그리드, 타워, 유닛, 렌더링.
└── web-shell/      — React 18 + Vite SPA. Phaser 게임을 임베드.

scripts/
└── generate-assets/ — @napi-rs/canvas 기반 절차적 픽셀 아트 생성 파이프라인
```

### React↔Phaser TypedEventBus

양방향 typed EventBus 패턴. React와 Phaser가 같은 JS 런타임에서 직접 통신.

**이벤트 흐름:**
```
React → EventBus.emit('request-place-tower', { col, row, towerDefId })
     → GameScene listens and executes
     → EventBus.emit('tower-placed', { col, row, towerId, success })
     → React useEffect listener → Zustand store update
```

**이벤트 명명 규칙:**
| 방향 | 접두사 | 예시 |
|------|--------|------|
| React → Game | `request-*` | `request-place-tower`, `request-sell-tower` |
| Game → React | 서술형 | `tower-placed`, `tower-sold`, `wave-preview` |

**핵심 파일 (수정 시 반드시 함께 확인):**
- `shared/src/types/events.ts` — 이벤트 타입 계약
- `phaser-game/src/EventBus.ts` — typed EventEmitter (GameEventMap)
- `web-shell/src/game/PhaserGame.tsx` — React 측 마운트 컴포넌트
- `phaser-game/src/scenes/Game.ts` — 메인 게임 씬

이벤트 타입을 추가/변경하면 EventBus.ts의 GameEventMap을 업데이트해야 함.

### Phaser Game Systems

- `systems/GridManager.ts` — 20x20 그리드 관리, 타일 점유, 좌표 변환, 경로 시각화
- `systems/PathfindingSystem.ts` — A* 경로탐색, 패스 캐싱
- `systems/TowerSystem.ts` — 타워 배치/판매, 범위 공격, Slow/Splash/Boost 특수효과
- `systems/UnitSystem.ts` — 유닛 스폰, 경로 이동, HP/아머/슬로우 상태 관리
- `systems/WaveSystem.ts` — 10웨이브 시스템, 빌드/전투 페이즈 전환, 웨이브 미리보기
- `systems/PressureSystem.ts` — Ghost Battle 압력 시스템
- `systems/GhostRecorder.ts` / `GhostPlayer.ts` — 비동기 PvP 기록/재생

### Tower Special Effects

| 타워 | 특수효과 | 구현 위치 |
|------|---------|----------|
| 서리 마탑 (emp) | Slow 30%, 2초, 파란 틴트 | TowerSystem → UnitSystem.applySlow() |
| 투석기 (plasma) | Splash 반경 1.5타일, 50% 피해 | TowerSystem.update() |
| 성기사 제단 (shield) | 인접 타워 +20% 부스트 | TowerSystem.getBoostMultiplier() |
| 타워 판매 | 빌드 페이즈 중 70% 환불 | TowerSystem.sellTower() |

### Phaser Scenes

- `Boot` → `Preloader` → `Game` 씬 체인
- `Game` 씬이 모든 시스템을 초기화하고 게임 루프를 실행
- shutdown 클린업: EventBus off → system destroy 순서

### Web-Shell

- **상태관리:** Zustand (gameStore — runStatus, gold, lives, wave, selectedTower, wavePreview)
- **UI:** Inline styles + `styles/tokens.ts` 중세 색상 팔레트 (갈색/금빛/초록)
- **Phaser 마운트:** `PhaserGame.tsx`가 useRef/useEffect로 Phaser.Game 인스턴스 관리
- **LobbyPage:** "왕국의 방어선" 타이틀, 한글 UI, 중세 판타지 배경
- **GamePage:** Phaser 캔버스 + 타워 선택 패널 + 웨이브 미리보기 + 타워 판매

### Asset Pipeline

`scripts/generate-assets/` — @napi-rs/canvas 기반 절차적 픽셀 아트 생성.

```
scripts/generate-assets/
├── shared.ts           # 중세 자연 팔레트, 픽셀 유틸리티
├── generate-tiles.ts   # 잔디 그리드, 동굴 스폰, 성문 출구, 흙길
├── generate-towers.ts  # 궁수 탑, 투석기, 서리 마탑, 성기사 제단 (2.5D)
├── generate-units.ts   # 고블린, 오크, 트롤, 암살자, 드래곤 (3/4뷰)
├── generate-projectiles.ts  # 화살, 돌 투사체, 얼음 결정, 황금빛
├── generate-vfx.ts     # 착탄, 얼음 파동, 황금 오라, 동굴 이펙트
├── generate-ui.ts      # 타워/유닛 아이콘, HP바, 배치 커서
├── generate-ui-mobile.ts    # 로비 키아트, CTA 아트
└── generate-all.ts     # 전체 에셋 오케스트레이터
```

에셋 출력: `packages/web-shell/public/assets/` (gitignored)

### Game Constants

- 그리드: 20x20, 타일 32px, 스폰(0,10) 동굴, 출구(19,10) 성문
- 타워: 4 기본(궁수 탑, 투석기, 서리 마탑, 성기사 제단) + 5 합성
- 유닛: 5종(고블린 정찰병, 오크 전사, 돌 트롤, 그림자 암살자, 고대 드래곤)
- 상수 정의: `shared/src/constants/`
- 색상 토큰: `web-shell/src/styles/tokens.ts`

## Phase Roadmap

- **Phase 1** (완료): 프로토타입 — 그리드, 타워(특수효과), 유닛, 10웨이브, Ghost Battle, 모바일, 중세 테마
- Phase 2: 네트워킹 (WebSocket, 실시간 동기화)
- Phase 3: 토스 연동 (인증, 결제)
- Phase 4: 게임 완성 (밸런싱, 매치메이킹)
