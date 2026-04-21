import { vi } from 'vitest';

/**
 * Shared Phaser-ish stubs for the characterization suite. Matches the
 * superset of fields used by tests/SiegeProjectileVfx.test.ts — so when
 * Phase 1-2 tests start piling on, new files should import from here
 * rather than duplicating the harness.
 *
 * NOTE: tests/SiegeProjectileVfx.test.ts still owns its own copy; moving
 * that file is out of scope for Phase 0.
 */

export function createGraphics() {
	return {
		setDepth: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		fillEllipse: vi.fn().mockReturnThis(),
		strokeEllipse: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		beginPath: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		strokePath: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

/**
 * Image stub with plain-object `x` / `y` / `rotation` fields so direct
 * property assignment (e.g. TowerSystem's nova_cannon barrel rotation
 * update) actually persists. `setPosition`/`setRotation` are vi.fn mocks
 * — they return `this` but do NOT mutate the tracked fields, matching
 * the existing SiegeProjectileVfx.test.ts contract.
 */
export function createImage() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		setRotation: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		visible: false,
		active: true,
		x: 100,
		y: 100,
		rotation: 0,
		destroy: vi.fn(),
	};
}

export function createSprite() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		clearTint: vi.fn().mockReturnThis(),
		setRotation: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		play: vi.fn().mockReturnThis(),
		once: vi.fn(),
		active: true,
		scaleX: 1,
		scaleY: 1,
		x: 100,
		y: 100,
		rotation: 0,
		destroy: vi.fn(),
	};
}

/**
 * Build a minimal scene whose `textures.exists(key)` returns true only for
 * the keys you pass in. Nova cannon uses this to opt into the rotating
 * barrel branch at TowerSystem.ts:313-324; other callers can pass an
 * empty set for the default "no textures loaded" harness.
 */
export function buildScene(existsKeys: Set<string> = new Set()) {
	const addGraphics = vi.fn(() => createGraphics());
	const addImage = vi.fn(() => createImage());
	const addSprite = vi.fn(() => createSprite());
	return {
		scene: {
			add: {
				graphics: addGraphics,
				image: addImage,
				sprite: addSprite,
			},
			textures: {
				exists: vi.fn((key: string) => existsKeys.has(key)),
			},
			anims: {
				exists: vi.fn(() => false),
			},
			tweens: {
				add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
			},
		},
		addGraphics,
		addImage,
		addSprite,
	};
}

export function buildGridManager() {
	return {
		orthoTile: 48,
		isInBounds: vi.fn(() => true),
		isWalkable: vi.fn(() => true),
		canPlaceTower: vi.fn(() => true),
		placeTower: vi.fn(() => true),
		removeTower: vi.fn(),
		getWalkabilityGrid: vi.fn(() => []),
		spawnPoint: { x: 0, y: 0 },
		exitPoint: { x: 4, y: 17 },
		gridToWorld: vi.fn((col: number, row: number) => ({
			x: col * 48,
			y: row * 48,
		})),
		getDepth: vi.fn(() => 10),
		worldToGridFloat: vi.fn((x: number, y: number) => ({
			x: x / 48,
			y: y / 48,
		})),
	};
}
