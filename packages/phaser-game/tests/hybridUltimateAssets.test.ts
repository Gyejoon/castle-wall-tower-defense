import { existsSync, readFileSync } from 'node:fs';
import { PHASE_A_LONG_MAP } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import { GridManager } from '../src/systems/GridManager';
import { TowerSystem } from '../src/systems/TowerSystem';

vi.mock('phaser', () => ({
	default: {
		Animations: {
			Events: {
				ANIMATION_COMPLETE: 'animationcomplete',
			},
		},
		Geom: {
			Point: class {
				x: number;
				y: number;
				constructor(x: number, y: number) {
					this.x = x;
					this.y = y;
				}
			},
		},
		GameObjects: { Graphics: class {} },
	},
}));

vi.mock('../src/audio/SoundGenerator', () => ({
	soundGenerator: {
		playTowerAttack: vi.fn(),
	},
}));

const manifestPath = new URL(
	'../../web-shell/public/assets/asset-manifest.json',
	import.meta.url,
);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
	assets: Array<{
		key: string;
		path: string;
		type: 'image' | 'spritesheet' | 'tilemapTiledJSON';
		section?: string;
	}>;
};
const manifestByKey = new Map(
	manifest.assets.map((asset) => [asset.key, asset]),
);

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
		setAlpha: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createImage() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setTexture: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		clearTint: vi.fn().mockReturnThis(),
		scaleX: 1,
		scaleY: 1,
		destroy: vi.fn(),
	};
}

function createScene(textureExists: (key: string) => boolean = () => false) {
	return {
		add: {
			graphics: vi.fn(() => createGraphics()),
			image: vi.fn(() => createImage()),
			sprite: vi.fn(),
		},
		textures: {
			exists: vi.fn(textureExists),
		},
		anims: {
			exists: vi.fn(() => false),
		},
		tweens: {
			add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
			killTweensOf: vi.fn(),
		},
	};
}

function createTowerSystem(textureExists?: (key: string) => boolean) {
	const scene = createScene(textureExists);
	const gridManager = new GridManager(PHASE_A_LONG_MAP);
	const pathfinding = {
		invalidateCache: vi.fn(),
		findPath: vi.fn(() => PHASE_A_LONG_MAP.path),
	};
	const towerSystem = new TowerSystem(
		scene as never,
		gridManager,
		pathfinding as never,
	);
	return { scene, gridManager, towerSystem, pathfinding };
}

describe('Phase 11 — hybrid/ultimate placeholder assets', () => {
	it('manifest registers placeholder entries for hybrid_ab, hybrid_cd, ultimate', () => {
		expect(manifestByKey.has('tower-hybrid_ab')).toBe(true);
		expect(manifestByKey.has('tower-hybrid_cd')).toBe(true);
		expect(manifestByKey.has('tower-ultimate')).toBe(true);
	});

	it('placeholder paths point to existing T4 sprite files', () => {
		const repoPublic = new URL('../../web-shell/public/', import.meta.url);
		const checkExists = (relPath: string) =>
			existsSync(new URL(relPath, repoPublic));

		const hybridAb = manifestByKey.get('tower-hybrid_ab');
		const hybridCd = manifestByKey.get('tower-hybrid_cd');
		const ultimate = manifestByKey.get('tower-ultimate');

		expect(hybridAb?.path).toBe('assets/towers/arcane_spire.png');
		expect(hybridCd?.path).toBe('assets/towers/world_tree.png');
		expect(ultimate?.path).toBe('assets/towers/divine_throne.png');

		expect(hybridAb && checkExists(hybridAb.path)).toBe(true);
		expect(hybridCd && checkExists(hybridCd.path)).toBe(true);
		expect(ultimate && checkExists(ultimate.path)).toBe(true);
	});
});

describe('Phase 11 — placement tolerates hybrid/ultimate towers without crashing', () => {
	for (const towerId of ['hybrid_ab', 'hybrid_cd', 'ultimate'] as const) {
		it(`placeTower(${towerId}) succeeds and triggers the aura tween`, () => {
			const { towerSystem, scene } = createTowerSystem();
			const buildable = PHASE_A_LONG_MAP.buildablePoints[0];

			const result = towerSystem.placeTower(buildable.x, buildable.y, towerId);

			expect(result.success).toBe(true);
			// Idle tween + aura tween => two add() calls minimum.
			expect(scene.tweens.add).toHaveBeenCalled();
		});
	}

	it('falls back to placeholder texture when primary key is missing', () => {
		// Pretend the manifest never produced a `tower-hybrid_ab` texture but
		// the placeholder ancestor `tower-arcane_spire` is present.
		const exists = vi.fn((key: string) => key === 'tower-arcane_spire');
		const { towerSystem, scene } = createTowerSystem(exists);
		const buildable = PHASE_A_LONG_MAP.buildablePoints[1];
		const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const result = towerSystem.placeTower(
			buildable.x,
			buildable.y,
			'hybrid_ab',
		);

		expect(result.success).toBe(true);
		expect(consoleWarn).toHaveBeenCalled();
		expect(scene.add.image).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			'tower-arcane_spire',
		);
		consoleWarn.mockRestore();
	});
});
