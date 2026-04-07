# Palace 개랜타디 (팔라스 개인랜덤타워디펜스)

모바일 우선 PVE 타워디펜스 버티컬 슬라이스. 에너지 기반 랜덤 타워 롤과 합성으로 10웨이브 솔로 생존을 벌인다. Phaser 3 + React 프론트엔드, bun 모노레포.

## 현재 빌드에서 할 수 있는 것

- **3탭 로비** — 홈(즉시 시작), 컬렉션, 설정
- **PVE 생존** — 에너지로 랜덤 타워 롤, 배치, 합성하며 10웨이브 방어
- **에너지 경제** — 시작 에너지 10, 초당 1 축적, 타워 롤에 10 소비. 일반 킬 +2, 보스 킬 +5
- **랜덤 타워 + 합성** — 랜덤 타워 획득, 동일 타워 2개를 다음 티어 랜덤으로 합성 (5티어까지)
- **드래그 합성** — 같은 타워를 드래그해서 합성
- **결과 화면** — 픽셀 배너 + 웨이브/타워/생존시간/골드/XP 스탯 그리드 + 재시작/로비
- **3개 맵** — 숲(1x), 용암(2x), 폭풍(3x) 골드/XP 보상 배율. 유닛 HP 5배 난이도
- **2배속 토글** — 맵 첫 클리어 후 해금, 1x/2x 실시간 전환
- **보스 HP바** — 게임 캔버스 위 HUD 영역에 표시
- **모바일 셸** — 430px 세로형 프레임, 데스크톱에서도 중앙 정렬

## Tech Stack

React 18 · Phaser 3 · Zustand · Vite · TypeScript · Bun workspaces · Vitest · Biome · Sentry · @napi-rs/canvas (절차적 픽셀 아트 에셋 생성)

## 모노레포 구조

```
packages/
  shared/           @gld/shared — TypeScript 타입, 상수, 이벤트 계약
  phaser-game/      @gld/phaser-game — Phaser 3 게임 엔진 (그리드, 타워, 유닛, 웨이브)
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
- **runStatus 흐름** — `lobby → building → running → victory | defeat`. Zustand 스토어가 전체 런 상태를 관리.
- **이벤트 기반 웨이브** — 적 전멸 시 다음 웨이브 자동 시작. 보스 웨이브(5, 10) 전 경고 연출.
- **에너지 경제** — 시작 10, 초당 1 축적 (최대 100). 타워 롤에 10 소비. 일반 킬 +2, 보스 킬 +5.
- **에셋 파이프라인** — `scripts/generate-assets/`가 @napi-rs/canvas로 타일, 타워, 유닛, 투사체, VFX, UI 아이콘을 절차적으로 생성. 출력은 `packages/web-shell/public/assets/`.

## 로드맵

| Phase | 설명 | 상태 |
|-------|------|------|
| 0 | PVE 기반 — 10웨이브, 에너지 경제, 랜덤 롤 + 합성 | **완료** |
| 1 | 핵심 전투 — 보스 페이즈, 결과 화면, 속성 시스템 (플레이테스트 후 결정) | 계획 |
| 2 | 메타 성장 — 저장, 타워 강화/승급, 컬렉션 | 계획 |
| 3 | 콘텐츠 확장 — 멀티 스테이지, 다중 경로 | 계획 |
| 4 | 참여 시스템 — 튜토리얼, 가챠, 미션 | 계획 |

활성 스펙과 플랜은 `docs/superpowers/` 아래에서 관리된다.

## License

[MIT](LICENSE)
