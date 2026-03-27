# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Grid Line Defense PvP — 20x20 그리드 기반 타워 디펜스 PvP 게임. Unity 6 WebGL + React 프론트엔드를 bun 모노레포로 구성. 현재 Phase 1 (프로토타입) 진행 중.

## Commands

```bash
# Development
bun dev:web          # Vite dev server (port 3000)
bun build:web        # TypeScript + Vite production build

# Testing (Vitest, jsdom)
bun test             # Run all tests
bun test:shared      # @gld/shared tests only
bun test:web         # web-shell tests only

# Single test file
cd packages/shared && bunx vitest run tests/types.test.ts
cd packages/web-shell && bunx vitest run tests/gameStore.test.ts

# Unity tests — Unity Editor Test Runner (EditMode)
```

Node >=22 required (.nvmrc). bun으로 패키지 관리.

## Architecture

```
packages/
├── shared/       (@gld/shared) — TypeScript 타입 + 상수. 다른 패키지가 의존.
├── web-shell/    — React 18 + Vite SPA. Unity WebGL을 임베드.
└── unity-game/   — Unity 6 C# 프로젝트. WebGL로 빌드하여 web-shell에 포함.
```

### Unity↔React Bridge Protocol

양방향 JSON 메시지 브릿지. 계약은 `shared/src/types/bridge.ts`에 정의.

**메시지 흐름:**
```
React → window.unityInstance.SendMessage('WebBridge', 'ReceiveFromReact', json)
     → WebBridge.cs (C# singleton) processes message
     → WebBridge.EmitToReact() → WebBridge.jslib (DllImport)
     → window.dispatchUnityMessage(msg) → useUnityBridge hook → React
```

**핵심 파일 (수정 시 반드시 함께 확인):**
- `shared/src/types/bridge.ts` — 메시지 타입 계약
- `web-shell/src/bridge/useUnityBridge.ts` — React 측 훅
- `unity-game/Assets/Scripts/Bridge/WebBridge.cs` — Unity 측 싱글턴
- `unity-game/Assets/Scripts/Bridge/Plugins/WebBridge.jslib` — JS interop 플러그인

메시지 타입을 추가/변경하면 위 4개 파일을 모두 동기화해야 함.

### Unity C# Namespaces

- `GLD.Core` — GridManager, Pathfinding (A*), Tower, Unit, TowerPlacer, UnitSpawner
- `GLD.Bridge` — WebBridge (React 통신)
- `GLD.Visual` — GridVisualizer, TowerVisualizer (도형 기반 렌더링)
- `GLD.Editor` — SceneSetup (에디터 자동화)

### Web-Shell

- **상태관리:** Zustand (gameStore — screen: 'lobby'|'game', unityLoaded)
- **UI:** Inline styles + `styles/tokens.ts` 컬러 팔레트. Press Start 2P 픽셀 폰트.
- **Unity 로딩:** `UnityCanvas.tsx`가 `/unity-build/Build/`에서 WebGL 빌드 로드
- **디버그:** `window.debugSendToUnity(type, payload)` 로 브라우저 콘솔에서 테스트 가능

### Game Constants

- 그리드: 20x20, 타일 32px, 스폰(0,10), 출구(19,10)
- 타워: 4 기본(laser, plasma, emp, shield) + 5 합성
- 유닛: 5종(scout_drone, battle_robot, heavy_walker, stealth_drone, titan)
- 상수 정의: `shared/src/constants/`

## Unity WebGL Build

Unity 빌드 산출물은 `packages/web-shell/public/unity-build/`에 배치 (gitignored). 빌드는 Unity Editor에서 수동으로 수행.

## Phase Roadmap

- **Phase 1** (현재): 프로토타입 — 그리드, 타워, 유닛, 브릿지
- Phase 2: 네트워킹 (WebSocket, 실시간 동기화)
- Phase 3: 토스 연동 (인증, 결제)
- Phase 4: 게임 완성 (밸런싱, 매치메이킹)
