# Tiny Swords Raw Field Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tiny Swords 원본 필드 에셋을 레포에 반입하고, 생성형 `tiles` / `tileset` 파이프라인을 우회해서 Phaser 런타임이 원본 에셋을 직접 사용하도록 바꾼다.

**Architecture:** 필드 배경 리워크는 두 단계로 나눈다. 먼저 Tiny Swords 원본 PNG를 `public/assets/vendor` 아래로 vendoring 하고, 생성 파이프라인에서 필드 타일 생성 단계를 제거한다. 그 다음 tilelayer 기반 decoration/tileset 렌더링을 object-layer + raw image key 기반으로 바꾸고, `Preloader`와 `GameScene`이 vendor asset을 직접 읽게 맞춘다.

**Tech Stack:** bun monorepo, TypeScript, Phaser 3, Vitest, Tiled JSON, Vite static assets

---

## Context Lock

- 범위는 게임 필드 배경만이다.
- 로비, 웹 UI, HUD, 버튼, 카드형 UI는 수정하지 않는다.
- `forest-gate.json` 파일명은 유지한다.
- path, spawn, exit, placement point의 의미는 유지한다.
- 플레이어 필드와 AI 필드는 같은 월드 계열을 쓴다.
- AI 필드는 원본 자산을 그대로 쓰되 tint 또는 색보정으로만 더 차갑고 어둡게 만든다.
- 이번 작업에서는 "AI 전용 다른 decoration 배치"를 하지 않는다.
- 기존 `grid-floor`, `path-tile`, `spawn-tile`, `exit-tile`, `tileset.png` 중심 계약은 필드 배경 범위에서 폐기해도 된다.

## File Structure

- `packages/web-shell/public/assets/vendor/tiny-swords/`
  Tiny Swords 원본 PNG를 보관하는 정적 자산 루트.
- `packages/web-shell/public/assets/vendor/tiny-swords/README.md`
  원본 pack 이름, 출처, 라이선스, 가져온 하위 폴더를 문서화.
- `scripts/generate-assets/generate-all.ts`
  필드용 `generate-tiles`, `generate-tileset` 단계를 제거할 오케스트레이터.
- `scripts/generate-assets/generate-map.ts`
  `forest-gate.json`을 생성한다. decoration을 tilelayer GID가 아니라 object layer 기반 raw asset 참조로 바꾼다.
- `scripts/generate-assets/generate-tiles.ts`
  더 이상 필드 배경 main path가 아니라는 점을 명시하는 deprecated 스크립트.
- `scripts/generate-assets/generate-tileset.ts`
  더 이상 필드 decoration main path가 아니라는 점을 명시하는 deprecated 스크립트.
- `packages/phaser-game/src/scenes/Preloader.ts`
  Tiny Swords vendor asset key를 preload한다.
- `packages/phaser-game/src/scenes/Game.ts`
  필드 바닥, 길, spawn/exit, decoration을 raw vendor asset 기준으로 렌더링한다.
- `packages/phaser-game/tests/preloadAssets.test.ts`
  새 preload contract를 잠근다.
- `packages/phaser-game/tests/fieldRuntime.test.ts`
  dual field runtime이 raw vendor asset 기준으로 렌더링되는지 검증한다.
- `packages/phaser-game/tests/assetIntegration.test.ts`
  `forest-gate.json`과 runtime asset contract가 새 구조에서도 맞는지 검증한다.

## Asset Inventory Lock

다음 원본 자산만 반입한다.

- `Terrain/Tileset/Tilemap_color*.png`
- `Terrain/Decorations/Rocks/*.png`
- `Terrain/Decorations/Bushes/*.png`
- `Terrain/Resources/Wood/Trees/*.png`
- 필요 시 `Terrain/Resources/Gold/Gold Stones/*.png`

권장 복사 대상 루트:

- `packages/web-shell/public/assets/vendor/tiny-swords/terrain/tileset/`
- `packages/web-shell/public/assets/vendor/tiny-swords/terrain/decorations/rocks/`
- `packages/web-shell/public/assets/vendor/tiny-swords/terrain/decorations/bushes/`
- `packages/web-shell/public/assets/vendor/tiny-swords/terrain/resources/wood/trees/`
- `packages/web-shell/public/assets/vendor/tiny-swords/terrain/resources/gold/gold-stones/`

## Runtime Contract Lock

- `tilemap-forest-gate` key는 유지한다.
- `forest-gate.json`은 계속 Phaser에서 로드한다.
- path/spawn/exit/placement 좌표는 map JSON이 source of truth다.
- decoration은 더 이상 `tileset` frame index를 신뢰하지 않는다.
- decoration object는 최소 다음 property를 가진다.
  - `kind`
  - `assetKey`
  - `variant`
- player / AI decoration layout은 같은 좌표를 사용한다.
- AI 필드 차이는 tint 또는 color adjustment만 허용한다.

## Task 1: Vendor Tiny Swords Assets Into The Repo

**Files:**
- Create: `packages/web-shell/public/assets/vendor/tiny-swords/`
- Create: `packages/web-shell/public/assets/vendor/tiny-swords/README.md`

- [ ] **Step 1: 복사할 원본 파일 목록을 확정한다**

기준:
- field tileset에 필요한 `Tilemap_color*.png`
- rocks, bushes, trees
- gold stones는 decoration 포인트가 부족할 때만 포함

- [ ] **Step 2: 반입 후 존재를 검증하는 간단한 실패 테스트를 먼저 적는다**

예시:

```ts
it('tiny swords vendor assets exist', () => {
  expect(existsSync('packages/web-shell/public/assets/vendor/tiny-swords/terrain/tileset/Tilemap_color1.png')).toBe(true);
});
```

- [ ] **Step 3: 원본 PNG를 vendor 경로로 복사한다**

Run:

```bash
mkdir -p packages/web-shell/public/assets/vendor/tiny-swords
```

그 다음 Finder 또는 `cp -R`로 필요한 폴더만 복사한다.

- [ ] **Step 4: vendor README를 작성한다**

포함 내용:
- pack 이름
- 출처 경로
- 라이선스/사용 조건 메모
- 실제로 반입한 하위 디렉토리 목록

- [ ] **Step 5: 반입 검증 커맨드를 돌린다**

Run: `find packages/web-shell/public/assets/vendor/tiny-swords -type f | sort`

Expected:
- 필요한 PNG가 모두 보인다

- [ ] **Step 6: Commit**

```bash
git add packages/web-shell/public/assets/vendor/tiny-swords
git commit -m "chore: vendor tiny swords field assets"
```

## Task 2: Remove Generated Field Tile Pipeline From The Main Path

**Files:**
- Modify: `scripts/generate-assets/generate-all.ts`
- Modify: `scripts/generate-assets/generate-tiles.ts`
- Modify: `scripts/generate-assets/generate-tileset.ts`

- [ ] **Step 1: field generation 의존 테스트를 먼저 실패시킨다**

예시:

```ts
it('generate-all no longer requires generated field tiles', async () => {
  // assert manifest generation succeeds without generate-tiles / generate-tileset
});
```

- [ ] **Step 2: `generate-all.ts`에서 field tile generation 단계를 제거한다**

기준:
- `generateTiles`
- `generateTileset`

이 두 단계만 제거하고, towers / units / projectiles / ui / map generation은 유지한다.

- [ ] **Step 3: deprecated 스크립트에 주석을 추가한다**

명시할 내용:
- field background main path 아님
- historical/fallback only

- [ ] **Step 4: asset generation smoke를 돌린다**

Run: `bun run scripts/generate-assets/generate-all.ts`

Expected:
- field tile generation 없이도 manifest와 나머지 산출물이 생성된다

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-assets/generate-all.ts scripts/generate-assets/generate-tiles.ts scripts/generate-assets/generate-tileset.ts
git commit -m "refactor: remove generated field tiles from main asset pipeline"
```

## Task 3: Rebuild `forest-gate.json` Decoration Contract Around Raw Asset References

**Files:**
- Modify: `scripts/generate-assets/generate-map.ts`
- Generated: `packages/web-shell/public/assets/maps/forest-gate.json`

- [ ] **Step 1: map contract 테스트를 먼저 새 구조로 바꾼다**

최소 검증:
- file name remains `forest-gate.json`
- path layer still marks walkable route
- placement objects still match `FOREST_GATE_MAP.placementPoints`
- decoration becomes an object layer or object entries with raw asset metadata

- [ ] **Step 2: protection mask를 확장한다**

필수 보호 집합:
- `pathProtection`
- `placementProtection`
- `landmarkProtection`

세부 규칙:
- path cell 금지
- path 인접 1칸 대형 장식 금지
- placement cell 금지
- placement 인접 1칸 대형 장식 금지
- spawn / exit 인접 1칸 전체 금지

- [ ] **Step 3: decoration tilelayer를 object-layer 기반 raw reference로 바꾼다**

각 object는 최소 아래 속성을 포함한다.

```json
{
  "name": "decor_12",
  "type": "decoration",
  "properties": [
    { "name": "kind", "type": "string", "value": "tree_large" },
    { "name": "assetKey", "type": "string", "value": "tiny-swords-tree-3" },
    { "name": "variant", "type": "string", "value": "Tree3.png" }
  ]
}
```

- [ ] **Step 4: map generation smoke를 돌린다**

Run: `bun run scripts/generate-assets/generate-map.ts`

Expected:
- writes `packages/web-shell/public/assets/maps/forest-gate.json`
- path / placement / decoration contract stays valid

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-assets/generate-map.ts packages/web-shell/public/assets/maps/forest-gate.json
git commit -m "feat: generate raw tiny swords field decoration map data"
```

## Task 4: Preload Tiny Swords Vendor Assets Directly

**Files:**
- Modify: `packages/phaser-game/src/scenes/Preloader.ts`
- Test: `packages/phaser-game/tests/preloadAssets.test.ts`

- [ ] **Step 1: preload contract 테스트를 먼저 새 key 기준으로 바꾼다**

최소 검증:
- Tiny Swords tileset image preload
- tree / bush / rock asset preload
- `tilemap-forest-gate` preload 유지
- old `grid-floor`, `path-tile`, `tileset` preload assertion 제거

- [ ] **Step 2: runtime에서 사용할 asset key 목록을 확정한다**

예시 key:
- `tiny-swords-tileset-color-1`
- `tiny-swords-rock-1`
- `tiny-swords-bush-2`
- `tiny-swords-tree-3`

- [ ] **Step 3: `Preloader.ts`를 raw vendor asset preload 방식으로 바꾼다**

원칙:
- static path만 사용
- field 배경 관련 old key 제거
- tower / unit / ui preload는 건드리지 않는다

- [ ] **Step 4: focused preload test를 돌린다**

Run: `cd packages/phaser-game && bunx vitest run tests/preloadAssets.test.ts`

Expected:
- PASS `tests/preloadAssets.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/phaser-game/src/scenes/Preloader.ts packages/phaser-game/tests/preloadAssets.test.ts
git commit -m "refactor: preload tiny swords field assets directly"
```

## Task 5: Replace `GameScene` Field Rendering With Raw Assets

**Files:**
- Modify: `packages/phaser-game/src/scenes/Game.ts`
- Test: `packages/phaser-game/tests/fieldRuntime.test.ts`

- [ ] **Step 1: field runtime 테스트를 먼저 실패하게 바꾼다**

새 검증 기준:
- player / AI field both render
- raw vendor tileset image is used
- raw decoration image keys are used
- AI field gets dark treatment without separate map layout

- [ ] **Step 2: tilelayer decoration cache를 object-layer decoration cache로 바꾼다**

핵심 변경:
- `decorLayer.data[y][x].index` 읽기 제거
- decoration object property에서 `assetKey`를 읽는다

- [ ] **Step 3: floor / path / spawn / exit 렌더링을 raw asset 기준으로 교체한다**

원칙:
- generated `grid-floor/path-tile/spawn-tile/exit-tile` key 사용 제거
- 타일맵 또는 image layer를 직접 사용
- player / AI는 같은 asset source를 쓰고 AI에만 tint 적용

- [ ] **Step 4: field runtime test를 돌린다**

Run: `cd packages/phaser-game && bunx vitest run tests/fieldRuntime.test.ts`

Expected:
- PASS `tests/fieldRuntime.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/phaser-game/src/scenes/Game.ts packages/phaser-game/tests/fieldRuntime.test.ts
git commit -m "refactor: render fields from raw tiny swords assets"
```

## Task 6: Lock Asset Integration And Full Verification

**Files:**
- Modify: `packages/phaser-game/tests/assetIntegration.test.ts`

- [ ] **Step 1: asset integration test를 새 구조로 갱신한다**

최소 검증:
- `forest-gate.json` file/path contract remains
- path / spawn / exit semantics remain
- placement object layer remains
- decoration raw asset metadata exists
- old `tileset.png` size / frame-count assertion 제거

- [ ] **Step 2: focused integration test를 돌린다**

Run: `cd packages/phaser-game && bunx vitest run tests/assetIntegration.test.ts`

Expected:
- PASS `tests/assetIntegration.test.ts`

- [ ] **Step 3: full test suite를 돌린다**

Run: `bun test`

Expected:
- all existing packages pass

- [ ] **Step 4: production build를 확인한다**

Run: `bun build:web`

Expected:
- Vite build succeeds

- [ ] **Step 5: browser smoke를 수행한다**

Run: `bun dev:web`

Manual checklist:
- player field reads as bright meadow
- AI field reads as the same world but colder/darker
- path is immediately legible
- spawn / exit are readable landmarks
- decorations do not block placement readability

- [ ] **Step 6: Commit**

```bash
git add packages/phaser-game/tests/assetIntegration.test.ts
git commit -m "test: lock raw tiny swords field asset integration"
```

## Final Verification Checklist

- [ ] `packages/web-shell/public/assets/vendor/tiny-swords/` exists and contains the required PNGs
- [ ] `generate-all.ts` no longer depends on generated field tiles
- [ ] `forest-gate.json` still loads with key `tilemap-forest-gate`
- [ ] placement object layer still matches `FOREST_GATE_MAP.placementPoints`
- [ ] player / AI fields share the same layout
- [ ] AI field is darker by tint/color treatment only
- [ ] old field tile keys are removed from preload/runtime/tests
- [ ] `bun test` passes
- [ ] `bun build:web` passes

## Notes For The Implementer

- Do not try to preserve the old field tile contract. That is the mess we are leaving.
- Keep the scope on field background only.
- If decoration object-layer parsing makes `Game.ts` too large, split parsing/helpers into a focused module under `packages/phaser-game/src/`.
- If a runtime detail is unclear, trust `forest-gate.json` for layout semantics and the vendor asset tree for visual source. That's the whole game.
