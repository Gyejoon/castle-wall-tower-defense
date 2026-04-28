import { existsSync, readFileSync } from 'node:fs';
import { ALL_TOWERS } from '@gld/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	prefetchAssetSections,
	preloadAssetSection,
	unloadAssetSections,
} from '../src/assets/assetManifest';
import { PRELOAD_TOWER_IDS } from '../src/constants/preloadAssets';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_TILESET_ASSETS,
} from '../src/fieldAssets';

// Ensure assetManifest uses the real implementation even when other test files
// (e.g. GameScene.test.ts) mock it — prevents cross-file mock bleed under bun:test.
vi.mock('../src/assets/assetManifest', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('phaser', () => ({
	default: {
		Scene: class {
			load: unknown;
			cache = {
				json: {
					get: vi.fn(),
				},
			};
			anims = {
				create: vi.fn(),
				generateFrameNumbers: vi.fn(() => []),
			};
			scene = {
				start: vi.fn(),
			};
		},
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
		frameWidth?: number;
		frameHeight?: number;
		frameCount?: number;
	}>;
};
const manifestByKey = new Map(
	manifest.assets.map((asset) => [asset.key, asset]),
);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('PRELOAD_TOWER_IDS', () => {
	it('includes every tower in the current catalog', () => {
		expect(PRELOAD_TOWER_IDS).toHaveLength(ALL_TOWERS.length);
		expect(PRELOAD_TOWER_IDS).toEqual(ALL_TOWERS.map((tower) => tower.id));
		expect(PRELOAD_TOWER_IDS).toContain('flame_tower');
		expect(PRELOAD_TOWER_IDS).toContain('divine_throne');
	});

	it('has either png manifest entries or generated webp files for every preloaded tower asset', () => {
		for (const towerId of PRELOAD_TOWER_IDS) {
			const hasPngManifestEntry = manifest.assets.some(
				(asset) =>
					asset.key === `tower-${towerId}` &&
					asset.path === `assets/towers/${towerId}.png`,
			);
			const hasWebpFile = existsSync(
				new URL(
					`../../web-shell/public/assets/towers/${towerId}.webp`,
					import.meta.url,
				),
			);

			expect(hasPngManifestEntry || hasWebpFile).toBe(true);
		}
	});
});

describe('field asset preload alignment', () => {
	it('keeps manifest entries aligned with the vendored Tiny Swords field runtime assets', () => {
		for (const asset of TINY_SWORDS_TILESET_ASSETS) {
			expect(manifest.assets).toContainEqual({
				key: asset.key,
				type: 'spritesheet',
				path: asset.path,
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
				frameCount: asset.frameCount,
				section: 'preload',
			});
		}

		for (const asset of TINY_SWORDS_DECORATION_ASSETS) {
			expect(manifest.assets).toContainEqual({
				key: asset.key,
				type: 'spritesheet',
				path: asset.path,
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
				frameCount: asset.frameCount,
				section: 'preload',
			});
		}

		expect(manifest.assets).toContainEqual({
			key: 'tilemap-forest-gate',
			type: 'tilemapTiledJSON',
			path: 'assets/maps/forest-gate.json',
			section: 'preload',
		});
	});

	it('boot preloads the asset manifest before the main preloader runs', async () => {
		const json = vi.fn();
		const { Boot } = await import('../src/scenes/Boot');
		const scene = new Boot();

		Object.assign(scene, {
			load: {
				json,
			},
		});

		scene.preload();

		expect(json).toHaveBeenCalledWith(
			'asset-manifest',
			'assets/asset-manifest.json',
		);
	});

	it('preloads only the core runtime assets from the cached manifest', async () => {
		vi.stubGlobal('document', {
			createElement: () => ({
				toDataURL: () => 'data:image/png',
			}),
		});

		const image = vi.fn();
		const spritesheet = vi.fn();
		const tilemapTiledJSON = vi.fn();
		const { Preloader } = await import('../src/scenes/Preloader');
		const scene = new Preloader();

		Object.assign(scene, {
			cache: {
				json: {
					get: vi.fn(() => manifest),
				},
			},
			load: {
				image,
				spritesheet,
				tilemapTiledJSON,
			},
		});

		scene.preload();

		expect(spritesheet).toHaveBeenCalledWith(
			TINY_SWORDS_TILESET_ASSETS[0].key,
			TINY_SWORDS_TILESET_ASSETS[0].path,
			{
				frameWidth: TINY_SWORDS_TILESET_ASSETS[0].frameWidth,
				frameHeight: TINY_SWORDS_TILESET_ASSETS[0].frameHeight,
			},
		);
		expect(spritesheet).toHaveBeenCalledWith(
			TINY_SWORDS_DECORATION_ASSETS[0].key,
			TINY_SWORDS_DECORATION_ASSETS[0].path,
			{
				frameWidth: TINY_SWORDS_DECORATION_ASSETS[0].frameWidth,
				frameHeight: TINY_SWORDS_DECORATION_ASSETS[0].frameHeight,
			},
		);
		expect(image).toHaveBeenCalledWith(
			'tower-archer',
			manifestByKey.get('tower-archer')?.path,
		);
		expect(spritesheet).toHaveBeenCalledWith(
			'unit-scout_drone',
			manifestByKey.get('unit-scout_drone')?.path,
			{
				frameWidth: 40,
				frameHeight: 48,
			},
		);
		expect(tilemapTiledJSON).toHaveBeenCalledWith(
			'tilemap-forest-gate',
			manifestByKey.get('tilemap-forest-gate')?.path,
		);

		expect(image).not.toHaveBeenCalledWith(
			'ui-hp-bar',
			manifestByKey.get('ui-hp-bar')?.path,
		);
		expect(spritesheet).not.toHaveBeenCalledWith(
			'ui-tower-icons',
			manifestByKey.get('ui-tower-icons')?.path,
			{
				frameWidth: 32,
				frameHeight: 32,
			},
		);
	});

	it('creates walk, idle, and death animations for unit sheets that exist in the manifest', async () => {
		vi.stubGlobal('document', {
			createElement: () => ({
				toDataURL: () => 'data:image/png',
			}),
		});
		const create = vi.fn();
		const generateFrameNumbers = vi.fn(
			(_key: string, range: { start: number; end: number }) => range,
		);
		const start = vi.fn();
		const { Preloader } = await import('../src/scenes/Preloader');
		const scene = new Preloader() as InstanceType<typeof Preloader> & {
			cache: {
				json: { get: () => { assets: Array<Record<string, unknown>> } };
			};
			anims: {
				create: typeof create;
				generateFrameNumbers: typeof generateFrameNumbers;
				exists: (key: string) => boolean;
			};
			scene: { start: typeof start };
		};

		scene.cache = {
			json: {
				get: () => ({
					assets: [
						{
							key: 'unit-scout_drone',
							type: 'spritesheet',
							path: 'assets/units/scout_drone.png',
							frameWidth: 40,
							frameHeight: 48,
							frameCount: 8,
							section: 'preload',
						},
						{
							key: 'unit-battle_robot',
							type: 'spritesheet',
							path: 'assets/units/battle_robot.png',
							frameWidth: 40,
							frameHeight: 48,
							frameCount: 8,
							section: 'preload',
						},
						{
							key: 'unit-heavy_walker',
							type: 'spritesheet',
							path: 'assets/units/heavy_walker.png',
							frameWidth: 40,
							frameHeight: 48,
							frameCount: 8,
							section: 'preload',
						},
						{
							key: 'unit-stealth_drone',
							type: 'spritesheet',
							path: 'assets/units/stealth_drone.png',
							frameWidth: 40,
							frameHeight: 48,
							frameCount: 8,
							section: 'preload',
						},
						{
							key: 'unit-dragon',
							type: 'spritesheet',
							path: 'assets/units/dragon.png',
							frameWidth: 40,
							frameHeight: 48,
							frameCount: 8,
							section: 'preload',
						},
						{
							key: 'unit-scout_drone-idle',
							type: 'spritesheet',
							path: 'assets/units/scout_drone_idle.png',
							frameWidth: 40,
							frameHeight: 48,
							frameCount: 6,
							section: 'preload',
						},
						{
							key: 'unit-scout_drone-death',
							type: 'spritesheet',
							path: 'assets/units/scout_drone_death.png',
							frameWidth: 40,
							frameHeight: 48,
							frameCount: 6,
							section: 'preload',
						},
					],
				}),
			},
		};
		scene.anims = {
			create,
			generateFrameNumbers,
			exists: vi.fn(() => false),
		};
		scene.scene = { start };

		scene.create();

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'scout_drone-walk',
				frameRate: 10,
				repeat: -1,
			}),
		);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'scout_drone-idle',
				frameRate: 8,
				repeat: -1,
			}),
		);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'scout_drone-death',
				frameRate: 12,
				repeat: 0,
			}),
		);
		expect(generateFrameNumbers).toHaveBeenCalledWith('unit-scout_drone-idle', {
			start: 0,
			end: 5,
		});
		expect(generateFrameNumbers).toHaveBeenCalledWith(
			'unit-scout_drone-death',
			{
				start: 0,
				end: 5,
			},
		);
		expect(start).toHaveBeenCalledWith('Game');
	});

	it('can preload a non-core section on demand from the same manifest', () => {
		const image = vi.fn();
		const spritesheet = vi.fn();
		const tilemapTiledJSON = vi.fn();
		const scene = {
			load: {
				image,
				spritesheet,
				tilemapTiledJSON,
			},
		};

		preloadAssetSection(scene as never, manifest, 'ui', false);

		expect(image).toHaveBeenCalledWith(
			'ui-hp-bar',
			manifestByKey.get('ui-hp-bar')?.path,
		);
		expect(spritesheet).toHaveBeenCalledWith(
			'ui-tower-icons',
			manifestByKey.get('ui-tower-icons')?.path,
			{
				frameWidth: 32,
				frameHeight: 32,
			},
		);
		expect(image).not.toHaveBeenCalledWith(
			TINY_SWORDS_TILESET_ASSETS[0].key,
			TINY_SWORDS_TILESET_ASSETS[0].path,
		);
	});

	it('prefetches only missing optional sections and starts the loader once', async () => {
		const image = vi.fn();
		const spritesheet = vi.fn();
		const tilemapTiledJSON = vi.fn();
		const once = vi.fn((_event: string, callback: () => void) => {
			callback();
		});
		const start = vi.fn();
		const exists = vi.fn((key: string) => key === 'ui-hp-bar');
		const scene = {
			load: {
				image,
				spritesheet,
				tilemapTiledJSON,
				once,
				start,
			},
			textures: {
				exists,
			},
			cache: {
				tilemap: {
					exists: vi.fn(() => false),
				},
			},
		};

		await prefetchAssetSections(scene as never, manifest, ['ui', 'vfx'], false);

		expect(image).not.toHaveBeenCalledWith(
			'ui-hp-bar',
			manifestByKey.get('ui-hp-bar')?.path,
		);
		expect(spritesheet).toHaveBeenCalledWith(
			'vfx-explosion-sm',
			manifestByKey.get('vfx-explosion-sm')?.path,
			{
				frameWidth: 32,
				frameHeight: 32,
			},
		);
		expect(start).toHaveBeenCalledOnce();
		expect(once).toHaveBeenCalledWith('complete', expect.any(Function));
	});

	it('unloads optional and preload section assets from textures and tilemap cache', () => {
		const removeTexture = vi.fn();
		const removeTilemap = vi.fn();
		const scene = {
			textures: {
				exists: vi.fn(() => true),
				remove: removeTexture,
			},
			cache: {
				tilemap: {
					exists: vi.fn((key: string) => key === 'tilemap-forest-gate'),
					remove: removeTilemap,
				},
			},
			anims: {
				exists: vi.fn(() => false),
				remove: vi.fn(),
			},
		};

		unloadAssetSections(scene as never, manifest, ['ui', 'preload']);

		expect(removeTexture).toHaveBeenCalledWith('ui-hp-bar');
		expect(removeTexture).toHaveBeenCalledWith(
			TINY_SWORDS_TILESET_ASSETS[0].key,
		);
		expect(removeTilemap).toHaveBeenCalledWith('tilemap-forest-gate');
	});
});
