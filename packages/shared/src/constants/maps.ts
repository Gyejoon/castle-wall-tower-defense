import type { Position } from '../types/grid';
import type { MapLayout } from '../types/map';

const FOREST_GATE_PATH: Position[] = [
	{ x: 3, y: 0 },
	{ x: 3, y: 1 },
	{ x: 4, y: 1 },
	{ x: 4, y: 2 },
	{ x: 3, y: 2 },
	{ x: 2, y: 2 },
	{ x: 2, y: 3 },
	{ x: 3, y: 3 },
	{ x: 4, y: 3 },
	{ x: 5, y: 3 },
	{ x: 5, y: 4 },
	{ x: 4, y: 4 },
	{ x: 3, y: 4 },
	{ x: 2, y: 4 },
	{ x: 1, y: 4 },
	{ x: 1, y: 5 },
	{ x: 2, y: 5 },
	{ x: 3, y: 5 },
	{ x: 4, y: 5 },
	{ x: 5, y: 5 },
	{ x: 6, y: 5 },
	{ x: 6, y: 6 },
	{ x: 5, y: 6 },
	{ x: 4, y: 6 },
	{ x: 3, y: 6 },
	{ x: 2, y: 6 },
	{ x: 2, y: 7 },
	{ x: 3, y: 7 },
	{ x: 4, y: 7 },
	{ x: 5, y: 7 },
	{ x: 5, y: 8 },
	{ x: 4, y: 8 },
	{ x: 3, y: 8 },
	{ x: 2, y: 8 },
	{ x: 1, y: 8 },
	{ x: 1, y: 9 },
	{ x: 2, y: 9 },
	{ x: 3, y: 9 },
	{ x: 4, y: 9 },
	{ x: 5, y: 9 },
	{ x: 6, y: 9 },
	{ x: 6, y: 10 },
	{ x: 5, y: 10 },
	{ x: 4, y: 10 },
	{ x: 3, y: 10 },
	{ x: 2, y: 10 },
	{ x: 2, y: 11 },
	{ x: 3, y: 11 },
	{ x: 4, y: 11 },
	{ x: 5, y: 11 },
	{ x: 5, y: 12 },
	{ x: 4, y: 12 },
	{ x: 3, y: 12 },
	{ x: 2, y: 12 },
	{ x: 1, y: 12 },
	{ x: 1, y: 13 },
	{ x: 2, y: 13 },
	{ x: 3, y: 13 },
	{ x: 4, y: 13 },
	{ x: 5, y: 13 },
	{ x: 6, y: 13 },
	{ x: 6, y: 14 },
	{ x: 5, y: 14 },
	{ x: 4, y: 14 },
	{ x: 3, y: 14 },
	{ x: 3, y: 15 },
	{ x: 4, y: 15 },
	{ x: 4, y: 16 },
	{ x: 4, y: 17 },
];

const FOREST_GATE_BLOCKED_PLACEMENT_POINTS: Position[] = [
	{ x: 3, y: 0 },
	{ x: 4, y: 17 },
	{ x: 0, y: 0 },
	{ x: 7, y: 17 },
];

function buildBuildablePoints({
	width,
	height,
	path,
	blockedPlacementPoints,
}: {
	width: number;
	height: number;
	path: Position[];
	blockedPlacementPoints: Position[];
}): Position[] {
	const pathSet = new Set(path.map((point) => `${point.x},${point.y}`));
	const blockedSet = new Set(
		blockedPlacementPoints.map((point) => `${point.x},${point.y}`),
	);
	const buildablePoints: Position[] = [];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const key = `${x},${y}`;
			if (pathSet.has(key) || blockedSet.has(key)) {
				continue;
			}
			buildablePoints.push({ x, y });
		}
	}

	return buildablePoints;
}

const FOREST_GATE_BUILDABLE_POINTS = buildBuildablePoints({
	width: 8,
	height: 18,
	path: FOREST_GATE_PATH,
	blockedPlacementPoints: FOREST_GATE_BLOCKED_PLACEMENT_POINTS,
});

export const FOREST_GATE_MAP: MapLayout = {
	id: 'forest_gate',
	name: 'Forest Gate',
	width: 8,
	height: 18,
	tileSize: 32,
	path: FOREST_GATE_PATH,
	blockedPlacementPoints: FOREST_GATE_BLOCKED_PLACEMENT_POINTS,
	buildablePoints: FOREST_GATE_BUILDABLE_POINTS,
	spawnPoint: { x: 3, y: 0 },
	exitPoint: { x: 4, y: 17 },
	tilemapKey: 'tilemap-forest-gate',
	tilesetKey: 'tileset',
};

export const LAVA_FORTRESS_MAP: MapLayout = {
	id: 'lava_fortress',
	name: 'Lava Fortress',
	width: 8,
	height: 18,
	tileSize: 32,
	path: FOREST_GATE_PATH,
	blockedPlacementPoints: FOREST_GATE_BLOCKED_PLACEMENT_POINTS,
	buildablePoints: FOREST_GATE_BUILDABLE_POINTS,
	spawnPoint: { x: 3, y: 0 },
	exitPoint: { x: 4, y: 17 },
	tilemapKey: 'tilemap-lava_fortress',
	tilesetKey: 'tileset',
};

export const STORM_CITADEL_MAP: MapLayout = {
	id: 'storm_citadel',
	name: 'Storm Citadel',
	width: 8,
	height: 18,
	tileSize: 32,
	path: FOREST_GATE_PATH,
	blockedPlacementPoints: FOREST_GATE_BLOCKED_PLACEMENT_POINTS,
	buildablePoints: FOREST_GATE_BUILDABLE_POINTS,
	spawnPoint: { x: 3, y: 0 },
	exitPoint: { x: 4, y: 17 },
	tilemapKey: 'tilemap-storm_citadel',
	tilesetKey: 'tileset',
};

export const MAP_REGISTRY: Record<string, MapLayout> = {
	forest_gate: FOREST_GATE_MAP,
	lava_fortress: LAVA_FORTRESS_MAP,
	storm_citadel: STORM_CITADEL_MAP,
};

export const DEFAULT_MAP_ID = 'forest_gate';

export function getMapById(mapId: string): MapLayout {
	const map = MAP_REGISTRY[mapId];
	if (!map) throw new Error(`Unknown map ID: ${mapId}`);
	return map;
}
