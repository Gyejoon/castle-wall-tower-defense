# Palace 개랜타디 (팔라스 개인랜덤타워디펜스)

모바일 우선 1:1 랜덤 타워디펜스 버티컬 슬라이스. 랜덤 타워 구매, 동일 타워 합성, 킬 트랜스퍼로 AI 상대와 20웨이브 생존 대전을 벌인다. Phaser 3 + React 프론트엔드, bun 모노레포.

## 현재 빌드에서 할 수 있는 것

- **3탭 로비** — 홈(매칭 시작), 컬렉션, 설정
- **AI 배틀** — 빌드 페이즈에서 랜덤 타워 구매·배치·합성, 전투 페이즈에서 유닛 처치
- **랜덤 타워 구매 + 합성** — 50G로 랜덤 타워 획득, 동일 타워 2개를 다음 티어 랜덤으로 합성 (5티어까지)
- **드래그 합성** — 같은 타워를 드래그해서 합성
- **이모트** — 대전 중 이모트 전송
- **결과 오버레이** — 승리/패배 결과 + 재시작/로비 복귀
- **모바일 셸** — 430px 세로형 프레임, 데스크톱에서도 중앙 정렬

> 현재 상대는 AI 시뮬레이션이며, 실시간 네트워크 PvP는 아직 구현되지 않았다.

## Tech Stack

React 18 · Phaser 3 · Zustand · Vite · TypeScript · Bun workspaces · Vitest · Biome · Sentry · @napi-rs/canvas (절차적 픽셀 아트 에셋 생성)

## 모노레포 구조

```
packages/
  shared/           @gld/shared — TypeScript 타입, 상수, 이벤트 계약
  phaser-game/      @gld/phaser-game — Phaser 3 게임 엔진 (그리드, 타워, 유닛, AI)
  web-shell/        React SPA. Phaser 게임 임베드, 로비, 설정, 상태 관리

scripts/
  generate-assets/  @napi-rs/canvas 기반 절차적 픽셀 아트 생성 파이프라인
```

## 시작하기

Node.js >= 22과 [bun](https://bun.sh/)이 필요하다.

```bash
bun install                                        # 의존성 설치
bun run scripts/generate-assets/generate-all.ts    # 에셋 생성 (최초 1회)
bun dev:web                                        # 개발 서버 (port 3000)
```

## 사용 가능한 커맨드

| 커맨드 | 설명 |
|--------|------|
| `bun dev:web` | Vite 개발 서버 (port 3000) |
| `bun build:web` | TypeScript + Vite 프로덕션 빌드 |
| `bun test` | 전체 테스트 실행 |
| `bun test:shared` | @gld/shared 테스트 |
| `bun test:phaser` | @gld/phaser-game 테스트 |
| `bun test:web` | web-shell 테스트 |
| `bun lint` | 전체 lint |
| `bun lint:check` | Biome check |
| `bun generate:assets` | 픽셀 아트 에셋 전체 생성 |

## 게임플레이 & 아키텍처 하이라이트

- **TypedEventBus** — React↔Phaser 양방향 typed 이벤트 통신. `request-*` (React→Game), 서술형 (Game→React).
- **runStatus 흐름** — `lobby → building → combat → victory | defeat`. Zustand 스토어가 전체 런 상태를 관리.
- **AI 상대 루프** — `AIOpponent` 시스템이 타워 배치, 유닛 이동, 킬 트랜스퍼를 시뮬레이션.
- **에셋 파이프라인** — `scripts/generate-assets/`가 @napi-rs/canvas로 타일, 타워, 유닛, 투사체, VFX, UI 아이콘을 절차적으로 생성. 출력은 `packages/web-shell/public/assets/`.

## 로드맵

| Phase | 설명 | 상태 |
|-------|------|------|
| 1 | 프로토타입 — 그리드, 타워, 유닛, 20웨이브, AI 대전, 모바일, 중세 테마 | **완료** |
| 1.5 | 프로덕션 준비 — CI/CD, 에셋 파이프라인, 코드 품질 | 진행 중 |
| 2 | 네트워킹 — WebSocket 실시간 동기화 | 계획 |
| 3 | 결제 연동 — 인증, 토스 결제 | 계획 |
| 4 | 게임 완성 — 밸런싱, 매치메이킹 | 계획 |

활성 스펙과 플랜은 `docs/superpowers/` 아래에서 관리된다.

## License

[MIT](LICENSE)
