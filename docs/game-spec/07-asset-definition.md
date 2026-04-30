# 에셋 정의

> **Last Updated:** 2026-04-30 (v3.7 — detailed 64×64 몬스터 스프라이트 + death motion)
> **Source:** 최초 전환 계획 `docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md` (historical)
> 에셋 추가·변경 시 이 문서를 먼저 업데이트한다.
>
> **v3 변경 요약**: plasma, dragon_nest 타워 **완전 제거** (family/tier 모델 불일치). hybrid_ab / hybrid_cd / ultimate 3종 신규 placeholder 상태 명시. PR #173 포팅으로 Tilemap_dirt_seamless / grass_seamless / path seamless 타일셋 도입. Cinematic keyart 로비 에셋 (성 실루엣 CSS-only, 에셋 없음).
>
> **v3.1 변경 요약 (2026-04-20, PR #175)**: Phaser `Scale.NONE`으로 **게임 캔버스 내부 bitmap은 모든 기기에서 고정 432×960**. 소스 스프라이트시트(타워 64×80, 유닛 40×48, 보스 60×72, 타일 48×48)는 픽셀 아트 원본 해상도를 유지하되, 런타임 `setDisplaySize`로 축소해 타일 크기(48×48)와 조화시킨다. 디바이스별 스케일링은 canvas를 flex-1 슬롯에 `width/height: 100%`로 스트레치하는 CSS만으로 처리된다 (uniform-within-canvas).
>
> **v3.2 변경 요약 (2026-04-29)**: `main_long`은 제공 이미지 기반 일러스트 배경을 사용한다. 런타임은 원본을 확대하지 않는 최대 cover 해상도인 **752×1672 HQ WebP** 배경을 `field-main-long-bg` texture key로 로드해 큰 모바일 캔버스에서 432×960 원본이 확대되는 흐림을 줄인다. WebP 미지원 환경은 432×960 PNG fallback을 사용한다. 게임 전체는 픽셀 스프라이트를 위해 nearest 필터를 유지하되, 일러스트 배경 texture만 `LINEAR` 필터로 전환해 축소 렌더링 계단 현상을 줄인다. 몬스터 이동은 0.55x 표시 속도 배율을 적용하고, 경로는 이미지 흙길 중심 픽셀을 waypoint로 역변환한다. 타워 배치는 이미지에 그려진 6개 빈 네모칸 중심에 `placementAnchors`로 스냅한다.
>
> **v3.3 변경 요약 (2026-04-30)**: 몬스터/보스 에셋은 `imagegen` 원화(`assets-source/monsters/`)를 기반으로 전면 교체했다. 런타임 출력은 `scripts/imagegen-monsters/build-unit-sheets.py`가 chroma-key 제거, 하체 스텝/바운스 프레임 패킹, WebP 변환을 수행한다. 기존 `scripts/generate-assets` 유닛 생성기는 이번 몬스터 교체의 소스로 사용하지 않는다.
>
> **v3.4 변경 요약 (2026-04-30)**: 일반 몬스터 소스 프레임을 **80×96**으로 확대하고 런타임 표시 크기를 **32×40**으로 복구했다. walk는 공용 bobbing이 아니라 unit별 `quick/heavy/robe/shield/flame/dragon` gait를 사용한다. chroma-key 잔여 픽셀과 이웃 셀 조각은 connected-component cleanup으로 제거한다. 보스 dragon sheet는 **128×128** 프레임으로 재패킹하고 표시 크기는 **48×56**이다.
>
> **v3.5 변경 요약 (2026-04-30)**: 몬스터/보스 런타임 에셋을 `imagegen` 원화 기반 **64×64 픽셀아트 프레임**으로 재패킹했다. `scripts/imagegen-monsters/build-unit-sheets.py`는 imagegen 원화의 실루엣을 유지하면서 chroma-key 제거, 저색상 팔레트 정리, 1px outline, 전용 8프레임 walk/6프레임 idle/death를 생성한다. 런타임 표시 크기는 일반 **32×32**, 보스 **42×42**로 정사각형 비율을 유지한다.
>
> **v3.6 변경 요약 (2026-04-30)**: 몬스터/보스 런타임 에셋을 첨부 참고 이미지풍 **clean cartoon sprite**로 다시 교체했다. 고해상도 원화 컷아웃을 축소하지 않고, 64×64 프레임 안에서 굵은 dark outline, 단순 면 색상, 고정 feet baseline, 전용 8프레임 walk를 직접 생성한다. 기존 `imagegen` 원화 파일은 레퍼런스/아카이브로만 보관하며 런타임 시트의 직접 입력으로 사용하지 않는다.
>
> **v3.7 변경 요약 (2026-04-30)**: 64×64 전용 스프라이트에 2~3단계 내부 명암, 장비/벨트/금속 하이라이트, 개체별 소품 디테일을 추가했다. death 시트는 정지 잔해가 아니라 피격 스파크 → 기울어짐 → 쓰러짐 → 잔해/먼지로 이어지는 6프레임 전용 모션으로 교체했다.

---

## 1. 공통 제작 사양

### 파이프라인

| 항목 | 사양 |
|------|------|
| 도구 | 기본 에셋: `@napi-rs/canvas` (TypeScript). 몬스터/보스: 참고 이미지풍 64×64 스프라이트를 `imagegen-monsters` Pillow 렌더러로 생성 |
| 생성 스크립트 | 기본 에셋: `scripts/generate-assets/`. `main_long` 배경: `scripts/generate-assets/generate-main-long-background.ts`. 몬스터/보스: `scripts/imagegen-monsters/build-unit-sheets.py` |
| 출력 경로 | `packages/web-shell/public/assets/` |
| 포맷 | PNG (원본) + WebP (런타임, `convert-webp.ts` 자동 변환) |
| 매니페스트 | `asset-manifest.json` (자동 생성, **수동 편집 금지**) |

### 공통 규격

| 항목 | 값 |
|------|---|
| Base Resolution | 64×80px (타워), 64×64px (유닛/보스/타일) |
| 보스 해상도 | 64×64px |
| Spritesheet | walk/fire: 8프레임, idle: 6프레임, death: 6프레임, 가로 연결 (예: 유닛 walk 512×64, idle 384×64) |
| Pivot/Origin | center (0.5, 0.5) |
| Trim | 불허 — 고정 프레임 크기 유지 |
| 색상 팔레트 | `scripts/generate-assets/shared.ts`의 PALETTE 상수 |

### 폰트/이미지 로딩 전략

로비 진입 시 FOUT/pop-in을 방지하기 위해 폰트와 UI 이미지를 사전 로드한다.

**폰트 preload** (`packages/web-shell/index.html`)

```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11-Bold.woff2" />
<link rel="stylesheet" href="…/galmuri.css" integrity="…" crossorigin />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" />
```

- **금지**: CSS `@import url('...Press+Start+2P...')` — stylesheet fetch가 CSS 파싱 뒤로 밀려 FOUT 발생. 반드시 HTML `<link>`로 이동한다.
- Galmuri woff2는 `galmuri.css` 로드 전에 병렬 받도록 `<link rel="preload">` 필수. `integrity` 값은 `galmuri.css`에만 적용되며 woff2 파일에는 사용하지 않는다.
- Galmuri 버전을 올릴 때 preload URL의 `@version`이 stylesheet와 일치해야 한다 — 불일치 시 preload가 404로 낭비된다.

**UI 이미지 preload** (`packages/web-shell/src/utils/preloadAssets.ts`)

```ts
export function preloadImages(urls: string[]): Promise<undefined[]>;
```

- `App.tsx` boot `useEffect`에서 `preloadImages(Object.values(uiMobileArt))` fire-and-forget 호출.
- 개별 실패는 블로킹하지 않고 `resolve(undefined)` — 네트워크 장애 시 로비 자체가 막히지 않도록.
- 대상: `uiMobileArt` 전체(17개, 배경 + 아이콘). 대부분 작은 webp이므로 전체 preload 부담 없음.

---

## 2. 에셋 인벤토리 (현재 상태)

| 카테고리 | 파일 수 | 생성기 | 상태 |
|---------|--------|-------|------|
| 타워 스태틱 | 18 PNG+WebP | `generate-towers.ts` | ✅ 완료 |
| 타워 공격 애니 | 18 spritesheet | `generate-towers.ts` | ✅ 완료 |
| 유닛 walk | 12 spritesheet (8f, 512×64) | `imagegen-monsters` | ✅ 교체 완료 |
| 유닛 idle | 12 spritesheet (6f, 384×64) | `imagegen-monsters` | ✅ 교체 완료 |
| 유닛 death | 12 spritesheet (6f, 384×64) | `imagegen-monsters` | ✅ 교체 완료 |
| 보스 전용 | 2 spritesheet (8f, 512×64) | `imagegen-monsters` | ✅ 교체 완료 |
| 투사체 | 4 spritesheet | `generate-projectiles.ts` | 부분 완료 |
| VFX | 4 spritesheet | `generate-vfx.ts` | 부분 완료 |
| UI (PVE) | ~34 PNG+WebP | `generate-ui.ts`, `generate-match-ui.ts` | PVP 혼재 |
| UI 모바일 | ~44 PNG+WebP | `generate-ui-mobile.ts` | ✅ 완료 |
| 타일 | tileset PNG | `generate-tiles.ts`, `generate-tileset.ts` | forest만 완료 |
| 맵 | 1 JSON + 1 배경 PNG/WebP | `generate-map.ts`, `generate-main-long-background.ts` | `main_long` 일러스트 배경 완료 |
| 아이콘 | ~8 PNG+WebP | `generate-icons.ts` | ✅ 완료 |
| vendor | tiny-swords 팩 | N/A | ✅ 완료 |

**현재 총계: ~234 PNG+WebP**

---

## 3. 타워 에셋 (19종 — v3)

### v3 타워 인벤토리

**완성된 에셋 (16종, 기존 제작분 재활용)**
- archer family: archer, wind_spire, flame_tower, arcane_spire
- siege family: nova_cannon, fortress, earth_golem, celestial
- frost family: emp, stasis_field, disruptor, world_tree
- stun family: shield, twin_archer, holy_shrine, divine_throne

**Placeholder (3종 — 전용 아트 미제작)**
| id | tier | 임시 스프라이트 alias | VFX 차별화 |
|----|------|---------------------|----------|
| `hybrid_ab` | 5 | `arcane_spire.png` alias | 금색 aura 파티클 (`tint: 0xffcc33`) |
| `hybrid_cd` | 5 | `world_tree.png` alias | 보라 aura 파티클 (`tint: 0x9966ff`) |
| `ultimate` | 6 | `divine_throne.png` alias | 무지개-gold aura + 강한 파티클 버스트 |

합성 reveal 시 추가 연출: camera flash (300ms, white) + scale punch (0.8→1.0, Back.easeOut) + 파티클 burst (tier 5: 30 particles, tier 6: 2개 ring + 더 큰 burst).

**제거된 타워 (Phase 1 마이그레이션)**
- ~~plasma~~ (family/tier 모델 불일치, siege T1 자리는 nova_cannon이 차지)
- ~~dragon_nest~~ (FusionTowerType enum 제거)

**Save migration v6→v7**: 기존 소유 `plasma` / `dragon_nest` 엔트리는 save에서 purge.

### 타워 파일 구성 (1개당)

| 파일 | 해상도 | 프레임 | 설명 |
|------|-------|-------|------|
| `tower-{id}.png` | 128×160 | 1 (static) | 배치 상태 (런타임 `setDisplaySize(64,80)`으로 표시) |
| `tower-{id}-fire.png` | 512×80 | 8 (spritesheet) | 공격 애니메이션 (충전→발사→비행→잔상→복귀) |

**Note**: v2의 grade variant (rare/unique/epic PNG) 전부 placeholder fallback으로 처리. v3는 tier가 별개 타워 id이므로 grade 스프라이트 세트 불필요.

### 발사체 스타일

| 타입 | 시각 | 사운드 |
|------|------|--------|
| arrow (archer, twin_archer) | 포물선 화살 + trail + 임팩트 플래시 | 휘이익 + 탁 |
| beam (emp, wind_spire 등) | 직선 빔 + 임팩트 플래시 | sawtooth/square 주파수 스윕 |
| arc (siege family: nova_cannon, fortress, earth_golem, celestial) | 포물선 돌 발사체 + trail dots | 3단계: 퍽(brown noise)→휘이(white bandpass)→쿵(brown noise) |

**v3 회귀 수정**: Phase 1 재작성에서 siege special string이 `'splash'` → `'splash_<radius>'` 포맷으로 바뀌었으나 `hasSplash()` 헬퍼가 정확히 매칭하지 못해 siege 타워 전체가 beam 스타일로 폴백됐던 버그를 post-ship에서 수정 (`startsWith('splash_')`). 공성 타워는 반드시 arc 스타일로 돌을 발사한다.

투석기(splash 타워) 팔 스윙 애니메이션: 180° 회전, 8프레임 (로딩→텐셔닝→발사→최대→반동→복귀)

### 역할군별 실루엣 규칙

| 역할군 | 실루엣 | 키워드 |
|--------|-------|-------|
| 집중 공격형 | 날카롭고 직선적 | narrow, sharp, vertical |
| 다중 공격형 | 넓고 무거운 포구 | wide, heavy cannon, horizontal |
| 슬로우 | 수정형/마법적 | crystalline, magical, aura |
| 스턴 | 제단/방패/성채형 | altar, shrine, shield |

### 티어별 시각 규칙

| Tier | 이름 | 크기 배율 | 글로우 |
|------|------|---------|-------|
| 1 | 일반 | 1.0x | 없음 |
| 2 | 레어 | 1.05x | 약한 외곽선 |
| 3 | 유니크 | 1.10x | 속성 색 글로우 |
| 4 | 에픽 | 1.15x | 메탈릭 + 오라 |
| 5 | 전설 | 1.20x | 방사형 + 파티클 |

### 3.5 타워 HQ 스프라이트 규격 (2026-04-10~)

- 대상: 전체 18종 (파일럿 8종 + 나머지 10종 모두 전환 완료)
- 스타일: `drawIsoCube` 기반 중세 픽셀 아트 (하드 엣지, PALETTE 색상)
- 해상도: 정적 스프라이트 128×160, fire spritesheet 64×80×8=512×80 (HQ base를 64×80으로 축소 + fire 이펙트 overlay)
- Grade variant: normal/rare/unique/epic 4종 (18×4=72 정적 스프라이트)
  - 에셋 파일명: `assets/towers/{id}.png`, `assets/towers/{id}-rare.png`, `assets/towers/{id}-unique.png`, `assets/towers/{id}-epic.png`
  - 매니페스트 key: `tower-{id}`, `tower-{id}-rare`, `tower-{id}-unique`, `tower-{id}-epic`
  - Normal은 base 스프라이트, rare/unique/epic은 공통 decoration 헬퍼로 overlay
- Grade decoration 헬퍼: `scripts/generate-assets/towers/grade-decoration.ts`
  - rare: 청록 배너 + V 트림
  - unique: rare + 보라 크리스탈 + glow
  - epic: unique + 금색 아우라 + 부유 파편
- 투사체 속도: `TowerStats.projectileSpeed` (tiles/sec). arc/arrow 타워는 투사체 비행 시간만큼 데미지 지연. beam 타워는 즉시
  - arrow (archer/twin_archer): 8, arc-slow (plasma/nova_cannon/earth_golem): 3~4, arc-mid (disruptor/dragon_nest): 5, arc-fast (celestial): 6
  - beam (emp/flame_tower/wind_spire/arcane_spire): 생략 = 즉시 적중
- idle animation: Phaser runtime tween (scale pulse 1.03x, 1800ms yoyo, Sine.InOut, 위상 offset)
- 승급 연출: 로비 `GradePromotionOverlay` one-shot (1.2s), React + CSS transition
- 런타임 표시: `setDisplaySize(64, 80)`으로 그리드 크기 정규화
- 공성대포(nova_cannon): body(128×160) + barrel(32×16) 분리. barrel은 별도 스프라이트로 가장 가까운 적 방향을 상시 추적

---

## 4. 속성/티어 색상 정책

### 속성 색상

| 속성 | 1차 색상 | 보조 색상 |
|------|---------|---------|
| 화(Fire) | `#e74c3c` red/orange | warm glow |
| 수(Water/Ice) | `#3498db` blue/cyan | frost aura |
| 번개(Lightning) | `#f39c12` yellow/purple | spark trail |
| 무(Neutral) | `#c8a04a` earth/gold | muted tone |

### 탭 아이콘 색상 정책

| 상태 | 외곽/메인 | 하이라이트 | 그림자 |
|------|---------|---------|------|
| Active | `#c8a050` | `#d4b060` | `#9a7830` |
| Inactive | `#6a5020` | `#8a6838` | `#4a3810` |

> **금색 계열(`#e2b714`, `#f0d060`) 사용 금지** — 과도하게 강조됨

---

## 5. 적 유닛 에셋 (12종)

| id | name | 크기 | walk 파일 | idle 파일 | death 파일 |
|----|------|------|-----------|-----------|------------|
| scout_drone | 고블린 scavenger | 작음 | `scout_drone.png` 512×64 (8f) | `scout_drone_idle.png` 384×64 (6f) | `scout_drone_death.png` 384×64 (6f) |
| battle_robot | orc veteran | 중간 | `battle_robot.png` 512×64 (8f) | `battle_robot_idle.png` 384×64 (6f) | `battle_robot_death.png` 384×64 (6f) |
| heavy_walker | stone troll | 큼 | `heavy_walker.png` 512×64 (8f) | `heavy_walker_idle.png` 384×64 (6f) | `heavy_walker_death.png` 384×64 (6f) |
| stealth_drone | shadow assassin | 가늘음 | `stealth_drone.png` 512×64 (8f) | `stealth_drone_idle.png` 384×64 (6f) | `stealth_drone_death.png` 384×64 (6f) |
| flame_imp | 화염 임프 | 작음 | `flame_imp.png` 512×64 (8f) | `flame_imp_idle.png` 384×64 (6f) | `flame_imp_death.png` 384×64 (6f) |
| lava_golem | 용암 골렘 | 큼 | `lava_golem.png` 512×64 (8f) | `lava_golem_idle.png` 384×64 (6f) | `lava_golem_death.png` 384×64 (6f) |
| arcane_mage | 마법사 유닛 | 중간 | `arcane_mage.png` 512×64 (8f) | `arcane_mage_idle.png` 384×64 (6f) | `arcane_mage_death.png` 384×64 (6f) |
| mana_shield | 마력 방패병 | 중간 | `mana_shield.png` 512×64 (8f) | `mana_shield_idle.png` 384×64 (6f) | `mana_shield_death.png` 384×64 (6f) |
| orc_warlord | 오크 전쟁 대장 | 보스 | `orc_warlord.png` 512×64 (8f) | `orc_warlord_idle.png` 384×64 (6f) | `orc_warlord_death.png` 384×64 (6f) |
| forge_master | 단조장의 군주 | 보스 | `forge_master.png` 512×64 (8f) | `forge_master_idle.png` 384×64 (6f) | `forge_master_death.png` 384×64 (6f) |
| corrupted_archmage | 타락한 대마법사 | 보스 | `corrupted_archmage.png` 512×64 (8f) | `corrupted_archmage_idle.png` 384×64 (6f) | `corrupted_archmage_death.png` 384×64 (6f) |
| dragon | 고대 드래곤 | 보스급 | `dragon.png` 512×64 (8f) | `dragon_idle.png` 384×64 (6f) | `dragon_death.png` 384×64 (6f) |

공통 스타일: 참고 이미지풍 중세 판타지 clean cartoon sprite, 64×64 고정 프레임, 굵은 dark outline, 단순 면 색상, 2~3단계 내부 명암, 고정 feet baseline, TinySwords 톤 팔레트.
모든 런타임 유닛은 개별 death 시트를 사용하며 공용 `unit-death.png`는 제거한다.

### 애니메이션 상태 시스템

런타임 유닛은 `walk → idle → death` 상태를 사용한다.
- `walk`: feet baseline 고정 + body bob/limb contact 기반 8프레임 워크 사이클
- `idle`: 6프레임 대기 루프
- `death`: 피격 스파크 → 기울어짐 → 쓰러짐 → 잔해/먼지 6프레임 전용 사망 애니메이션 후 sprite destroy
- stun 중에는 `idle`, 이동 중에는 `walk`, 사망 시에는 공용 death FX 대신 유닛 본체 `death`를 재생한다.

### walk 모션 공통 규칙

unit별 8프레임 워크 사이클:
- humanoid: 고정 feet baseline, 좌우 다리 contact 교차, 1px body bob
- heavy: 넓은 contact shadow, 낮은 중심, 무거운 실루엣
- robe: 로브/스태프/오브 실루엣 중심의 단순 sway
- flame: 보폭 + 프레임별 화염 flicker
- dragon: 날개/꼬리 sway + 낮은 비행 bob

| 유닛 | walk/idle/death 연출 |
|------|----------------------|
| 고블린 scavenger | 등짐과 잡동사니가 흔들리고, idle에서 하중 sway, death에서 잡동사니/금화가 흩어진다 |
| orc veteran | 비대칭 갑옷과 배틀액스 실루엣, idle 호흡, death에서 갑주 분리와 붕괴를 표현한다 |
| stone troll | 거대한 어깨와 곤봉, idle heavy breathing, death에서 rubble pile로 무너진다 |
| shadow assassin | 하체 alpha gradient와 눈 glow, idle pulse, death에서 연기와 cape fragment로 소멸한다 |
| 고대 드래곤 | 날개 ±5px 펄럭, 꼬리 스윙, 화염 입김 |

---

## 6. 보스 에셋 (dragon)

| 상태 | 설명 | 특이사항 |
|------|------|---------|
| Phase 1 idle | 512×64 (8프레임 spritesheet), 호흡+날개+화염 | `dragon-boss.png` |
| Phase 2 rage | 동일 + fireRed 틴트 (0.25), 프레임별 절대좌표 적용 | `dragon-boss-rage.png` |
| Weak point | 수 속성 집중 화력에 취약 — 하이라이트 영역 | |
| Death | 소멸 이펙트 | 보스 전용 (미구현) |

---

## 7. VFX (현재 + 추가 필요)

### 현재 보유

`explosion-sm`, `explosion-lg`, `shield-bubble`, `spawn-portal`

### 추가 필요

| 분류 | 에셋 키 |
|------|-------|
| 전투 | `tower-place-fx`, `tower-upgrade-fx` |
| 상태 | `buff-aura`, `debuff-slow`, `debuff-stun` |
| 보스 | `boss-phase-transition`, `boss-death-fx` |
| 보상 | `gold-popup-fx`, `stage-clear-fx` |
| 가챠 | `gacha-reveal-fx`, `gacha-rarity-glow` |

---

## 8. UI 에셋

### 인라인 SVG (코드 내장)

| 컴포넌트 | 크기 | 색상 출처 | 용도 |
|---------|------|---------|------|
| `DiamondIcon` | 12×12 | info (#5bc8e8) 계열 | 다이아몬드 통화 표시 (ProfileBar, MissionsTab) |
| `CoinIcon` | 12×12 | gold (#f0d060) + accent (#c8a04a) | 골드 통화 표시 (MissionsTab) |

> 코드 위치: `packages/web-shell/src/components/ui/CurrencyIcon.tsx`

### 이미지 에셋 (추가 필요)

| 분류 | 에셋 |
|------|------|
| HUD | `wave-counter`, `energy-gauge`, `boss-hp-bar` |
| 결과 | `defense-success`, `defense-fail` |
| 바텀 탭 | `*-tab-icon-active` / `*-tab-icon-inactive` (4종) |
| 로비 | `tower-card-bg` (등급별), `upgrade-button` |
| 컬렉션 | `rarity-frame` (5종), `level-badge` |
| 덱 | `deck-slot` |
| 가챠 | `box-free`, `box-ad`, `box-diamond`, `box-premium`, `gacha-chest` (개봉 애니용) |
| 튜토리얼 | `highlight-frame`, `arrow-indicator`, `hint-bubble` |
| 스테이지 선택 | `icon-energy` (번개), `icon-sword` (검), `icon-arrow-left` (화살표), `icon-edit` (연필) — 16×16 픽셀 아이콘, `check-badge` (클리어 배지, 골드 방패+체크마크) — 20×20 |
| 스테이지 썸네일 | `stage-thumb-forest_gate`, `stage-thumb-lava_fortress`, `stage-thumb-storm_citadel` — 맵 미리보기 |

### World Map Assets

| Key | File | Size | Description |
|-----|------|------|-------------|
| ui-worldmap-bg | ui/worldmap-bg.png | 512x768 | 월드맵 배경 (ComfyUI 픽셀아트) |
| ui-landmark-forest_gate | ui/landmark-forest_gate.png | 96x96 | 숲의 성문 랜드마크 |
| ui-landmark-lava_fortress | ui/landmark-lava_fortress.png | 96x96 | 용암 요새 랜드마크 |
| ui-landmark-storm_citadel | ui/landmark-storm_citadel.png | 96x96 | 폭풍 성채 랜드마크 |

---

## 9. 맵 에셋

정식 모드는 `main_long` 단일 맵을 사용한다. 게임 로직은 9×18 논리 그리드, path, placement data를 유지하고, 시각 지형은 사용 권리가 확인된 제공 원본 이미지를 한 장짜리 일러스트 배경으로 렌더링한다.

| asset | 파일 | 해상도 | 설명 |
|------|------|--------|------|
| field-main-long-bg | maps/main-long-bg-hq.webp | 752×1672 | 런타임 로드용 원본 비확대 HQ `main_long` 배경 |
| field-main-long-bg-preview | maps/main-long-bg.png / .webp | 432×960 | 고정 게임 논리 해상도 기준 preview/fallback 배경 |
| main-long-central-castle | maps/main-long-central-castle.png / .webp | 340×410 | 원본 이미지에서 중앙 성채를 별도 에셋으로 보관 |
| tilemap-main-long | maps/main-long.json | 8×24 legacy JSON | fallback/호환용 tilemap data |

원본 소스는 `scripts/generate-assets/sources/main-long-reference.png`에 보관한다. 배경은 원본 비율을 유지한 cover-crop으로 432×960/864×1920에 맞춘다. 게임 판정은 별도의 보이지 않는 논리 그리드가 담당한다. 적 이동 경로는 이미지의 흙길 중심 픽셀을 `worldToMainLongGridPoint()`로 역변환한 소수점 waypoint를 사용한다. 타워 배치는 6개 `buildablePoints`만 허용하고, 각 칸은 `placementAnchors`의 이미지 좌표 중심으로 스냅한다. 중앙 성채와 스폰 문은 별도 런타임 에셋이 있더라도 배경과 중복되므로 `main_long`에서는 렌더링하지 않는다.

---

## 10. 네이밍 규칙

### 매니페스트 키

```
tower-{id}           # 타워 스태틱
tower-{id}-fire      # 타워 공격 애니메이션
unit-{id}            # 유닛 walk cycle
unit-{id}-idle       # 유닛 idle cycle
unit-{id}-death      # 유닛 death cycle
projectile-{type}    # 투사체
vfx-{name}           # VFX
ui-{element}         # UI 요소
tilemap-{stage-id}   # 타일맵
icon-{category}-{id} # 아이콘
```

> 현재 코드는 `-` 구분자 기반 (`tower-archer`, `unit-scout_drone`). **기존 패턴 유지.**

---

## 11. 등급 색상 토큰

> `ui-colors.ts`의 디자인 토큰과 일치해야 한다.

| 등급 | 테두리 색상 | 글로우 |
|------|----------|-------|
| normal | border (#4a3a20) | 없음 |
| rare | info (#5bc8e8) | 없음 |
| unique | gradeUnique (#9060e0) | 없음 |
| epic | gold (#f0d060) | `0_0_8px` glow |
| legendary | tierBright (#ffe870) | `0_0_12px` glow |

---

## 12. 변경 이력

| 날짜 | 항목 | 변경 내용 |
|------|------|---------|
| 2026-04-07 | 최초 작성 | 게임 에셋 제작 specs 기반 |
| 2026-04-07 | §8, §11 | CurrencyIcon SVG 추가, 등급 색상 토큰 섹션 신설 |
| 2026-04-07 | 애니메이션 강화 | 4→8프레임, 투석기 포물선/사운드, 보스 idle spritesheet, 걷기 모션 시스템 |
| 2026-04-09 | §8 World Map Assets | 월드맵 배경 + 랜드마크 에셋 추가 |
| 2026-04-09 | §1 폰트/이미지 로딩 전략 | Galmuri11 woff2 `<link rel="preload">`, Press Start 2P는 HTML `<link rel="stylesheet">`(CSS `@import` 금지), `preloadImages()` 유틸로 UI 이미지 17개 boot 시점 사전 로드 |
| 2026-04-10 | §1, §2, §5, §6 | 일반 몬스터 4종 에셋 강화: 3-tone+1px 아웃라인, walk 8f + idle 6f + death 6f, 유닛별 실루엣 훅, stealth_drone 추상형→캐릭터형, 공용 unit-death 폐기, §1 spritesheet 규격 idle/death 추가, 보스 §6 후속 이슈 주석 |
| 2026-04-10 | §3, §3.5 | 전체 18종 HQ iso-cube 중세 픽셀 스프라이트 + projectileSpeed + 사거리 밸런스 + barrel 트래킹 + 쌍궁탑 이중 화살 + 눈보라탑 눈덩이 + grade variant + idle tween + 승급 연출 |
| 2026-04-20 | §3, §11 (전반) | **v3 정식 모드 승격**. plasma / dragon_nest 완전 제거. hybrid_ab / hybrid_cd / ultimate 3종 placeholder 상태 (T4 스프라이트 alias + aura VFX 차별화). Siege projectile arc 회귀 수정 (`hasSplash()` startsWith 교정). PR #173 포팅으로 Tilemap_dirt_seamless / Tilemap_grass_seamless / Tilemap_path seamless 타일셋 도입 (grass platform 9-slice + cliff wall graphics + dirt tileSprite base). Cinematic keyart 로비 (성 실루엣·달·횃불·안개, CSS-only, 에셋 파일 없음). Grade variant 세트 (rare/unique/epic PNG)는 v3에서 불필요 — tier가 별개 타워 id이므로. |
| 2026-04-20 | 헤더, §1 | **v3.1 정식 모드 안정화 (PR #175)**. 고정 논리 해상도 432×960 확정 — Phaser `Scale.NONE`으로 모든 디바이스에서 캔버스 내부 bitmap 기준을 동일하게 유지. 소스 에셋 크기(타워 64×80, 유닛 40×48 / 60×72, 타일 48×48)는 그대로, 런타임 `setDisplaySize`로 타일 폭에 맞춤. 디바이스 스케일링은 canvas CSS `width/height: 100%`로 flex-1 슬롯에 맞춤 (전체 DOM을 스케일하는 CSS transform wrapper는 모바일 세로형 표준과 충돌해 미사용). |
| 2026-04-29 | 헤더, §1, §2, §9 | `main_long`을 제공 이미지 기반 일러스트 배경 맵으로 교체. HQ WebP 배경, 이미지 좌표 기반 waypoint, 6개 `placementAnchors`, 축소된 몬스터 표시 크기/속도 배율을 적용한다. |
| 2026-04-30 | 헤더, §1, §2, §5, §6 | 몬스터/보스 에셋 전면 교체. `imagegen` 원화를 `assets-source/monsters/`에 보관하고 `scripts/imagegen-monsters/build-unit-sheets.py`로 chroma-key 제거, 하체 스텝/바운스 walk 프레임 패킹, PNG/WebP 출력을 생성한다. |
| 2026-04-30 | 헤더, §2, §5, §6 | 몬스터 프레임을 80×96으로 확대하고 런타임 표시 크기를 32×40으로 복구. `quick/heavy/robe/shield/flame/dragon` 전용 gait walk sheet와 connected-component cleanup으로 재생 자연스러움을 개선한다. |
| 2026-04-30 | 헤더, §1, §2, §5, §6 | 몬스터/보스를 imagegen 원화 기반 64×64 픽셀아트 시트로 재패킹. 실루엣 디테일을 유지하면서 일반 32×32, 보스 42×42 정사각형 표시 크기로 변경한다. |
| 2026-04-30 | 헤더, §1, §5, §6 | 몬스터/보스를 첨부 참고 이미지풍 clean cartoon sprite로 재교체. 고해상도 원화 컷아웃 축소 대신 64×64 프레임 안에서 굵은 외곽선, 단순 면 색상, 고정 feet baseline, 전용 walk 시트를 직접 생성한다. |
| 2026-04-30 | 헤더, §5 | 몬스터/보스 64×64 시트에 내부 명암과 장비 디테일을 추가하고, death 시트를 피격/쓰러짐/잔해 6프레임 전용 모션으로 교체한다. |
