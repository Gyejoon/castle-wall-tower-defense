import { existsSync, readFileSync } from 'node:fs';
import { ALL_TOWERS } from '@gld/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRELOAD_TOWER_IDS } from '../src/constants/preloadAssets';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_TILESET_ASSETS,
} from '../src/fieldAssets';

vi.mock('phaser', () => ({
	default: {
		Scene: class {
			load: unknown;
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
		frameWidth?: number;
		frameHeight?: number;
		frameCount?: number;
	}>;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('PRELOAD_TOWER_IDS', () => {
	it('includes every tower asset id through god tier', () => {
		expect(PRELOAD_TOWER_IDS).toHaveLength(ALL_TOWERS.length);
		expect(PRELOAD_TOWER_IDS).toEqual(ALL_TOWERS.map((tower) => tower.id));
		expect(PRELOAD_TOWER_IDS).toContain('flame_tower');
		expect(PRELOAD_TOWER_IDS).toContain('dragon_nest');
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
			});
		}

		expect(manifest.assets).toContainEqual({
			key: 'tilemap-forest-gate',
			type: 'tilemapTiledJSON',
			path: 'assets/maps/forest-gate.json',
		});

		expect(manifest.assets.some((asset) => asset.key === 'grid-floor')).toBe(
			false,
		);
		expect(manifest.assets.some((asset) => asset.key === 'path-tile')).toBe(
			false,
		);
		expect(manifest.assets.some((asset) => asset.key === 'spawn-tile')).toBe(
			false,
		);
		expect(manifest.assets.some((asset) => asset.key === 'exit-tile')).toBe(
			false,
		);
		expect(manifest.assets.some((asset) => asset.key === 'tileset')).toBe(
			false,
		);
	});

	it('preloads Tiny Swords field spritesheets and tilemap JSON', async () => {
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
			load: {
				image,
				spritesheet,
				tilemapTiledJSON,
			},
		});

		scene.preload();

		for (const asset of TINY_SWORDS_TILESET_ASSETS) {
			expect(spritesheet).toHaveBeenCalledWith(asset.key, asset.path, {
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
			});
		}

		for (const asset of TINY_SWORDS_DECORATION_ASSETS) {
			expect(spritesheet).toHaveBeenCalledWith(asset.key, asset.path, {
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
			});
		}

		expect(tilemapTiledJSON).toHaveBeenCalledWith(
			'tilemap-forest-gate',
			'assets/maps/forest-gate.json',
		);
		expect(image).not.toHaveBeenCalledWith('grid-floor', expect.anything());
		expect(image).not.toHaveBeenCalledWith('path-tile', expect.anything());
		expect(image).not.toHaveBeenCalledWith('spawn-tile', expect.anything());
		expect(image).not.toHaveBeenCalledWith('exit-tile', expect.anything());
	});
});
