# Spawn Hut Asset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 몬스터 스폰 포인트에 다크 오두막 에셋을 배치하고, 웨이브 진행 중 연기 VFX로 활성 상태를 표시한다.

**Architecture:** CastleWallSystem과 대칭 구조. 에셋 생성 스크립트(generate-spawn-hut.ts)로 idle/active 2개 이미지 + spawn-smoke VFX 스프라이트시트를 생성하고, SpawnHutSystem이 Phaser 씬에서 스폰 포인트마다 스프라이트를 관리한다. wave-started/wave-completed 이벤트로 active 상태를 전환한다.

**Tech Stack:** @napi-rs/canvas (에셋 생성), Phaser 3 (런타임 렌더링), TypeScript

---

## File Structure

| 파일 | 작업 | 역할 |
|------|------|------|
| `scripts/generate-assets/shared.ts` | 수정 | PALETTE에 spawnHut 서브그룹 추가 |
| `scripts/generate-assets/generate-spawn-hut.ts` | 신규 | idle/active 오두막 이미지 2개 생성 |
| `scripts/generate-assets/generate-vfx.ts` | 수정 | spawn-smoke 스프라이트시트 추가 |
| `scripts/generate-assets/generate-all.ts` | 수정 | spawn-hut 생성기 등록 |
| `packages/phaser-game/src/systems/SpawnHutSystem.ts` | 신규 | 오두막 스프라이트 + VFX 관리 |
| `packages/phaser-game/src/scenes/Game.ts` | 수정 | spawn fillTileRect 제거, SpawnHutSystem 연동 |

---

### Task 1: Asset Generation Pipeline

shared.ts PALETTE 추가, generate-spawn-hut.ts 생성, generate-vfx.ts에 spawn-smoke 추가, generate-all.ts 등록.

**Files:**
- Modify: `scripts/generate-assets/shared.ts`
- Create: `scripts/generate-assets/generate-spawn-hut.ts`
- Modify: `scripts/generate-assets/generate-vfx.ts`
- Modify: `scripts/generate-assets/generate-all.ts`

- [ ] **Step 1: shared.ts에 spawnHut 색상 서브그룹 추가**

`PALETTE` 객체 끝, `castleStone` 아래에 추가:

```typescript
  // Spawn hut wood
  spawnHut: {
    woodDark: '#3a2a1a', woodMid: '#2a1f15', woodLight: '#4a3828',
    thatch: '#8a7a50', bone: '#c8c0b0', door: '#0a0a0a',
    shadow: '#1a1210', accent: '#c04020', flagPole: '#5a4a3a',
  },
```

- [ ] **Step 2: generate-spawn-hut.ts 생성**

경로: `scripts/generate-assets/generate-spawn-hut.ts`

```typescript
import { makeCanvas, saveCanvas, PALETTE, drawRect, setPixel, fillCircle, type ManifestEntry } from './shared';
import { mkdirSync } from 'fs';
import type { SKRSContext2D } from '@napi-rs/canvas';

const OUTPUT_DIR = 'packages/web-shell/public/assets/spawn-hut';
const W = 64;
const H = 80;

const SH = PALETTE.spawnHut;

function drawSpawnHut(ctx: SKRSContext2D, w: number, h: number, active: boolean): void {
  // === Wooden walls (y:24~79) ===
  for (let y = 24; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const plank = Math.floor(x / 8);
      const isJoint = x % 8 === 0;
      if (isJoint) {
        setPixel(ctx, x, y, SH.shadow);
      } else {
        const color = plank % 2 === 0 ? SH.woodMid : SH.woodLight;
        setPixel(ctx, x, y, color);
      }
    }
  }

  // === Triangular roof (y:0~24) ===
  const roofPeak = 0;
  const roofBase = 24;
  const roofHeight = roofBase - roofPeak;
  for (let y = roofPeak; y < roofBase; y++) {
    const progress = (y - roofPeak) / roofHeight;
    const halfWidth = Math.round(progress * (w / 2));
    const left = w / 2 - halfWidth;
    const right = w / 2 + halfWidth;
    for (let x = left; x < right; x++) {
      // Thatch texture with variation
      const isRidge = Math.abs(x - w / 2) <= 1;
      if (isRidge) {
        setPixel(ctx, x, y, SH.woodDark);
      } else {
        // Irregular thatch pattern
        const noise = ((x * 7 + y * 13) % 5);
        const color = noise < 2 ? SH.woodDark : SH.thatch;
        setPixel(ctx, x, y, color);
      }
    }
    // Roof edge (2px dark line)
    if (halfWidth > 0) {
      setPixel(ctx, left, y, SH.woodDark);
      setPixel(ctx, left + 1, y, SH.woodDark);
      setPixel(ctx, right - 1, y, SH.woodDark);
      setPixel(ctx, right - 2, y, SH.woodDark);
    }
  }

  // Flagpole + bone decoration at roof peak
  drawRect(ctx, 31, 0, 2, 3, SH.flagPole);
  drawRect(ctx, 30, 0, 4, 2, SH.bone); // bone ornament

  // === Arched door (y:50~79, x:20~43) ===
  const doorLeft = 20;
  const doorRight = 43;
  const doorTop = 50;
  const doorCx = (doorLeft + doorRight) / 2;
  const doorRadius = (doorRight - doorLeft) / 2;

  // Door frame (shadow, 2px)
  for (let y = doorTop; y < h; y++) {
    for (let x = doorLeft - 2; x <= doorRight + 2; x++) {
      const dx = x - doorCx;
      const dy = y - doorTop;
      const inArch = dy < doorRadius && (dx * dx + (dy - doorRadius) * (dy - doorRadius)) <= (doorRadius + 2) * (doorRadius + 2);
      const inRect = dy >= doorRadius && x >= doorLeft - 2 && x <= doorRight + 2;
      if (inArch || inRect) {
        setPixel(ctx, x, y, SH.shadow);
      }
    }
  }

  // Door interior (black)
  for (let y = doorTop; y < h; y++) {
    for (let x = doorLeft; x <= doorRight; x++) {
      const dx = x - doorCx;
      const dy = y - doorTop;
      const inArch = dy < doorRadius && (dx * dx + (dy - doorRadius) * (dy - doorRadius)) <= doorRadius * doorRadius;
      const inRect = dy >= doorRadius;
      if (inArch || inRect) {
        setPixel(ctx, x, y, SH.door);
      }
    }
  }

  // === Skull decorations ===
  // Skull 1 (left of door): x:12~17, y:55~60
  drawRect(ctx, 12, 55, 6, 5, SH.bone);
  drawRect(ctx, 12, 60, 6, 1, SH.shadow); // jaw shadow
  setPixel(ctx, 13, 56, SH.door); // left eye
  setPixel(ctx, 14, 56, SH.door);
  setPixel(ctx, 16, 56, SH.door); // right eye
  setPixel(ctx, 17, 56, SH.door);

  // Skull 2 (right of door): x:46~51, y:55~60
  drawRect(ctx, 46, 55, 6, 5, SH.bone);
  drawRect(ctx, 46, 60, 6, 1, SH.shadow);
  setPixel(ctx, 47, 56, SH.door);
  setPixel(ctx, 48, 56, SH.door);
  setPixel(ctx, 50, 56, SH.door);
  setPixel(ctx, 51, 56, SH.door);

  // === Active state additions ===
  if (active) {
    // Red glow inside door (source-atop to stay within door area)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const gradient = ctx.createRadialGradient(doorCx, 65, 0, doorCx, 65, doorRadius);
    gradient.addColorStop(0, 'rgba(200,40,20,0.35)');
    gradient.addColorStop(1, 'rgba(200,40,20,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(doorLeft, doorTop, doorRight - doorLeft + 1, h - doorTop);
    ctx.restore();

    // Red highlight on inner door frame (1px)
    for (let y = doorTop + 1; y < h; y++) {
      setPixel(ctx, doorLeft, y, SH.accent);
      setPixel(ctx, doorRight, y, SH.accent);
    }

    // Glowing skull eyes (red)
    const redEye = '#ff4040';
    setPixel(ctx, 13, 56, redEye);
    setPixel(ctx, 14, 56, redEye);
    setPixel(ctx, 16, 56, redEye);
    setPixel(ctx, 17, 56, redEye);
    setPixel(ctx, 47, 56, redEye);
    setPixel(ctx, 48, 56, redEye);
    setPixel(ctx, 50, 56, redEye);
    setPixel(ctx, 51, 56, redEye);
  }
}

export async function generate(): Promise<ManifestEntry[]> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const entries: ManifestEntry[] = [];

  const variants: { active: boolean; name: string }[] = [
    { active: false, name: 'idle' },
    { active: true, name: 'active' },
  ];

  for (const { active, name } of variants) {
    const { canvas, ctx } = makeCanvas(W, H);
    drawSpawnHut(ctx, W, H, active);
    const filename = `base-${name}.png`;
    saveCanvas(canvas, `${OUTPUT_DIR}/${filename}`);
    entries.push({
      key: `spawn-hut-${name}`,
      type: 'image',
      path: `assets/spawn-hut/${filename}`,
    });
  }

  return entries;
}

if (import.meta.main) {
  generate().then(e => console.log(JSON.stringify(e, null, 2)));
}
```

- [ ] **Step 3: 단독 실행 테스트**

Run: `cd scripts/generate-assets && bun run generate-spawn-hut.ts`
Expected: 2개 PNG 생성 출력 + JSON manifest 엔트리

- [ ] **Step 4: generate-vfx.ts에 spawn-smoke 추가**

`generate-vfx.ts`의 `generate()` 함수 끝, `return entries;` 직전에 추가:

```typescript
  // spawn-smoke.png (192x32, 8 frames x 24x32) — 스폰 연기
  {
    const FW = 24, FH = 32, FRAMES = 8;
    const { canvas, ctx } = makeCanvas(FW * FRAMES, FH);
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      const cx = 12, cy = 10;
      // Smoke descends y +1~+3px per frame (downward, spawn direction)
      const descent = 1 + (f % 3);
      // Alpha cycle: 0.15→0.45→0.15 (breathing)
      const t = f / (FRAMES - 1);
      const alpha = 0.15 + 0.30 * Math.sin(t * Math.PI);
      // Cloud radius varies 6~10
      const radius = 6 + Math.round(4 * Math.sin(t * Math.PI));
      // Main smoke cloud (dark reddish)
      fillCircle(ctx, ox + cx, cy + descent, radius, `rgba(120,60,40,${alpha.toFixed(2)})`);
      // Secondary smaller cloud
      fillCircle(ctx, ox + cx + 3, cy + descent + 2, Math.max(3, radius - 3), `rgba(80,40,30,${(alpha * 0.7).toFixed(2)})`);
    }
    saveCanvas(canvas, `${OUTPUT_DIR}/spawn-smoke.png`);
    entries.push({
      key: 'vfx-spawn-smoke', type: 'spritesheet',
      path: 'assets/vfx/spawn-smoke.png',
      frameWidth: FW, frameHeight: FH, frameCount: FRAMES,
      section: 'preload' as const,
    });
  }
```

- [ ] **Step 5: generate-all.ts 등록**

import 추가:
```typescript
import { generate as generateSpawnHut } from './generate-spawn-hut';
```

Promise.all 배열의 destructure에 `spawnHut` 추가 (castleWall 옆):
```typescript
spawnHut,
```

Promise.all 배열에 실행 추가:
```typescript
generateSpawnHut().then((result) => {
    console.log('[spawn-hut] done');
    return result;
}),
```

allEntries spread에 추가:
```typescript
...spawnHut,
```

- [ ] **Step 6: 전체 에셋 생성 실행**

Run: `bun generate:assets`
Expected: `[spawn-hut] done` 출력, manifest에 `spawn-hut-idle`, `spawn-hut-active`, `vfx-spawn-smoke` 3개 키 존재, 중복 없음

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-assets/shared.ts scripts/generate-assets/generate-spawn-hut.ts scripts/generate-assets/generate-vfx.ts scripts/generate-assets/generate-all.ts
git commit -m "feat: spawn hut asset pipeline — idle/active hut + spawn-smoke VFX"
```

---

### Task 2: Game Integration

SpawnHutSystem 생성, Game.ts 연동, spawn fillTileRect 제거.

**Files:**
- Create: `packages/phaser-game/src/systems/SpawnHutSystem.ts`
- Modify: `packages/phaser-game/src/scenes/Game.ts`
- Modify: `packages/phaser-game/tests/fieldRuntime.test.ts` (mock 추가)
- Modify: `packages/phaser-game/tests/GameScene.test.ts` (mock 추가)

- [ ] **Step 1: SpawnHutSystem.ts 생성**

경로: `packages/phaser-game/src/systems/SpawnHutSystem.ts`

```typescript
import {
	getMapPaths,
	type MapLayout,
	TILE_SIZE,
} from '@gld/shared';
import type Phaser from 'phaser';

import type { GridManager } from './GridManager';

interface HutSet {
	hut: Phaser.GameObjects.Sprite;
	smoke: Phaser.GameObjects.Sprite;
}

export class SpawnHutSystem {
	private scene: Phaser.Scene;
	private grid: GridManager;
	private map: MapLayout;
	private huts: HutSet[] = [];

	constructor(scene: Phaser.Scene, grid: GridManager, map: MapLayout) {
		this.scene = scene;
		this.grid = grid;
		this.map = map;
	}

	create(): void {
		// Register animation if not already registered
		if (!this.scene.anims.exists('spawn-smoke')) {
			this.scene.anims.create({
				key: 'spawn-smoke',
				frames: this.scene.anims.generateFrameNumbers('vfx-spawn-smoke', {
					start: 0,
					end: 7,
				}),
				frameRate: 8,
				repeat: -1,
			});
		}

		const paths = getMapPaths(this.map);
		for (const lane of paths) {
			if (lane.length === 0) continue;
			const sp = lane[0];
			const world = this.grid.gridToWorld(sp.x, sp.y);
			const hutY = world.y - TILE_SIZE / 2; // align hut top to tile top edge
			const baseDepth = sp.x + sp.y;

			// Hut sprite
			const hut = this.scene.add.sprite(world.x, hutY, 'spawn-hut-idle');
			hut.setDisplaySize(64, 80);
			hut.setOrigin(0.5, 0.0);
			hut.setDepth(baseDepth + 1);

			// Smoke sprite (below door area)
			const smoke = this.scene.add.sprite(
				world.x,
				hutY + 60,
				'vfx-spawn-smoke',
			);
			smoke.setDepth(baseDepth + 2);
			smoke.setVisible(false);
			smoke.play('spawn-smoke');
			smoke.anims.pause();

			this.huts.push({ hut, smoke });
		}
	}

	setActive(active: boolean): void {
		for (const { hut, smoke } of this.huts) {
			if (active) {
				hut.setTexture('spawn-hut-active');
				smoke.setVisible(true);
				if (!smoke.anims.isPlaying) {
					smoke.anims.resume();
				}
			} else {
				hut.setTexture('spawn-hut-idle');
				smoke.setVisible(false);
				smoke.anims.pause();
			}
		}
	}

	destroy(): void {
		for (const { hut, smoke } of this.huts) {
			hut.destroy();
			smoke.destroy();
		}
		this.huts.length = 0;
	}
}
```

- [ ] **Step 2: Game.ts — spawnColor fillTileRect + fillCircle 제거**

`renderFieldPathOverlay` 메서드에서 spawn 렌더링 블록 제거.

제거할 코드 (약 lines 322, 335-344):
```typescript
// 제거: spawnColor 변수 선언
const spawnColor = dark ? 0x40556f : theme.spawnColor;

// 제거: spawn points 렌더링 전체 블록
// Render spawn points for all lanes
const paths = getMapPaths(this.currentMap);
for (const lane of paths) {
    if (lane.length === 0) continue;
    const sp = lane[0];
    grid.fillTileRect(graphics, sp.x, sp.y, spawnColor, dark ? 0.58 : 0.68);
    const spWorld = grid.gridToWorld(sp.x, sp.y);
    graphics.fillStyle(dark ? 0xc4d6ff : 0xf6e3aa, dark ? 0.95 : 0.88);
    graphics.fillCircle(spWorld.x, spWorld.y - 6, 7);
}
```

MapTheme에서도 `spawnColor` 제거:
- `interface MapTheme`: `spawnColor: number;` 삭제
- 3개 테마 객체에서 `spawnColor: ...` 라인 삭제

- [ ] **Step 3: Game.ts — SpawnHutSystem 추가**

import 추가:
```typescript
import { SpawnHutSystem } from '../systems/SpawnHutSystem';
```

클래스 필드 추가 (castleWall 옆):
```typescript
private spawnHut!: SpawnHutSystem;
```

`create()` 메서드에서 castleWall 생성 바로 다음에 추가:
```typescript
this.spawnHut = new SpawnHutSystem(
    this,
    this.playerGrid,
    this.currentMap,
);
this.spawnHut.create();
```

- [ ] **Step 4: Game.ts — wave 이벤트로 active 상태 전환**

`onWaveStartedLifecycle` 핸들러에 추가:
```typescript
this.onWaveStartedLifecycle = (data) => {
    this.currentSlotDef = mapWaves[data.slotIndex - 1] ?? mapWaves[0];
    soundGenerator.playWaveStart();
    this.spawnHut.setActive(true);  // ← 추가
};
```

`wave-completed` 이벤트 핸들러를 새로 등록. 클래스 필드 추가:
```typescript
private onWaveCompleted!: (data: {
    wave: number;
    totalWaves: number;
    slotIndex: number;
    delaySec: number;
}) => void;
```

`create()`에서 핸들러 정의 + 등록:
```typescript
this.onWaveCompleted = () => {
    this.spawnHut.setActive(false);
};

EventBus.on('wave-completed', this.onWaveCompleted);
```

`cleanup()`에서 해제:
```typescript
EventBus.off('wave-completed', this.onWaveCompleted);
```

`emitGameOver()`에서도 해제:
```typescript
EventBus.off('wave-completed', this.onWaveCompleted);
```

- [ ] **Step 5: Game.ts — cleanup에 spawnHut.destroy() 추가**

`cleanup()` 메서드에서 `castleWall?.destroy()` 옆에:
```typescript
this.spawnHut?.destroy();
```

- [ ] **Step 6: 테스트 mock 업데이트**

`fieldRuntime.test.ts`와 `GameScene.test.ts`에 SpawnHutSystem mock이 필요하면 추가. CastleWallSystem mock 패턴을 참고:
- scene mock에 `anims.exists`, `anims.create`, `anims.generateFrameNumbers` 이미 있으므로 추가 불필요
- GameScene.test.ts의 defeat 테스트에서 `spawnHut` 속성 mock 필요 시 추가

- [ ] **Step 7: 테스트 실행**

Run: `bun test:phaser`
Expected: 19 test files, 139 tests passed (기존과 동일, 신규 실패 없음)

- [ ] **Step 8: Commit**

```bash
git add packages/phaser-game/src/systems/SpawnHutSystem.ts packages/phaser-game/src/scenes/Game.ts packages/phaser-game/tests/fieldRuntime.test.ts packages/phaser-game/tests/GameScene.test.ts
git commit -m "feat: SpawnHutSystem — wave-synced spawn hut with smoke VFX"
```

---

### Task 3: Verification

- [ ] **Step 1: 에셋 생성 확인**

Run: `bun generate:assets`
Expected:
- `packages/web-shell/public/assets/spawn-hut/base-idle.png` (64×80)
- `packages/web-shell/public/assets/spawn-hut/base-active.png` (64×80)
- `packages/web-shell/public/assets/vfx/spawn-smoke.png` (192×32)

- [ ] **Step 2: manifest 키 확인**

Run: `bun -e "const m = require('./packages/web-shell/public/assets/asset-manifest.json'); ['spawn-hut-idle','spawn-hut-active','vfx-spawn-smoke'].forEach(k => { const a = m.assets.find(a => a.key === k); console.log(k, a ? '✓' : '✗'); })"`
Expected: 3개 모두 ✓

- [ ] **Step 3: 전체 테스트**

Run: `bun test:phaser && bun test:shared`
Expected: 기존과 동일한 pass 수, 신규 실패 없음

- [ ] **Step 4: 개발 서버 시각 확인**

Run: `bun dev:web`
확인 사항:
- 스폰 포인트에 오두막 렌더링됨
- 웨이브 시작 시 active 텍스처 + 연기 VFX 전환
- 웨이브 종료 시 idle로 복귀
- 멀티레인 맵에서 복수 오두막 확인
