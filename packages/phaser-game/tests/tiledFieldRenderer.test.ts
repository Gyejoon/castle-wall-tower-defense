import {
	collectVisualLayers,
	hasRecognizedVisualLayers,
} from '../src/rendering/tiledFieldRenderer';

type MockLayerRecord = {
	name: string;
	type: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	visible?: boolean;
	alpha?: number;
	data?: number[][];
	objects?: Array<{ id: number; name: string }>;
};

const makeTilemap = (layers: MockLayerRecord[]) => {
	const layerByName = new Map(layers.map((layer) => [layer.name, layer]));

	return {
		tileWidth: 32,
		tileHeight: 32,
		width: 20,
		height: 12,
		layers,
		getLayer: (name: string) => {
			const layer = layerByName.get(name);
			return layer ? { tilemapLayer: undefined, layer } : null;
		},
	};
};

describe('tiledFieldRenderer helper', () => {
	it('extracts only recognized visual layers in stable order', () => {
		const mockTilemap = makeTilemap([
			{ name: 'decorations', type: 'objectgroup', objects: [{ id: 1, name: 'tree' }] },
			{
				name: 'wall_trim',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 0.75,
				data: [[1]],
			},
			{
				name: 'ground_base',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 1,
				data: [[1]],
			},
			{ name: 'spawn_points', type: 'objectgroup', objects: [] },
			{
				name: 'foliage_low',
				type: 'tilelayer',
				x: 4,
				y: 8,
				width: 20,
				height: 12,
				visible: false,
				alpha: 0.5,
				data: [[7]],
			},
			{
				name: 'road_low',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 1,
				data: [[2]],
			},
			{
				name: 'cliff_faces',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 1,
				data: [[4]],
			},
			{
				name: 'platform_high',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 1,
				data: [[3]],
			},
			{
				name: 'wall_mass',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 1,
				data: [[5]],
			},
			{
				name: 'debug_overlay',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 1,
				data: [[9]],
			},
		]);

		const result = collectVisualLayers(mockTilemap);

		expect(result.layerNames).toEqual([
			'ground_base',
			'road_low',
			'platform_high',
			'cliff_faces',
			'wall_mass',
			'wall_trim',
			'foliage_low',
		]);
		expect(result.layers).toHaveLength(7);
		expect(result.layers.map((layer) => layer.name)).toEqual(result.layerNames);
		expect(result.layers[0]).toMatchObject({
			name: 'ground_base',
			order: 0,
			width: 20,
			height: 12,
			tileWidth: 32,
			tileHeight: 32,
			offsetX: 0,
			offsetY: 0,
			visible: true,
			alpha: 1,
		});
		expect(result.layers[5]).toMatchObject({
			name: 'wall_trim',
			order: 5,
		});
		expect(result.layers[6]).toMatchObject({
			name: 'foliage_low',
			order: 6,
			offsetX: 4,
			offsetY: 8,
			visible: false,
			alpha: 0.5,
		});
		expect(result.layers.every((layer) => layer.type === 'tilelayer')).toBe(true);
		expect(result.layers.some((layer) => layer.name === 'decorations')).toBe(false);
		expect(result.layers.some((layer) => layer.name === 'debug_overlay')).toBe(false);
	});

	it('falls back when the tilemap does not expose recognized visual layers', () => {
		const mockTilemapWithoutLayers = makeTilemap([
			{ name: 'decorations', type: 'objectgroup', objects: [{ id: 1, name: 'tree' }] },
			{ name: 'spawn_points', type: 'objectgroup', objects: [] },
			{
				name: 'debug_overlay',
				type: 'tilelayer',
				x: 0,
				y: 0,
				width: 20,
				height: 12,
				visible: true,
				alpha: 1,
				data: [[9]],
			},
		]);

		expect(hasRecognizedVisualLayers(mockTilemapWithoutLayers)).toBe(false);
		expect(collectVisualLayers(mockTilemapWithoutLayers)).toMatchObject({
			layerNames: [],
			layers: [],
			hasRecognizedLayers: false,
		});
	});
});
