import type { Position } from '../types/grid';
import type { MapLayout } from '../types/map';

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

// === Phase A Long Map (8×24, U-turn double-back, random-summon + merge) ===
//
// The path goes DOWN the left half (cols 0-3) zigzagging, crosses the
// BOTTOM row, then comes BACK UP the right half (cols 4-7). Every row is
// visited TWICE (once each direction) so towers at ANY height remain useful
// for the entire run.
//
// Commit 7.3 will replace this with a 9×18 grid with obstacles and a
// castleWall exit. For commit 7.0 we keep the existing 8×24 shape so the
// rest of Phase 7 is layered on top of a known-good build.

const PHASE_A_SWEEP_ROWS = [0, 3, 6, 9, 12, 15, 18, 21] as const;

function generateHalfZigzag(
	colStart: number,
	colEnd: number,
	sweepRows: readonly number[],
	direction: 'down' | 'up',
): Position[] {
	const path: Position[] = [];
	const rows = direction === 'down' ? [...sweepRows] : [...sweepRows].reverse();

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const goRight = i % 2 === 0;
		if (goRight) {
			for (let x = colStart; x <= colEnd; x++) path.push({ x, y: row });
		} else {
			for (let x = colEnd; x >= colStart; x--) path.push({ x, y: row });
		}
		if (i < rows.length - 1) {
			const nextRow = rows[i + 1];
			const transCol = goRight ? colEnd : colStart;
			if (direction === 'down') {
				for (let y = row + 1; y < nextRow; y++) path.push({ x: transCol, y });
			} else {
				for (let y = row - 1; y > nextRow; y--) path.push({ x: transCol, y });
			}
		}
	}
	return path;
}

const PHASE_A_DOWN = generateHalfZigzag(0, 3, PHASE_A_SWEEP_ROWS, 'down');
const PHASE_A_TURN: Position[] = [
	{ x: 0, y: 22 },
	{ x: 0, y: 23 },
	{ x: 1, y: 23 },
	{ x: 2, y: 23 },
	{ x: 3, y: 23 },
	{ x: 4, y: 23 },
	{ x: 4, y: 22 },
];
const PHASE_A_UP = generateHalfZigzag(4, 7, PHASE_A_SWEEP_ROWS, 'up');

const PHASE_A_LONG_PATH: Position[] = [
	...PHASE_A_DOWN,
	...PHASE_A_TURN,
	...PHASE_A_UP,
];

const PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS: Position[] = [
	{ x: 0, y: 0 },
	{ x: 4, y: 0 },
	{ x: 0, y: 23 },
	{ x: 4, y: 23 },
	{ x: 7, y: 0 },
	{ x: 7, y: 23 },
];

const PHASE_A_LONG_BUILDABLE_POINTS = buildBuildablePoints({
	width: 8,
	height: 24,
	path: PHASE_A_LONG_PATH,
	blockedPlacementPoints: PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS,
});

export const PHASE_A_MAP_ID = 'phase_a_long' as const;

export const PHASE_A_LONG_MAP: MapLayout = {
	id: PHASE_A_MAP_ID,
	name: 'Phase A — 왕복 회랑',
	width: 8,
	height: 24,
	tileSize: 32,
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
