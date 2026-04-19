import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		Animations: {
			Events: {
				ANIMATION_COMPLETE: 'animationcomplete',
			},
		},
		GameObjects: {
			Events: {
				DESTROY: 'destroy',
			},
		},
	},
}));

vi.mock('../src/audio/SoundGenerator', () => ({
	soundGenerator: {
		playTowerAttack: vi.fn(),
		playArrowImpact: vi.fn(),
	},
}));

vi.mock('../src/EventBus', () => ({
	EventBus: {
		emit: vi.fn(),
	},
}));

import { TowerSystem } from '../src/systems/TowerSystem';

function createGraphics() {
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

function createImage() {
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
		destroy: vi.fn(),
	};
}

function createSprite() {
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

function buildScene() {
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
				exists: vi.fn(() => false),
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

function buildGridManager() {
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

const pathfinding = {
	invalidateCache: vi.fn(),
	findPath: vi.fn(() => [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
	]),
};

describe('siege tower projectile VFX (rock arc)', () => {
	it('siege towers (splash_X.X special) classify as arc-style projectiles', () => {
		const { scene } = buildScene();
		const gridManager = buildGridManager();
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager as never,
			pathfinding as never,
		);

		// Place a fortress (공성대포) — Phase 1 special is 'splash_1.5'
		const placement = towerSystem.placeTower(0, 0, 'fortress');
		expect(placement.success).toBe(true);

		// Trigger one attack cycle on a target within range.
		towerSystem.update(2000, 16, [
			{ instanceId: 'enemy_1', x: 96, y: 0, hp: 100 },
		]);

		// Pull internal attackLines via cast for verification.
		const lines = (
			towerSystem as unknown as {
				attackLines: Array<{
					style: 'beam' | 'arc' | 'arrow';
					impactPending?: boolean;
				}>;
			}
		).attackLines;

		expect(lines.length).toBeGreaterThan(0);
		// Regression guard for the bug fixed in this commit: hasSplash() used
		// to require `_splash` suffix and missed the new `splash_<radius>`
		// format, dropping siege towers to a beam — which the player sees as
		// "공격방식이 바뀌었다 / 돌이 안 날아간다".
		expect(lines[0].style).toBe('arc');
		expect(lines[0].impactPending).toBe(true);
	});
});
