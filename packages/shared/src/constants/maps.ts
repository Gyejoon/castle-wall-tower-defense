import type { Position } from '../types/grid';
import type { MapLayout } from '../types/map';

function buildBuildablePoints({
	width,
	height,
	path,
	blockedPlacementPoints,
	obstacles = [],
}: {
	width: number;
	height: number;
	path: Position[];
	blockedPlacementPoints: Position[];
	obstacles?: Position[];
}): Position[] {
	const blockedSet = new Set<string>([
		...path.map((p) => `${p.x},${p.y}`),
		...blockedPlacementPoints.map((p) => `${p.x},${p.y}`),
		...obstacles.map((p) => `${p.x},${p.y}`),
	]);
	const buildablePoints: Position[] = [];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const key = `${x},${y}`;
			if (blockedSet.has(key)) continue;
			buildablePoints.push({ x, y });
		}
	}

	return buildablePoints;
}

// === Phase A Long Map (12×20, fortress band serpent, portrait v2) ===
//
// 12 cols × 20 rows × 48px = 576×960 canvas. The playfield stays portrait
// but the tactical band expands hard left/right. The path runs through a
// 10-row serpentine corridor in the middle of the board, which slows the
// enemy route without forcing the whole map into a single narrow strip.
// Top and bottom rows carry the twin-tower / stone-fortress silhouette,
// while the off-path obstacles keep the buildable budget near the previous
// cap for balance.

function generateSerpentineBand(startY: number, endY: number, width: number): Position[] {
	const path: Position[] = [];

	for (let y = startY; y <= endY; y++) {
		const leftToRight = (y - startY) % 2 === 0;
		if (leftToRight) {
			for (let x = 0; x < width; x++) path.push({ x, y });
		} else {
			for (let x = width - 1; x >= 0; x--) path.push({ x, y });
		}
	}

	return path;
}

const PHASE_A_LONG_PATH: Position[] = generateSerpentineBand(3, 12, 12);

const PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS: Position[] = [
	{ x: 5, y: 2 },
	{ x: 6, y: 2 },
	{ x: 5, y: 13 },
	{ x: 6, y: 13 },
];

// Fixed obstacles sit outside the serpentine band so the tower budget stays
// stable while the fortress silhouette gets stronger.
const PHASE_A_LONG_OBSTACLES: Position[] = [
	{ x: 0, y: 0 },
	{ x: 1, y: 0 },
	{ x: 2, y: 0 },
	{ x: 3, y: 0 },
	{ x: 4, y: 0 },
	{ x: 5, y: 0 },
	{ x: 6, y: 0 },
	{ x: 7, y: 0 },
	{ x: 8, y: 0 },
	{ x: 9, y: 0 },
	{ x: 10, y: 0 },
	{ x: 11, y: 0 },
	{ x: 0, y: 1 },
	{ x: 1, y: 1 },
	{ x: 10, y: 1 },
	{ x: 11, y: 1 },
	{ x: 0, y: 2 },
	{ x: 1, y: 2 },
	{ x: 2, y: 2 },
	{ x: 9, y: 2 },
	{ x: 10, y: 2 },
	{ x: 11, y: 2 },
	{ x: 0, y: 13 },
	{ x: 1, y: 13 },
	{ x: 2, y: 13 },
	{ x: 9, y: 13 },
	{ x: 10, y: 13 },
	{ x: 11, y: 13 },
	{ x: 0, y: 14 },
	{ x: 1, y: 14 },
	{ x: 10, y: 14 },
	{ x: 11, y: 14 },
	{ x: 0, y: 15 },
	{ x: 1, y: 15 },
	{ x: 2, y: 15 },
	{ x: 3, y: 15 },
	{ x: 8, y: 15 },
	{ x: 9, y: 15 },
	{ x: 10, y: 15 },
	{ x: 11, y: 15 },
	{ x: 4, y: 16 },
	{ x: 5, y: 16 },
	{ x: 6, y: 16 },
	{ x: 7, y: 16 },
	{ x: 0, y: 17 },
	{ x: 1, y: 17 },
	{ x: 2, y: 17 },
	{ x: 9, y: 17 },
	{ x: 10, y: 17 },
	{ x: 11, y: 17 },
];

const PHASE_A_LONG_BUILDABLE_POINTS = buildBuildablePoints({
	width: 12,
	height: 20,
	path: PHASE_A_LONG_PATH,
	blockedPlacementPoints: PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS,
	obstacles: PHASE_A_LONG_OBSTACLES,
});

// Ambient decorations stay cosmetic-only and hug the widened side margins so
// the extra portrait width reads as background space rather than dead space.
const PHASE_A_LONG_DECORATIONS: MapLayout['decorations'] = [
	{ x: -1.6, y: 0.4, kind: 'tree', variant: 1 },
	{ x: -1.9, y: 4.2, kind: 'tree', variant: 2 },
	{ x: -1.5, y: 8.9, kind: 'tree', variant: 3 },
	{ x: -1.8, y: 14.1, kind: 'tree', variant: 4 },
	{ x: 12.4, y: 1.1, kind: 'tree', variant: 2 },
	{ x: 12.7, y: 5.3, kind: 'tree', variant: 3 },
	{ x: 12.5, y: 9.7, kind: 'tree', variant: 1 },
	{ x: 12.8, y: 15.8, kind: 'tree', variant: 4 },
	{ x: -0.8, y: -0.7, kind: 'bush', variant: 1 },
	{ x: 11.9, y: -0.6, kind: 'bush', variant: 2 },
	{ x: -0.7, y: 19.2, kind: 'bush', variant: 3 },
	{ x: 12.0, y: 19.1, kind: 'bush', variant: 4 },
	{ x: -1.0, y: 6.1, kind: 'bush', variant: 2 },
	{ x: 12.2, y: 12.8, kind: 'bush', variant: 1 },
	{ x: -1.2, y: 10.4, kind: 'rock', variant: 3 },
	{ x: 12.1, y: 3.8, kind: 'rock', variant: 4 },
	{ x: -1.1, y: 16.1, kind: 'rock', variant: 3 },
	{ x: 12.3, y: 7.6, kind: 'rock', variant: 4 },
];

export const PHASE_A_MAP_ID = 'phase_a_long' as const;
export const PHASE_A_LONG_V2_TILEMAP_KEY = 'tilemap-phase-a-long-v2' as const;
export const PHASE_A_LONG_V2_TILEMAP_PATH =
	'assets/maps/phase-a-long-v2.tmj' as const;

export const PHASE_A_LONG_MAP: MapLayout = {
	id: PHASE_A_MAP_ID,
	name: 'Phase A — 쌍탑 요새 회랑',
	width: 12,
	height: 20,
	tileSize: 48,
	path: PHASE_A_LONG_PATH,
	blockedPlacementPoints: PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS,
	buildablePoints: PHASE_A_LONG_BUILDABLE_POINTS,
	spawnPoint: { x: 0, y: 3 },
	exitPoint: { x: 0, y: 12 },
	tilemapKey: PHASE_A_LONG_V2_TILEMAP_KEY,
	tilesetKey: 'tileset',
	rewardMultiplier: 1,
	difficultyHpMult: 1,
	recommendedPower: 55,
	obstacles: PHASE_A_LONG_OBSTACLES,
	castleWallTiles: [{ x: 0, y: 12 }],
	decorations: PHASE_A_LONG_DECORATIONS,
};

export const MAP_REGISTRY: Record<string, MapLayout> = {
	phase_a_long: PHASE_A_LONG_MAP,
};

export const DEFAULT_MAP_ID = PHASE_A_MAP_ID;

export function getMapById(mapId: string): MapLayout {
	const map = MAP_REGISTRY[mapId];
	if (!map) throw new Error(`Unknown map ID: ${mapId}`);
	return map;
}

/** Returns all lanes for a map. Falls back to [map.path] for single-lane maps. */
export function getMapPaths(map: MapLayout): Position[][] {
	return map.paths ?? [map.path];
}

/** Check if a map is unlocked for the given player level. */
export function isMapUnlocked(map: MapLayout, playerLevel: number): boolean {
	return map.unlockLevel === undefined || playerLevel >= map.unlockLevel;
}

/** Returns spawn→exit pairs for each lane (used for multi-path tower placement validation). */
export function getSpawnExitPairs(
	map: MapLayout,
): Array<{ spawn: Position; exit: Position }> {
	const paths = getMapPaths(map);
	return paths
		.filter((lane) => lane.length >= 2)
		.map((lane) => ({
			spawn: lane[0],
			exit: lane[lane.length - 1],
		}));
}

/** Returns all path cells across all lanes (deduplicated). */
export function getAllPathCells(map: MapLayout): Position[] {
	const paths = getMapPaths(map);
	if (paths.length === 1) return paths[0];
	const seen = new Set<string>();
	const result: Position[] = [];
	for (const lane of paths) {
		for (const p of lane) {
			const key = `${p.x},${p.y}`;
			if (!seen.has(key)) {
				seen.add(key);
				result.push(p);
			}
		}
	}
	return result;
}
