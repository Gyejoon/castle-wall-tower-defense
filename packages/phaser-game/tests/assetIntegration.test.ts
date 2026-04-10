import { readFileSync } from 'node:fs';
import { ALL_TOWERS } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import { TINY_SWORDS_TILESET_ASSETS } from '../src/fieldAssets';

vi.mock('phaser', () => ({
	default: {
		Scene: class {
			constructor(_key?: string) {}
		},
	},
}));

// Ensure assetManifest uses the real implementation even when other test files
// (e.g. GameScene.test.ts) mock it — prevents cross-file mock bleed under bun:test.
vi.mock('../src/assets/assetManifest', async (importOriginal) => {
	return await importOriginal();
});

import { Preloader } from '../src/scenes/Preloader';

const manifest = JSON.parse(
	readFileSync(
		new URL(
			'../../web-shell/public/assets/asset-manifest.json',
			import.meta.url,
		),
		'utf-8',
	),
) as {
	assets: Array<{
		key: string;
		path: string;
		type: 'image' | 'spritesheet' | 'tilemapTiledJSON';
		frameWidth?: number;
		frameHeight?: number;
	}>;
};

describe('asset integration', () => {
	it('Preloader queues every tower sprite used by TowerSystem', async () => {
		vi.stubGlobal('document', {
			createElement: () => ({
				toDataURL: () => 'data:image/png',
			}),
		});

		const image = vi.fn();
		const tilemapTiledJSON = vi.fn();
		const spritesheet = vi.fn();

		const preloader = new Preloader() as Preloader & {
			cache: {
				json: {
					get: () => typeof manifest;
				};
			};
			load: {
				image: typeof image;
				tilemapTiledJSON: typeof tilemapTiledJSON;
				spritesheet: typeof spritesheet;
			};
		};

		preloader.cache = {
			json: {
				get: () => manifest,
			},
		};
		preloader.load = {
			image,
			tilemapTiledJSON,
			spritesheet,
		};

		preloader.preload();

		const towerImageCalls = image.mock.calls.filter(([key]) =>
			String(key).startsWith('tower-'),
		);
		expect(towerImageCalls).toHaveLength(ALL_TOWERS.length);

		for (const tower of ALL_TOWERS) {
			expect(image).toHaveBeenCalledWith(
				`tower-${tower.id}`,
				`assets/towers/${tower.id}.png`,
			);
		}

		for (const asset of TINY_SWORDS_TILESET_ASSETS) {
			expect(spritesheet).toHaveBeenCalledWith(asset.key, asset.path, {
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
			});
		}
	});

	// NOTE: "field map contract" test removed — tilemap JSON files migrated to @gld/shared source.
	// Map contract is now verified by packages/shared/tests/maps-regression.test.ts.
});
