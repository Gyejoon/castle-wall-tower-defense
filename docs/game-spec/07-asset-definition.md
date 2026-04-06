# 에셋 정의

> **Last Updated:** 2026-04-07  
> **Source:** Obsidian `ai/product/specs/게임 에셋 제작 specs.md`  
> 에셋 추가·변경 시 이 문서를 먼저 업데이트한다.

---

## 1. 공통 제작 사양

### 파이프라인

| 항목 | 사양 |
|------|------|
| 도구 | `@napi-rs/canvas` (TypeScript, 서버사이드 렌더링) |
| 생성 스크립트 | `scripts/generate-assets/` (25 TS 파일) |
| 출력 경로 | `packages/web-shell/public/assets/` |
| 포맷 | PNG (원본) + WebP (런타임, `convert-webp.ts` 자동 변환) |
| 매니페스트 | `asset-manifest.json` (자동 생성, **수동 편집 금지**) |

### 공통 규격

| 항목 | 값 |
|------|---|
| Base Resolution | 64×64px (타워, 유닛, 타일) |
| 보스 해상도 | 96×96px 또는 128×128px |
| Spritesheet | 4프레임, 가로 연결 (256×64px) |
| Pivot/Origin | center (0.5, 0.5) |
| Trim | 불허 — 고정 프레임 크기 유지 |
| 색상 팔레트 | `scripts/generate-assets/shared.ts`의 PALETTE 상수 |

---

## 2. 에셋 인벤토리 (현재 상태)

| 카테고리 | 파일 수 | 생성기 | 상태 |
|---------|--------|-------|------|
| 타워 스태틱 | 18 PNG+WebP | `generate-towers.ts` | ✅ 완료 |
| 타워 공격 애니 | 18 spritesheet | `generate-towers.ts` | ✅ 완료 |
| 유닛 walk | 5 spritesheet | `generate-units.ts` | ✅ 완료 |
| 유닛 death | 1 spritesheet | `generate-units.ts` | ✅ 완료 |
| 투사체 | 4 spritesheet | `generate-projectiles.ts` | 부분 완료 |
| VFX | 4 spritesheet | `generate-vfx.ts` | 부분 완료 |
| UI (PVE) | ~34 PNG+WebP | `generate-ui.ts`, `generate-match-ui.ts` | PVP 혼재 |
| UI 모바일 | ~44 PNG+WebP | `generate-ui-mobile.ts` | ✅ 완료 |
| 타일 | tileset PNG | `generate-tiles.ts`, `generate-tileset.ts` | forest만 완료 |
| 맵 | 1 JSON | `generate-map.ts` | forest_gate만 완료 |
| 아이콘 | ~8 PNG+WebP | `generate-icons.ts` | ✅ 완료 |
| vendor | tiny-swords 팩 | N/A | ✅ 완료 |

**현재 총계: ~234 PNG+WebP**

---

## 3. 타워 에셋 (18종)

### 타워 파일 구성 (1개당)

| 파일 | 해상도 | 프레임 | 설명 |
|------|-------|-------|------|
| `tower-{id}.png` | 64×64 | 1 (static) | 배치 상태 |
| `tower-{id}-fire.png` | 256×64 | 4 (spritesheet) | 공격 애니메이션 |

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

## 5. 적 유닛 에셋 (5종)

| id | name | 크기 | 파일 | 해상도 |
|----|------|------|------|-------|
| scout_drone | 고블린 정찰병 | 작음 | `unit-scout_drone.png` | 256×64 (4프레임) |
| battle_robot | 오크 전사 | 중간 | `unit-battle_robot.png` | 256×64 |
| heavy_walker | 돌 트롤 | 큼 | `unit-heavy_walker.png` | 256×64 |
| stealth_drone | 그림자 암살자 | 가늘음 | `unit-stealth_drone.png` | 256×64 |
| titan | 고대 드래곤 | 보스급 | `unit-titan.png` | 256×96+ |

공용: `unit-death.png` (256×64, 4프레임)

---

## 6. 보스 에셋 (titan)

| 상태 | 설명 | 특이사항 |
|------|------|---------|
| Phase 1 idle/move | 표준 드래곤 형태 | 96×96 이상 |
| Phase 2 transition | 분노 표시 — 색상 변화, 파티클 오라 | 시각적으로 명확한 전환 |
| Weak point | 수 속성 집중 화력에 취약 — 하이라이트 영역 | |
| Death | 소멸 이펙트 | 보스 전용 |

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

## 8. UI 에셋 (추가 필요)

| 분류 | 에셋 |
|------|------|
| HUD | `wave-counter`, `energy-gauge`, `boss-hp-bar` |
| 결과 | `defense-success`, `defense-fail` |
| 바텀 탭 | `*-tab-icon-active` / `*-tab-icon-inactive` (4종) |
| 로비 | `tower-card-bg` (등급별), `upgrade-button` |
| 컬렉션 | `rarity-frame` (5종), `level-badge` |
| 덱 | `deck-slot` |
| 가챠 | `box-free`, `box-ad`, `box-diamond`, `box-premium` |
| 튜토리얼 | `highlight-frame`, `arrow-indicator`, `hint-bubble` |

---

## 9. 맵 에셋 (3 스테이지)

| stage_id | 테마 | 상태 |
|---------|------|------|
| forest_gate | 초록/갈색 자연 톤, 단일 경로 | ✅ 완료 |
| lava_fortress | 붉은/주황 화산 톤, 2경로 | ⬜ 미구현 |
| storm_citadel | 짙은 파랑/보라 전기 톤, 3경로 | ⬜ 미구현 |

---

## 10. 네이밍 규칙

### 매니페스트 키

```
tower-{id}           # 타워 스태틱
tower-{id}-fire      # 타워 공격 애니메이션
unit-{id}            # 유닛 walk cycle
projectile-{type}    # 투사체
vfx-{name}           # VFX
ui-{element}         # UI 요소
tilemap-{stage-id}   # 타일맵
icon-{category}-{id} # 아이콘
```

> 현재 코드는 `-` 구분자 기반 (`tower-laser`, `unit-scout-drone`). **기존 패턴 유지.**

---

## 11. 변경 이력

| 날짜 | 항목 | 변경 내용 |
|------|------|---------|
| 2026-04-07 | 최초 작성 | 게임 에셋 제작 specs 기반 |
