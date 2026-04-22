export const RECOGNIZED_VISUAL_LAYER_NAMES = [
	'ground_base',
	'road_low',
	'platform_high',
	'cliff_faces',
	'wall_mass',
	'wall_trim',
	'foliage_low',
] as const;

type TileLayerLike = {
	name?: unknown;
	type?: unknown;
	x?: unknown;
	y?: unknown;
	width?: unknown;
	height?: unknown;
	visible?: unknown;
	alpha?: unknown;
};

type TilemapLayerWrapperLike = {
	layer?: unknown;
	tilemapLayer?: unknown;
};

export type TilemapLike = {
	tileWidth?: unknown;
	tileHeight?: unknown;
	width?: unknown;
	height?: unknown;
	layers?: unknown;
	getLayer?: ((name: string) => unknown) | undefined;
};

export type VisualLayerMetadata = {
	name: (typeof RECOGNIZED_VISUAL_LAYER_NAMES)[number];
	type: 'tilelayer';
	order: number;
	width: number;
	height: number;
	tileWidth: number;
	tileHeight: number;
	offsetX: number;
	offsetY: number;
	visible: boolean;
	alpha: number;
	layerData: unknown;
	tilemapLayer?: unknown;
};

export type VisualLayerCollection = {
	hasRecognizedLayers: boolean;
	layerNames: VisualLayerMetadata['name'][];
	layers: VisualLayerMetadata[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const toNumber = (value: unknown, fallback: number): number =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const toBoolean = (value: unknown, fallback: boolean): boolean =>
	typeof value === 'boolean' ? value : fallback;

const isTileLayer = (layer: unknown): layer is TileLayerLike => {
	if (!isRecord(layer)) {
		return false;
	}

	return layer.type === 'tilelayer' && typeof layer.name === 'string';
};

const unwrapLayer = (
	entry: unknown,
): { layerData: TileLayerLike; tilemapLayer?: unknown } | null => {
	if (isTileLayer(entry)) {
		return { layerData: entry };
	}

	if (!isRecord(entry)) {
		return null;
	}

	const wrapper = entry as TilemapLayerWrapperLike;
	if (!isTileLayer(wrapper.layer)) {
		return null;
	}

	return {
		layerData: wrapper.layer,
		tilemapLayer: wrapper.tilemapLayer,
	};
};

const getNamedLayer = (
	tilemap: TilemapLike,
	name: string,
): { layerData: TileLayerLike; tilemapLayer?: unknown } | null => {
	const fromGetter = tilemap.getLayer?.(name);
	const unwrappedFromGetter = unwrapLayer(fromGetter);
	if (unwrappedFromGetter) {
		return unwrappedFromGetter;
	}

	if (!Array.isArray(tilemap.layers)) {
		return null;
	}

	for (const entry of tilemap.layers) {
		const unwrapped = unwrapLayer(entry);
		if (unwrapped?.layerData.name === name) {
			return unwrapped;
		}
	}

	return null;
};

export const collectVisualLayers = (
	tilemap: TilemapLike,
): VisualLayerCollection => {
	const tileWidth = toNumber(tilemap.tileWidth, 0);
	const tileHeight = toNumber(tilemap.tileHeight, 0);
	const mapWidth = toNumber(tilemap.width, 0);
	const mapHeight = toNumber(tilemap.height, 0);

	const layers = RECOGNIZED_VISUAL_LAYER_NAMES.reduce<VisualLayerMetadata[]>(
		(acc, name, order) => {
			const resolved = getNamedLayer(tilemap, name);
			if (!resolved) {
				return acc;
			}

			const { layerData, tilemapLayer } = resolved;

			acc.push({
				name,
				type: 'tilelayer',
				order,
				width: toNumber(layerData.width, mapWidth),
				height: toNumber(layerData.height, mapHeight),
				tileWidth,
				tileHeight,
				offsetX: toNumber(layerData.x, 0),
				offsetY: toNumber(layerData.y, 0),
				visible: toBoolean(layerData.visible, true),
				alpha: toNumber(layerData.alpha, 1),
				layerData,
				tilemapLayer,
			});

			return acc;
		},
		[],
	);

	return {
		hasRecognizedLayers: layers.length > 0,
		layerNames: layers.map((layer) => layer.name),
		layers,
	};
};

export const hasRecognizedVisualLayers = (tilemap: TilemapLike): boolean => {
	return collectVisualLayers(tilemap).hasRecognizedLayers;
};
