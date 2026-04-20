# Grid Line Defense — 랜덤 합성 타워 디펜스

모바일 우선 타워 디펜스. 소환 → 합성 → 보스 → 로그라이크 → 메타 강화의 단일 코어 루프. Phaser 3 + React 프론트엔드, bun 모노레포.

## 현재 빌드에서 할 수 있는 것

- **랜덤 소환 + 합성** — 에너지로 타워 소환. 같은 family·tier 타워끼리 합성해 상위 tier로 승급 (`MERGE_CHAIN`). 19종 = 4 family × 4 tier + tier-5 하이브리드 2 + tier-6 궁극기 1.
- **인게임 가챠** — T2 소환 ⚡40 (60%), T3 소환 ⚡80 (20%), T4 소환 ⚡160 (5%). 로그라이크 카드 `tier_odds_up`로 +50%p까지 스택.
- **보스 웨이브 로그라이크** — 보스 웨이브 클리어 시 6종(dmg_up / crit_dmg / energy_harvest / energy_regen / effect_amp / tier_odds_up) 중 3장을 뽑아 1장 선택. 광고 리롤 1회.
- **에너지 v3** — 초당 +1, 킬 +1, 보스 처치 +20, fast-clear +20. CAP 200.
- **9×18 맵** — 중앙 레인 프리미엄 존 + 장애물 9개(나무/바위/덤불). 50 wave endless.
- **HUD** — 하단 액션바(Summon + 가챠 3종 + Menu), 상단 정보 배지, 타워 탭 시 `TowerActionSheet`(merge/move/sell), `SummonRevealOverlay`, `UpgradePickOverlay`, `PauseModal`.
- **CC 가드레일** — 보스 ccResistance 0.5~0.7, MIN_MOVE_SPEED 하한, 2초 스턴 면역 윈도우.
- **메타 루프 (shell)** — `metaProgressStore`로 영속화. `globalAtkPct`가 TowerSystem에 주입.
- **BM stub** — `AdService` 인터페이스 + `MockAdService`. 패배 시 "이어서 하기"(런당 1회).
- **배속 토글** — 1x / 2x / 3x 실시간 전환.
- **모바일 셸** — 430px 세로형 프레임, 데스크톱에서도 중앙 정렬.

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
- **단일 정식 모드** — 소환 / 합성 / 가챠 / 보스 / 로그라이크 / 메타 강화 루프. 시나리오(월드/스테이지/미션/덱)는 제거.
- **에너지 v3** — 초당 +1, 킬 +1, 보스 처치 +20, fast-clear +20. CAP 200. 웨이브 클리어 고정 보너스는 없다.
- **Save 마이그레이션** — v6→v7 (grade→tier, plasma/dragon_nest 제거), v7→v8 (시나리오 키 정리). 현재 v8.
- **디자인 토큰** — Tailwind v4 `@theme`. accent `#c8a04a`, panel `#2a2010`, border `#4a3a20`, danger `#c03020`, info `#4a7a9a`. `font-pixel` (Press Start 2P + Galmuri11).
- **에셋 파이프라인** — `scripts/generate-assets/`가 @napi-rs/canvas로 타일, 타워, 유닛, 투사체, VFX, UI 아이콘을 절차적으로 생성. 출력은 `packages/web-shell/public/assets/`.

## 로드맵

| 트랙 | 설명 | 상태 |
|------|------|------|
| R1 | 정식 모드 확정 — 소환/합성/가챠/보스/로그라이크/메타 shell + 4 안정화 픽스 (B1-B4) | **완료** |
| R1 | 메타 루프 본 구현 — `metaProgressStore` 영속화, `globalAtkPct` 주입 | **shell 완료** |
| R1 | BM stub — `AdService` + `MockAdService`, 이어서 하기 (1회/런) | **완료** |
| R2 | 타워 강화 UX 확장 / 메타 퍽 선택 UI / 맵 2~3종 / FTUE 튜토리얼 | 계획 |
| R3 | 실광고 SDK 연결, LiveOps, 서버 동기화, BM 본격화 | 계획 |

자세한 트랙 정의는 `docs/game-spec/06-milestone.md` 참조.

활성 스펙과 플랜은 `docs/superpowers/` 아래에서 관리된다.

## License

[MIT](LICENSE)
