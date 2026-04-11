# AGENTS.md

AI 코딩 에이전트가 이 저장소에서 안전하게 작업하기 위한 실무 가이드.

## Cross-Agent Operating Rules

이 섹션은 `claude-token-efficient`의 핵심 규칙을 이 저장소의 `AGENTS.md`에 맞게 옮긴 공용 운영 규칙이다.
Claude Code, Codex, 그 외 `AGENTS.md`/`CLAUDE.md`를 읽는 에이전트 모두에 동일하게 적용한다.

### 작업 전

- 관련 파일을 먼저 읽고 수정할 것. 블라인드 수정 금지.
- 요구사항과 영향 범위를 이해한 뒤에만 변경할 것.
- 이미 확인한 파일은 변경이나 새 맥락이 없으면 불필요하게 다시 읽지 말 것.

### 작업 중

- 가장 단순하게 동작하는 해법을 우선할 것. 과한 추상화 금지.
- 전체 파일 재작성보다 필요한 부분만 수정하는 편집을 우선할 것.
- 요청 범위를 벗어난 제안, 기능 추가, 리팩터링은 하지 말 것.
- 확실하지 않으면 추측하지 말고 모른다고 말할 것.
- 실패한 테스트, 빌드, 린트는 넘기지 말고 원인을 확인한 뒤 진행할 것.

### 완료 전

- 완료 주장 전에 관련 검증 명령을 직접 다시 실행할 것.
- 테스트나 빌드가 필요한 변경은 통과 증거 없이 완료로 보고하지 말 것.
- 수정 사항이 요구사항을 실제로 충족하는지 마지막으로 다시 확인할 것.

### 출력 규칙

- 응답 첫 줄부터 본론만 말할 것. 과한 인사, 맞장구, 마무리용 문구 금지.
- 사용자 질문을 불필요하게 되풀이하지 말 것.
- 설명은 짧고 직접적으로 작성할 것. 요청하지 않은 대안 제시는 하지 말 것.
- 코드, 명령, 로그, 식별자는 복사 가능한 평문 형식을 유지할 것.
- 한국어 응답은 유지하되, 코드와 기계가 읽는 텍스트는 ASCII-safe 표기를 우선할 것.

### 우선순위

- 사용자의 직접 지시가 항상 이 문서보다 우선한다.
- 저장소의 구체 규칙이 공용 규칙보다 우선한다.

## 프로젝트 스냅샷

Palace 개랜타디 — 모바일 우선 PVE 타워디펜스 버티컬 슬라이스. 10웨이브 솔로 생존.

**구현 완료:** 8×18 세로 그리드, 타워 18종(5티어) 배치·판매(50% 에너지 환급), 적 9종(W1: scout_drone/battle_robot/heavy_walker/stealth_drone/dragon(비행) · W2: flame_imp/lava_golem · W3: arcane_mage/mana_shield) + 보스 3종(orc_warlord/forge_master/corrupted_archmage), A* 경로탐색, 에너지 기반 덱 경제(시작 40, 웨이브 클리어 +5, 킬 보상 없음), 이벤트 기반 10웨이브 진행(WaveSlotKind: normal | boss), 3월드×8스테이지(24스테이지), 웨이브 스케일링(HP 1.0x~3.5x), 월드별 난이도 배수(1.0x/1.3x/1.6x), 물리 충돌 비활성화(유닛 서로 통과), 보스 리크(boss-kind 웨이브에서 경로 끝 도달 시 즉시 패배), 월드맵·스테이지 선택, 덱 편집, 타워 판매 패널, 나가기 모달(일시정지), 보스 HP바, 결과 오버레이(스탯 그리드), 2배속 토글(첫 클리어 후 해금), iOS AudioContext 자동 해금, 모바일 세로형 셸, 절차적 픽셀 아트 에셋 파이프라인, Sentry 에러 추적.

**아직 구현되지 않은 것:** 속성 시스템 전투 적용, 메타 성장(저장/타워 강화·승급 LV.50 캡/컬렉션 영속화), 가챠·미션·튜토리얼. 로비의 프로필·컬렉션 데이터는 현재 목(mock) 데이터다.

## Local Skills

- Claude Code용 수렴 리뷰 스킬: `.claude/skills/ralreview/SKILL.md`
- Codex용 수렴 리뷰 스킬: `.agents/skills/ralreview/SKILL.md`
- 런타임 안정성 체크 기준: `.claude/skills/phaser-best-practices/SKILL.md`

## 자동 학습 룰

반복 실수에서 자동 생성된 프로젝트 룰이 있다. 작업 전 확인 필수:
→ `.claude/learned-rules.md`

## 워크스페이스 맵

| 패키지 | 역할 |
|---------|------|
| `packages/shared/` (`@gld/shared`) | TypeScript 타입, 상수, 이벤트 계약. 다른 패키지가 의존. |
| `packages/phaser-game/` (`@gld/phaser-game`) | Phaser 3 게임 엔진. 그리드, 타워, 유닛, AI, 렌더링. |
| `packages/web-shell/` | React 18 SPA. Phaser 임베드, 로비(3탭), 설정, Zustand 상태 관리. |
| `scripts/generate-assets/` | @napi-rs/canvas 기반 절차적 픽셀 아트 생성 파이프라인. |

## 핵심 런타임 흐름

### TypedEventBus

React↔Phaser 양방향 typed 이벤트 통신.

```
React → EventBus.emit('request-place-tower', { col, row, towerDefId })
     → Game scene 실행
     → EventBus.emit('tower-placed', { col, row, towerId, success, reason? })
     → React useEffect → Zustand store 업데이트
```

| 방향 | 접두사 | 예시 |
|------|--------|------|
| React → Game | `request-*` | `request-place-tower`, `request-sell-tower`, `request-select-tower`, `request-set-speed` |
| Game → React | 서술형 | `tower-placed`, `tower-sold`, `wave-preview` |

이벤트 타입을 추가/변경하면 `shared/src/types/events.ts`와 `phaser-game/src/EventBus.ts`의 `GameEventMap`을 반드시 함께 업데이트해야 한다.

### runStatus 전이

```
lobby → building → running → victory | defeat → lobby
```

`gameStore.ts`의 `runStatus`가 전체 런 상태를 관리. `runId` 변경 시 Phaser 인스턴스가 새로 마운트된다. PVE에서는 전투 중 자유 배치 허용 (빌드/전투 구분 없음).

### 타워 배치 피드백

게임 종료 후 배치 시도는 `PlacementFailureReason`(`combat_phase | insufficient_energy | occupied | blocked_path | out_of_bounds`)과 함께 거부된다. 전투 중에는 항상 배치 가능.

### 에너지 경제

에너지가 초당 1씩 자동 축적된다 (최대 100). 시작 에너지 40. 타워 배치 에너지: 공격형 10 / CC형 20. 웨이브 클리어 시 +5. 킬 보상 없음. 마지막 보스 웨이브에서는 리젠과 클리어 보상 비활성화.

## 하이시그널 파일

에이전트가 가장 먼저 확인해야 할 파일들:

| 파일 | 역할 |
|------|------|
| `packages/shared/src/types/events.ts` | 이벤트 타입 계약 |
| `packages/phaser-game/src/EventBus.ts` | typed EventEmitter (GameEventMap) |
| `packages/phaser-game/src/scenes/Game.ts` | 메인 게임 씬, 시스템 초기화 |
| `packages/web-shell/src/stores/gameStore.ts` | Zustand 상태 — runStatus, gold, lives, wave 등 |
| `packages/web-shell/src/game/PhaserGame.tsx` | React 측 Phaser 마운트 |
| `packages/web-shell/src/App.tsx` | 상태 기반 라우팅 (lobby ↔ game) |
| `packages/web-shell/src/pages/LobbyPage.tsx` | 3탭 로비 (home, collection, settings) |
| `packages/web-shell/src/pages/WorldMapPage.tsx` | 월드맵 — 3맵 진행도·잠금 해제 |
| `packages/web-shell/src/pages/StageDetailPage.tsx` | 스테이지 상세 — 난이도·보상·덱 편집 |
| `packages/web-shell/src/pages/GamePage.tsx` | 게임 UI, HUD, 타워 판매 패널, 나가기 모달 |
| `packages/web-shell/src/styles/tokens.ts` | 중세 색상 팔레트 토큰 |

게임 시스템 파일 (`packages/phaser-game/src/systems/`):

| 파일 | 역할 |
|------|------|
| `GridManager.ts` | 8×18 세로 그리드, 타일 점유, 좌표 변환 |
| `PathfindingSystem.ts` | A* 경로탐색, 패스 캐싱 |
| `TowerSystem.ts` | 타워 배치·판매, 범위 공격, Slow/Splash/Boost |
| `DeckSystem.ts` | 4타워 덱 관리, 카드 선택·배치 |
| `UnitSystem.ts` | 유닛 스폰, 경로 이동, HP/아머/슬로우 |
| `WaveSystem.ts` | 10웨이브, 이벤트 기반 진행 (prep→spawning→combat→waiting→next), 보스 경고 |
| `EnergySystem.ts` | 에너지 축적 (1/sec), 타워 배치 비용 관리 |
| `DamageNumberSystem.ts` | 부유 데미지 넘버 오브젝트 풀 |
| `GimmickSystem.ts` | 월드별 고유 기믹 (용광로 폭발, 마력 폭주 등) |
| `TutorialSystem.ts` | 첫 세션 튜토리얼 오버레이 |

## 커맨드

```bash
bun install                                        # 의존성 설치
bun dev:web                                        # Vite 개발 서버 (port 3000)
bun build:web                                      # 프로덕션 빌드
bun test                                           # 전체 테스트
bun test:shared                                    # @gld/shared 테스트
bun test:phaser                                    # @gld/phaser-game 테스트
bun test:web                                       # web-shell 테스트
bun lint                                           # 전체 lint
bun lint:check                                     # Biome check
bun generate:assets                                # 에셋 전체 생성
```

Node >= 22, bun 필수. 단일 테스트: `cd packages/<pkg> && bunx vitest run tests/<file>.test.ts`

## 편집 가이드

- **shared 이벤트/타입 변경 시** Phaser(`EventBus.ts`, `GameEventMap`)와 React(`gameStore`, UI 컴포넌트) 양쪽 소비자를 반드시 동기화할 것.
- **로비 프로필/컬렉션 데이터는 현재 mock.** 이 영역을 수정할 때 실제 API가 없음을 인지할 것.
- **에셋은 커밋된 산출물이다.** `packages/web-shell/public/assets/` 전체가 git에 트래킹되며 CI/Vercel 배포는 커밋된 파일을 그대로 사용한다. 에셋을 변경하려면 `scripts/generate-assets/`의 생성 스크립트를 수정한 뒤 `bun generate:assets`를 로컬에서 실행하고 산출물을 함께 커밋해야 한다. 생성 스크립트만 수정하고 산출물을 커밋하지 않으면 프로덕션에 반영되지 않는다.
- **`bun generate:assets`는 유저가 명시적으로 요청할 때만 실행한다.** ComfyUI 기반 에셋(stage-thumb 등)은 AI 생성 고품질 이미지인데, ComfyUI가 없는 환경에서 실행하면 플레이스홀더로 대체되어 원본이 소실된다. 에셋 확인이 필요하면 파일을 직접 읽거나 git log로 확인할 것.
- **Phaser 씬 클린업 순서:** EventBus off → system destroy. shutdown 시 역순 정리 필수.
- **runStatus 전이를 임의로 건너뛰지 말 것.** `lobby → building → running → victory|defeat` 순서를 따른다.

활성 스펙과 플랜은 `docs/superpowers/` 아래에서 관리된다.
`docs/superpowers/specs/`는 브레인스토밍/설계 단계의 드래프트이며, 구현 완료 후 `docs/game-spec/`에 반영해야 한다.
**"스펙 문서"는 `docs/game-spec/`를 의미한다.** `docs/superpowers/specs/`는 설계 스펙(design spec)이다.

## 게임 스펙 문서 (`docs/game-spec/`)

게임의 모든 설계 결정은 `docs/game-spec/`에서 관리한다.

| 파일 | 역할 |
|------|------|
| `01-GDD.md` | 게임 정의, 코어 루프, 시스템, 콘텐츠 플랜, UI |
| `02-balance-sheet.md` | 화폐 경제, 가챠 확률, 미션, 타워/적 수치 |
| `03-business-model.md` | BM 구조, 상점, 광고, LiveOps KPI |
| `04-data-structure.md` | Save Data 스키마, 텔레메트리 이벤트 |
| `05-operations.md` | 운영 스택, 모니터링, LiveOps 체계 |
| `06-milestone.md` | Phase 로드맵, 출시 전/후 단기/중기/장기 계획 |
| `07-asset-definition.md` | 에셋 사양, 인벤토리, 파이프라인 |
| `08-architecture.md` | 패키지 구조, 시스템 의존성, EventBus, 상태 관리, 렌더링 depth |

### 문서 운용 원칙

- **모든 구현 작업은 `docs/game-spec/`를 기준으로 시작한다.**
- 게임 변경(수치, 시스템, BM 등)이 생기면 **코드보다 문서를 먼저 업데이트**한다.
- 구현 후 문서가 코드와 다르면 문서를 교정한다.

### 이슈 처리 워크플로우

사용자가 이슈를 던지면 아래 순서로 처리한다.

```
1. 컨텍스트 검토
   - 관련 game-spec 문서 읽기 (설계 의도·현행 수치 파악)
   - 관련 코드 읽기 (현재 구현 상태 파악)
   - 필요 시 의사결정 검토 (설계 충돌, 밸런스 영향, 범위 등) → 사용자와 합의

2. 플랜 수립
   - 검토 결과를 기반으로 구현 계획 작성

3. 구현
   - 플랜대로 코드 변경

4. 게임 스펙 업데이트
   - 변경된 내용에 해당하는 game-spec 파일을 업데이트한다
   - 수치 변경 → 02-balance-sheet.md
   - 시스템/UI 변경 → 01-GDD.md
   - BM 변경 → 03-business-model.md
   - 저장 구조 변경 → 04-data-structure.md
   - 에셋 변경 → 07-asset-definition.md
   - 일정/범위 변경 → 06-milestone.md
```

**의사결정 검토가 필요한 경우**: 이슈가 game-spec 설계와 충돌하거나, 수치 변경이 밸런스에 영향을 주거나, 범위가 불명확할 때 — 구현 전에 사용자와 먼저 합의한다.
