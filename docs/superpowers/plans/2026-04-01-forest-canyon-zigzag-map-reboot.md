# Forest Canyon Zigzag Map Reboot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 밝은 주간 숲 테마의 `지그재그 협곡 루트 + 중간 밀도 배치 포인트` 맵으로 리부트해서, 플레이 체감이 분명히 달라지면서도 실시간 PvP 루프와 자산 파이프라인이 깨지지 않게 만든다.

**Architecture:** 맵 리부트는 먼저 `shared`의 path/placement source of truth를 바꾸고, 그 계약을 기준으로 생성기와 테스트를 갱신한다. 그 다음 타일 비주얼과 decoration 규칙을 숲 협곡형으로 재작성하고, 마지막으로 generated tilemap + preload/runtime tests + 실제 브라우저 스모크로 읽힘과 플레이 가능성을 확인한다.

**Tech Stack:** bun monorepo, TypeScript, Phaser 3, Vitest, @napi-rs/canvas, Tiled JSON

---

## File Structure

- `packages/shared/src/constants/maps.ts`
  새 `FOREST_GATE_MAP` 경로, spawn/exit, placementPoints의 source of truth.
- `packages/shared/tests/maps.test.ts`
  직선 경로 spec을 제거하고 지그재그 협곡 루트 계약으로 교체.
- `scripts/generate-assets/generate-map.ts`
  새 path/placement를 기반으로 Tiled JSON과 decoration density gate 생성.
- `scripts/generate-assets/generate-tiles.ts`
  밝은 주간 숲 톤, path readability 강화, 협곡형 path/terrain 대비 조정.
- `scripts/generate-assets/generate-tileset.ts`
  필요 시 새 tile usage에 맞는 tileset 인덱스/구성을 유지 보수.
- `packages/web-shell/public/assets/maps/forest-gate.json`
  생성 산출물. 직접 수정하지 않고 생성기로 갱신.
- `packages/phaser-game/tests/assetIntegration.test.ts`
  tilemap/tileset alignment가 새 맵에서도 유지되는지 검증.
- `packages/phaser-game/tests/preloadAssets.test.ts`
  field tile preload contract가 유지되는지 검증.
- `packages/phaser-game/tests/fieldRuntime.test.ts`
  dual field runtime이 새 맵 자산에서도 로드되는지 검증.

## Map Design Lock

- Theme: `밝은 주간 숲`
- Route: `여러 번 좁게 꺾이는 지그재그 협곡 루트`
- Density: `중간 밀도 배치 포인트`
- Readability rule:
  - path는 한눈에 읽혀야 한다
  - path 인접 1타일은 장식을 강하게 제한한다
  - 장식은 랜덤 살포가 아니라 덩어리/랜드마크 중심으로 둔다
- Landmark rule:
  - spawn은 `협곡 입구/목책 게이트`
  - exit는 `숲 문루/성문`

## Task 1: Shared Map Contract Reboot

**Files:**
- Modify: `packages/shared/src/constants/maps.ts`
- Modify: `packages/shared/tests/maps.test.ts`

- [ ] **Step 1: 새 경로 shape와 배치 포인트 분포를 종이에 먼저 확정한다**

기준:
- 12×8 bounds 유지
- spawn과 exit는 경계에 둔다
- path는 맨해튼 인접만 허용한다
- route는 최소 3회 이상 방향이 바뀌어야 한다
- placementPoints는 초반/중반/후반 화력 포인트가 분산되어야 한다

- [ ] **Step 2: 직선 경로 가정 테스트를 실패하는 상태로 바꾼다**

예시로 아래 성격의 테스트를 만든다:

```ts
it('경로가 지그재그 협곡 루트로 3회 이상 꺾여야 한다', () => {
  expect(countTurns(FOREST_GATE_MAP.path)).toBeGreaterThanOrEqual(3);
});

it('배치 포인트가 초반/중반/후반 구간에 분산되어야 한다', () => {
  expect(bucketPlacementPoints(FOREST_GATE_MAP.placementPoints)).toEqual({
    early: expect.any(Number),
    mid: expect.any(Number),
    late: expect.any(Number),
  });
});
```

- [ ] **Step 3: `FOREST_GATE_MAP`를 새 route/placement layout으로 교체한다**

구현 기준:
- `buildPalacePath()`를 대체하는 새 path builder 작성
- 기존 `spec 6.2 직선` 주석 제거
- 맵 id/name/tileSize 유지 여부는 필요 시만 바꾼다

- [ ] **Step 4: shared 맵 테스트를 돌려 계약을 잠근다**

Run: `cd packages/shared && bunx vitest run tests/maps.test.ts`

Expected:
- PASS `tests/maps.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants/maps.ts packages/shared/tests/maps.test.ts
git commit -m "feat: reboot map contract to zigzag canyon layout"
```

## Task 2: Tile Visual Language Reboot

**Files:**
- Modify: `scripts/generate-assets/generate-tiles.ts`
- Modify if needed: `scripts/generate-assets/generate-tileset.ts`

- [ ] **Step 1: path readability expectations을 테스트/게이트로 먼저 정리한다**

최소 기준:
- path center band가 grass와 명도 차이를 가진다
- spawn/exit landmark가 일반 path tile보다 더 눈에 띈다
- dark AI variants도 동일한 실루엣을 유지한다

- [ ] **Step 2: grass / path / cliff-edge 색 분리를 더 크게 만든다**

구현 기준:
- grass는 더 밝은 초록
- dirt path는 더 따뜻한 황토
- path edge는 stone/wood accents로 윤곽 강화
- 필요하면 협곡 edge tile 느낌을 base tile 내에 음영으로 표현

- [ ] **Step 3: spawn/exit를 새 랜드마크 실루엣으로 다시 그린다**

구현 방향:
- spawn: 목책 게이트 + 토치
- exit: 숲 문루/성문 + 깃발

- [ ] **Step 4: 타일 생성 스모크를 돌린다**

Run: `bun run scripts/generate-assets/generate-tiles.ts`

Expected:
- required tile PNG outputs exist
- readability gate does not throw

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-assets/generate-tiles.ts scripts/generate-assets/generate-tileset.ts
git commit -m "feat: reboot forest canyon tile visuals"
```

## Task 3: Tiled Map Generation Rework

**Files:**
- Modify: `scripts/generate-assets/generate-map.ts`
- Generated: `packages/web-shell/public/assets/maps/forest-gate.json`

- [ ] **Step 1: decoration policy를 새 route 기준으로 테스트 가능한 형태로 적는다**

핵심 규칙:
- path 인접 1타일은 mostly empty
- buffer lane은 sparse
- far lane만 decoration cluster 허용
- decoration density upper bound 유지

- [ ] **Step 2: `generate-map.ts`에서 decoration scatter를 route-aware cluster 방식으로 교체한다**

구현 기준:
- `distanceFromPath`만 보지 말고 route segment/turn/edge를 함께 고려
- 코너 바깥쪽에는 바위/목책/나무를 우선 배치
- 코너 안쪽은 플레이 읽힘을 위해 더 비운다
- spawn/exit 주변은 랜드마크 보호를 위해 장식 충돌 금지

- [ ] **Step 3: 새 shared map path를 그대로 tilemap에 반영한다**

체크:
- spawnPoint == path[0]
- exitPoint == path[last]
- path gid selection이 corner shape와 맞는다
- placement object layer가 새 points와 일치한다

- [ ] **Step 4: 생성 후 map smoke를 돌린다**

Run: `bun run scripts/generate-assets/generate-map.ts`

Expected:
- writes `packages/web-shell/public/assets/maps/forest-gate.json`
- decoration density gate passes

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-assets/generate-map.ts packages/web-shell/public/assets/maps/forest-gate.json
git commit -m "feat: generate zigzag canyon tilemap"
```

## Task 4: Runtime/Asset Regression Lock

**Files:**
- Modify if needed: `packages/phaser-game/tests/assetIntegration.test.ts`
- Modify if needed: `packages/phaser-game/tests/preloadAssets.test.ts`
- Modify if needed: `packages/phaser-game/tests/fieldRuntime.test.ts`

- [ ] **Step 1: failing test를 먼저 추가하거나 기존 assertions를 새 맵 계약으로 바꾼다**

최소 검증 포인트:
- generated tilemap path gids are valid
- tileset alignment unchanged
- dark field variants still preload
- field runtime can render both boards with the new tilemap

- [ ] **Step 2: 필요한 최소 코드만 수정한다**

원칙:
- preload key/asset key는 가능하면 유지
- 테스트는 새 맵 shape를 허용하되 타일 계약은 더 엄격하게

- [ ] **Step 3: focused asset/runtime tests를 돌린다**

Run:
- `bun run --filter @gld/phaser-game test -- tests/preloadAssets.test.ts`
- `bun run --filter @gld/phaser-game test -- tests/assetIntegration.test.ts`
- `cd packages/phaser-game && bunx vitest run tests/fieldRuntime.test.ts`

Expected:
- all pass

- [ ] **Step 4: Commit**

```bash
git add packages/phaser-game/tests/preloadAssets.test.ts packages/phaser-game/tests/assetIntegration.test.ts packages/phaser-game/tests/fieldRuntime.test.ts
git commit -m "test: lock canyon map asset integration"
```

## Task 5: End-to-End Visual Verification

**Files:**
- No new source files required unless issues are found during QA

- [ ] **Step 1: 전체 자산 재생성**

Run: `bun run scripts/generate-assets/generate-all.ts`

Expected:
- asset manifest regenerated
- map/tiles/towers/units outputs present

- [ ] **Step 2: workspace test script 실행**

Run: `bun run test`

Expected:
- shared/phaser/web test suites all pass

- [ ] **Step 3: production build 확인**

Run: `bun build:web`

Expected:
- vite build completed successfully

- [ ] **Step 4: 브라우저에서 실제 읽힘 확인**

수동 체크리스트:
- 로비에서 맵이 이전보다 분명히 다른 route를 가진다
- path가 한눈에 읽힌다
- 코너 구간이 구분된다
- placementPoints가 한쪽에 몰리지 않는다
- spawn과 exit가 일반 path tile보다 강하게 읽힌다
- AI dark field에서도 route가 읽힌다

- [ ] **Step 5: 결과 메모 기록**

최소 기록:
- 이전 맵 대비 무엇이 크게 달라졌는지
- path readability가 여전히 약한 구간
- 배치 포인트가 과밀/과소한 구간
- 다음 패스 후보 2~3개

## Assumptions

- 이번 리부트는 `A가 아니라 B`: path/placement contract 변경을 허용한다.
- 맵 크기 `12×8`은 유지한다. 이번 패스에서 board size 자체는 늘리지 않는다.
- 기존 asset key를 최대한 유지해서 preload/runtime consumer 변경은 최소화한다.
- tower/unit 리부트는 이번 계획의 주목표가 아니다. 맵 쪽 체감 변화를 최우선으로 만든다.
- route readability가 장식 밀도보다 우선한다.

## Exit Criteria

- 새 route가 직선이 아니라 지그재그 협곡 루트로 바뀐다.
- path와 placementPoints가 테스트로 잠긴다.
- 타일/맵 자산 regenerate 후 runtime tests가 통과한다.
- 브라우저에서 봤을 때 “맵이 크게 달라졌다”는 체감이 생긴다.
