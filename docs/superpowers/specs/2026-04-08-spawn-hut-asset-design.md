# 스폰 오두막 에셋 생성 — Spawn Hut Asset Design

## Context

몬스터 스폰 지점에 다크 오두막 구조물 에셋을 배치한다.
현재 스폰 포인트는 색상 타일 + 원형 표시뿐이며, 성벽(exit)과 대칭되는 시각적 구조물이 필요하다.

- 몬스터는 그리드 상단 스폰 포인트에서 출현하여 아래로 이동한다.
- 스폰 포인트는 각 레인의 첫 번째 좌표 (lane[0]).
- 기존 generate-assets 파이프라인(@napi-rs/canvas)을 그대로 활용한다.

---

## 확정된 디자인 결정

| 항목 | 결정 |
|------|------|
| 스타일 | 다크 판타지 오두막 (목재 + 해골 장식, 붉은 빛) |
| 시점 | 탑다운 (위에서 내려다보기) |
| 상태 | 2단계 (idle / active) |
| 애니메이션 | 웨이브 진행 중 연기 VFX |
| 접근법 | 신규 `generate-spawn-hut.ts` + `generate-vfx.ts`에 spawn-smoke 추가 |

---

## 생성될 에셋 목록

| 파일 | 타입 | 크기 | manifest key | 트리거 |
|------|------|------|-------------|--------|
| `assets/spawn-hut/base-idle.png` | image | 64×80px | `spawn-hut-idle` | 항상 |
| `assets/spawn-hut/base-active.png` | image | 64×80px | `spawn-hut-active` | 웨이브 진행 중 |
| `assets/vfx/spawn-smoke.png` | spritesheet | 192×32px (8f×24×32) | `vfx-spawn-smoke` | 웨이브 진행 중 |

---

## 픽셀아트 스펙 (탑다운)

### 공통 색상
```
woodDark:   #3a2a1a  (지붕)
woodMid:    #2a1f15  (벽체)
woodLight:  #4a3828  (판자 하이라이트)
thatch:     #8a7a50  (볏짚)
bone:       #c8c0b0  (해골/뼈 장식)
doorBlack:  #0a0a0a  (문 통로)
shadow:     #1a1210  (그림자)
accent:     #c04020  (붉은 빛 하이라이트)
flagPole:   #5a4a3a  (깃대)
```

### idle — 기본 오두막
- 상단 y:0~24: 삼각 지붕
  - 지붕 뼈대: woodDark(#3a2a1a), 두께 2px 대각선
  - 볏짚 채움: thatch(#8a7a50), 불규칙 텍스처
  - 지붕 꼭대기 중앙: 깃대(#5a4a3a) 3px + 뼈 장식(bone) 3×3px
- y:24~79: 목재 벽체
  - 세로 판자 패턴: 8px 간격, woodMid(#2a1f15) + woodLight(#4a3828) 교대
  - 판자 이음: 1px 검은 선 (#1a1210)
- y:50~79 중앙 x:20~43: 아치형 문
  - 상단 아치: 반원형 (radius 11px)
  - 내부: doorBlack(#0a0a0a)
  - 문틀: shadow(#1a1210) 2px
- 문 양쪽: 해골 장식
  - x:12~17, y:55~60: 해골 1 (bone #c8c0b0, 눈구멍 #0a0a0a 2px)
  - x:46~51, y:55~60: 해골 2

### active — 웨이브 진행 중
- idle 위에 추가:
  - 문 내부: 붉은 빛 그라디언트
    - 문 중심에서 바깥으로 rgba(200,40,20,0.3) → 투명
    - `source-atop` 컴포지트로 문 영역에만 적용
  - 문 테두리: accent(#c04020) 1px 하이라이트 (문틀 안쪽)
  - 해골 눈구멍: 붉은 점 (#ff4040) 1px — 빛나는 느낌

### VFX: spawn-smoke (8프레임 × 24×32px)
- wall-smoke와 동일 패턴, 붉은 톤
- 프레임마다 연기 구름 y좌표 +1~+3px 하강 (위→아래 스폰 방향)
- alpha 0.15→0.45→0.15 사이클
- 색상: rgba(120,60,40,α) + rgba(80,40,30,α*0.7)
- 구름 radius: 6~10px

---

## 구현 단계

### Step 1: `generate-spawn-hut.ts` 생성
경로: `scripts/generate-assets/generate-spawn-hut.ts`

```typescript
// 구조
export async function generate(): Promise<ManifestEntry[]>
// 내부:
//   drawSpawnHut(ctx, 64, 80, active: boolean) 헬퍼
//   2개 이미지 저장 → entries 반환
// import.meta.main 단독 실행 지원
```

재사용할 기존 유틸 (`scripts/generate-assets/shared.ts`):
- `makeCanvas`, `saveCanvas`, `PALETTE`, `hexToRgba`
- `drawRect`, `setPixel`, `fillCircle`

오두막 색상을 shared.ts의 PALETTE에 등록:
```typescript
// shared.ts PALETTE 추가
spawnHut: {
  woodDark: '#3a2a1a', woodMid: '#2a1f15', woodLight: '#4a3828',
  thatch: '#8a7a50', bone: '#c8c0b0', door: '#0a0a0a',
  shadow: '#1a1210', accent: '#c04020', flagPole: '#5a4a3a',
}
```

### Step 2: `generate-vfx.ts`에 spawn-smoke 추가

기존 wall-smoke 패턴 참고:
- `spawn-smoke`: 8프레임 × 24×32px → 192×32 캔버스
- section: 'preload' (CastleWallSystem과 동일 이유)

### Step 3: `generate-all.ts` 등록
```typescript
import { generate as generateSpawnHut } from './generate-spawn-hut';

// Promise.all 배열에 추가
generateSpawnHut().then(result => { console.log('[spawn-hut] done'); return result; }),

// allEntries 병합에 추가
...spawnHut,
```

### Step 4: SpawnHutSystem.ts 생성
경로: `packages/phaser-game/src/systems/SpawnHutSystem.ts`

```typescript
// CastleWallSystem과 대칭 구조
class SpawnHutSystem {
  constructor(scene, grid, map)
  create()         // per-spawn 레인: hutSprite + smokeSprite 생성
  setActive(active: boolean)  // 텍스처 전환 + smoke 토글
  destroy()
}
```

#### 렌더링 정렬
- 에셋 64×80px → `setDisplaySize(64, 80)` 원본 크기
- `setOrigin(0.5, 0.0)` — 상단 중앙 기준 정렬 (성벽과 반대)
- 위치: `gridToWorld(sp.x, sp.y)` + y를 `- TILE_SIZE / 2`로 조정 (타일 상단 가장자리)
- depth: `sp.x + sp.y + 1`
- VFX offset: hutSprite 기준 상대 좌표
  - smoke: (0, +60) — 문 아래쪽, 연기가 아래로 퍼짐
- VFX depth: `sp.x + sp.y + 2`

#### 애니메이션 등록
```typescript
if (!scene.anims.exists('spawn-smoke')) {
  scene.anims.create({
    key: 'spawn-smoke',
    frames: scene.anims.generateFrameNumbers('vfx-spawn-smoke', { start: 0, end: 7 }),
    frameRate: 8, repeat: -1,
  });
}
```

### Step 5: Game.ts 연동
- spawnColor `fillTileRect` + `fillCircle` 완전 제거
- SpawnHutSystem 인스턴스 생성 + create/destroy 호출
- `wave-started` 이벤트에서 `spawnHut.setActive(true)`
- `wave-completed` 이벤트에서 `spawnHut.setActive(false)`
- cleanup에서 `spawnHut?.destroy()`

### Step 6: 실행 및 검증
```bash
cd scripts/generate-assets && npx tsx generate-spawn-hut.ts  # 단독 테스트
bun run generate:assets                                       # 전체 실행
# 확인: packages/web-shell/public/assets/spawn-hut/ 2개 PNG
# 확인: packages/web-shell/public/assets/vfx/spawn-smoke.png
# 확인: asset-manifest.json에 3개 키 추가
```

---

## Phaser 렌더링 수치
- `setDisplaySize(64, 80)` — 원본 크기
- `setOrigin(0.5, 0.0)` — 상단 중앙 기준 (성벽 setOrigin(0.5,1.0)과 반대)
- 위치: `world.y - TILE_SIZE / 2` — 타일 상단 가장자리 정렬
- depth: `sp.x + sp.y + 1` (decoration과 동일 계산)
- VFX depth: `sp.x + sp.y + 2`
- spawn-smoke: `anims.play('spawn-smoke', true)`, frameRate 8fps, loop
- active 전환: `setTexture` + `smoke.setVisible` + `smoke.anims.pause()/resume()`

## 멀티레인 지원
- `getMapPaths(map)` 반환 배열의 각 레인 첫 좌표 = spawn
- 레인마다 (hutSprite, smokeSprite) 세트 1개
- lava_fortress: 2세트, storm_citadel: 3세트, forest_gate: 1세트
- 웨이브 active 상태는 전역 (모든 레인 동시 활성화/비활성화)

---

## 검증 체크리스트

- [ ] `spawn-hut/base-idle.png` 생성됨 (64×80px)
- [ ] `spawn-hut/base-active.png` 생성됨 (64×80px)
- [ ] `vfx/spawn-smoke.png` 생성됨 (192×32px, 8프레임)
- [ ] `asset-manifest.json`에 `spawn-hut-idle`, `spawn-hut-active`, `vfx-spawn-smoke` 3개 키 존재
- [ ] manifest key 중복 없음
- [ ] 단독 실행 (`npx tsx generate-spawn-hut.ts`) 에러 없음
- [ ] shared.ts PALETTE에 spawnHut 서브그룹 등록됨
- [ ] `setDisplaySize(64, 80)` + `setOrigin(0.5, 0.0)` 적용 확인
- [ ] `bun dev:web` 실행 후 오두막 렌더링 확인 (idle/active 전환)
- [ ] 멀티레인 맵(lava_fortress)에서 복수 오두막 렌더링 확인
- [ ] 웨이브 시작/종료 시 active 상태 전환 확인

---

## 수정 파일 목록

| 파일 | 작업 |
|------|------|
| `scripts/generate-assets/shared.ts` | PALETTE에 spawnHut 서브그룹 추가 |
| `scripts/generate-assets/generate-spawn-hut.ts` | 신규 생성 |
| `scripts/generate-assets/generate-vfx.ts` | spawn-smoke 추가 |
| `scripts/generate-assets/generate-all.ts` | import + Promise.all + allEntries 등록 |
| `packages/phaser-game/src/systems/SpawnHutSystem.ts` | 신규 생성 |
| `packages/phaser-game/src/scenes/Game.ts` | spawnColor fillTileRect 제거, SpawnHutSystem 연동 |
