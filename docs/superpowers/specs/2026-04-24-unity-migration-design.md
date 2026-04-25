# Unity 2D WebGL 마이그레이션 — Grid Line Defense

> **Status:** v2 (subagent 통합) — 사용자 리뷰 완료, Phase 0 플랜 작성됨
> **Created:** 2026-04-24
> **Repo:** castle-wall-tower-defense / endurable-hurricane
> **Phase 0 implementation plan:** [`docs/superpowers/plans/2026-04-24-unity-phase-0-bootstrap.md`](../plans/2026-04-24-unity-phase-0-bootstrap.md)
> **Sync:** origin/main 머지 완료 (9 subagent 임포트 포함, FF)

---

## Context

### 왜 이 변경을 하는가

현재 Grid Line Defense는 React 18 + Phaser 3 이중 런타임이다. TypedEventBus(40+ 이벤트)가 두 런타임을 양방향으로 잇고, Zustand가 React 측 상태를, Phaser 9개 시스템이 게임 측 상태를 나눠 쥔다. 기능은 이미 정식 모드(소환→합성→보스→로그라이크→메타) 전체를 실동작하지만 구조적 부담이 쌓였다.

- **성능 상한** (동기 A): Canvas 2D 렌더 기반. iOS Safari·저사양 Android에서 3× speed + 다중 유닛 + 파티클 + VFX가 겹치면 frame drop. WebGL2가 켜져 있어도 draw call 관리·스프라이트 배칭을 직접 해야 한다.
- **네이티브 경로 부재** (동기 B): R3 로드맵에 LiveOps·실광고 SDK가 있고, 향후 iOS/Android 네이티브 배포를 열어두려면 Phaser는 본질적으로 웹 전용.
- **생태계 접근성 제한** (동기 C): 셰이더·파티클·오디오 믹싱·타일맵/애니메이터/타임라인을 전부 직접 구현. Unity 생태계의 2D Lights, SpriteShape, TMP SDF, Addressables, Cinemachine, DOTween 등을 활용 불가.
- **이중 런타임 유지 비용** (동기 D): `shared → phaser-game → web-shell` 3 패키지 + TypedEventBus 이벤트 쌍 + `gameStore`/`metaProgressStore` + `PhaserGame.tsx` 바운더리. 신규 기능마다 양쪽 동기화.

### 의도된 결과

1. `packages/unity-game/`에 Unity 2D WebGL 프로젝트가 자리 잡고, **로비·게임 루프·HUD·오버레이·메타 루프까지 Unity 내부에서 완결**된다.
2. 빌드 산출물은 기존 Vercel 배포에 `/unity/` 경로로 **공존**한다. `?engine=phaser`로 레거시 회귀.
3. 기존 phaser-game·web-shell은 parity 달성까지 **feature freeze 상태로 존속**. 정식 승격 후 6주 bake → 별도 spec으로 삭제.
4. 에셋(~234 PNG+WebP), 게임 수치(`shared/src/{data,constants}`), 디자인 토큰(`shared/src/design`)은 **SSOT를 유지**하면서 Unity로 포팅 — JSON export → ScriptableObject + USS 변환.
5. **R1 기능 parity**(19 타워·5 유닛·50 wave·보스·로그라이크·가챠·합성·메타 shell·저장 v8→v9 마이그레이션·3× speed·AdService stub·Sentry) 달성이 완료 판정 기준. 실광고 SDK·서버 동기화·LiveOps·FTUE 확장은 범위 밖.

### 코드 기반 정본 수치

- **논리 해상도 512×1152 (8×18 그리드, TILE_SIZE/PPU 64)** — `packages/shared/src/constants/grid.ts` 기준. 최근 `6fd1694`에서 48→64px 확장. `config.ts` 주석의 "432×960"은 stale.
- Phaser `Scale.FIT` + `autoCenter: CENTER_BOTH` + `pixelArt: true` + `roundPixels: true`.
- 9개 시스템·3 unit sub-manager·7 scene 서브패키지·runStatus/WavePhase 상태머신·저장 v8·디자인 토큰 SSOT·DS 프리미티브 6개·절차적 에셋 파이프라인.

---

## Subagent 활용 전략

`origin/main`에 `dfdd6d9`로 **9 subagent 임포트**가 들어왔다 (`msitarzewski/agency-agents` MIT). `.claude/agents/` 아래 배치되어 `/agents`로 호출 가능.

**중요한 맥락 갱신**: `.claude/agents/README.md`와 `AGENTS.md`는 임포트 당시 "Unity 4종은 코드 생성용 아님, 아키텍처 패턴 레퍼런스로만"이라고 명시했다. 그 전제는 **"본 저장소는 Phaser 3 + React 18 런타임"**이었다. 본 스펙이 `packages/unity-game/`을 도입하면 그 전제가 바뀐다 — Unity 4종은 **unity-game 스코프 내에서는 실제 코드 설계·리뷰에 직접 활용 가능**. Phaser 스코프 작업에서는 기존 주석대로 "레퍼런스 전용"을 유지. 이 이중 규칙을 `.claude/agents/README.md`·`AGENTS.md`에 Phase 0에서 명시한다.

### Phase별 담당 agent (위임 맵)

| Phase | 주 담당 agent | 보조 agent | 위임 유형 |
|-------|--------------|-----------|-----------|
| 0 부트스트랩 | **Unity Architect** (프로젝트 구조, asmdef 경계, SO-first 원칙) | **Unity Editor Tool Developer** (WebGLBuilder, CI 훅) | 설계 리뷰 + 스캐폴드 제안 |
| 1 데이터/에셋 파이프라인 | **Unity Editor Tool Developer** (`JsonToSOImporter`, `SpriteImportPostprocessor`, `AddressablesKeyAssigner`, `ValidateDatabase`) | **Technical Artist** (PPU 64·Atlas padding·압축 선택·번들 사이즈 감사), **Unity Architect** (SO 카탈로그 스키마) | 실제 코드 설계 + 구현 리뷰 |
| 2 PoC 버티컬 슬라이스 | **Unity Architect** (SO event channel / RuntimeSet 적용 여부), **Technical Artist** (PixelPerfectCamera 설정 검증) | **Game Designer** (wave 1 invariant 기준 수치 확인) | 구조 설계 + 수치 invariant |
| 3 코어 루프 parity | **Unity Architect** (19 타워 SO 카탈로그, MergeChain SO, CoreOrchestrator 의존성 그래프), **Game Designer** (balance drift ≤5% invariant 체크리스트) | **Technical Artist** (DrawCall/Atlas 효율) | SO 설계 리뷰 + 밸런스 검증 |
| 4 합성·가챠·보스·로그라이크 | **Game Designer** (가챠 분포·pity 정책·합성 체인 리뷰), **Unity Architect** (보스 AI state machine, UpgradeCard SO 패턴) | **Level Designer** (보스 encounter 페이싱, wave 템포), **Unity Shader Graph Artist** (보스 tint/invuln 쉐이더) | 밸런스 리뷰 + 상태 머신 + VFX |
| 5 UI/UX parity | **Unity Architect** (UIController ↔ System decoupling, `RunState.OnChanged` 바인딩), **Unity Editor Tool Developer** (DesignTokensSO → USS 생성 Editor 툴) | **Technical Artist** (UI Toolkit vs uGUI 트레이드오프), **Narrative Designer** (Galmuri11 한글 카피 가독성 리뷰) | 구조 설계 + Editor 툴 |
| 6 저장·오디오·BM·Sentry | **Game Audio Engineer** (AudioMixer 그룹, BGM fade, 절차적 SFX 프리-베이크 ↔ 런타임 합성 트레이드오프, 모바일 WebGL 오디오 성능 예산) | **Unity Architect** (SaveRepository SO 패턴, AdService DI), **Unity Editor Tool Developer** (Sentry config SO) | 오디오 설계 + BM 아키텍처 |
| 7 parity gate + FTUE + 성능 | **Technical Artist** (WebGL 번들 감사·텍스처 압축·LOD 검증·모바일 성능 프로파일), **Game Designer** (parity 체크리스트 최종 리뷰) | **Level Designer** (FTUE 튜토리얼 온보딩 페이싱), **Unity Shader Graph Artist** (VFX 성능 검증) | 최종 감사 + 성능 |
| 8 프로덕션 전환 | (사용자 주도, agent는 rollback runbook 초안 리뷰에만) | **Unity Architect** (deprecation 체크리스트) | 리뷰 전용 |
| **범위 밖 (R3+)** | **Unity Multiplayer Engineer** (LiveOps 랭킹/매치메이킹), **Unity Shader Graph Artist** (고급 VFX), **Narrative Designer** (스토리·환경 서사 확장) | — | — |

### 호출 규칙

- **설계 단계**: 각 Phase 착수 시 담당 agent를 **1회 호출**해 해당 Phase의 SO 스키마/시스템 경계/Editor 툴 목록을 받는다. 반환 결과를 기준으로 구현 티켓 세분화.
- **리뷰 단계**: 각 Phase exit gate 직전, 담당 agent에게 **diff 리뷰**를 요청해 anti-pattern(God class, `FindObjectOfType`, `DontDestroyOnLoad` 남용, 500+ LOC MonoBehaviour, SRP 위반)을 찾는다. Unity Architect의 "Anti-Pattern Watchlist"가 기본 체크리스트.
- **병렬 호출**: 서로 책임이 겹치지 않는 agent는 하나의 메시지에서 병렬 호출 (Technical Artist가 Atlas 감사 + Game Designer가 수치 검증 등).
- **중복 방지**: Phaser 스코프 작업(예: web-shell 긴급 패치)에서는 Unity agent를 호출하지 않는다. 기존 `phaser-best-practices`·`game-ui-design` skill이 우선.

---

## 확정된 가정 (auto-mode 기본값)

| 축 | 결정 | 근거 |
|----|------|------|
| Unity 버전 | **Unity 6 LTS (6000.x)** | 2026-04 시점 최신 LTS, WebGL 사이즈/메모리 개선, Brotli, UI Toolkit 성숙 |
| 렌더 파이프라인 | **URP 2D Renderer** | 2D Lights / Shader Graph / Pixel Perfect 공식 통합 |
| UI 프레임워크 | **UI Toolkit (UXML + USS)** | React/CSS 멘탈 근접, flexbox, uGUI보다 CanvasRenderer 오버헤드 적음 |
| 픽셀 카메라 | **PixelPerfectCamera** + `Reference 512×1152`, `Assets PPU 64`, `Upscale Off`, `Pixel Snapping On`, `Crop Frame Both` | Phaser `roundPixels: true`와 대응 |
| 인풋 | **Unity Input System** (Enhanced Touch) | WebGL 모바일 안정 |
| 트윈 | **DOTween** (`com.demigiant.dotween` 또는 OpenUPM) | 타워 idle pulse 저비용 재현 |
| 폰트 | **TMP SDF** Galmuri11 + Press Start 2P. KS X 1001 완성형(~2,350자) 서브셋 | 한글 번들 사이즈 관리 |
| 에셋 반입 | PNG만 재사용, **Sprite Atlas V2** + **Addressables**, WebP skip | Unity가 WebP 미지원 |
| 데이터 SSOT | shared TS → JSON export → ScriptableObject. Editor 메뉴 `GLD/Import Shared Data` | 밸런스/상수는 TS 상위, Unity는 소비자 |
| 이벤트 | **static class `GameEvents`** (C# typed events). `request-*` 24개 제거, 서술형 30여 개 유지 | EventBus 단일 런타임 화 |
| JS bridge | AdService / Sentry 보조 / URL params / localStorage — 4개 경계만 | WebGL `.jslib` 최소화 |
| 저장 | `gld-save-v9` 키 신설, v8→v9 일방 마이그레이션, jslib으로 `localStorage` 직접 read/write | Phaser와 localStorage 공유 유지 |
| RNG | 커스텀 LCG, TS/C# 동일 구현 (`DeterministicRng(seed)`) | 가챠/웨이브 재현성 |
| 절차적 SFX | Node에서 프리-베이크 → .wav + `AudioSource` 풀 + `AudioMixer` 3 group | WebGL 런타임 합성 회피 |
| BGM | Gates of the Waning Moon, `AudioClip` Compressed In Memory, `BgmService` fade | 라이선스 R4로 검증 |
| Sentry | `io.sentry.unity`, `environment: web-unity`, DSN 공유 | dedup은 engine 태그 |
| Ad stub | `IAdService` + `MockAdService`, 이어서 하기 1회/런 유지 | 기존 규칙 이식 |
| 배포 라우팅 | 경로 기반 `/` (phaser) + `/unity/` (신규). Phase 8에서 역전 | 동일 origin, localStorage 공유 |

---

## Unity 프로젝트 디렉터리 (`packages/unity-game/`)

```
packages/unity-game/
├── .gitignore                 # Library/ Temp/ Build/ Logs/ obj/
├── README.md
├── Assets/
│   ├── _Project/Scenes/       # Boot.unity, Root.unity
│   ├── Art/Sprites/{Towers,Units,Tiles,Projectiles,VFX,UI,CastleWall,SpawnHut}
│   ├── Art/Atlases/           # *.spriteatlasv2 (10종)
│   ├── Art/Fonts/             # Galmuri11 SDF, Press Start 2P SDF
│   ├── Audio/{BGM,SFX}/
│   ├── Prefabs/{Towers,Units,Projectiles,VFX,World,Root}/
│   ├── UI/
│   │   ├── Runtime/PanelSettings.asset, *.tss
│   │   ├── Styles/tokens.uss, primitives.uss, hud.uss, lobby.uss, overlays.uss
│   │   └── Documents/*.uxml (13종)
│   ├── Scripts/
│   │   ├── Core/              # Events, RNG, Save, Bridge, ServiceLocator, GameBootstrap
│   │   ├── Systems/           # Grid, Pathfinding, Towers, Units, Waves, Energy, Merge, Summon, Gacha, DamageNumbers, Orchestrator, CastleWall, SpawnHut
│   │   ├── SceneRuntime/      # GameSceneController, Input/*, Render/*, Runtime/*
│   │   ├── UI/                # Root, Lobby, Hud, Primitives (GLDButton/Card/Badge/Panel/Overlay/Sheet)
│   │   ├── Data/              # ScriptableObjects, GameDatabase, Editor/JsonToSOImporter
│   │   ├── Audio/             # SfxService, BgmService, WebGLAudioUnlocker
│   │   └── Common/            # MathEx, ObjectPool, Log
│   ├── Addressables/Groups/
│   ├── Resources/             # GameBootstrap.asset + GameData/ (JSON staging)
│   └── Tests/{EditMode,PlayMode}/
├── Packages/manifest.json     # UPM: addressables, 2d.*, render-pipelines.universal, ui, inputsystem, sentry-unity, textmeshpro, test-framework
├── ProjectSettings/
├── WebGLTemplates/GLDMobilePortrait/   # index.html, style.css (aspect 8/18), bridge.js, service-worker.js, manifest.webmanifest
├── BuildScripts/Editor/WebGLBuilder.cs
└── scripts/export-shared-to-json.ts
```

**asmdef 의존 방향 (Unity Architect 룰: 단방향, SRP, decoupled):**
`GLD.Core ← GLD.Systems ← GLD.SceneRuntime`, `GLD.Core ← GLD.UI`, `GLD.Core ← GLD.Data`, `GLD.Tests.EditMode → {Core, Systems, Data}`. `Systems`는 `UI` 미참조.

---

## 시스템 매핑 (Phaser → Unity)

### 9 시스템
| Phaser | Unity 형태 | 담당 agent 검토 포인트 |
|---|---|---|
| `GridManager` | **pure C#** `GLD.Systems.Grid.GridManager` (+ `GridManagerMB` gizmo 전용) | Unity Architect: GridData를 `MapLayoutSO`로, 장애물 9개는 SO 필드 |
| `PathfindingSystem` | **pure C#** (A*) | Unity Architect: 결정론 RNG·캐싱은 SO 아닌 pure state |
| `TowerSystem` | **pure C# 컨테이너** + `TowerInstance` MB 프리팹 | Unity Architect: `FindObjectOfType` 금지, `TowerRuntimeSet : RuntimeSet<TowerInstance>` |
| `UnitSystem` | **pure C# 컨테이너** + `UnitInstance` MB 프리팹 | Unity Architect: PathFollower/CCState/BossPhaseTracker는 composition |
| `WaveSystem` | **pure C#** | Game Designer: 50 wave 수치 invariant 체크 |
| `EnergySystem` | **pure C#** | Game Designer: 에너지 v3 수식 invariant |
| `MergeSystem` | **static pure C#** | Unity Architect: `MergeConfigSO`에 MERGE_CHAIN 데이터 |
| `GachaSystem` | **static pure C#** | Game Designer: tier 가중치·pity 리뷰 |
| `CoreOrchestrator` | **pure C#** | Unity Architect: idempotent OnEnable/OnDisable, cancelled-cache 포팅 |

### 3 Unit sub-managers · 7 Scene 서브패키지
| 원본 | Unity |
|---|---|
| `PathFollower`·`CCStateManager`·`BossPhaseTracker` | pure C# (UnitInstance 소유 or UnitSystem Map) |
| `scenes/Game.ts` | `GameSceneController : MonoBehaviour` (Root.unity) |
| `FieldRenderer` | MB + Tilemap 2장 (base + highlight) + SpriteRenderer 장식 |
| `RangeOverlayController` | MB + `RangeCircle.prefab` (Shader Graph ring) — **Unity Shader Graph Artist 검토** |
| `InputController` | MB + `InputAction`s |
| `PlacementCoordinator`·`CombatMediator`·`GameStateManager`·`BossContextBuilder` | pure C# |

### 초기화 순서 (`GameSceneController.Awake`)

Phaser `Game.ts.create()` 순서를 1:1 이식. Cleanup 순서(`OnDestroy`)도 Phase 6 규정(Bus→input→runtime→systems→renderers) 그대로.

---

## 이벤트 통신

단일 런타임이 되면 `request-*` 대부분은 **직접 메서드 호출로 소멸**. 타입 안전을 위해 **`static class GameEvents`**의 개별 typed event 필드로 재편.

**Unity Architect 대안 검토**: SO 기반 `GameEvent : ScriptableObject` 채널 vs static event 클래스. SO 채널은 designer-friendly하지만 30여 개 이벤트 × SO asset 파일이 생겨 관리 부담. 본 스펙은 **static class 기본 + 디자이너 편집이 의미 있는 이벤트**(예: 보스 페이즈 전이 트리거)에 한해 SO 채널 옵션. Phase 2 PoC 시점에 Unity Architect agent로 최종 검토.

**제거되는 이벤트 (UI→시스템 직접 호출)**: `request-select-tower`, `request-clear-tower-selection`, `request-place-tower`, `request-sell-tower`, `request-start-game`, `request-reset-run`, `request-set-speed`, `request-tutorial-advance`, `request-gimmick-info`, `request-summon-tower`, `request-merge-towers`, `request-enter-move-mode`, `request-move-tower`, `request-pause/resume`, `request-apply-upgrade`, `request-upgrade-reroll`, `request-gacha-summon`, `request-continue-run`, `request-family-upgrade`, `request-enter-lobby`, `request-enter-stage-select`, `request-deck-edit`, `current-scene-ready` (24개).

**유지**: `OnGameReady`, `OnTowerPlaced`, `OnWaveStarted/Completed/PrepStarted/PrepTick/TimerTick`, `OnBossWarning/HpUpdate/PhaseChange/Defeated`, `OnEnergyChanged`, `OnPlayerDamaged`, `OnBaseHpChanged`, `OnGameOver`, `OnGameResumed`, `OnSummonReady/Failed`, `OnTowerSummoned/Selected/Deselected/Sold/Moved`, `OnTowersMerged`, `OnMergeFailed/MoveFailed`, `OnUpgradeChoiceReady/Applied`, `OnFamilyUpgraded/FailUpgradeFailed`, `OnGachaInsufficientEnergy`, `OnEnterMergeMode`, `OnDeckLoaded`, `OnPlayerTowerCount`, `OnWavePreview`, `OnTutorialStep/Completed` (~30개).

**외부 경계 4개 (`.jslib`)**: AdService / Sentry 브라우저 unhandledrejection 보조 / URL params / localStorage bridge.

---

## UI Toolkit 포팅

### 디자인 토큰 → USS

`Assets/UI/Styles/tokens.uss` = `DesignTokensSO` → USS 자동 생성기 (**Unity Editor Tool Developer agent**가 Phase 5에서 설계). CI에서 shared `design/*.ts` → JSON → SO → USS.

- palette / spacing / radius / motion / typography → CSS 커스텀 프로퍼티 (`--color-*`, `--space-*`, 등)
- USS `box-shadow` 미지원 → border-bottom + translate 조합으로 픽셀 3D 섀도 재현 (기존 `ds/Button` `0 3px 0 color`와 동형)

### DS 프리미티브 6개

`GLDButton/Card/Badge/Panel/Overlay/Sheet` = `VisualElement` 서브클래스 + `UxmlFactory`/`UxmlTraits`. USS class 조합은 React 구현과 동일 네이밍 (`--primary`, `--tier-3`, `--element-fire`).

### 기존 오버레이 13종 대응

`GameHud / TopHud / TowerActionSheet / SummonRevealOverlay / UpgradePickOverlay / PauseModal / BossHpBar / BossWarningOverlay / GameOverScreen / ToastNotification / TutorialOverlay / Lobby / MetaForge` → UXML 문서 + C# Controller. 각 Controller는 유지되는 `GameEvents` 구독으로 리렌더.

### PanelSettings

`Scale Mode: Scale With Screen Size`, `Reference 512×1152`, `Screen Match 0 (width)`, `Dynamic Atlas Off`, `Sort Order 10` (게임 카메라 위). 게임 뷰포트는 PixelPerfectCamera가 Sort Order 0.

---

## 에셋 파이프라인

### 반입 & 임포터 (Unity Editor Tool Developer 주도 — Phase 1)

- `packages/web-shell/public/assets/**/*.png` → `Assets/Art/Sprites/**` 복사. WebP skip.
- `Assets/Editor/SpriteImportPostprocessor.cs`가 일괄: PPU 64, Point, High Quality(WebGL DXT5), MipMaps Off, sRGB On.
- Sprite Atlas V2 10종 (Towers / Units_Core / Units_Boss / Projectiles / VFX / UI_HUD / UI_Lobby / CastleWall / SpawnHut / Tiles / Icons). `Include in Build Off` + Addressable.
- **Technical Artist agent 검토**: Atlas padding 4px+, Extrude Edges On, 픽셀 경계 무결성 스냅샷 테스트.

### Addressables Group

| Group | Load | Label | 비고 |
|-------|------|-------|------|
| Default | Local built-in | — | GameBootstrap, GameDatabase, DesignTokensSO, PanelSettings, tss, Fonts |
| Preload | Local | `preload` | Towers/Units_Core/UI_HUD/CastleWall/SpawnHut/Tiles/Icons/Lobby UXML |
| Optional_UI | Local | `optional` | UI/VFX/Projectiles atlas — 게임 진입 후 prefetch |
| Boss | Local | `boss` | Units_Boss + boss VFX — `OnBossWarning` 시 download |
| BGM | Local | `bgm` | Gates of the Waning Moon |

`Editor/AddressablesKeyAssigner.cs`가 `packages/shared/src/assets/manifest.ts` 스키마 추종.

### 절차적 생성 스크립트

**dual-output 유지**. `scripts/generate-assets/`에 `--target=unity` 플래그 추가 → unity-game Art 폴더에도 PNG만 출력. ComfyUI 스크립트는 그대로. 유저 명시 요청 시에만 실행 규칙 유지.

---

## 데이터/상수 파이프라인 (Unity Architect + Editor Tool Developer)

- `packages/shared/package.json`에 `"build:unity-json"` 스크립트 추가 → `scripts/export-shared-to-json.ts` 실행 → `packages/unity-game/Assets/Resources/GameData/*.json` 쓰기.
- Editor 메뉴 `GLD/Import Shared Data`: JSON → SO (`TowerCatalogSO`, `UnitCatalogSO`, `WaveDefSO[]`, `MapLayoutSO`, `UpgradeCardSO[]`, `SummonPoolSO`, `GachaConfigSO`, `BossConfigSO`, `EnergyConfigSO`, `ScalingConfigSO`, `FamilyUpgradeConfigSO`, `ElementMatchupSO`, `DesignTokensSO`).
- CI 훅: `bun run build:unity-json && unity -batchmode -executeMethod JsonToSOImporter.ImportAll`.
- 검증: `packages/shared/src/constants/__tests__/unity-export-parity.test.ts` round-trip, Unity `Editor/ValidateDatabase.cs`가 tier chain·pool 참조·spawn/exit pair 무결성.

---

## 상태 관리 (Unity Architect)

- `RunState` (pure C#, `GameSceneController` 소유): `RunId`, `RunStatus`, `Energy`, `Lives`, `Wave`, `WavePhase`, `Countdown`, `SpeedMultiplier`, `BossHp`. `OnChanged` 이벤트로 UI Toolkit 바인딩.
- `MetaProgressRepository` (pure C#) + `SaveRepository` (localStorage bridge): `metaProgressStore`의 프로필/컬렉션/덱/globalAtkPct/familyPerks. `SaveDataV9`.
- `SaveMigrator.FromV8(v8) → v9`: 일방 변환. 변환 후 `gld-save-v9` 쓰고 `gld-save-data`(v8)는 30일 보존 후 `PurgeLegacy()`.

---

## 런타임 특성 번역

- **3× speed**: `GameStateManager.Tick(Time.deltaTime * 1000 * mult)` scaledDelta 직접 전달. `DOTween.timeScale = mult`. VFX와 `DamageNumberSystem`은 `Time.unscaledDeltaTime`. `Time.timeScale`은 pause용(0↔1).
- **iOS AudioContext 해금** (Game Audio Engineer agent 검토): `WebGLAudioUnlocker.cs` 부트에서 `AudioListener.volume = 0` + 첫 터치 resume + `bridge.js`의 `WEBAudio.audioContext.resume()`. visibilitychange 재시도.
- **절차적 SFX**: Node 베이크 .wav 24종 → `Assets/Audio/SFX/`. `SfxService.Play(id)` + `AudioMixer` (master/bgm/sfx 3 group, exposed volume). Game Audio Engineer가 adaptive 전환·duck 정책 리뷰.
- **Tower idle tween**: DOTween yoyo scale pulse.
- **DamageNumber**: 24 풀 TMP World, 800ms unscaled delta.
- **Range overlay**: Shader Graph ring sprite + SpriteMask. **Unity Shader Graph Artist agent**가 URP 2D ring shader 제작.
- **입력**: Input System `PointerPress`/`Position` → `Camera.ScreenToWorldPoint` → `GridManager.WorldToGrid` → `PlacementCoordinator`/`movePending`/`selectedTowerId` 분기.

---

## 마이그레이션 Phase 로드맵

| Phase | 목표 | 주요 deliverable | Exit gate | 크기 | 담당 agent | 의존 |
|-------|------|-----------------|-----------|------|-----------|------|
| **0 부트스트랩** | Unity 프로젝트 + CI + `/unity/` 라우트 + AGENTS.md 업데이트 | `packages/unity-game/` 스캐폴드, UPM manifest, WebGLTemplate, `.github/workflows/unity-build.yml` (GameCI), `scripts/merge-build.ts`, `vercel.json` rewrites, `.claude/agents/README.md`·`AGENTS.md` Unity 4종 이중 규칙 | `<preview>.vercel.app/unity/`에서 "Unity Phase 0" UXML 라벨, iOS Safari 실기 로드 | S | **Unity Architect**, Unity Editor Tool Developer | — |
| **1 데이터·에셋 파이프라인** | shared → SO, PNG → Sprite/Atlas, manifest → Addressables, tokens.uss 생성기, Galmuri11 SDF | `scripts/export-shared-to-json.ts`, `Editor/JsonToSOImporter/AddressablesKeyAssigner/SpriteImportPostprocessor.cs`, Atlas 10종, Addressables Group, `tokens.uss` 생성기 | round-trip Vitest green, Editor 메뉴 "Imported N towers" 확인, Atlas 경계 무결 | M | **Unity Editor Tool Developer**, Technical Artist, Unity Architect | 0 |
| **2 PoC 버티컬 슬라이스** | 에셋 로드 + 8×18 그리드 + 아처 1종 + orc 1종 + wave 1 + 배치 + 전투 + 에너지 HUD | `Scenes/Slice2_PoC.unity`, `MinimalTowerSystem/UnitSystem/WaveSystem/EnergySystem`, `Slice2Hud.uxml`, `Slice2SmokeTest` | iOS Safari에서 배치→킬→에너지+1 30초 레코딩, Phaser 대비 wave 1 데미지 ≤5% | L | **Unity Architect**, Technical Artist, Game Designer | 1 |
| **3 코어 루프 parity** | 19 타워·5 유닛·50 wave (보스/합성/가챠 제외) | `Systems/Grid,Pathfinding,Towers,Units,Waves,Energy,CoreOrchestrator,DamageNumbers` full, `SceneRuntime/*` 전부, PlayMode tests | /unity/?autostart=1 wave 50 endless, PlayMode green, balance drift ≤5% | L | **Unity Architect**, Game Designer, Technical Artist | 2 |
| **4 합성·가챠·보스·로그라이크** | 런 내부 루프 완결 | `MergeSystem`, `GachaSystem`, `UpgradeCardSystem`, `BossAI/{OrcWarlord,ForgeMaster,CorruptedArchmage,Dragon}`, cancelled-cache 포팅, 10만 롤 분포 테스트 | 전체 런 재현, 가챠 ±0.5%p, 보스 phase 전이 확인 | L | **Game Designer**, Unity Architect, Level Designer, Unity Shader Graph Artist | 3 |
| **5 UI/UX parity** | 로비·HUD·오버레이·메타 UI Toolkit 완결, Unity 단독 lobby↔game | 13 UXML + Controllers, `UI/Primitives/GLD*` 6종, `tokens.uss` 생성, `LobbyController`/`MetaForgeController` | Unity 단독 lobby→game→victory/defeat→lobby 왕복, Playwright 페어 스크린샷 | M-L | **Unity Architect**, Unity Editor Tool Developer, Technical Artist, Narrative Designer | 4 |
| **6 저장·오디오·BM·Sentry** | 영속·사운드·광고 stub·텔레메트리 | `SaveSystem/SaveMigratorV8ToV9`, `bridge.jslib` localStorage, `SfxService`/`BgmService`/`WebGLAudioUnlocker`, `IAdService`/`MockAdService`/`WebGLBridgeAdService`, `sentry-unity` 설정 | v8 유저 진행도 손실 0, iOS/Android BGM+SFX 정상, "이어서 하기" 1회/런, Sentry web-unity 세션 수신 | M | **Game Audio Engineer**, Unity Architect, Unity Editor Tool Developer | 5 |
| **7 parity gate + FTUE + 성능** | parity 체크리스트 통과, 성능 목표, 튜토리얼 | `TutorialSystem.cs`, `Tests/PlayMode/ParityAcceptance/`, `docs/unity-migration/phase7-perf.md`, `unity-parity-gate.yml` | 자동화 parity green, 수동 QA 2인 통과, Desktop 60fps/iOS Safari 45fps+/3× 20fps+, 빌드 <30MB | L | **Technical Artist**, Game Designer, Level Designer, Unity Shader Graph Artist | 6 |
| **8 프로덕션 전환** | Unity default 승격, phaser freeze | `vercel.json` 역전, `?engine=legacy` 회귀, `rollback-runbook.md`, phaser-game freeze 고지 | default Unity 상태 72h Sentry 에러율 <0.5%, 롤백 드릴 <5분 성공 | S | (사용자 주도) + Unity Architect 리뷰 | 7 |
| 9 (별도 spec) | phaser-game 삭제 | — | 범위 외, Phase 8 +6주 | — | — | 8 |

---

## Parity 체크리스트 (Phase 7 gate)

### 자동화 (PlayMode/EditMode + CI)

- [ ] 19 타워 정의 필드 JSON round-trip 바이트 일치
- [ ] 에너지 v3 6 케이스 (초기 40, +1/s, 킬 +1, CAP 200, 보스 +20, fast-clear +20)
- [ ] 가챠 분포 T2 60% / T3 20% / T4 5%, `tier_odds_up` +50%p, 10만 롤 ±0.5%p
- [ ] `MERGE_CHAIN` 전부 (4 family × 4 tier → hybrid 2 → ultimate 1)
- [ ] 3× speed 결정론 fixed seed: wave 클리어 ±2%, 보스 킬 ±500ms
- [ ] v8→v9 마이그레이션 10 샘플 round-trip
- [ ] "이어서 하기" 1회/런 제약
- [ ] 234 PNG 전부 Addressables 포함
- [ ] Sprite Atlas 경계 픽셀 무결 (Editor snapshot)
- [ ] PixelPerfectCamera 타일 서브픽셀 흐림 없음
- [ ] 빌드 <30MB 압축, LCP <5s Desktop Chrome
- [ ] `GameEvents` 유지 이벤트 30개 payload schema
- [ ] `runStatus` 상태머신 전이 전부
- [ ] visibilitychange save flush
- [ ] `ccResistance`(보스 0.5~0.7), `MIN_MOVE_SPEED=0.15`, 2초 스턴 면역

### 수동 QA

- [ ] iOS Safari 실기 (iPhone 12/13/SE): BGM 해금, SFX 지연 <100ms, 터치 hit-test
- [ ] Android Chrome 실기 (Pixel 6, Galaxy S20)
- [ ] 세로 고정, 가로 회전 letterbox
- [ ] Galmuri11 한국어 가독성
- [ ] 합성 드래그·탭 UX
- [ ] 보스 warning 타이밍 체감
- [ ] 3× speed 음향 왜곡 없음
- [ ] 튜토리얼 FTUE 첫 실행

---

## 공존 전략 (phaser-game + unity-game)

- **라우팅**: 경로 기반. `vercel.json` rewrites 순서: `/unity/(.*) → /unity/$1` → `/unity → /unity/index.html` → `/(.*) → /index.html` (SPA fallback). Phase 8 역전.
- **localStorage 키**: v8 `gld-save-data` (Phaser), v9 `gld-save-v9` (Unity). v9 우선 로드. URL `?engine=`으로 한 번에 하나만 active.
- **CI**: 기존 `ci.yml` 유지 + `unity-build.yml` (GameCI `game-ci/unity-builder@v4`, Library 캐시), `unity-parity-gate.yml`.
- **dev server**: Vite(5173) = web-shell 전용. Unity는 에디터 Play Mode. 로컬 통합 테스트는 `bun run dev:unity-preview` (vite preview 8080).
- **Sentry**: 동일 DSN + `environment: web-phaser | web-unity` 태그, engine flag로 단일 active.

---

## 수정/신설될 핵심 파일

### 신설 (unity-game)
- Unity 프로젝트 전체 (디렉터리 레이아웃 참조)
- 특히: `Core/Events/GameEvents.cs`, `Core/Save/{SaveDataV9,SaveMigrator,SaveRepository}.cs`, `Core/Bridge/JsBridge.jslib`, `SceneRuntime/GameSceneController.cs`, `Systems/Orchestrator/CoreOrchestrator.cs`, `UI/Primitives/GLD*.cs`, `UI/Styles/tokens.uss`(자동 생성), `Editor/{JsonToSOImporter,AddressablesKeyAssigner,SpriteImportPostprocessor,ValidateDatabase,WebGLBuilder}.cs`, `WebGLTemplates/GLDMobilePortrait/*`

### 신설 (루트)
- `scripts/export-shared-to-json.ts`
- `scripts/merge-build.ts`
- `.github/workflows/unity-build.yml`, `unity-parity-gate.yml`
- `docs/unity-migration/phase7-perf.md`, `rollback-runbook.md`
- `packages/shared/src/constants/__tests__/unity-export-parity.test.ts`

### 수정
- `package.json` — `build:all`, `build:unity-json`, `dev:unity-preview`
- `vercel.json` — buildCommand, rewrites
- `packages/shared/package.json` — `build:unity-json`
- `packages/phaser-game/README.md` (Phase 8 freeze 고지)
- **`AGENTS.md`** — Unity 런타임 추가 + Unity 4종 이중 규칙 (unity-game 스코프 직접 활용 / phaser 스코프 레퍼런스 전용)
- **`.claude/agents/README.md`** — 동일 이중 규칙 반영
- `README.md` — 모노레포 구조 (unity-game 추가)
- `docs/game-spec/08-architecture.md` — Unity 대응 섹션 (Phase 7 시점)

### 재사용 (SSOT 유지)
- `packages/shared/src/{data,constants,design,types}/**` — TS SSOT
- `packages/web-shell/public/assets/**/*.png` — Sprite 원본
- `packages/shared/src/assets/manifest.ts` — Addressables label 원본
- `scripts/generate-assets/**` — `--target=unity` 확장만
- 참조용 포팅 소스: `packages/phaser-game/src/scenes/Game.ts`, `EventBus.ts`, `systems/CoreOrchestrator.ts`, `systems/TowerSystem.ts`, `systems/UnitSystem.ts`, `systems/WaveSystem.ts`, `scenes/input/InputController.ts`, `scenes/runtime/GameStateManager.ts`, `scenes/runtime/CombatMediator.ts`, `web-shell/src/hooks/useGameEvents.tsx`, `web-shell/src/stores/gameStore.ts`, `web-shell/src/stores/metaProgressStore.ts`
- **`.claude/agents/*.md`** — 9 subagent 정의 (직접 수정 금지, README의 사용 규칙만 업데이트)

---

## 리스크 레지스터

| ID | 리스크 | 완화 타이밍 | 완화책 | 최악 우회 | 담당 agent |
|----|--------|-----------|--------|-----------|-----------|
| R1 | iOS Safari WebGL OOM | Phase 2 PoC | WEBGL_MEMORY_SIZE 256MB, Brotli, Atlas 통합, Addressables 지연 로드 | iPhone 11/XR 미만 미지원 | Technical Artist |
| R2 | Sprite Atlas 경계 깨짐 | Phase 1 | padding 4px+, Extrude Edges, Compression None | 개별 Sprite, drawcall ~60 수용 | Technical Artist |
| R3 | UI Toolkit 모바일 터치 지연 | Phase 2 PoC | `touch-action: manipulation`, Sort Order 명시, Enhanced Touch | 민감 UX만 uGUI 병행 (+1주) | Unity Architect |
| R4 | iOS AudioContext 해금 실패 | Phase 6 | `WebGLAudioUnlocker` + visibilitychange 재시도 | "탭하여 사운드 켜기" 배너 (BGM 재분배는 확정 — 대체 BGM 불필요) | Game Audio Engineer |
| R5 | Galmuri11 SDF 품질/용량 | Phase 5 | KS X 1001 완성형(~2,350자) SDF, 정수 크기 | 전체 완성형(+4MB) or 웹폰트 DOM 주입 | Technical Artist |
| R6 | TS↔C# 결정적 drift | Phase 3 | LCG 이식, 연산 순서 통일, FixedUpdate 50ms | ±10% 허용 + 상대 난이도 튜닝 | Game Designer |
| R7 | Addressables remote 지연 | Phase 7 | Local(lobby) + Remote(game) 분리 | R2/CloudFront | Technical Artist |
| R8 | IL2CPP WebGL 빌드 장기화 | Phase 0 | GameCI Library 캐시, 문서 PR skip | PR 테스트만, 빌드 main only | Unity Editor Tool Developer |
| R9 | phaser-game 이중 유지 | Phase 3 | Phase 2 exit부터 feature freeze, critical only | 예외 1-2회 수용 | — |
| R10 | Supabase 세션 공유 | Phase 6 | jslib로 token 공유 | Supabase 화면만 React portal | Unity Architect |
| R11 | UI Toolkit HUD 프레임 드롭 | Phase 2 PoC | `schedule.Execute` throttle, `INotifyValueChanged`, 문자열 최소화 | 핫 엘리먼트만 IMGUI/WorldSpace TMP | Technical Artist |

---

## 자동 검증 파이프라인 (Overnight-safe)

**한 줄 요약**: 잠자는 동안 PR/main에 붙는 모든 변경은 GitHub Actions가 자동 판정하고, 밤 12시 이후엔 nightly soak이 6시간짜리 결정론·메모리 누수 테스트를 돌려 아침 7시에 브리핑 MD를 `docs/unity-migration/briefings/$DATE.md`에 커밋해 둔다. 실패는 PR status로 merge를 막고, Sentry release + (옵션) Slack 웹훅으로 알린다.

**아침 루틴 (예상)**
1. `docs/unity-migration/briefings/$DATE.md` 열기 → 지난밤 PR/push 결과, nightly soak 요약, drift 경고 확인.
2. `[FAIL]` 접두사가 있으면 해당 PR/commit 링크로 바로 artifact 확인.
3. GitHub PR 페이지의 status check가 전부 green이면 머지 가능.
4. 수동 QA 필요한 항목(R5 폰트, R4 청각)은 체크리스트로 주말 배치.

사용자가 AFK여도 각 Phase의 exit gate가 자동 판정되도록 설계. 실패는 PR status + Sentry release + 선택적 Slack 웹훅으로 전파. 모든 artifact는 7일 보존 (바이너리 빌드만 30일).

### A. 공통 인프라 (Phase 0에 구축)

**`.github/workflows/` 매트릭스**

| 워크플로 | 트리거 | 런타임 | 산출물 | 요구 status |
|---------|-------|--------|--------|-----------|
| `ci.yml` (기존) | PR, push(main) | ubuntu, 10-15min | Vitest 리포트 + Biome + Playwright(기존 phaser) | required |
| `unity-build.yml` (신설) | PR(unity-game 변경), push(main), manual | GameCI ubuntu, 25-40min | Unity WebGL 빌드 zip, Addressables 번들, EditMode/PlayMode 결과 XML, 번들 사이즈 JSON | required (PR) |
| `unity-parity-gate.yml` (신설, Phase 3+) | PR(src 변경), push(main) | ubuntu, 30min | parity report MD + artifact, balance-drift CSV | required (Phase 3+) |
| `visual-regression.yml` (신설, Phase 5+) | PR(UI 변경 라벨), nightly | Playwright webkit+chromium, 20min | 스크린샷 PNG + diff PNG + HTML 리포트 | optional (informational) |
| `lighthouse-ci.yml` (신설, Phase 7) | PR(main 대상), nightly | ubuntu, 10min | Lighthouse 리포트 JSON, LCP/CLS/TBT 메트릭 | required (Phase 7) |
| `nightly-soak.yml` (신설, Phase 3+) | cron `0 17 * * *` (KST 02시), manual | ubuntu, 최대 6h | JSONL 이벤트 로그, 크래시 카운트, 메모리 프로파일, summary.md | informational (알림 only) |
| `save-migration-fuzz.yml` (신설, Phase 6) | PR(save 변경), weekly | ubuntu, 5min | fuzz seed corpus 결과 CSV | required (Phase 6+) |
| `release-smoke.yml` (신설, Phase 8) | Vercel deployment webhook | BrowserStack or Playwright webkit, 10min | 실기/에뮬 스크린샷 + first-paint 측정 | required (deployment gate) |

**공통 컨벤션**
- 모든 워크플로는 `concurrency: { group: "${{ github.ref }}-${{ github.workflow }}", cancel-in-progress: true }`로 PR push 시 이전 실행 자동 취소.
- 실패 시 Actions 출력에 ```## FAIL 섹션``` + artifact 링크가 PR comment로 자동 게시 (기존 `actions/github-script` 활용).
- Sentry release 태깅: 각 Unity 빌드 생성 시 `sentry-cli releases new unity-$SHA` → 야간 실패는 release에 일괄 묶여 대시보드에서 확인 가능.
- 선택적 Slack 웹훅: repo secret `SLACK_WEBHOOK_URL` 있을 때만 활성. `nightly-soak` 결과 요약·치명적 실패만 전송.

**알림 우선순위**
1. **PR blocker** (merge 차단): ci / unity-build / unity-parity-gate / lighthouse-ci / save-migration-fuzz / release-smoke
2. **Warning** (PR 가능, comment 남김): visual-regression
3. **Monitor only** (대시보드 업데이트, merge 영향 X): nightly-soak, Sentry release

### B. 결정적 시뮬레이션 하네스 (Phase 3부터, 핵심 자동화)

**목적**: TS(phaser-game)와 C#(unity-game)이 동일 seed + 동일 입력 트레이스로 동일한 결과(웨이브 클리어 시간, 킬 카운트, 에너지 타임라인, 보스 phase 전이 타이밍)를 내는지 기계 검증.

**구성**

1. **공유 fixture**: `packages/shared/src/testing/replay-fixtures/` 하위에 JSON 트레이스 정의 10종
   - `seed-001-wave-1to5.json`: seed 12345, 60초 시나리오, 배치 이벤트 타임라인 (예: t=100ms "place archer at 3,14"), 예상 metrics (wave1 clear=23.4s, kills=12, energy peak=67)
   - `seed-002-gacha-stack.json`: 가챠 10회 + 로그라이크 `tier_odds_up` 3 스택
   - `seed-003-boss-wave-10.json`: 보스 phase 전이 + invuln 창
   - `seed-004-merge-chain-full.json`: 전 family × tier 합성
   - `seed-005-fast-clear-bonus.json`: fast-clear +20 트리거
   - 나머지 5종: 에너지 CAP, 이어서 하기, 메타 globalAtkPct 주입, 3× speed, tutorial 완료

2. **TS reference ledger**: `packages/shared/src/testing/replay-runner.ts`가 phaser-game을 headless로 기동해(웨이브/타워/유닛 system을 scene 없이 pure로 import) fixture 실행 → `events-reference.jsonl`(타임스탬프 + 이벤트 + snapshot) 생성. `bun run replay:record` 커맨드.

3. **C# 파리티 비교**: Unity `Tests/EditMode/ReplayParityTests.cs`가 동일 fixture + 커스텀 LCG로 pure C# system 돌려 `events-unity.jsonl` 생성. 두 ledger의 **invariant** 비교:
   - 이벤트 시퀀스(순서, 종류)는 완전 일치
   - 타이밍은 ±2% 허용 (wave clear), ±500ms (보스 killing blow)
   - 수치(킬 카운트, 에너지 peak, damage total)는 ±5% (Phase 3), ±2% (Phase 7 고도화)
   - 어긋나면 diff.json 생성 + 첫 divergent event 시점을 artifact로 아카이브

4. **CI 게이트**: `unity-parity-gate.yml`이 Phase 3부터 required.

**드리프트 조기 경보**: 10 fixture × 2 엔진 = 20 run/CI. 런타임 ~4분. 실패 시 `docs/unity-migration/parity-failures/$SHA.md` 자동 생성해 diff + reproduce 커맨드 기록.

### C. 밸런스·확률 통계 테스트 (Phase 4 강화)

**가챠 분포 (10^5 롤)**
- Vitest `packages/shared/src/testing/gacha-distribution.test.ts`: T1~T5 분포 χ² 검정, 95% 신뢰 구간 vs 기대 가중치.
- Unity EditMode `GachaDistributionTests.cs`: 동일 10^5 롤, ±0.5%p 허용.
- **양 엔진 교차 확인**: 두 엔진이 동일 seed 시퀀스로 동일 tier를 뽑아야 함 (LCG 이식 검증).

**합성 체인 all-paths**
- `MergeChainTests.cs`가 `MERGE_CHAIN` 정의의 모든 경로(4 family × 4 tier + hybrid 2 + ultimate 1)를 조합 생성 → `MergeSystem.ResolveMerge` 호출 → 기대 출력과 비교. 누락 경로 있으면 fail.

**에너지 v3 invariant**
- 6 케이스 EditMode 테스트: 초기 40, +1/s, 킬 +1, CAP 200, 보스 +20, fast-clear +20.
- 야간 soak 테스트에서 "런 중 energy < 0 또는 > CAP" 발생 시 즉시 fail.

**보스 phase 전이**
- HP 50%/25% 경계에서 invuln 500ms + speed 배율 체크. 10 seed 돌려 invariant.

### D. 에셋·시각 무결성 자동화 (Phase 1, 5, 7)

**Sprite Atlas 경계 스냅샷**
- `Assets/Editor/AtlasBoundarySnapshot.cs`: 빌드 전 훅으로 각 Atlas 페이지를 헤드리스 렌더 → 각 sprite 주변 1px alpha 합산 = 0이어야 함. 경계 번짐 감지.
- CI artifact: atlas-boundary-report.json (sprite별 pass/fail).

**픽셀 퍼펙트 타일 스냅샷**
- `Tests/PlayMode/PixelPerfectSnapshotTest.cs`: 8×18 그리드 기본 씬을 `ScreenCapture.CaptureScreenshotAsTexture()` → 기대 bytes hash 비교. 서브픽셀 흐림 발생 시 다름.

**UI Toolkit 시각 회귀 (visual-regression.yml)**
- Playwright webkit + chromium이 `/unity/?screen=lobby`, `/unity/?screen=hud-mid-wave`, `/unity/?screen=game-over` 등 deterministic 시드 진입점을 열어 스크린샷.
- `pixelmatch` 로 baseline 대비 diff. 5% 이상 변화 시 informational 경고, artifact에 3-way 스크린샷(baseline/actual/diff).
- 베이스라인은 `tests/visual/baselines/` 하위 git-lfs로 관리.

**Addressables 포함 검증**
- `Editor/ValidateAddressables.cs`: `packages/shared/src/assets/manifest.ts`의 전체 key 목록 vs Addressables 등록 key diff. 누락 있으면 fail.

### E. 성능·크기 회귀 (Phase 7부터 필수, Phase 2/5에 informational)

**Lighthouse CI**
- `lighthouse-ci.yml`이 Vercel preview URL에 대해 Mobile(Moto G Power 에뮬) + Desktop 모드 측정. 임계값 `lighthouserc.json`:
  - LCP: Mobile ≤5s, Desktop ≤3s
  - CLS: ≤0.1
  - TBT: ≤400ms
  - Total JS: ≤15MB (압축 후)

**Unity 빌드 사이즈 게이트**
- `unity-build.yml` 끝단에 `du -sb Build/WebGL.br | jq ...`로 크기 측정 → `build-size.json` artifact. PR 본문에 크기 증감 표 자동 comment. 30MB 초과 시 required fail.

**런타임 메모리 프로파일 (nightly)**
- `nightly-soak.yml`이 `/unity/?soak=1&seed=RANDOM`을 headless webkit에서 30분 돌리며 `performance.memory.usedJSHeapSize`를 10초 간격 샘플링. 200MB 초과 지속 시 fail.

**GC 압박 프로파일**
- Unity PlayMode 테스트 `GCProfileTest.cs`가 60초 시뮬레이션 중 `GC.GetTotalAllocatedBytes(true)` 델타 기록. 프레임당 평균 5KB 초과 시 fail.

### F. 저장·광고·사운드 자동화 (Phase 6)

**Save Migration Fuzzer (`save-migration-fuzz.yml`)**
- TS에서 synthetic v8 payload 100종 생성 (다양한 필드 조합, boundary value, null, 극단치) → localStorage에 주입 → Unity boot → `gld-save-v9` 변환 → JSON deserialize → invariant 체크:
  - `energy >= 0 && energy <= 200`
  - 모든 타워의 tier ∈ [1, 6]
  - `metaProgress.globalAtkPct >= 0`
  - 덱 크기 ≤ 정의된 MAX_DECK
  - v8 원본과 v9 변환 사이에 진행도 손실 0 (대응 필드 bit-exact)
- 실패한 payload는 `fuzz-failures/$SHA/*.json`으로 artifact 아카이브.

**AdService 계약 테스트**
- `MockAdService`는 결정론적으로 `Rewarded` 반환. PlayMode `AdServiceContractTest.cs`가 "이어서 하기" 1회/런 제약 + 광고 종료 후 에너지 회복 invariant 검증.
- 실제 브릿지는 `WebGLBridgeAdService` 계약 테스트(JS mock로 `Rewarded`/`Skipped`/`Error` 케이스 주입, C#이 올바르게 분기하는지).

**오디오 상태 검증 (들을 필요 없이)**
- PlayMode `AudioSmokeTest.cs`: BGM 재생 요청 후 `AudioSource.isPlaying == true`, `AudioListener.volume == 1` (첫 터치 후), pause 시 volume 페이드 확인.
- `WebGLAudioUnlocker` 검증: 첫 pointer 이벤트 가짜 dispatch → `AudioContext.state == 'running'` (jslib bridge 경유 확인).
- 실제 사운드 청각 검증은 수동 QA (R4 리스크).

### G. 야간 Soak 테스트 (`nightly-soak.yml`)

**목적**: 오랜 시간 돌려야만 드러나는 메모리 누수·결정론 drift·엣지 케이스를 검출.

**시나리오**

1. **Long-run 결정론**: seed 10종 × wave 1→50 endless 완주 × 엔진 2종 = 20 run. Unity 런은 `unity -batchmode -executeMethod NightlySoak.Run --seed=N --target=wave-50`. TS 런은 `bun run replay:soak --seed=N`. 양 엔진의 metrics를 diff.
2. **메모리 누수**: Unity WebGL 빌드를 Playwright webkit으로 띄워 100 run 연속 실행(각 2-3분). heap size trend가 monotonic 증가면 leak 의심.
3. **Crash/에러**: 각 run 종료 후 Sentry 이벤트 수 diff = 0 기대.
4. **Balance drift 확대 매트릭스**: 50 seed × wave 1~10 집계 → "wave N 평균 클리어 시간" 분포. 일일 편차 <0.5% 유지.

**산출물** (`nightly-soak-$DATE/`):
- `summary.md`: PASS/FAIL + 주요 metrics 표
- `events.jsonl`: 전체 이벤트 로그 (용량 크면 S3/R2 업로드)
- `memory-trace.csv`
- `drift-report.csv`: seed × wave × (TS metric, Unity metric, diff)

**아침 보기용**: `docs/unity-migration/nightly/$DATE-summary.md`가 repo에 자동 커밋 (별도 브랜치 `nightly-reports`). 문제 발견 시 `[FAIL]` 접두사.

### H. 변경 감지·skip 로직 (루틴 오버헤드 최소화)

- `unity-build.yml` 트리거 경로 필터: `packages/unity-game/**`, `packages/shared/src/**`, `scripts/export-shared-to-json.ts`, `.github/workflows/unity-*.yml`.
- 문서 전용 PR(`docs/**`, `*.md`)은 자동으로 Unity 관련 워크플로 skip.
- `[skip-unity-build]` PR title 키워드로 수동 skip.

### I. 실기·에뮬레이터 자동화 (Phase 8)

- **BrowserStack Automate** 또는 **Sauce Labs** 선택지:
  - 예산 있으면 실기 iOS 15+ × Android 12+ 매트릭스로 smoke 8-12개 돌림 (release-smoke.yml).
  - 예산 없으면 Playwright webkit + chromium (모바일 device descriptor)로 대체. 엄밀성 ↓하지만 회귀 감지는 충분.
- 검증 지표: first paint < 4s, `/unity/?screen=game-ready` 안에 `data-ready` 요소 존재, 터치 tap → `OnTowerSelected` 이벤트 발화(ex: `window.__gld_events`에 테스트용 브리지 노출).

### J. 새벽 브리핑 자동 생성

`scripts/morning-briefing.ts` (Phase 3 신설): 매일 아침 7시 cron으로 돌며
- 최근 24h 워크플로 결과 집계
- 실패한 check + 링크 + artifact 위치
- nightly-soak 요약에서 drift/누수 지표 추출
- Sentry `unity-*` release의 에러율

결과를 `docs/unity-migration/briefings/$DATE.md`로 저장하고, Slack 웹훅이 있다면 요약 메시지 전송. 야간 검증 결과 + 행동 추천이 한 파일.

---

## 검증 계획 (Phase별, 자동화 중심)

모든 Phase는 "자동화로 판정 가능한 exit gate"를 기본으로 한다. 수동 QA는 R5(폰트), R4(오디오 청각), R3(터치 체감) 등 자동화 한계 항목에만.

### Phase 0
**자동**:
- `ci.yml` + `unity-build.yml`이 PR에 green.
- `scripts/verify-boot.mjs`: Playwright webkit이 `<preview>/unity/`를 열어 "Unity Phase 0" UXML 라벨의 DOM 노드 존재 확인 → artifact 스크린샷.
- iOS Safari 로드 테스트는 Playwright webkit mobile preset으로 감정 완벽하진 않지만 smoke.

**수동**:
- 실기 iPhone 12에서 1회 방문 (morning briefing에 스크린샷 첨부 가능).

### Phase 1
**자동**:
- `bun test packages/shared/src/constants/__tests__/unity-export-parity.test.ts` round-trip.
- Unity EditMode `DataLoadTests.cs`: SO 카탈로그 전부 로드, null 필드 0, tier chain 연결, `MERGE_CHAIN` 무결.
- Atlas boundary snapshot (섹션 D).
- `Editor/ValidateAddressables.cs` manifest vs Addressables key diff 0.

**수동**: 없음.

### Phase 2 (PoC)
**자동**:
- `Slice2SmokeTest.cs` (PlayMode): 부트 → 아처 배치 → orc spawn → kill → energy +1 이벤트 시퀀스 확인.
- **결정적 replay 축소판**: seed 12345 fixture 1종을 TS·Unity 양쪽에서 60초 돌려 kill count·energy peak diff ≤5%.
- `unity-build.yml` 빌드 사이즈 <10MB (PoC 단계 목표).
- `lighthouse-ci.yml` informational 측정 (baseline 기록용).

**수동**:
- iPhone 12 실기 30초 레코딩 1회 (morning briefing 첨부).

### Phase 3 (코어 루프 parity)
**자동**:
- 전체 PlayMode 스위트 green.
- 섹션 B 결정적 replay 하네스: 10 fixture × 2 엔진, 타이밍 ±2%, metrics ±5%.
- `balance-drift.csv`가 50 seed × wave 1~10 drift <5%로 자동 기록.
- `unity-parity-gate.yml`이 required 승격.

**수동**: 없음 (R6 drift 허용치 튜닝이 필요하면 Game Designer agent 리뷰).

### Phase 4 (합성·가챠·보스·로그라이크)
**자동**:
- `GachaDistributionTests.cs` (10^5 롤, ±0.5%p).
- `MergeChainTests.cs` (all paths).
- `BossPhaseTransitionTests.cs` (10 seed × 4 보스).
- 섹션 B fixture 확장: `seed-002~005` 추가 포함.

**수동**: 없음.

### Phase 5 (UI/UX parity)
**자동**:
- `UIToolkitSmokeTest.cs`: 각 UXML 로드 → 주요 버튼 Click → 대응 `GameEvents` 발화.
- `visual-regression.yml`이 informational로 13 overlay × 2 브라우저 스크린샷 + diff.
- `schedule.Execute` 프로파일: 60초 run 중 UI Toolkit 재드로우 카운트 <100/frame.

**수동**:
- Galmuri11 가독성 1-2인 눈 검사 (R5).
- 합성 드래그 UX 체감 (R3).

### Phase 6 (저장·오디오·BM·Sentry)
**자동**:
- `save-migration-fuzz.yml` (100 synthetic payload, 모든 invariant green).
- `AdServiceContractTest.cs`, `AudioSmokeTest.cs`.
- Sentry release smoke: 부트 후 intentional `Log.Warning` 1건 발화 → 대시보드에 `unity-$SHA` release 수신 확인 자동 assertion.

**수동**:
- 실기 BGM/SFX 청각 확인 (R4).

### Phase 7 (parity gate + FTUE + 성능)
**자동**:
- 전체 `unity-parity-gate.yml` + `lighthouse-ci.yml` green.
- 번들 <30MB 압축 게이트.
- 섹션 B fixture 10종 전부 통과 (타이밍 ±2% 고도화).
- `nightly-soak.yml`이 최근 7일 연속 크래시 0 + drift <0.5%.

**수동**:
- QA-Checklist.md 2인 독립 통과 (R1/R5 포함).

### Phase 8 (프로덕션 전환)
**자동**:
- `release-smoke.yml`이 Vercel deploy webhook → 실기/에뮬 12 매트릭스 smoke green.
- A/B 없는 flag-day이므로 default swap 72h 동안 Sentry `unity-*` release 에러율 <0.5% (자동 알림: rate 초과 시 Slack 경고).
- 롤백 드릴 자동화: `scripts/rollback-drill.sh`가 Vercel env flag flip → 5분 대기 → `?engine=legacy` 응답 200 + Phaser 부트 완료 검증. PR로 주기 실행.

**수동**:
- runbook 절차 1회 수기 실행 후 로그 보존.

---

## 남은 Open Questions

### 블로커 (확정 완료)

1. ✅ **Unity 라이선스 티어 = Personal** → GameCI workflow `game-ci/unity-builder@v4`에 `UNITY_LICENSE` + `UNITY_EMAIL` + `UNITY_PASSWORD` repo secret 흐름. Phase 0 체크리스트에 secret 등록 단계 포함. Personal 라이선스는 `Unity.ulf` 파일을 `UNITY_LICENSE` secret으로 base64 인코딩해 주입.
2. ✅ **BGM Gates of the Waning Moon 재분배 = OK** → Unity 번들에 `.mp3`/`AudioClip` 포함 확정. Phase 6 `BgmService`에서 Compressed In Memory로 로드. R4 리스크 항목에서 "대체 BGM 필요성" 제거.
3. ✅ **`AGENTS.md` + `.claude/agents/README.md` 수정 = 승인** → Phase 0 PR에 다음 변경 포함:
   - `AGENTS.md`에 Unity 런타임 추가 명시 + Unity 4종 이중 사용 규칙(unity-game 스코프 직접 / phaser 스코프 레퍼런스)
   - `.claude/agents/README.md`의 "이 프로젝트에서의 사용 범위" 섹션 업데이트 — "본 저장소는 Phaser 3 + React 18 런타임" 문장을 "본 저장소는 **Phaser 3 + React 18 런타임(legacy)** 과 **Unity 2D WebGL 런타임(`packages/unity-game/`, 신규)** 을 병행 호스팅한다" 로 교체 + 4종 사용 규칙 스코프 별도 명시
   - 본 변경은 agent 정의 파일(`.claude/agents/*.md`)을 건드리지 않음 (원문 MIT 유지)

### 후결 가능

4. Addressables Remote 호스팅 — 기본 Vercel 동일 origin, 이슈 시 R2/CloudFront.
5. Save v8 백업 보존 — 30일 기본.
6. Unity 승격 방식 — flag-day cutover 기본. A/B면 Phase 7.5.
7. Supabase 화면 이관 — Phase 8 이후 별도 spec.
8. PWA shell 유지 — 기본 유지.

### 자동 검증 전제 (secret / 예산 요구)

아래는 Phase별로 필요해지는 GitHub Actions secret 및 선택적 예산. 없어도 대체 경로가 있지만 보강 효과 차이가 있음.

| Phase | 항목 | 종류 | 없을 때 대체 |
|-------|------|------|-----------|
| 0 | `UNITY_LICENSE` or `UNITY_EMAIL/PASSWORD` (Personal) 또는 `UNITY_SERIAL` (Pro) | 필수 | Unity 빌드 자체 불가 — 블로커 1번 |
| 0 | `VERCEL_TOKEN` (PR preview URL 회수용) | 권장 | Playwright 부트 smoke 일부만 local로 |
| 0 | `SENTRY_AUTH_TOKEN` (release tagging) | 권장 | release 묶음 없이 raw 이벤트만, 대시보드 품질 ↓ |
| 3 | `GITHUB_TOKEN` (기본 제공) | 필수 | — |
| 5 | Playwright baseline 저장용 Git LFS | 필수 | Baseline을 raw commit — 리포 크기 폭증 |
| 7 | `LHCI_GITHUB_APP_TOKEN` (Lighthouse CI, 선택) | 선택 | 로컬 artifact만 |
| 7 | Cloudflare R2 or AWS S3 credentials (nightly soak 로그 외부 저장) | 선택 | repo artifact만(7일 retention) |
| 8 | BrowserStack `BROWSERSTACK_USERNAME/ACCESS_KEY` 또는 Sauce Labs 대체 | 선택 | Playwright webkit/chromium 에뮬만 |
| 8 | `SLACK_WEBHOOK_URL` | 선택 | briefing MD만 — Slack 실시간 알림 없음 |
| 0~8 | GameCI Library 캐시 (GitHub Actions cache 20GB 무료 한도) | 필수 | 빌드 시간 25→40분 증가 |

**블로커 1 (Unity 라이선스)만 확정되면 나머지는 단계적으로 채워 넣어도 야간 검증의 "핵심" 커버리지(결정론 replay, balance drift, parity gate, bundle size, save fuzz)는 유지된다.**

---

## 플랜 생성 상태

| Phase | Plan 파일 | 상태 |
|-------|-----------|------|
| 0a 부트스트랩 (Claude 실행 가능 범위) | `docs/superpowers/plans/2026-04-24-unity-phase-0-bootstrap.md` | ✅ 작성 완료 (bite-sized TDD, 즉시 실행 가능) |
| 0b 사용자 실행 (Unity 설치, secret, 첫 씬/빌드) | `docs/unity-migration/phase-0b-runbook.md`로 위임 (Plan 0a의 Task 9에서 생성) | Phase 0a 실행 시 자동 생성 |
| 1 데이터·에셋 파이프라인 | `docs/superpowers/plans/2026-04-24-unity-phase-1-data-asset-pipeline.md` | ✅ 작성 완료 (outline-level) |
| 2 PoC 버티컬 슬라이스 | `docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md` | ✅ 작성 완료 (outline-level) |
| 3 코어 루프 parity | `docs/superpowers/plans/2026-04-24-unity-phase-3-core-loop-parity.md` | ✅ 작성 완료 (outline-level) |
| 4 합성·가챠·보스·로그라이크 | `docs/superpowers/plans/2026-04-24-unity-phase-4-merge-gacha-boss-roguelike.md` | ✅ 작성 완료 (outline-level) |
| 5 UI/UX parity | `docs/superpowers/plans/2026-04-24-unity-phase-5-ui-ux-parity.md` | ✅ 작성 완료 (outline-level) |
| 6 저장·오디오·BM·Sentry | `docs/superpowers/plans/2026-04-24-unity-phase-6-save-audio-bm-sentry.md` | ✅ 작성 완료 (outline-level) |
| 7 parity gate + FTUE + 성능 | `docs/superpowers/plans/2026-04-24-unity-phase-7-parity-gate-ftue-performance.md` | ✅ 작성 완료 (outline-level) |
| 8 프로덕션 전환 | `docs/superpowers/plans/2026-04-24-unity-phase-8-production-cutover.md` | ✅ 작성 완료 (outline-level, 사용자 go/no-go 결정 포함) |

**plan 수준 구분**

- **bite-sized TDD (Phase 0a만)**: writing-plans skill의 "No Placeholders" 룰을 완전 준수. 각 step에 실제 코드/명령/예상 출력 포함. 지금 바로 agent가 실행 가능.
- **outline-level (Phase 1~8)**: 플랜 헤더, 스코프, 파일 구조, task 분해는 구체적이나, Phase N의 Task 1은 항상 **담당 agent 자문 + 디자인 결정 문서화**로 시작한다. agent 자문 결과에 따라 Task 3+의 세부 구현이 revise될 수 있음을 플랜 상단에 명시. 이는 Phase N-1이 머지되기 전에는 Unity 측 구체적 파일 경로·심볼·SO 스키마가 아직 결정되지 않았기 때문의 의도된 구조. Phase 실행 직전에 plan을 rewrite하면 bite-sized로 승격 가능.

각 Phase는 별도 plan 문서로 분리한다 (writing-plans skill의 scope-check 룰: 독립 서브시스템은 독립 plan). Outline-level plans는 **roadmap + 구조 설계서**로 읽되, 실제 실행 직전에는 해당 시점의 repo 상태를 반영하여 bite-sized로 재작성하는 것을 권장.
