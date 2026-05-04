import type { TileKind, TilemapCell, TilemapDocument } from './types';

interface RawTilemap {
	width: number;
	height: number;
	tilewidth: number;
	layers?: unknown[];
}

function tileLayerData(
	map: RawTilemap,
	names: string | string[],
	width: number,
	height: number,
): number[] {
	const candidates = Array.isArray(names) ? names : [names];
	const layer = (map.layers ?? []).find(
		(entry): entry is { name: string; data: number[] } =>
			typeof entry === 'object' &&
			entry !== null &&
			candidates.includes(String((entry as { name?: unknown }).name)) &&
			Array.isArray((entry as { data?: unknown }).data),
	);
	return layer?.data ?? Array.from({ length: width * height }, () => 0);
}

function hasLayer(map: RawTilemap, name: string): boolean {
	return (map.layers ?? []).some(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			(entry as { name?: unknown }).name === name,
	);
}

export function tilemapRuleTiles(raw: Partial<RawTilemap>, tileSize: number) {
	const legacy = hasLayer(raw as RawTilemap, 'path') || tileSize <= 32;
	if (legacy) {
		return [
			{ layer: 'ground', kind: 'ground' as const, rule: 'fill' as const },
			{
				layer: 'path',
				kind: 'path' as const,
				rule: 'path-neighbor-mask' as const,
			},
		];
	}

	return [
		{ layer: 'ground_base', kind: 'ground' as const, rule: 'fill' as const },
		{
			layer: 'road_low',
			kind: 'path' as const,
			rule: 'path-neighbor-mask' as const,
		},
		{
			layer: 'platform_high',
			kind: 'platform' as const,
			rule: 'inverse-path' as const,
		},
		{
			layer: 'cliff_faces',
			kind: 'wall' as const,
			rule: 'path-neighbor-mask' as const,
		},
		{
			layer: 'foliage_low',
			kind: 'foliage' as const,
			rule: 'path-neighbor-mask' as const,
		},
	];
}

export function parseTilemapRaw(
	file: string,
	raw: RawTilemap,
): TilemapDocument {
	const width = raw.width;
	const height = raw.height;
	const road = tileLayerData(raw, ['road_low', 'path'], width, height);
	const platform = tileLayerData(raw, ['platform_high'], width, height);
	const wall = tileLayerData(raw, ['cliff_faces'], width, height);
	const foliage = tileLayerData(raw, ['foliage_low'], width, height);
	const cells: TilemapCell[] = [];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const kind: TileKind =
				road[index] > 0
					? 'path'
					: wall[index] > 0
						? 'wall'
						: foliage[index] > 0
							? 'foliage'
							: platform[index] > 0
								? 'platform'
								: 'ground';
			cells.push({ x, y, kind });
		}
	}

	return {
		id: file.replace(/\.json$/i, ''),
		file,
		width,
		height,
		tileSize: raw.tilewidth,
		cells,
		ruleTiles: tilemapRuleTiles(raw, raw.tilewidth),
	};
}

function neighborMask(
	cells: TilemapCell[],
	width: number,
	height: number,
	x: number,
	y: number,
	kind: TileKind,
): number {
	const key = new Set(
		cells
			.filter((cell) => cell.kind === kind)
			.map((cell) => `${cell.x},${cell.y}`),
	);
	let mask = 0;
	if (y > 0 && key.has(`${x},${y - 1}`)) mask |= 1;
	if (x < width - 1 && key.has(`${x + 1},${y}`)) mask |= 2;
	if (y < height - 1 && key.has(`${x},${y + 1}`)) mask |= 4;
	if (x > 0 && key.has(`${x - 1},${y}`)) mask |= 8;
	return mask;
}

function legacyPathTile(mask: number): number {
	const vertical = (mask & 1) !== 0 || (mask & 4) !== 0;
	const horizontal = (mask & 2) !== 0 || (mask & 8) !== 0;
	if (vertical && horizontal) return 6;
	if (!vertical && !horizontal) return 5;
	return 3;
}

export function buildTilemapJson(input: {
	id: string;
	width: number;
	height: number;
	tileSize: number;
	cells: TilemapCell[];
}) {
	const { id, width, height, tileSize, cells } = input;
	const byPos = new Map(
		cells.map((cell) => [`${cell.x},${cell.y}`, cell.kind]),
	);
	const dataFor = (kind: TileKind, baseTile: number, useMask = false) =>
		Array.from({ length: width * height }, (_, index) => {
			const x = index % width;
			const y = Math.floor(index / width);
			const cellKind = byPos.get(`${x},${y}`) ?? 'ground';
			if (kind === 'platform' && cellKind !== 'path') return baseTile;
			if (cellKind !== kind) return 0;
			return useMask
				? baseTile + neighborMask(cells, width, height, x, y, kind)
				: baseTile;
		});
	const legacyPathData = () =>
		Array.from({ length: width * height }, (_, index) => {
			const x = index % width;
			const y = Math.floor(index / width);
			const cellKind = byPos.get(`${x},${y}`) ?? 'ground';
			if (cellKind !== 'path') return 0;
			return legacyPathTile(neighborMask(cells, width, height, x, y, 'path'));
		});
	const checkerGround = Array.from({ length: width * height }, (_, index) =>
		(index + Math.floor(index / width)) % 2 === 0 ? 1 : 2,
	);

	const layer = (name: string, data: number[]) => ({
		name,
		type: 'tilelayer',
		width,
		height,
		data,
		visible: true,
		opacity: 1,
		x: 0,
		y: 0,
	});

	if (tileSize <= 32) {
		return {
			compressionlevel: -1,
			height,
			width,
			infinite: false,
			orientation: 'orthogonal',
			renderorder: 'right-down',
			tileheight: tileSize,
			tilewidth: tileSize,
			tiledversion: '1.10.2',
			type: 'map',
			version: '1.10',
			layers: [
				layer('ground', checkerGround),
				layer('path', legacyPathData()),
				{
					name: 'decorations',
					type: 'objectgroup',
					objects: [],
					visible: true,
					opacity: 1,
					x: 0,
					y: 0,
				},
				{
					name: 'objects',
					type: 'objectgroup',
					objects: [],
					visible: true,
					opacity: 1,
					x: 0,
					y: 0,
				},
			],
			tilesets: [
				{
					firstgid: 1,
					name: 'tiny-swords-primary-tileset',
					tilewidth: tileSize,
					tileheight: tileSize,
					tilecount: 6,
					columns: 6,
					imagewidth: tileSize * 6,
					imageheight: tileSize,
					image: '../tilesets/tiny-swords-primary.png',
				},
			],
			properties: [
				{ name: 'generatedBy', type: 'string', value: 'tools-app' },
				{ name: 'mapId', type: 'string', value: id },
			],
		};
	}

	return {
		compressionlevel: -1,
		height,
		width,
		infinite: false,
		orientation: 'orthogonal',
		renderorder: 'right-down',
		tileheight: tileSize,
		tilewidth: tileSize,
		tiledversion: '1.10.2',
		type: 'map',
		version: '1.10',
		layers: [
			layer(
				'ground_base',
				Array.from({ length: width * height }, () => 1),
			),
			layer('road_low', dataFor('path', 2, true)),
			layer('platform_high', dataFor('platform', 3)),
			layer('cliff_faces', dataFor('wall', 24, true)),
			layer('foliage_low', dataFor('foliage', 40, true)),
			{
				name: 'decorations',
				type: 'objectgroup',
				objects: [],
				visible: true,
				opacity: 1,
			},
			{
				name: 'objects',
				type: 'objectgroup',
				objects: [],
				visible: true,
				opacity: 1,
			},
		],
		tilesets: [
			{
				firstgid: 1,
				name: 'tiny-swords-runtime-markers',
				tilewidth: tileSize,
				tileheight: tileSize,
				tilecount: 64,
				columns: 8,
			},
		],
		properties: [
			{ name: 'generatedBy', type: 'string', value: 'tools-app' },
			{ name: 'mapId', type: 'string', value: id },
		],
	};
}
