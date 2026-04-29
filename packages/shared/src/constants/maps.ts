import type { Position } from '../types/grid';
import type { MapLayout } from '../types/map';

// === 정식 모드 Main Long Map (9×18, illustrated central-castle field) ===
//
// Visible terrain is a single portrait background image. These paths are the
// invisible gameplay rails: enemies enter from the top and bottom road ends,
// split around the side loops, and damage HP when they reach the central
// castle wall tile at (4,8).
const MAIN_LONG_TILE_SIZE = 48;
const MAIN_LONG_WORLD_ORIGIN_X = 24;
const MAIN_LONG_WORLD_ORIGIN_Y = 72;

function worldToMainLongGridPoint(worldX: number, worldY: number): Position {
	return {
		x: (worldX - MAIN_LONG_WORLD_ORIGIN_X) / MAIN_LONG_TILE_SIZE,
		y: (worldY - MAIN_LONG_WORLD_ORIGIN_Y) / MAIN_LONG_TILE_SIZE,
	};
}

const MAIN_TOP_LEFT_PATH: Position[] = [
	{ x: 4, y: 0 },
	worldToMainLongGridPoint(216, 150),
	worldToMainLongGridPoint(213, 175),
	worldToMainLongGridPoint(182, 184),
	worldToMainLongGridPoint(132, 190),
	worldToMainLongGridPoint(96, 220),
	worldToMainLongGridPoint(83, 275),
	worldToMainLongGridPoint(62, 314),
	worldToMainLongGridPoint(40, 360),
	worldToMainLongGridPoint(55, 390),
	worldToMainLongGridPoint(90, 405),
	worldToMainLongGridPoint(125, 405),
	worldToMainLongGridPoint(150, 420),
	worldToMainLongGridPoint(158, 455),
	worldToMainLongGridPoint(180, 485),
	{ x: 4, y: 8 },
];

const MAIN_TOP_RIGHT_PATH: Position[] = [
	{ x: 4, y: 0 },
	worldToMainLongGridPoint(216, 150),
	worldToMainLongGridPoint(219, 175),
	worldToMainLongGridPoint(250, 184),
	worldToMainLongGridPoint(300, 190),
	worldToMainLongGridPoint(336, 220),
	worldToMainLongGridPoint(349, 275),
	worldToMainLongGridPoint(370, 314),
	worldToMainLongGridPoint(392, 360),
	worldToMainLongGridPoint(377, 390),
	worldToMainLongGridPoint(342, 405),
	worldToMainLongGridPoint(307, 405),
	worldToMainLongGridPoint(282, 420),
	worldToMainLongGridPoint(274, 455),
	worldToMainLongGridPoint(252, 485),
	{ x: 4, y: 8 },
];

const MAIN_BOTTOM_LEFT_PATH: Position[] = [
	{ x: 4, y: 17 },
	worldToMainLongGridPoint(216, 826),
	worldToMainLongGridPoint(216, 760),
	worldToMainLongGridPoint(215, 705),
	worldToMainLongGridPoint(185, 690),
	worldToMainLongGridPoint(145, 678),
	worldToMainLongGridPoint(105, 662),
	worldToMainLongGridPoint(78, 620),
	worldToMainLongGridPoint(45, 600),
	worldToMainLongGridPoint(40, 558),
	worldToMainLongGridPoint(65, 526),
	worldToMainLongGridPoint(108, 512),
	worldToMainLongGridPoint(155, 522),
	worldToMainLongGridPoint(190, 545),
	worldToMainLongGridPoint(216, 545),
	{ x: 4, y: 8 },
];

const MAIN_BOTTOM_RIGHT_PATH: Position[] = [
	{ x: 4, y: 17 },
	worldToMainLongGridPoint(216, 826),
	worldToMainLongGridPoint(216, 760),
	worldToMainLongGridPoint(217, 705),
	worldToMainLongGridPoint(247, 690),
	worldToMainLongGridPoint(287, 678),
	worldToMainLongGridPoint(327, 662),
	worldToMainLongGridPoint(354, 620),
	worldToMainLongGridPoint(387, 600),
	worldToMainLongGridPoint(392, 558),
	worldToMainLongGridPoint(367, 526),
	worldToMainLongGridPoint(324, 512),
	worldToMainLongGridPoint(277, 522),
	worldToMainLongGridPoint(242, 545),
	worldToMainLongGridPoint(216, 545),
	{ x: 4, y: 8 },
];

const MAIN_LONG_PATHS: Position[][] = [
	MAIN_TOP_LEFT_PATH,
	MAIN_TOP_RIGHT_PATH,
	MAIN_BOTTOM_LEFT_PATH,
	MAIN_BOTTOM_RIGHT_PATH,
];

const MAIN_LONG_PATH = MAIN_TOP_LEFT_PATH;

const MAIN_LONG_BLOCKED_PLACEMENT_POINTS: Position[] = [
	{ x: 4, y: 0 },
	{ x: 4, y: 17 },
	{ x: 4, y: 8 },
];

const MAIN_LONG_OBSTACLES: Position[] = [];

const MAIN_LONG_BUILDABLE_POINTS: MapLayout['buildablePoints'] = [
	{ x: 3, y: 3 },
	{ x: 5, y: 3 },
	{ x: 2, y: 6 },
	{ x: 6, y: 6 },
	{ x: 2, y: 11 },
	{ x: 6, y: 11 },
];

const MAIN_LONG_PLACEMENT_ANCHORS: MapLayout['placementAnchors'] = [
	{ x: 3, y: 3, worldX: 148, worldY: 204 },
	{ x: 5, y: 3, worldX: 284, worldY: 204 },
	{ x: 2, y: 6, worldX: 98, worldY: 366 },
	{ x: 6, y: 6, worldX: 334, worldY: 366 },
	{ x: 2, y: 11, worldX: 98, worldY: 607 },
	{ x: 6, y: 11, worldX: 334, worldY: 607 },
];

// Ambient decorations placed OFF the playfield (x<0 or x>=9, fractional
// allowed) so they read as background scenery and never compete with tower
// placement tiles or block the U-turn path. Pure visual layer — no
// pathfinding / buildable impact.
const MAIN_LONG_DECORATIONS: MapLayout['decorations'] = [
	// Left-edge tree line — clustered toward top + mid + bottom
	{ x: -1.2, y: 0.5, kind: 'tree', variant: 1 },
	{ x: -1.5, y: 3.5, kind: 'tree', variant: 2 },
	{ x: -1.1, y: 7.2, kind: 'tree', variant: 3 },
	{ x: -1.4, y: 11.1, kind: 'tree', variant: 4 },
	// Right-edge tree line
	{ x: 9.3, y: 2.3, kind: 'tree', variant: 2 },
	{ x: 9.5, y: 6.8, kind: 'tree', variant: 3 },
	{ x: 9.2, y: 10.9, kind: 'tree', variant: 1 },
	{ x: 9.4, y: 15.2, kind: 'tree', variant: 4 },
	// Corner bushes (just outside the four corners)
	{ x: -0.7, y: -0.8, kind: 'bush', variant: 1 },
	{ x: 9.1, y: -0.7, kind: 'bush', variant: 2 },
	{ x: -0.6, y: 17.8, kind: 'bush', variant: 3 },
	{ x: 9.0, y: 17.9, kind: 'bush', variant: 4 },
	// Mid-edge bushes for rhythm
	{ x: -0.8, y: 5.5, kind: 'bush', variant: 2 },
	{ x: 9.1, y: 13.6, kind: 'bush', variant: 1 },
	// Scattered small rocks along the edges
	{ x: -1.0, y: 9.3, kind: 'rock', variant: 3 },
	{ x: 9.2, y: 4.1, kind: 'rock', variant: 4 },
	{ x: -0.9, y: 13.8, kind: 'rock', variant: 3 },
	{ x: 9.1, y: 8.5, kind: 'rock', variant: 4 },
];

export const MAIN_MAP_ID = 'main_long' as const;

export const MAIN_LONG_MAP: MapLayout = {
	id: MAIN_MAP_ID,
	name: '중앙 성채 회랑',
	width: 9,
	height: 18,
	tileSize: 48,
	path: MAIN_LONG_PATH,
	paths: [...MAIN_LONG_PATHS],
	blockedPlacementPoints: MAIN_LONG_BLOCKED_PLACEMENT_POINTS,
	buildablePoints: MAIN_LONG_BUILDABLE_POINTS,
	placementAnchors: MAIN_LONG_PLACEMENT_ANCHORS,
	spawnPoint: { x: 4, y: 0 },
	exitPoint: { x: 4, y: 8 },
	tilemapKey: 'tilemap-main-long',
	tilesetKey: 'tileset',
	rewardMultiplier: 1,
	difficultyHpMult: 1,
	recommendedPower: 55,
	obstacles: MAIN_LONG_OBSTACLES,
	castleWallTiles: [{ x: 4, y: 8 }],
	decorations: MAIN_LONG_DECORATIONS,
};

export const MAP_REGISTRY: Record<string, MapLayout> = {
	main_long: MAIN_LONG_MAP,
};

export const DEFAULT_MAP_ID = MAIN_MAP_ID;

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
