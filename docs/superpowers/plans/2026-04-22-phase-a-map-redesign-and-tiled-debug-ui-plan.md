# Phase A 맵 리디자인 및 Tiled 디버그 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase A 전장을 더 넓고 느린 세로형 공성전 맵으로 재설계하고, Tiled 시각 맵과 코드 규칙을 혼합 운용하며, `tiled-for-agent` 디버그 페이지에서 snapshot/레이어 상태/간단 미리보기를 바로 확인할 수 있게 만든다.

**Architecture:** 게임 규칙의 원본은 계속 [packages/shared/src/constants/maps.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/src/constants/maps.ts:1)가 맡고, Tiled 파일은 시각 레이어와 장식 배치만 책임진다. Phaser는 새 Tiled 맵을 읽어 시각 레이어를 렌더링하되, path/buildable/obstacle 판정은 코드 데이터를 유지한다. `tiled-for-agent`는 feature worktree에서만 수정하며, 브라우저 디버그 UI는 기존 HTTP API를 사용해 map snapshot을 읽고 optional overlay JSON을 합성 표시한다.

**Tech Stack:** TypeScript, Phaser 3, Bun/Vitest, Tiled JSON (`.tmj`), Node HTTP server, plain browser JavaScript

---

## Context

- 스펙 문서: [2026-04-22-phase-a-map-redesign-and-tiled-debug-ui-design.md](/Users/lio/Documents/personal/github/grid-line-defense-pvp/docs/superpowers/specs/2026-04-22-phase-a-map-redesign-and-tiled-debug-ui-design.md:1)
- 게임 저장소: `/Users/lio/Documents/personal/github/grid-line-defense-pvp`
- Tiled agent 구현 저장소는 현재 `master`가 아니라 worktree `/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1` 에 있다.
- 게임 저장소에는 사용자 변경분 `docs/game-spec/01-GDD.md` 가 이미 있으므로 건드리지 않는다.

## File Structure

### grid-line-defense-pvp

- Create: [packages/web-shell/public/assets/maps/phase-a-long-v2.tmj](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long-v2.tmj)
  - Tiled 시각 원본. `ground_base`, `road_low`, `platform_high`, `cliff_faces`, `wall_mass`, `wall_trim`, `foliage_low`, `decorations` 구조를 담는다.
- Create: [packages/web-shell/public/assets/maps/phase-a-long-v2-overlay.json](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long-v2-overlay.json)
  - 코드 규칙에서 파생된 debug overlay fixture. `path`, `buildablePoints`, `blockedPlacementPoints`, `obstacles`, `spawnPoint`, `exitPoint`를 담는다.
- Modify: [packages/web-shell/public/assets/asset-manifest.json](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/asset-manifest.json:1)
  - `tilemap-phase-a-long-v2` 등록.
- Modify: [packages/shared/src/constants/maps.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/src/constants/maps.ts:1)
  - `PHASE_A_LONG_MAP`를 12x20 규격으로 재설계하고 `tilemapKey`를 새 시각 맵으로 전환.
- Modify: [packages/shared/tests/maps.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/tests/maps.test.ts:1)
  - 새 dimensions/path/buildable/tempo 제약을 검증.
- Create: [packages/shared/tests/phaseAMapOverlayFixture.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/tests/phaseAMapOverlayFixture.test.ts)
  - overlay fixture가 코드 맵 규칙과 동기화되는지 검증.
- Create: [packages/phaser-game/src/rendering/tiledFieldRenderer.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/src/rendering/tiledFieldRenderer.ts)
  - Tiled tile layer / object layer를 Phaser draw calls로 변환하는 최소 helper.
- Modify: [packages/phaser-game/src/scenes/Game.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/src/scenes/Game.ts:538)
  - 새 renderer helper를 연결하고, recognized Tiled visual layers가 있을 때 이를 우선 사용한다.
- Create: [packages/phaser-game/tests/tiledFieldRenderer.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/tests/tiledFieldRenderer.test.ts)
  - helper의 layer parsing / depth / fallback 계약을 검증.
- Modify: [packages/phaser-game/tests/fieldRuntime.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/tests/fieldRuntime.test.ts:1)
  - 새 tilemap key와 visual layer path를 통합 검증.

### tiled-for-agent (`/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1`)

- Modify: [tools/tiled-agent-orchestrator/public/index.html](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/public/index.html:1)
  - 디버그 레이아웃 뼈대와 control panel 마크업 추가.
- Create: [tools/tiled-agent-orchestrator/public/debug-ui.js](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/public/debug-ui.js)
  - workspace/session/document open 플로우, snapshot fetch, layer 패널, canvas preview, optional overlay import 담당.
- Modify: [tools/tiled-agent-orchestrator/src/http-server.ts](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/src/http-server.ts:1)
  - `/debug-ui.js` 같은 정적 public asset 제공.
- Modify: [tools/tiled-agent-orchestrator/test/http-server.test.ts](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/test/http-server.test.ts:1)
  - 정적 asset 서빙과 새 debug page 마크업 검증.
- Modify: [README.md](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/README.md:1)
  - 새 debug UI 사용법 반영.
- Modify: [docs/agent-usage.md](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/docs/agent-usage.md:1)
  - `phase-a-long-v2.tmj` 와 `phase-a-long-v2-overlay.json` 을 여는 절차 추가.

## Phase 0: 실행 환경 고정

### Task 0: 저장소/브랜치 경계 고정

**Files:**
- Modify: 없음

- [ ] **Step 1: 게임 저장소 상태 확인**

Run: `git -C /Users/lio/Documents/personal/github/grid-line-defense-pvp status --short`
Expected: `docs/game-spec/01-GDD.md` 외 변경은 없거나 의도한 범위만 보인다.

- [ ] **Step 2: Tiled agent는 feature worktree에서만 수정할 것을 메모**

Run: `git -C /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1 branch --show-current`
Expected: `feature/agent-v1`

- [ ] **Step 3: 두 저장소 테스트 명령 확인**

Run:
```bash
cat /Users/lio/Documents/personal/github/grid-line-defense-pvp/package.json
cat /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/package.json
```
Expected: 게임은 `bun run test:shared`, `bun run test:phaser`; agent는 `npm run build`, `npm test` 사용.

---

## Phase 1: 코드 규칙 쪽 Phase A v2 레이아웃 확정

### Task 1: `PHASE_A_LONG_MAP`를 12x20 v2 규격으로 갱신

**Files:**
- Modify: [packages/shared/src/constants/maps.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/src/constants/maps.ts:220)
- Modify: [packages/shared/tests/maps.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/tests/maps.test.ts:29)

- [ ] **Step 1: 실패하는 shared 테스트부터 추가**

`packages/shared/tests/maps.test.ts` 에 아래 성격의 assertion을 추가한다.

```ts
it('Phase A v2 uses the widened portrait board contract', () => {
  expect(PHASE_A_LONG_MAP.width).toBe(12)
  expect(PHASE_A_LONG_MAP.height).toBe(20)
  expect(PHASE_A_LONG_MAP.tilemapKey).toBe('tilemap-phase-a-long-v2')
})

it('Phase A v2 keeps buildable count near the old cap while extending path length', () => {
  expect(PHASE_A_LONG_MAP.path.length).toBeGreaterThanOrEqual(115)
  expect(PHASE_A_LONG_MAP.path.length).toBeLessThanOrEqual(125)
  expect(PHASE_A_LONG_MAP.buildablePoints.length).toBeGreaterThanOrEqual(64)
  expect(PHASE_A_LONG_MAP.buildablePoints.length).toBeLessThanOrEqual(68)
})
```

- [ ] **Step 2: 테스트를 실행해 실제로 실패하는지 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:shared`
Expected: FAIL, 기존 `width=9`, `height=18`, `tilemapKey=tilemap-phase-a-long` 때문에 깨진다.

- [ ] **Step 3: `maps.ts`에서 새 path / blocked / obstacles / buildable 구성을 작성**

수정 원칙:

- `width=12`, `height=20`
- `path.length` 는 `115~125`
- `buildablePoints.length` 는 `64~68`
- `spawnPoint`, `exitPoint`, `castleWallTiles` 는 새 요새 실루엣에 맞춘다
- `tilemapKey` 는 `tilemap-phase-a-long-v2`
- `decorations` 는 시각용 ambient only로 유지하되, 넓어진 좌우 여백을 살리는 값으로 갱신한다

- [ ] **Step 4: shared 테스트를 다시 돌려 통과 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:shared`
Expected: PASS

- [ ] **Step 5: 이 변경만 먼저 커밋**

```bash
cd /Users/lio/Documents/personal/github/grid-line-defense-pvp
git add packages/shared/src/constants/maps.ts packages/shared/tests/maps.test.ts
git commit -m "feat(shared): redesign Phase A map layout for v2 fortress board"
```

### Task 2: overlay fixture를 코드 규칙과 동기화

**Files:**
- Create: [packages/web-shell/public/assets/maps/phase-a-long-v2-overlay.json](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long-v2-overlay.json)
- Create: [packages/shared/tests/phaseAMapOverlayFixture.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/shared/tests/phaseAMapOverlayFixture.test.ts)

- [ ] **Step 1: overlay fixture 검증 테스트 추가**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PHASE_A_LONG_MAP } from '../src/constants/maps'

describe('phase-a-long-v2 overlay fixture', () => {
  it('matches the code-owned map contract', () => {
    const overlayPath = path.resolve(import.meta.dirname, '../../web-shell/public/assets/maps/phase-a-long-v2-overlay.json')
    const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'))

    expect(overlay.path).toEqual(PHASE_A_LONG_MAP.path)
    expect(overlay.buildablePoints).toEqual(PHASE_A_LONG_MAP.buildablePoints)
    expect(overlay.blockedPlacementPoints).toEqual(PHASE_A_LONG_MAP.blockedPlacementPoints)
    expect(overlay.obstacles).toEqual(PHASE_A_LONG_MAP.obstacles ?? [])
  })
})
```

- [ ] **Step 2: 테스트를 실행해서 먼저 실패 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:shared`
Expected: FAIL, fixture 파일이 아직 없거나 값이 비어 있다.

- [ ] **Step 3: fixture JSON 파일 생성**

최소 구조:

```json
{
  "mapId": "phase_a_long",
  "version": 1,
  "path": [],
  "buildablePoints": [],
  "blockedPlacementPoints": [],
  "obstacles": [],
  "spawnPoint": { "x": 0, "y": 0 },
  "exitPoint": { "x": 0, "y": 0 }
}
```

실제 값은 `PHASE_A_LONG_MAP` 와 동일하게 채운다. 이 파일은 `tiled-for-agent` 디버그 UI가 optional overlay로 읽는다.

- [ ] **Step 4: shared 테스트 재실행**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:shared`
Expected: PASS

- [ ] **Step 5: fixture 동기화 변경 커밋**

```bash
cd /Users/lio/Documents/personal/github/grid-line-defense-pvp
git add packages/web-shell/public/assets/maps/phase-a-long-v2-overlay.json packages/shared/tests/phaseAMapOverlayFixture.test.ts
git commit -m "test(shared): lock Phase A overlay fixture to map contract"
```

---

## Phase 2: Tiled 시각 맵과 Phaser 렌더링 연결

### Task 3: `phase-a-long-v2.tmj` 와 asset manifest 연결

**Files:**
- Create: [packages/web-shell/public/assets/maps/phase-a-long-v2.tmj](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long-v2.tmj)
- Modify: [packages/web-shell/public/assets/asset-manifest.json](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/asset-manifest.json:2120)

- [ ] **Step 1: visual asset wiring 검증 테스트 추가**

`packages/phaser-game/tests/fieldRuntime.test.ts` 또는 새 helper test에 아래 assertion을 추가한다.

```ts
expect(makeTilemap).toHaveBeenCalledWith(
  expect.objectContaining({ key: 'tilemap-phase-a-long-v2' }),
)
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:phaser`
Expected: FAIL, 아직 manifest와 map asset이 연결되지 않았다.

- [ ] **Step 3: Tiled 시각 맵 작성**

Tiled 데스크톱으로 [packages/web-shell/public/assets/maps/phase-a-long-v2.tmj](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long-v2.tmj) 를 작성한다.

레이어 계약:

- `ground_base`
- `road_low`
- `platform_high`
- `cliff_faces`
- `wall_mass`
- `wall_trim`
- `foliage_low`
- `decorations` object layer

필수 제약:

- 맵 크기 `12x20`
- 세로 모드에서 좌우 성루 날개가 확실히 보일 것
- buildable 아닌 좌우 매스/절벽/자연 지형이 충분할 것
- `decorations` object layer는 기존 `cacheDecorationData()` 패턴을 유지할 수 있게 `kind`, `assetKey`, `variant` properties를 넣을 것

- [ ] **Step 4: asset manifest에 새 tilemap key 등록**

`asset-manifest.json` 에 `tilemap-phase-a-long-v2` 항목을 추가하고 파일 경로를 `assets/maps/phase-a-long-v2.tmj` 로 맞춘다.

- [ ] **Step 5: phaser 테스트 재실행**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:phaser`
Expected: 아직 renderer helper가 없어 일부 테스트가 계속 실패할 수 있지만, asset key 관련 실패는 사라진다.

- [ ] **Step 6: 시각 자산 연결 커밋**

```bash
cd /Users/lio/Documents/personal/github/grid-line-defense-pvp
git add packages/web-shell/public/assets/maps/phase-a-long-v2.tmj packages/web-shell/public/assets/asset-manifest.json
git commit -m "feat(web): add Phase A v2 tiled visual map asset"
```

### Task 4: Tiled visual layer renderer helper 추가

**Files:**
- Create: [packages/phaser-game/src/rendering/tiledFieldRenderer.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/src/rendering/tiledFieldRenderer.ts)
- Create: [packages/phaser-game/tests/tiledFieldRenderer.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/tests/tiledFieldRenderer.test.ts)

- [ ] **Step 1: helper 계약 테스트부터 작성**

핵심 테스트:

```ts
it('extracts only recognized visual layers in stable order', () => {
  const result = collectVisualLayers(mockTilemap)
  expect(result.layerNames).toEqual([
    'ground_base',
    'road_low',
    'platform_high',
    'cliff_faces',
    'wall_mass',
    'wall_trim',
    'foliage_low',
  ])
})

it('falls back when the tilemap does not expose recognized visual layers', () => {
  expect(hasRecognizedVisualLayers(mockTilemapWithoutLayers)).toBe(false)
})
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:phaser`
Expected: FAIL, helper 모듈과 함수가 없다.

- [ ] **Step 3: 최소 helper 구현**

helper 책임:

- recognized layer names 탐지
- tile layer / object layer lookup 정규화
- Phaser draw call에 필요한 layer metadata 계산
- recognized visual layers가 없으면 기존 procedural rendering fallback 신호 반환

여기서는 gameplay 규칙(path/buildable)은 절대 읽지 않는다.

- [ ] **Step 4: phaser 테스트 재실행**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:phaser`
Expected: PASS, helper test 기준

- [ ] **Step 5: helper 도입 커밋**

```bash
cd /Users/lio/Documents/personal/github/grid-line-defense-pvp
git add packages/phaser-game/src/rendering/tiledFieldRenderer.ts packages/phaser-game/tests/tiledFieldRenderer.test.ts
git commit -m "feat(phaser): add tiled visual layer renderer helper"
```

### Task 5: `Game.ts`를 새 visual renderer에 연결

**Files:**
- Modify: [packages/phaser-game/src/scenes/Game.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/src/scenes/Game.ts:538)
- Modify: [packages/phaser-game/tests/fieldRuntime.test.ts](/Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/phaser-game/tests/fieldRuntime.test.ts:1)

- [ ] **Step 1: runtime regression 테스트 보강**

추가할 assertion 예시:

```ts
expect(tilemapData.getLayer).toHaveBeenCalledWith('ground_base')
expect(tilemapData.getLayer).toHaveBeenCalledWith('platform_high')
expect(tilemapData.getObjectLayer).toHaveBeenCalledWith('decorations')
```

또는 helper를 mock 해서 `GameScene.create()` 가 `renderField` fallback 대신 새 renderer를 타는지 검증한다.

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:phaser`
Expected: FAIL, 현재 `Game.ts` 는 새 helper를 호출하지 않는다.

- [ ] **Step 3: `Game.ts` 연결**

구현 원칙:

- `cacheDecorationData()` 는 `decorations` object layer를 계속 읽는다
- `renderField()` 는 recognized Tiled layers가 있으면 helper를 통해 시각 레이어를 먼저 그린다
- recognized layers가 없으면 기존 procedural dirt/platform/cliff fallback을 유지한다
- `renderPath()`, `renderObstacles()`, `showBuildableZone()` 는 계속 코드 소스 오브 트루스 기준으로 동작한다

- [ ] **Step 4: phaser 테스트 전체 통과 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run test:phaser`
Expected: PASS

- [ ] **Step 5: 웹 번들까지 한 번 확인**

Run: `cd /Users/lio/Documents/personal/github/grid-line-defense-pvp && bun run build:web`
Expected: PASS

- [ ] **Step 6: scene integration 커밋**

```bash
cd /Users/lio/Documents/personal/github/grid-line-defense-pvp
git add packages/phaser-game/src/scenes/Game.ts packages/phaser-game/tests/fieldRuntime.test.ts
git commit -m "feat(phaser): render Phase A v2 visuals from tiled layers"
```

---

## Phase 3: Tiled agent 디버그 UI 확장

### Task 6: 정적 public asset 서빙 추가

**Files:**
- Modify: [tools/tiled-agent-orchestrator/src/http-server.ts](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/src/http-server.ts:1)
- Modify: [tools/tiled-agent-orchestrator/test/http-server.test.ts](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/test/http-server.test.ts:1)
- Create: [tools/tiled-agent-orchestrator/public/debug-ui.js](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/public/debug-ui.js)

- [ ] **Step 1: HTTP 테스트에 정적 asset route assertion 추가**

```ts
it('serves debug-ui.js as a public asset', async () => {
  const response = await fetch(`${server.baseUrl}/debug-ui.js`)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('async function openDocument')
})
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run:
```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator
npm test
```
Expected: FAIL, 현재는 `/` 외 public asset을 안 준다.

- [ ] **Step 3: `http-server.ts` 에 public file route 추가**

구현 원칙:

- 허용 경로는 `public/` 바로 아래 파일만
- `/debug-ui.js` 요청 시 JS MIME으로 반환
- API routes 우선순서는 그대로 유지

- [ ] **Step 4: 빈 shell 수준의 `debug-ui.js` 생성**

최소한 다음 함수를 내보내는 plain JS를 만든다.

```js
async function createWorkspace() {}
async function createSession() {}
async function openDocument() {}
async function fetchSnapshot() {}
function renderPreview() {}
```

- [ ] **Step 5: agent 테스트 재실행**

Run:
```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator
npm test
```
Expected: PASS

- [ ] **Step 6: 정적 asset 서빙 커밋**

```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1
git add tools/tiled-agent-orchestrator/src/http-server.ts tools/tiled-agent-orchestrator/test/http-server.test.ts tools/tiled-agent-orchestrator/public/debug-ui.js
git commit -m "feat(orchestrator): serve debug UI assets"
```

### Task 7: 디버그 페이지를 상태 + 미리보기 UI로 교체

**Files:**
- Modify: [tools/tiled-agent-orchestrator/public/index.html](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/public/index.html:1)
- Modify: [tools/tiled-agent-orchestrator/public/debug-ui.js](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/public/debug-ui.js:1)
- Modify: [tools/tiled-agent-orchestrator/test/http-server.test.ts](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator/test/http-server.test.ts:1)

- [ ] **Step 1: 페이지 구조 검증 테스트 추가**

루트 HTML에서 아래 id가 존재하는지 확인한다.

```ts
expect(html).toContain('id="workspace-root-path"')
expect(html).toContain('id="document-path"')
expect(html).toContain('id="layers-panel"')
expect(html).toContain('id="preview-canvas"')
expect(html).toContain('id="overlay-input"')
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run:
```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator
npm test
```
Expected: FAIL, 현재 debug page는 정적 문구만 있다.

- [ ] **Step 3: `index.html` 구조를 교체**

필수 UI:

- workspace root 입력
- session 생성 버튼
- document path 입력 및 open 버튼
- 현재 session/document/revision 상태 바
- layer list 패널
- tileset / diagnostics 패널
- preview canvas
- optional overlay JSON file input
- overlay toggle (`path`, `buildable`, `blocked`, `obstacles`)

- [ ] **Step 4: `debug-ui.js` 에 실제 동작 구현**

구현 원칙:

- `POST /workspaces` → `POST /sessions` → `POST /sessions/:id/documents/open` → `GET /sessions/:id/snapshot` 순서 사용
- snapshot 이 `documentType: "map"` 인 경우만 preview 활성화
- `LayerSummary.cells` 를 canvas grid로 그리고, `objects` 는 bounding box / label로 요약 렌더링
- overlay JSON 은 사용자가 선택한 로컬 파일을 `FileReader` 로 읽는다
- overlay가 없으면 preview는 snapshot만 그린다

- [ ] **Step 5: agent 빌드/테스트**

Run:
```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator
npm run build
npm test
```
Expected: PASS

- [ ] **Step 6: 디버그 UI 커밋**

```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1
git add tools/tiled-agent-orchestrator/public/index.html tools/tiled-agent-orchestrator/public/debug-ui.js tools/tiled-agent-orchestrator/test/http-server.test.ts
git commit -m "feat(orchestrator): add snapshot and preview debug UI"
```

---

## Phase 4: 문서와 실제 확인 루프 정리

### Task 8: 여는 방법과 검수 절차 문서화

**Files:**
- Modify: [README.md](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/README.md:1)
- Modify: [docs/agent-usage.md](/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/docs/agent-usage.md:1)

- [ ] **Step 1: README에 새 debug UI 사용 절차 추가**

반드시 포함할 항목:

- orchestrator 실행
- `http://127.0.0.1:3017/` 접속
- workspace root 입력
- `phase-a-long-v2.tmj` 열기
- 필요 시 `phase-a-long-v2-overlay.json` 로드

- [ ] **Step 2: 상세 usage 문서에 실제 예시 경로 추가**

문서에 아래 예시를 넣는다.

```text
TMJ: /Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long-v2.tmj
Overlay: /Users/lio/Documents/personal/github/grid-line-defense-pvp/packages/web-shell/public/assets/maps/phase-a-long-v2-overlay.json
```

- [ ] **Step 3: 문서 변경 후 최소 검증**

Run:
```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1
git diff --check
```
Expected: PASS

- [ ] **Step 4: 문서 커밋**

```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1
git add README.md docs/agent-usage.md
git commit -m "docs: document Phase A map preview workflow"
```

### Task 9: 수동 E2E 검수

**Files:**
- Modify: 없음

- [ ] **Step 1: 게임 쪽 검수**

Run:
```bash
cd /Users/lio/Documents/personal/github/grid-line-defense-pvp
bun run test:shared
bun run test:phaser
bun run build:web
```
Expected: PASS

- [ ] **Step 2: agent 쪽 검수**

Run:
```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator
npm run build
npm test
```
Expected: PASS

- [ ] **Step 3: 실제 디버그 페이지 동작 확인**

Run:
```bash
cd /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1/tools/tiled-agent-orchestrator
node dist/src/index.js
```

브라우저에서 확인:

1. `http://127.0.0.1:3017/` 접속
2. workspace root에 `/Users/lio/Documents/personal/github/grid-line-defense-pvp` 입력
3. document path에 `packages/web-shell/public/assets/maps/phase-a-long-v2.tmj` 입력 후 open
4. layer list / revision / preview canvas 확인
5. overlay JSON 로드 후 `path`, `buildable`, `obstacles` 토글 확인

Expected:

- snapshot이 로드된다
- layer 패널이 실제 레이어 수를 보여준다
- preview canvas가 맵 실루엣을 대략적으로 그린다
- overlay 토글이 켜지고 꺼진다

- [ ] **Step 4: 최종 커밋/푸시 전 상태 확인**

Run:
```bash
git -C /Users/lio/Documents/personal/github/grid-line-defense-pvp status --short
git -C /Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1 status --short
```
Expected: 의도한 파일만 변경되어 있다.

---

## Acceptance Checklist

- [ ] `PHASE_A_LONG_MAP` 가 `12x20` 으로 확장되고, path는 `115~125`, buildable은 `64~68` 범위를 유지한다.
- [ ] `phase-a-long-v2.tmj` 가 Tiled 데스크톱에서 열리고, 지정된 visual layer 계약을 따른다.
- [ ] Phaser는 새 Tiled visual layers가 있으면 이를 렌더링하고, 없으면 기존 procedural fallback을 유지한다.
- [ ] `phase-a-long-v2-overlay.json` 이 코드 규칙과 동기화되어 debug UI overlay source로 사용된다.
- [ ] `tiled-for-agent` 디버그 페이지가 snapshot/레이어 상태/tileset/diagnostics/canvas preview를 보여준다.
- [ ] 사용자는 `phase-a-long-v2.tmj` 와 optional overlay JSON을 로드해 변경 결과를 바로 확인할 수 있다.

## Notes for Execution

- 게임 저장소의 `docs/game-spec/01-GDD.md` 는 사용자 변경분이므로 절대 포함하지 않는다.
- `tiled-for-agent` 수정은 반드시 worktree `/Users/lio/.config/superpowers/worktrees/tiled-for-agent/agent-v1` 에서 한다. 현재 cwd인 `/Users/lio/Documents/personal/github/tiled-for-agent` `master` 는 건드리지 않는다.
- visual asset 작성은 코드 생성보다 Tiled 데스크톱 수동 편집 비중이 크다. 대신 레이어 계약과 테스트를 통해 결과를 고정한다.
