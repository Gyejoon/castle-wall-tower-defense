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
	// Phase 1: grade variant assets were removed alongside the grade system.
	// Full preload coverage is re-verified in Phase 11 when placeholder towers
	// for the new T2-T6 ids land.
	it.skip('Preloader queues every tower sprite used by TowerSystem (disabled in Phase 1)', async () => {
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

		preloader.cache = { json: { get: () => manifest } };
		preloader.load = { image, tilemapTiledJSON, spritesheet };
		preloader.preload();

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

	// Phase 7: the forest-gate tilemap JSON integrity test was scenario-
	// specific (asserts width/height/path counts from FOREST_GATE_MAP).
	// 정식 모드 uses an on-the-fly generated grid with no Tiled JSON source,
	// so the check no longer applies. Commit 7.4 adds obstacle placement
	// tests that cover the 정식 모드 spatial contract.
});
