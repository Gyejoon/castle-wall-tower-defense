# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Grid Line Defense PvP — 20x20 그리드 기반 타워 디펜스 PvP 게임. Phaser.js + React 프론트엔드를 bun 모노레포로 구성. 현재 Phase 1 (프로토타입) 진행 중.

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
```

Node >=22 required (.nvmrc). bun으로 패키지 관리.

## Architecture

```
packages/
├── shared/         (@gld/shared) — TypeScript 타입 + 상수. 다른 패키지가 의존.
├── phaser-game/    (@gld/phaser-game) — Phaser 3 게임 엔진. 그리드, 타워, 유닛, 렌더링.
└── web-shell/      — React 18 + Vite SPA. Phaser 게임을 임베드.
```

### React↔Phaser EventBus

양방향 typed EventBus 패턴. React와 Phaser가 같은 JS 런타임에서 직접 통신.

**이벤트 흐름:**
```
React → EventBus.emit('request-place-tower', { col, row, towerDefId })
     → GameScene listens and executes
     → EventBus.emit('tower-placed', { col, row, towerId, success })
     → React useEffect listener → Zustand store update
```

**핵심 파일 (수정 시 반드시 함께 확인):**
- `shared/src/types/events.ts` — 이벤트 타입 계약
- `phaser-game/src/EventBus.ts` — typed EventEmitter (GameEventMap)
- `web-shell/src/game/PhaserGame.tsx` — React 측 마운트 컴포넌트
- `phaser-game/src/scenes/Game.ts` — 메인 게임 씬

이벤트 타입을 추가/변경하면 EventBus.ts의 GameEventMap을 업데이트해야 함.

### Phaser Game Systems

- `systems/GridManager.ts` — 20x20 그리드 관리, 타일 점유, 좌표 변환, 렌더링
- `systems/PathfindingSystem.ts` — A* 경로탐색, 패스 캐싱
- `systems/TowerSystem.ts` — 타워 배치, 범위 공격, 데미지 계산
- `systems/UnitSystem.ts` — 유닛 스폰, 경로 이동, HP/아머 관리

### Phaser Scenes

- `Boot` → `Preloader` → `Game` 씬 체인
- `Game` 씬이 모든 시스템을 초기화하고 게임 루프를 실행

### Web-Shell

- **상태관리:** Zustand (gameStore — screen, gameReady, gold, lives, wave, selectedTower)
- **UI:** Inline styles + `styles/tokens.ts` 컬러 팔레트. Press Start 2P 픽셀 폰트.
- **Phaser 마운트:** `PhaserGame.tsx`가 useRef/useEffect로 Phaser.Game 인스턴스 관리
- **GamePage:** Phaser 캔버스 + 사이드 패널 (타워 선택, 유닛 전송)

### Game Constants

- 그리드: 20x20, 타일 32px, 스폰(0,10), 출구(19,10)
- 타워: 4 기본(laser, plasma, emp, shield) + 5 합성
- 유닛: 5종(scout_drone, battle_robot, heavy_walker, stealth_drone, titan)
- 상수 정의: `shared/src/constants/`

## Phase Roadmap

- **Phase 1** (현재): 프로토타입 — 그리드, 타워, 유닛, EventBus
- Phase 2: 네트워킹 (WebSocket, 실시간 동기화)
- Phase 3: 토스 연동 (인증, 결제)
- Phase 4: 게임 완성 (밸런싱, 매치메이킹)
