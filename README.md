# Palace 개랜타디 (팔라스 개인랜덤타워디펜스)

모바일 우선 PVE 타워디펜스 버티컬 슬라이스. 에너지 기반 4타워 덱 배치로 10웨이브 솔로 생존을 벌인다. Phaser 3 + React 프론트엔드, bun 모노레포.

## 현재 빌드에서 할 수 있는 것

- **월드맵 + 스테이지 선택** — 3월드×8스테이지(24스테이지) 진행도 기반 잠금 해제, 스테이지별 난이도·보상 표시
- **덱 편집** — 출전 4타워 덱 관리, 보유 타워 컬렉션 확인
- **PVE 생존** — 에너지로 4타워 덱에서 선택 배치하며 10웨이브 방어
- **에너지 경제** — 시작 에너지 40, 초당 1 축적, 공격형 배치 10 / CC형 20 소비. 웨이브 클리어 +5. 킬 보상 없음
- **타워 판매** — 배치된 타워 탭 → 판매 패널 → 에너지 50% 환급
- **웨이브 스케일링** — 스테이지별 웨이브 구성(STAGE_WAVES), HP 1.0x~3.5x 자동 스케일링
- **월드별 난이도** — forest_gate 1.0x, lava_fortress 1.3x, storm_citadel 1.6x HP 배수
- **보스 리크** — boss-kind 웨이브에서 보스가 경로 끝 도달 시 즉시 패배
- **나가기 모달** — 전투 중 나가기 → 확인 모달, 게임 일시정지
- **결과 화면** — 픽셀 배너 + 웨이브/타워/생존시간/골드/XP 스탯 그리드 + 재시작/로비
- **배속 토글** — 1x/2x/3x 실시간 전환 (맵 첫 클리어 후 해금)
- **보스 HP바** — 게임 캔버스 위 HUD 영역에 표시
- **모바일 셸** — 430px 세로형 프레임, 데스크톱에서도 중앙 정렬

### Phase A (LAB 모드)

- **랜덤 소환 + 합성** — 에너지로 랜덤 타워 소환, 동일 타워 탭하여 합성 등급업
- **phase_a_long 맵** — 8×24 U-turn 경로, 50 wave endless
- **킬 에너지 경제** — 적 처치 시 에너지 획득 (레거시 맵의 시간 기반 리젠과 다름)
- **PhaseAHud** — 소환 버튼, 합성 안내, 웨이브 타이머
- **로비 [LAB] 버튼** — Phase A 전용 진입점
- **로그라이트 강화 선택** — 10 웨이브마다 3장 중 1장 선택
- **3배속 지원** — Phase A에서 1x/2x/3x 배속 전환

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
bun dev:web                                        # 개발 서버 (port 3000)
```

에셋은 `packages/web-shell/public/assets/`에 커밋되어 있어 별도 생성 없이 바로 실행된다. 에셋 자체를 수정하려면 아래 `bun generate:assets`로 재생성하고 산출물을 함께 커밋한다.

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
| `bun generate:assets` | 픽셀 아트 에셋 전체 재생성 (생성 스크립트 변경 시에만 필요, 산출물은 git에 함께 커밋) |

## 게임플레이 & 아키텍처 하이라이트

- **TypedEventBus** — React↔Phaser 양방향 typed 이벤트 통신. `request-*` (React→Game), 서술형 (Game→React).
- **runStatus 흐름** — `lobby → building → running → victory | defeat`. Zustand 스토어가 전체 런 상태를 관리.
- **이벤트 기반 웨이브** — 적 전멸 시 다음 웨이브 자동 시작. 보스 웨이브(10) 전 경고 연출. 30초 타이머(마지막 웨이브 면제).
- **에너지 경제** — 시작 40, 초당 1 축적 (최대 100). 공격형 배치 10 / CC형 20 소비. 웨이브 클리어 +5. 킬 보상 없음.
- **에셋 파이프라인** — `scripts/generate-assets/`가 @napi-rs/canvas로 타일, 타워, 유닛, 투사체, VFX, UI 아이콘을 절차적으로 생성. 출력은 `packages/web-shell/public/assets/`.

## 로드맵

| Phase | 설명 | 상태 |
|-------|------|------|
| 0 | PVE 기반 — 10웨이브, 에너지 경제, 4타워 덱 배치 | **완료** |
| 0+ | 전투 확장 — 타워 판매, 웨이브 스케일링, 보스 리크, 나가기 모달, 월드별 난이도, 30초 타이머 | **완료** |
| 0+ | 월드맵/스테이지 — 3월드×8스테이지(24스테이지) 선택, 스테이지 상세, 덱 편집 | **완료** |
| 1 | 핵심 전투 — 속성 시스템 전투 적용 (플레이테스트 후 결정) | 계획 |
| 2 | 메타 성장 — metaStore 영속화, 타워 강화/등급별 승급(normal 20/rare 30/unique 50/epic 50), 컬렉션 | **완료** |
| 3 | 가챠 시스템 — prep phase 카드 선택 | **완료** |
| 4 | 참여 시스템 — 튜토리얼, 미션 | 계획 |

활성 스펙과 플랜은 `docs/superpowers/` 아래에서 관리된다.

## License

[MIT](LICENSE)
