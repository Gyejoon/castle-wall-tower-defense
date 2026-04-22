import { readFileSync } from 'node:fs';
import { ALL_TOWERS } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_TILESET_ASSETS,
} from '../src/fieldAssets';
import { collectManualManifestEntries } from '../../../scripts/generate-assets/generate-all';

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

const phaseALongV2Tilemap = JSON.parse(
	readFileSync(
		new URL(
			'../../web-shell/public/assets/maps/phase-a-long-v2.tmj',
			import.meta.url,
		),
		'utf-8',
	),
) as {
	width: number;
	height: number;
	tilewidth: number;
	tileheight: number;
	layers: Array<
		| {
				type: 'tilelayer';
				name: string;
				data: number[];
		  }
		| {
				type: 'objectgroup';
				name: string;
				objects: Array<{
					x?: number;
					y?: number;
					width?: number;
					height?: number;
					properties?: Array<{
						name: string;
						value: unknown;
					}>;
				}>;
		  }
	>;
};

const decorationAssetKeys = new Set(
	TINY_SWORDS_DECORATION_ASSETS.map((asset) => asset.key),
);

describe('asset integration', () => {
	it('keeps manual tilemap assets in the generator-owned manifest pipeline', () => {
		expect(collectManualManifestEntries()).toContainEqual({
			key: 'tilemap-phase-a-long-v2',
			type: 'tilemapTiledJSON',
			path: 'assets/maps/phase-a-long-v2.tmj',
			section: 'preload',
		});
	});

	it('keeps the Phase A v2 decorations object layer parseable for GameScene runtime', () => {
		const decorationsLayer = phaseALongV2Tilemap.layers.find(
			(layer) => layer.type === 'objectgroup' && layer.name === 'decorations',
		);

		expect(decorationsLayer).toBeDefined();
		expect(decorationsLayer?.type).toBe('objectgroup');
		expect(decorationsLayer?.objects.length).toBeGreaterThan(0);

		for (const object of decorationsLayer?.objects ?? []) {
			const properties = new Map(
				(object.properties ?? []).map((property) => [
					property.name,
					property.value,
				]),
			);

			expect(typeof properties.get('kind')).toBe('string');
			expect(typeof properties.get('assetKey')).toBe('string');
			expect(typeof properties.get('variant')).toBe('string');
			expect(decorationAssetKeys.has(properties.get('assetKey') as string)).toBe(
				true,
			);
			expect(typeof object.x).toBe('number');
			expect(typeof object.y).toBe('number');
			expect((object.x ?? -1) % phaseALongV2Tilemap.tilewidth).toBe(0);
			expect((object.y ?? -1) % phaseALongV2Tilemap.tileheight).toBe(0);
			expect(object.width).toBe(phaseALongV2Tilemap.tilewidth);
			expect(object.height).toBe(phaseALongV2Tilemap.tileheight);
		}
	});

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
	// Phase A uses an on-the-fly generated grid with no Tiled JSON source,
	// so the check no longer applies. Commit 7.4 adds obstacle placement
	// tests that cover the Phase A spatial contract.
});
