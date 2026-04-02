import { readFileSync } from 'node:fs';
import { ALL_TOWERS, FOREST_GATE_MAP } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_PRIMARY_TILESET,
	TINY_SWORDS_TILESET_ASSETS,
} from '../src/fieldAssets';

vi.mock('phaser', () => ({
	default: {
		Scene: class {
			constructor(_key?: string) {}
		},
	},
}));

import { Preloader } from '../src/scenes/Preloader';

const manifest = JSON.parse(
	readFileSync(
		new URL('../../web-shell/public/assets/asset-manifest.json', import.meta.url),
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

	it('field map contract stays aligned with raw Tiny Swords asset references', async () => {
		const mapJson = JSON.parse(
			readFileSync(
				new URL(
					'../../web-shell/public/assets/maps/forest-gate.json',
					import.meta.url,
				),
				'utf-8',
			),
		) as {
			width: number;
			height: number;
			tilesets: Array<{
				image: string;
				imagewidth: number;
				imageheight: number;
				tilewidth: number;
				tileheight: number;
				tilecount: number;
				columns: number;
			}>;
			layers: Array<{
				name: string;
				type: string;
				data?: number[];
				objects?: Array<{
					x: number;
					y: number;
					width: number;
					height: number;
					properties?: Array<{ name: string; value: string }>;
				}>;
			}>;
		};

		expect(mapJson.tilesets).toHaveLength(1);
		expect(mapJson.tilesets[0]).toMatchObject({
			image: '../vendor/tiny-swords/terrain/tileset/Tilemap_color1.png',
			imagewidth: TINY_SWORDS_PRIMARY_TILESET.pixelWidth,
			imageheight: TINY_SWORDS_PRIMARY_TILESET.pixelHeight,
		});

		expect(mapJson.width).toBe(FOREST_GATE_MAP.width);
		expect(mapJson.height).toBe(FOREST_GATE_MAP.height);

		const pathLayer = mapJson.layers.find(
			(layer) => layer.name === 'path' && layer.type === 'tilelayer',
		);
		const objectLayer = mapJson.layers.find(
			(layer) => layer.name === 'objects' && layer.type === 'objectgroup',
		);
		const decorationLayer = mapJson.layers.find(
			(layer) => layer.name === 'decorations' && layer.type === 'objectgroup',
		);

		expect(pathLayer?.data).toBeDefined();
		expect(objectLayer?.objects).toBeDefined();
		expect(decorationLayer?.objects).toBeDefined();

		const nonEmptyPathTiles = pathLayer?.data?.filter((gid) => gid !== 0);
		const spawnIndex =
			FOREST_GATE_MAP.spawnPoint.y * FOREST_GATE_MAP.width +
			FOREST_GATE_MAP.spawnPoint.x;
		const exitIndex =
			FOREST_GATE_MAP.exitPoint.y * FOREST_GATE_MAP.width +
			FOREST_GATE_MAP.exitPoint.x;

		expect(nonEmptyPathTiles).toHaveLength(FOREST_GATE_MAP.path.length);
		expect(pathLayer?.data?.[spawnIndex]).not.toBe(0);
		expect(pathLayer?.data?.[exitIndex]).not.toBe(0);

		expect(objectLayer?.objects).toHaveLength(
			FOREST_GATE_MAP.buildablePoints.length,
		);
		expect(
			objectLayer?.objects?.map((object) => ({
				x: object.x,
				y: object.y,
				width: object.width,
				height: object.height,
			})),
		).toEqual(
			FOREST_GATE_MAP.buildablePoints.map((point) => ({
				x: point.x * FOREST_GATE_MAP.tileSize,
				y: point.y * FOREST_GATE_MAP.tileSize,
				width: FOREST_GATE_MAP.tileSize,
				height: FOREST_GATE_MAP.tileSize,
			})),
		);

		expect(decorationLayer?.objects?.length).toBeGreaterThan(0);
		for (const object of decorationLayer?.objects ?? []) {
			const properties = Object.fromEntries(
				(object.properties ?? []).map((property) => [
					property.name,
					property.value,
				]),
			);
			expect(properties.kind).toBeTruthy();
			expect(properties.assetKey).toBeTruthy();
			expect(properties.variant).toBeTruthy();
			expect(
				TINY_SWORDS_DECORATION_ASSETS.some(
					(asset) => asset.key === properties.assetKey,
				),
			).toBe(true);
		}
	});
});
