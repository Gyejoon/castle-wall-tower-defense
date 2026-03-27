# Grid Line Defense PvP

20x20 그리드 기반 타워 디펜스 PvP 게임. Unity 6 WebGL + React 프론트엔드를 bun 모노레포로 구성.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Game Engine:** Unity 6 (WebGL)
- **State Management:** Zustand
- **Package Manager:** bun (monorepo workspaces)
- **Testing:** Vitest + jsdom

## Architecture

```
packages/
  shared/       — @gld/shared: TypeScript 타입 + 게임 상수
  web-shell/    — React SPA. Unity WebGL 임베드
  unity-game/   — Unity 6 C# 프로젝트
```

Unity와 React는 양방향 JSON 메시지 브릿지로 통신합니다. 메시지 계약은 `packages/shared/src/types/bridge.ts`에 정의되어 있습니다.

## Prerequisites

- Node.js >= 22
- [bun](https://bun.sh/)
- Unity 6 (WebGL 빌드용)

## Getting Started

```bash
# 의존성 설치
bun install

# 개발 서버 실행 (port 3000)
bun dev:web

# 프로덕션 빌드
bun build:web
```

## Testing

```bash
# 전체 테스트
bun test

# 패키지별 테스트
bun test:shared    # @gld/shared
bun test:web       # web-shell
```

Unity 테스트는 Unity Editor Test Runner (EditMode)에서 실행합니다.

## Unity WebGL Build

Unity 빌드 산출물은 `packages/web-shell/public/unity-build/`에 배치됩니다 (gitignored). Unity Editor에서 수동으로 빌드합니다.

## Game Design

- **Grid:** 20x20, 타일 32px
- **Towers:** 4 기본 (laser, plasma, emp, shield) + 5 합성
- **Units:** 5종 (scout_drone, battle_robot, heavy_walker, stealth_drone, titan)
- **Spawn:** (0, 10) / **Exit:** (19, 10)

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Prototype — 그리드, 타워, 유닛, 브릿지 | **In Progress** |
| 2 | Networking — WebSocket, 실시간 동기화 | Planned |
| 3 | Toss Integration — 인증, 결제 | Planned |
| 4 | Polish — 밸런싱, 매치메이킹 | Planned |

## License

[MIT](LICENSE)
