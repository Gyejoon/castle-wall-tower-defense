import { readFileSync } from 'node:fs';
import {
	ALL_TOWERS,
	MAIN_LONG_MAP,
	PHASE_A_LONG_MAP,
	PHASE_A_LONG_V2_TILEMAP_KEY,
	PHASE_A_LONG_V2_TILEMAP_PATH,
} from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import { collectManualManifestEntries } from '../../../scripts/generate-assets/generate-all';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_TILESET_ASSETS,
	type TinySwordsDecorationKind,
} from '../src/fieldAssets';

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
			`../../web-shell/public/${PHASE_A_LONG_V2_TILEMAP_PATH}`,
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

const mainLongTilemap = JSON.parse(
	readFileSync(
		new URL(
			'../../web-shell/public/assets/maps/main-long.json',
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
				objects: Array<unknown>;
		  }
	>;
};

const decorationAssetKeys = new Set(
	TINY_SWORDS_DECORATION_ASSETS.map((asset) => asset.key),
);
const decorationKinds = new Set<TinySwordsDecorationKind>(
	TINY_SWORDS_DECORATION_ASSETS.map((asset) => asset.kind),
);

describe('asset integration', () => {
	it('keeps manual tilemap assets in the generator-owned manifest pipeline', () => {
		expect(collectManualManifestEntries()).toContainEqual({
			key: PHASE_A_LONG_V2_TILEMAP_KEY,
			type: 'tilemapTiledJSON',
			path: PHASE_A_LONG_V2_TILEMAP_PATH,
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
		expect(phaseALongV2Tilemap.tilewidth).toBe(PHASE_A_LONG_MAP.tileSize);
		expect(phaseALongV2Tilemap.tileheight).toBe(PHASE_A_LONG_MAP.tileSize);

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
			expect(
				decorationKinds.has(properties.get('kind') as TinySwordsDecorationKind),
			).toBe(true);
			expect(
				decorationAssetKeys.has(properties.get('assetKey') as string),
			).toBe(true);
			expect(typeof object.x).toBe('number');
			expect(typeof object.y).toBe('number');
			expect((object.x ?? -1) % phaseALongV2Tilemap.tilewidth).toBe(0);
			expect((object.y ?? -1) % phaseALongV2Tilemap.tileheight).toBe(0);
			expect(object.width).toBe(phaseALongV2Tilemap.tilewidth);
			expect(object.height).toBe(phaseALongV2Tilemap.tileheight);
		}
	});

	it('keeps the main_long mobile tilemap aligned with the runtime map contract', () => {
		expect(mainLongTilemap.width).toBe(MAIN_LONG_MAP.width);
		expect(mainLongTilemap.height).toBe(MAIN_LONG_MAP.height);
		expect(mainLongTilemap.tilewidth).toBe(MAIN_LONG_MAP.tileSize);
		expect(mainLongTilemap.tileheight).toBe(MAIN_LONG_MAP.tileSize);

		expect(mainLongTilemap.layers.map((layer) => layer.name)).toEqual([
			'ground_base',
			'road_low',
			'platform_high',
			'cliff_faces',
			'foliage_low',
			'decorations',
			'objects',
		]);

		const roadLayer = mainLongTilemap.layers.find(
			(layer) => layer.type === 'tilelayer' && layer.name === 'road_low',
		);
		expect(roadLayer?.type).toBe('tilelayer');
		expect((roadLayer as { data: number[] }).data.filter(Boolean)).toHaveLength(
			MAIN_LONG_MAP.path.length,
		);
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
	// 정식 모드 uses an on-the-fly generated grid with no Tiled JSON source,
	// so the check no longer applies. Commit 7.4 adds obstacle placement
	// tests that cover the 정식 모드 spatial contract.
});
