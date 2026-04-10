import { describe, expect, it } from 'vitest';
import type {
	TiledObjectLayer,
	TiledRawMap,
	TiledTileLayer,
} from '../src/maps/parseTiledMap';
import { parseTiledMap } from '../src/maps/parseTiledMap';

function makeRaw(overrides: Partial<TiledRawMap> = {}): TiledRawMap {
	return {
		width: 3,
		height: 3,
		tilewidth: 32,
		tileheight: 32,
		orientation: 'orthogonal',
		version: '1.10',
		layers: [
			{
				name: 'ground',
				type: 'tilelayer',
				width: 3,
				height: 3,
				data: [1, 1, 1, 1, 1, 1, 1, 1, 1],
			},
			{
				name: 'terrain',
				type: 'tilelayer',
				width: 3,
				height: 3,
				data: [1, 1, 1, 3, 3, 3, 1, 1, 1],
			},
			{
				name: 'paths',
				type: 'objectgroup',
				objects: [
					{
						id: 1,
						name: 'lane_0',
						type: 'path_lane',
						x: 0,
						y: 0,
						width: 0,
						height: 0,
						polyline: [
							{ x: 0, y: 32 },
							{ x: 32, y: 32 },
							{ x: 64, y: 32 },
						],
						properties: [
							{ name: 'isPrimary', type: 'bool', value: true },
							{ name: 'spawn', type: 'bool', value: true },
							{ name: 'exit', type: 'bool', value: true },
						],
					},
				],
			},
			{ name: 'structures', type: 'objectgroup', objects: [] },
			{ name: 'decorations', type: 'objectgroup', objects: [] },
			{ name: 'objects', type: 'objectgroup', objects: [] },
		],
		properties: [
			{ name: 'id', type: 'string', value: 'test_map' },
			{ name: 'name', type: 'string', value: 'Test' },
			{ name: 'recommendedPower', type: 'int', value: 50 },
			{ name: 'rewardMultiplier', type: 'int', value: 1 },
			{ name: 'difficultyHpMult', type: 'int', value: 1 },
			{ name: 'tilemapKey', type: 'string', value: 'tilemap-test' },
			{
				name: 'tilesetKey',
				type: 'string',
				value: 'tiny-swords-tileset-color-1',
			},
		],
		...overrides,
	};
}

describe('parseTiledMap', () => {
	it('converts a valid 3x3 map with a single path lane', () => {
		const result = parseTiledMap(makeRaw());
		expect(result.id).toBe('test_map');
		expect(result.width).toBe(3);
		expect(result.path).toEqual([
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
		]);
		expect(result.terrain[1][0]).toBe('road');
		expect(result.terrain[0][0]).toBe('plain');
		expect(result.spawnPoint).toEqual({ x: 0, y: 1 });
		expect(result.exitPoint).toEqual({ x: 2, y: 1 });
		expect(result.structures).toEqual([]);
	});

	it('throws when required layers are missing', () => {
		const bad = makeRaw({
			layers: [
				{
					name: 'ground',
					type: 'tilelayer',
					width: 3,
					height: 3,
					data: [1, 1, 1, 1, 1, 1, 1, 1, 1],
				},
			],
		});
		expect(() => parseTiledMap(bad)).toThrow(/missing layer/i);
	});

	it('throws when terrain GID is unknown', () => {
		const bad = makeRaw();
		const terrainLayer = bad.layers.find(
			(l): l is TiledTileLayer =>
				l.name === 'terrain' && l.type === 'tilelayer',
		);
		if (!terrainLayer) throw new Error('missing terrain layer in test');
		terrainLayer.data = [1, 1, 1, 999, 1, 1, 1, 1, 1];
		expect(() => parseTiledMap(bad)).toThrow(/unknown terrain gid/i);
	});

	it('throws when path lane is disconnected', () => {
		const bad = makeRaw();
		const paths = bad.layers.find(
			(l): l is TiledObjectLayer =>
				l.name === 'paths' && l.type === 'objectgroup',
		);
		if (!paths) throw new Error('missing paths layer in test');
		paths.objects[0].polyline = [
			{ x: 0, y: 32 },
			{ x: 64, y: 32 },
		];
		expect(() => parseTiledMap(bad)).toThrow(/not adjacent/i);
	});

	it('parses a structure with blocksPlacement and blocksPath flags', () => {
		const raw = makeRaw();
		const structures = raw.layers.find(
			(l): l is TiledObjectLayer =>
				l.name === 'structures' && l.type === 'objectgroup',
		);
		if (!structures) throw new Error('missing structures layer in test');
		structures.objects.push({
			id: 10,
			name: 'wall_0',
			type: 'structure',
			x: 32,
			y: 0,
			width: 32,
			height: 32,
			properties: [
				{ name: 'structureKind', type: 'string', value: 'wall_stone' },
				{ name: 'blocksPlacement', type: 'bool', value: true },
				{ name: 'blocksPath', type: 'bool', value: true },
				{ name: 'assetKey', type: 'string', value: 'wall_stone' },
				{ name: 'variant', type: 'string', value: 'a' },
			],
		});
		const result = parseTiledMap(raw);
		expect(result.structures).toHaveLength(1);
		expect(result.structures[0]).toMatchObject({
			kind: 'wall_stone',
			position: { x: 1, y: 0 },
			blocksPlacement: true,
			blocksPath: true,
		});
	});

	it('includes blocked placement markers from the objects layer', () => {
		const raw = makeRaw();
		const objects = raw.layers.find(
			(l): l is TiledObjectLayer =>
				l.name === 'objects' && l.type === 'objectgroup',
		);
		if (!objects) throw new Error('missing objects layer in test');
		objects.objects.push({
			id: 20,
			name: 'blocked_corner',
			type: 'blocked_placement',
			x: 64,
			y: 64,
			width: 0,
			height: 0,
		});
		const result = parseTiledMap(raw);
		expect(result.blockedPlacementPoints).toContainEqual({ x: 2, y: 2 });
	});
});
