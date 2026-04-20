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

// === Phase A Long Map (9×18, U-turn double-back, random-summon + merge) ===
//
// 9 cols × 18 rows × 48px = 432×864 canvas (mobile viewport-friendly).
// Spawn at top-left corner (0,0). Path zigzags DOWN the LEFT strip
// (cols 0-3), crosses the BOTTOM row (all the way across), then zigzags
// back UP the RIGHT strip (cols 5-8), finally turning left along row 0 to
// reach the castle wall exit at (4,0). Every non-obstacle row is visited
// twice (once each direction) so towers placed anywhere stay useful for
// the full run.
//
// Obstacles sit on the center column (col 4 at rows 2/5/8/11/14) — they
// block the middle so the eye reads the U-turn shape cleanly. Commit 7.4
// renders them as tree/rock/bush sprites.

function generateLeftDescent(): Position[] {
	const path: Position[] = [];
	// Helper to generate a horizontal sweep starting at given column.
	// Row 0: (0,0) → (3,0)
	for (let x = 0; x <= 3; x++) path.push({ x, y: 0 });
	// col 3: (3,1), (3,2)
	path.push({ x: 3, y: 1 });
	path.push({ x: 3, y: 2 });
	// Row 2 (continuing): (2,2) → (0,2)
	for (let x = 2; x >= 0; x--) path.push({ x, y: 2 });
	// col 0: (0,3), (0,4)
	path.push({ x: 0, y: 3 });
	path.push({ x: 0, y: 4 });
	// Row 4: (1,4) → (3,4)
	for (let x = 1; x <= 3; x++) path.push({ x, y: 4 });
	// col 3: (3,5), (3,6)
	path.push({ x: 3, y: 5 });
	path.push({ x: 3, y: 6 });
	// Row 6: (2,6) → (0,6)
	for (let x = 2; x >= 0; x--) path.push({ x, y: 6 });
	// col 0: (0,7), (0,8)
	path.push({ x: 0, y: 7 });
	path.push({ x: 0, y: 8 });
	// Row 8: (1,8) → (3,8)
	for (let x = 1; x <= 3; x++) path.push({ x, y: 8 });
	// col 3: (3,9), (3,10)
	path.push({ x: 3, y: 9 });
	path.push({ x: 3, y: 10 });
	// Row 10: (2,10) → (0,10)
	for (let x = 2; x >= 0; x--) path.push({ x, y: 10 });
	// col 0: (0,11), (0,12)
	path.push({ x: 0, y: 11 });
	path.push({ x: 0, y: 12 });
	// Row 12: (1,12) → (3,12)
	for (let x = 1; x <= 3; x++) path.push({ x, y: 12 });
	// col 3: (3,13), (3,14)
	path.push({ x: 3, y: 13 });
	path.push({ x: 3, y: 14 });
	// Row 14: (2,14) → (0,14)
	for (let x = 2; x >= 0; x--) path.push({ x, y: 14 });
	// col 0: (0,15), (0,16), (0,17)
	path.push({ x: 0, y: 15 });
	path.push({ x: 0, y: 16 });
	return path;
}

function generateBottomTraverse(): Position[] {
	// Row 17: (0,17) → (8,17) — full width crossing
	const path: Position[] = [];
	path.push({ x: 0, y: 17 });
	for (let x = 1; x <= 8; x++) path.push({ x, y: 17 });
	return path;
}

function generateRightAscent(): Position[] {
	const path: Position[] = [];
	// (8,16), (8,15), (8,14)
	path.push({ x: 8, y: 16 });
	path.push({ x: 8, y: 15 });
	path.push({ x: 8, y: 14 });
	// Row 14: (7,14) → (5,14)
	for (let x = 7; x >= 5; x--) path.push({ x, y: 14 });
	// col 5: (5,13), (5,12)
	path.push({ x: 5, y: 13 });
	path.push({ x: 5, y: 12 });
	// Row 12: (6,12) → (8,12)
	for (let x = 6; x <= 8; x++) path.push({ x, y: 12 });
	// col 8: (8,11), (8,10)
	path.push({ x: 8, y: 11 });
	path.push({ x: 8, y: 10 });
	// Row 10: (7,10) → (5,10)
	for (let x = 7; x >= 5; x--) path.push({ x, y: 10 });
	// col 5: (5,9), (5,8)
	path.push({ x: 5, y: 9 });
	path.push({ x: 5, y: 8 });
	// Row 8: (6,8) → (8,8)
	for (let x = 6; x <= 8; x++) path.push({ x, y: 8 });
	// col 8: (8,7), (8,6)
	path.push({ x: 8, y: 7 });
	path.push({ x: 8, y: 6 });
	// Row 6: (7,6) → (5,6)
	for (let x = 7; x >= 5; x--) path.push({ x, y: 6 });
	// col 5: (5,5), (5,4)
	path.push({ x: 5, y: 5 });
	path.push({ x: 5, y: 4 });
	// Row 4: (6,4) → (8,4)
	for (let x = 6; x <= 8; x++) path.push({ x, y: 4 });
	// col 8: (8,3), (8,2)
	path.push({ x: 8, y: 3 });
	path.push({ x: 8, y: 2 });
	// Row 2: (7,2) → (5,2)
	for (let x = 7; x >= 5; x--) path.push({ x, y: 2 });
	// col 5: (5,1), (5,0)
	path.push({ x: 5, y: 1 });
	path.push({ x: 5, y: 0 });
	// Row 0 traverse back to exit
	path.push({ x: 4, y: 0 });
	return path;
}

// Descent from (0,0) at row 0 down to row 16 on col 0.
// Then bottom crossing: path continues from (0,16) → (0,17) → (8,17) → (8,16).
// But descent ends at (0,16). We need to join to (0,17) first.
const PHASE_A_LEFT = generateLeftDescent();
const PHASE_A_BOTTOM = generateBottomTraverse();
const PHASE_A_RIGHT = generateRightAscent();

const PHASE_A_LONG_PATH: Position[] = [
	...PHASE_A_LEFT,
	...PHASE_A_BOTTOM,
	...PHASE_A_RIGHT,
];

// Only the corners that are neither path nor obstacle are explicitly blocked
// so no tower can sit on the spawn/exit tile itself.
const PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS: Position[] = [
	{ x: 0, y: 0 }, // spawn
	{ x: 4, y: 0 }, // exit
	{ x: 8, y: 0 },
];

// Fixed obstacles. Col 4 punctuations block the middle lane visually and
// give the 9×18 grid a clear "two strips + crossing" read.
const PHASE_A_LONG_OBSTACLES: Position[] = [
	{ x: 4, y: 2 },
	{ x: 4, y: 5 },
	{ x: 4, y: 8 },
	{ x: 4, y: 11 },
	{ x: 4, y: 14 },
];

const PHASE_A_LONG_BUILDABLE_POINTS = buildBuildablePoints({
	width: 9,
	height: 18,
	path: PHASE_A_LONG_PATH,
	blockedPlacementPoints: PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS,
	obstacles: PHASE_A_LONG_OBSTACLES,
});

// Ambient decorations placed OFF the playfield (x<0 or x>=9, fractional
// allowed) so they read as background scenery and never compete with tower
// placement tiles or block the U-turn path. Pure visual layer — no
// pathfinding / buildable impact.
const PHASE_A_LONG_DECORATIONS: MapLayout['decorations'] = [
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

export const PHASE_A_MAP_ID = 'phase_a_long' as const;

export const PHASE_A_LONG_MAP: MapLayout = {
	id: PHASE_A_MAP_ID,
	name: 'Phase A — 왕복 회랑',
	width: 9,
	height: 18,
	tileSize: 48,
	path: PHASE_A_LONG_PATH,
	blockedPlacementPoints: PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS,
	buildablePoints: PHASE_A_LONG_BUILDABLE_POINTS,
	spawnPoint: { x: 0, y: 0 },
	exitPoint: { x: 4, y: 0 },
	tilemapKey: 'tilemap-phase-a-long',
	tilesetKey: 'tileset',
	rewardMultiplier: 1,
	difficultyHpMult: 1,
	recommendedPower: 55,
	obstacles: PHASE_A_LONG_OBSTACLES,
	castleWallTiles: [{ x: 4, y: 0 }],
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
