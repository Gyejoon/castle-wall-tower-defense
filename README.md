# 팔라스 개인랜덤타워디펜스 (Palace 개랜타디)

1:1 개인 랜덤 타워디펜스 게임. 랜덤 타워 구매 + 합성으로 강화하며 20웨이브를 버텨라. Phaser 3 + React 프론트엔드를 bun 모노레포로 구성.

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

### 타워 (18종, 5티어)

| 티어 | 이름 예시 | 특수효과 |
|------|----------|---------|
| Base (T1) | 궁수 탑, 투석기, 서리 마탑, 성기사 제단 | 단일공격, Splash, Slow, Boost |
| Rare (T2) | 쌍궁 탑, 눈보라 탑, 공성 대포, 수호 탑, 빙하 제단 | 강화된 기본 효과 |
| Heroic (T3) | 화염 궁수, 지진 투석기, 서리 폭풍 등 | DoT, 체인, 광역 |
| Legendary (T4) | 용의 숨결, 천둥 망치 등 | 강력한 특수 효과 |
| God (T5) | 세계수의 가호, 천상의 심판 등 | 궁극기급 효과 |

랜덤 구매 → 동일 타워 2개 합성 → 다음 티어 랜덤 획득

### 유닛 (5종)

| ID | 이름 | HP | 특징 |
|----|------|-----|------|
| scout_drone | 고블린 정찰병 | 30 | 빠르고 약함 |
| battle_robot | 오크 전사 | 80 | 균형 스탯 |
| heavy_walker | 돌 트롤 | 200 | 느리고 단단함 |
| stealth_drone | 그림자 암살자 | 50 | 은신 능력 |
| titan | 고대 드래곤 | 500 | 보스, 재생 |

### 게임 플로우

- **20웨이브 생존**: 빌드 페이즈 → 전투 페이즈 반복
- **랜덤 타워 구매**: 골드로 랜덤 타워 획득
- **타워 합성**: 동일 타워 2개 → 다음 티어 랜덤 타워
- **킬 트랜스퍼**: 잡은 유닛을 상대 필드에 50% HP로 전송
- **타워 판매**: 빌드 페이즈 중 70% 환불
- **AI 대전**: AI 상대와 1:1 대전

### 그리드

- 12×8, 타일 32px
- 스폰: (0, 4)
- 출구: (11, 4)
- 배경: 자연 잔디 체커보드, 흙길 경로

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | 프로토타입 — 그리드, 타워, 유닛, 20웨이브, AI 대전, 모바일, 중세 테마 | **Complete** |
| 1.5 | 프로덕션 준비 — PWA, CI/CD, 에셋 파이프라인, 코드 품질 | In Progress |
| 2 | 네트워킹 — WebSocket, 실시간 동기화 | Planned |
| 3 | 토스 연동 — 인증, 결제 | Planned |
| 4 | 게임 완성 — 밸런싱, 매치메이킹 | Planned |

## License

[MIT](LICENSE)
