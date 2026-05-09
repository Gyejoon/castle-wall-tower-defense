# 에셋 정의

> **Last Updated:** 2026-05-10 (v4.3 — Unity combat SFX and monster hit/death feedback)
> **Goal:** v1 출시는 현재 보유 에셋을 최대한 재사용한다. 신규 에셋 제작은 재미 검증 이후로 미룬다.

---

## 1. Asset Policy

| 원칙 | 내용 |
|------|------|
| 신규 제작 최소화 | v1 Go/No-Go 전에는 신규 맵/상점/미션 에셋을 만들지 않는다 |
| 현재 산출물 우선 | `packages/web-shell/public/assets/`에 커밋된 파일을 기준으로 한다 |
| 생성 스크립트 보존 | 에셋 변경 시 generator와 산출물을 함께 관리한다 |
| Unity 전환 고려 | Unity 복사는 전환 트랙에서 별도로 다루며 Phaser v1 asset scope를 키우지 않는다 |
| 판독성 우선 | 작은 모바일 화면에서 읽히지 않는 디테일은 줄인다 |

---

## 2. Current Runtime Inventory

| 카테고리 | 상태 | v1 정책 |
|----------|------|---------|
| 타워 19종 static/runtime/fire | 완료 | 유지 |
| 몬스터/보스 spritesheet | 완료 | 사용 종수만 줄여 판독성 확보 |
| 투사체 | 부분 완료 | 현재 있는 것만 사용 |
| VFX | 부분 완료 | 필수 피드백만 사용 |
| UI 모바일 에셋 | 완료 | 유지 |
| `main_long` 배경 | 완료 | 단일 맵으로 유지 |
| tiny-swords vendor | 보유 | fallback/호환용 |

현재 에셋 총량을 늘리는 것보다, 실제 모바일 화면에서 잘 읽히는지 확인하는 것이 우선이다.

---

## 3. Tower Assets

v1 타워는 19종을 유지한다.

| Family | Tower IDs |
|--------|-----------|
| archer | archer, wind_spire, flame_tower, arcane_spire |
| siege | nova_cannon, fortress, earth_golem, celestial |
| frost | emp, stasis_field, disruptor, world_tree |
| stun | shield, twin_archer, holy_shrine, divine_throne |
| hybrid/ultimate | hybrid_ab, hybrid_cd, ultimate |

### File Shape

| 파일 | 용도 |
|------|------|
| `tower-{id}.png` | source/static |
| `tower-{id}-runtime.png` | Phaser runtime display |
| `tower-{id}-fire.png` | attack spritesheet |

grade variant는 v1 active asset이 아니다. 기존 호환 파일이 있더라도 새 제작 요구사항으로 보지 않는다.

---

## 4. Unit and Boss Assets

보유 유닛은 12종이지만, v1 wave에는 필요한 만큼만 노출한다.

| 역할 | 후보 |
|------|------|
| 빠른 약체 | scout_drone, flame_imp |
| 일반 | battle_robot, arcane_mage |
| 탱커 | heavy_walker, lava_golem |
| 특수 | stealth_drone, mana_shield |
| 보스 | orc_warlord, forge_master, corrupted_archmage, dragon |

파일 규격은 기존 64x64 frame 계열을 유지한다.

| 상태 | 기본 |
|------|------|
| walk | 8 frames |
| idle | 6 frames |
| death | 6 frames |

Unity v1은 몬스터 피격 시 walk 첫 프레임에서 파생한 red tint hit sprite를 짧게 표시하고, 사망 시 death sheet 첫 프레임을 fade-out한다. 보스 death 전용 VFX가 없으면 기존 death sheet 또는 간단한 fade/flash로 처리한다. 신규 보스 death 에셋은 v1 필수가 아니다.

---

## 5. Map Assets

v1 맵은 `main_long` 하나다.

| asset | 파일 | 정책 |
|------|------|------|
| field-main-long-bg | `maps/main-long-bg-hq.webp` | 유지 |
| field-main-long-bg-preview | `maps/main-long-bg.png` / `.webp` | fallback |
| main-long-central-castle | `maps/main-long-central-castle.png` / `.webp` | 필요 시만 사용 |
| tilemap-main-long | `maps/main-long.json` | legacy/fallback |

신규 맵, 월드맵, 스테이지 썸네일은 v1 제외다.

---

## 6. VFX

### V1 Required Feedback

| 상황 | 허용 방식 |
|------|-----------|
| 소환 성공 | 현재 VFX 또는 간단한 flash |
| 합성 성공 | scale punch + particle burst |
| 보스 등장 | warning overlay + shake 옵션 |
| 카드 선택 | DOM highlight |
| 게임오버 | DOM result screen |

### Deferred VFX

- `tower-upgrade-fx`
- `buff-aura`
- `debuff-slow`
- `debuff-stun`
- `boss-death-fx`
- `stage-clear-fx`
- `gacha-rarity-glow`

## 7. Audio Assets

v1은 별도 오디오 파일을 필수 에셋으로 추가하지 않는다. Unity CoreLoop는 아래 사운드를 `AudioClip.Create` 기반 런타임 합성 clip으로 재생하고, 이후 정식 오디오 pass에서 파일 에셋으로 교체할 수 있게 한다.

| 상황 | v1 방식 |
|------|---------|
| 타워/성벽 공격 | 짧은 화살/타격 계열 attack clip |
| 몬스터 피격 | 낮은 thump 계열 hit clip |
| 몬스터 사망 | 짧은 fall/drop 계열 death clip |

---

## 8. UI Assets

v1 UI는 DOM/CSS 중심으로 유지한다. 추가 이미지 에셋 요구를 만들지 않는다.

| 영역 | 정책 |
|------|------|
| HUD | 기존 DOM + 아이콘 사용 |
| Result | DOM 화면 |
| Bottom tabs | 기존 모바일 UI 유지 |
| Shop | v1 제외 |
| Mission | v1 제외 |
| World map | v1 제외 |
| Stage thumbnails | v1 제외 |

---

## 9. Generation Rules

에셋을 변경할 때만 generator를 실행한다.

| 규칙 | 내용 |
|------|------|
| manifest | `asset-manifest.json` 수동 편집 금지 |
| output | `packages/web-shell/public/assets/` 산출물 커밋 필요 |
| source | `assets-source/` 또는 generator source 보존 |
| ComfyUI 의존 에셋 | 환경 없으면 재생성하지 않음 |

`bun generate:assets`는 명시 요청이 있을 때만 실행한다.

---

## 10. Unity Asset Notes

Unity 전환은 유지한다. 다만 Unity 이행 때문에 Phaser v1 에셋을 새로 늘리지 않는다.

| 항목 | 정책 |
|------|------|
| tower sprites | Unity가 필요할 때 별도 import profile 작성 |
| unit sheets | 기존 sheet 재사용 가능성 우선 검토 |
| map background | `main_long` 배경과 anchor data 재사용 |
| VFX | Unity parity 전에는 신규 제작하지 않음 |

Unity 쪽에서 필요한 에셋 변환은 전환 트랙 문서나 작업 PR에서 별도 관리한다.

### Unity Visual Asset Catalog

| 항목 | 파일 |
|------|------|
| unified catalog | `packages/unity-game/Assets/Resources/Visuals/VisualAssetCatalog.asset` |
| catalog type | `packages/unity-game/Assets/Scripts/Data/VisualAssetCatalogSO.cs` |
| generated sprite assets | `packages/unity-game/Assets/Art/Sprites/generated_forest_defense/` |
| runtime tower binding | `packages/unity-game/Assets/Resources/Visuals/TowerSpriteCatalog.asset` |
| runtime map binding | `packages/unity-game/Assets/Resources/Visuals/TileSpriteCatalog.asset` |
| runtime HUD binding | `packages/unity-game/Assets/UI/Styles/hud.uss` |

`VisualAssetCatalog.asset`은 기존 `TowerSpriteCatalog`, `UnitSpriteCatalog`, `TileSpriteCatalog`를 묶고, 성벽 3단계, 맵/타일, HUD, UI 스프라이트를 `key -> Sprite` 형태로 노출한다. `generated_forest_defense/`의 PNG는 첨부 이미지 기반으로 생성한 실제 raster asset이며, Unity CoreLoop 화면은 해당 타워 catalog, 맵 background/tile catalog, HUD USS background-image를 직접 참조한다.
