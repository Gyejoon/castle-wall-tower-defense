# 왕국의 방어선 (Grid Line Defense PvP)

20x20 그리드 기반 중세 판타지 타워 디펜스 PvP 게임. Phaser 3 + React 프론트엔드를 bun 모노레포로 구성.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Game Engine:** Phaser 3 (Canvas/WebGL)
- **State Management:** Zustand
- **Package Manager:** bun (monorepo workspaces)
- **Testing:** Vitest
- **Asset Pipeline:** @napi-rs/canvas (절차적 픽셀 아트 생성)

## Architecture

```
packages/
  shared/         — @gld/shared: TypeScript 타입 + 게임 상수
  phaser-game/    — @gld/phaser-game: Phaser 3 게임 엔진
  web-shell/      — React SPA. Phaser 게임 임베드
scripts/
  generate-assets/ — 픽셀 아트 에셋 생성 스크립트
```

React와 Phaser는 같은 JS 런타임에서 TypedEventBus를 통해 양방향 통신합니다.

## Prerequisites

- Node.js >= 22
- [bun](https://bun.sh/)

## Getting Started

```bash
# 의존성 설치
bun install

# 에셋 생성 (최초 1회)
bun run scripts/generate-assets/generate-all.ts

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
bun test:shared       # @gld/shared
bun test:web          # web-shell
```

## Game Design

### 세계관

중세 판타지 — 왕국을 향해 밀려오는 마물의 군대를 타워로 막아내는 전략 게임.

### 타워 (4 기본 + 5 합성)

| ID | 이름 | 비용 | 특수효과 |
|----|------|------|---------|
| laser | 궁수 탑 | 50G | 빠른 단일 공격 |
| plasma | 투석기 | 80G | Splash (범위 50% 피해) |
| emp | 서리 마탑 | 60G | Slow 30% (2초) |
| shield | 성기사 제단 | 70G | 인접 타워 +20% 부스트 |

합성 타워: 쌍궁 탑, 눈보라 탑, 공성 대포, 수호 탑, 빙하 제단

### 유닛 (5종)

| ID | 이름 | HP | 특징 |
|----|------|-----|------|
| scout_drone | 고블린 정찰병 | 30 | 빠르고 약함 |
| battle_robot | 오크 전사 | 80 | 균형 스탯 |
| heavy_walker | 돌 트롤 | 200 | 느리고 단단함 |
| stealth_drone | 그림자 암살자 | 50 | 은신 능력 |
| titan | 고대 드래곤 | 500 | 보스, 재생 |

### 게임 플로우

- **10웨이브 생존**: 빌드 페이즈 → 전투 페이즈 반복
- **타워 판매**: 빌드 페이즈 중 70% 환불
- **경로 시각화**: A* 경로를 흙길 색상으로 표시
- **웨이브 미리보기**: 다음 웨이브 구성을 사전 확인
- **Ghost Battle**: 기록된 상대와 비동기 PvP 대전

### 그리드

- 20x20, 타일 32px
- 스폰: (0, 10) — 동굴 입구
- 출구: (19, 10) — 중세 성문
- 배경: 자연 잔디 체커보드, 흙길 경로

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | 프로토타입 — 그리드, 타워, 유닛, 웨이브, Ghost Battle | **Complete** |
| 2 | 네트워킹 — WebSocket, 실시간 동기화 | Planned |
| 3 | 토스 연동 — 인증, 결제 | Planned |
| 4 | 게임 완성 — 밸런싱, 매치메이킹 | Planned |

## License

[MIT](LICENSE)
