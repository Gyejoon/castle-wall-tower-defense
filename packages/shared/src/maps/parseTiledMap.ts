import { TERRAIN_GID_MAP, type TerrainKind } from '../constants/terrain';
import type { Position } from '../types/grid';
import type { DecorationSpec, MapLayout, StructureSpec } from '../types/map';

export interface TiledProperty {
	name: string;
	type: 'string' | 'int' | 'bool' | 'float';
	value: string | number | boolean;
}

export interface TiledTileLayer {
	name: string;
	type: 'tilelayer';
	width: number;
	height: number;
	data: number[];
}

export interface TiledPolylinePoint {
	x: number;
	y: number;
}

export interface TiledObject {
	id: number;
	name: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	polyline?: TiledPolylinePoint[];
	properties?: TiledProperty[];
}

export interface TiledObjectLayer {
	name: string;
	type: 'objectgroup';
	objects: TiledObject[];
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer;

export interface TiledRawMap {
	width: number;
	height: number;
	tilewidth: number;
	tileheight: number;
	orientation: string;
	version: string;
	layers: TiledLayer[];
	properties?: TiledProperty[];
}

function prop<T = string | number | boolean>(
	properties: TiledProperty[] | undefined,
	name: string,
	fallback?: T,
): T {
	const found = properties?.find((p) => p.name === name);
	if (!found) {
		if (fallback !== undefined) return fallback;
		throw new Error(`[parseTiledMap] missing property "${name}"`);
	}
	return found.value as T;
}

function getLayer<T extends TiledLayer>(
	raw: TiledRawMap,
	name: string,
	type: T['type'],
): T {
	const layer = raw.layers.find((l) => l.name === name && l.type === type);
	if (!layer) {
		throw new Error(`[parseTiledMap] missing layer "${name}" of type ${type}`);
	}
	return layer as T;
}

function parseTerrain(layer: TiledTileLayer): TerrainKind[][] {
	const { width, height, data } = layer;
	const terrain: TerrainKind[][] = [];
	for (let y = 0; y < height; y++) {
		const row: TerrainKind[] = [];
		for (let x = 0; x < width; x++) {
			const gid = data[y * width + x];
			if (gid === 0) {
				row.push('plain');
				continue;
			}
			const kind = TERRAIN_GID_MAP[gid];
			if (!kind) {
				throw new Error(
					`[parseTiledMap] unknown terrain gid ${gid} at (${x},${y})`,
				);
			}
			row.push(kind);
		}
		terrain.push(row);
	}
	return terrain;
}

function polylineToCells(object: TiledObject, tileSize: number): Position[] {
	if (!object.polyline || object.polyline.length < 2) {
		throw new Error(
			`[parseTiledMap] path lane "${object.name}" missing polyline`,
		);
	}
	const originX = object.x;
	const originY = object.y;
	const cells: Position[] = [];
	for (let i = 0; i < object.polyline.length; i++) {
		const cell = {
			x: Math.floor((originX + object.polyline[i].x) / tileSize),
			y: Math.floor((originY + object.polyline[i].y) / tileSize),
		};
		if (i > 0) {
			const prev = cells[cells.length - 1];
			const dx = Math.abs(cell.x - prev.x);
			const dy = Math.abs(cell.y - prev.y);
			if (dx + dy !== 1) {
				throw new Error(
					`[parseTiledMap] path lane "${object.name}" segment ${i - 1} not adjacent ` +
						`(${prev.x},${prev.y})\u2192(${cell.x},${cell.y})`,
				);
			}
		}
		cells.push(cell);
	}
	return cells;
}

function parseStructures(
	layer: TiledObjectLayer,
	tileSize: number,
): StructureSpec[] {
	return layer.objects.map((o) => ({
		id: `${o.id}`,
		kind: prop<string>(o.properties, 'structureKind'),
		position: { x: Math.round(o.x / tileSize), y: Math.round(o.y / tileSize) },
		width: Math.max(1, Math.round(o.width / tileSize)),
		height: Math.max(1, Math.round(o.height / tileSize)),
		blocksPlacement: prop<boolean>(o.properties, 'blocksPlacement', true),
		blocksPath: prop<boolean>(o.properties, 'blocksPath', false),
		assetKey: prop<string>(o.properties, 'assetKey'),
		variant: prop<string>(o.properties, 'variant', 'default'),
	}));
}

export function parseTiledMap(raw: TiledRawMap): MapLayout {
	if (raw.orientation !== 'orthogonal') {
		throw new Error('[parseTiledMap] only orthogonal orientation supported');
	}
	const tileSize = raw.tilewidth;

	getLayer<TiledTileLayer>(raw, 'ground', 'tilelayer');
	const terrainLayer = getLayer<TiledTileLayer>(raw, 'terrain', 'tilelayer');
	const pathsLayer = getLayer<TiledObjectLayer>(raw, 'paths', 'objectgroup');
	const structuresLayer = getLayer<TiledObjectLayer>(
		raw,
		'structures',
		'objectgroup',
	);
	const decorationsLayer = getLayer<TiledObjectLayer>(
		raw,
		'decorations',
		'objectgroup',
	);
	const decorations: DecorationSpec[] = decorationsLayer.objects
		.filter((o) => o.type === 'decoration')
		.map((o) => ({
			x: Math.round(o.x / tileSize),
			y: Math.round(o.y / tileSize),
			assetKey: prop<string>(o.properties, 'assetKey'),
			kind: prop<string>(o.properties, 'kind'),
			variant: prop<string>(o.properties, 'variant'),
		}));
	const objectsLayer = getLayer<TiledObjectLayer>(
		raw,
		'objects',
		'objectgroup',
	);

	const terrain = parseTerrain(terrainLayer);

	const laneObjects = pathsLayer.objects.filter((o) => o.type === 'path_lane');
	if (laneObjects.length === 0) {
		throw new Error('[parseTiledMap] no path lanes defined');
	}
	const primaryIndex = laneObjects.findIndex((o) =>
		prop<boolean>(o.properties, 'isPrimary', false),
	);
	const primary =
		primaryIndex >= 0 ? laneObjects[primaryIndex] : laneObjects[0];
	const primaryPath = polylineToCells(primary, tileSize);
	const allLanes = laneObjects.map((o, i) =>
		i === (primaryIndex >= 0 ? primaryIndex : 0)
			? primaryPath
			: polylineToCells(o, tileSize),
	);

	const structures = parseStructures(structuresLayer, tileSize);

	const buildablePoints: Position[] = objectsLayer.objects
		.filter((o) => o.type === 'placement_point')
		.map((o) => ({
			x: Math.round(o.x / tileSize),
			y: Math.round(o.y / tileSize),
		}));

	const blockedPlacementPoints: Position[] = [];
	for (let y = 0; y < raw.height; y++) {
		for (let x = 0; x < raw.width; x++) {
			const t = terrain[y][x];
			if (
				t === 'water' ||
				t === 'mountain' ||
				t === 'bog' ||
				t === 'road' ||
				t === 'lava'
			) {
				blockedPlacementPoints.push({ x, y });
			}
		}
	}
	for (const marker of objectsLayer.objects.filter(
		(o) => o.type === 'blocked_placement',
	)) {
		blockedPlacementPoints.push({
			x: Math.round(marker.x / tileSize),
			y: Math.round(marker.y / tileSize),
		});
	}
	for (const s of structures) {
		if (s.blocksPlacement) {
			for (let dy = 0; dy < s.height; dy++) {
				for (let dx = 0; dx < s.width; dx++) {
					blockedPlacementPoints.push({
						x: s.position.x + dx,
						y: s.position.y + dy,
					});
				}
			}
		}
	}

	return {
		id: prop<string>(raw.properties, 'id'),
		name: prop<string>(raw.properties, 'name'),
		width: raw.width,
		height: raw.height,
		tileSize,
		path: primaryPath,
		paths: allLanes,
		terrain,
		structures,
		decorations,
		blockedPlacementPoints,
		buildablePoints,
		spawnPoint: primaryPath[0],
		exitPoint: primaryPath[primaryPath.length - 1],
		tilemapKey: prop<string>(raw.properties, 'tilemapKey'),
		tilesetKey: prop<string>(raw.properties, 'tilesetKey'),
		unlockLevel: raw.properties?.find((p) => p.name === 'unlockLevel')?.value as
			| number
			| undefined,
		recommendedPower: prop<number>(raw.properties, 'recommendedPower'),
		rewardMultiplier: prop<number>(raw.properties, 'rewardMultiplier'),
		difficultyHpMult: prop<number>(raw.properties, 'difficultyHpMult'),
	};
}
