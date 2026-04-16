import type { Position } from '../types/grid';
import type { MapLayout } from '../types/map';

// Forest Gate: wide S-curve with tower placement pockets between bends
//   0 1 2 3 4 5 6 7
// 0       S                ← spawn
// 1       ·
// 2   · · ·
// 3   ·
// 4   · · · · ·
// 5               ·
// 6       · · · · ·
// 7       ·
// 8   · · ·
// 9   ·
//10   · · · · ·
//11               ·
//12       · · · · ·
//13       ·
//14   · · ·
//15   ·
//16   · · · ·
//17           E            ← exit
const FOREST_GATE_PATH: Position[] = [
	{ x: 3, y: 0 },
	{ x: 3, y: 1 },
	{ x: 3, y: 2 },
	{ x: 2, y: 2 },
	{ x: 1, y: 2 },
	{ x: 1, y: 3 },
	{ x: 1, y: 4 },
	{ x: 2, y: 4 },
	{ x: 3, y: 4 },
	{ x: 4, y: 4 },
	{ x: 5, y: 4 },
	{ x: 5, y: 5 },
	{ x: 5, y: 6 },
	{ x: 4, y: 6 },
	{ x: 3, y: 6 },
	{ x: 3, y: 7 },
	{ x: 3, y: 8 },
	{ x: 2, y: 8 },
	{ x: 1, y: 8 },
	{ x: 1, y: 9 },
	{ x: 1, y: 10 },
	{ x: 2, y: 10 },
	{ x: 3, y: 10 },
	{ x: 4, y: 10 },
	{ x: 5, y: 10 },
	{ x: 5, y: 11 },
	{ x: 5, y: 12 },
	{ x: 4, y: 12 },
	{ x: 3, y: 12 },
	{ x: 3, y: 13 },
	{ x: 3, y: 14 },
	{ x: 2, y: 14 },
	{ x: 1, y: 14 },
	{ x: 1, y: 15 },
	{ x: 1, y: 16 },
	{ x: 2, y: 16 },
	{ x: 3, y: 16 },
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
	id: 'w1_forest_a',
	name: '숲의 성문',
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
	rewardMultiplier: 1,
	difficultyHpMult: 1,
	recommendedPower: 55,
};

// --- Lava Fortress: 2-lane map ---
// Lane A (left): spawn top-left, zigzags left side
const LAVA_LANE_A: Position[] = [
	{ x: 1, y: 0 },
	{ x: 1, y: 1 },
	{ x: 1, y: 2 },
	{ x: 2, y: 2 },
	{ x: 3, y: 2 },
	{ x: 3, y: 3 },
	{ x: 3, y: 4 },
	{ x: 2, y: 4 },
	{ x: 1, y: 4 },
	{ x: 1, y: 5 },
	{ x: 1, y: 6 },
	{ x: 2, y: 6 },
	{ x: 3, y: 6 },
	{ x: 3, y: 7 },
	{ x: 3, y: 8 },
	{ x: 2, y: 8 },
	{ x: 1, y: 8 },
	{ x: 1, y: 9 },
	{ x: 1, y: 10 },
	{ x: 2, y: 10 },
	{ x: 3, y: 10 },
	{ x: 3, y: 11 },
	{ x: 3, y: 12 },
	{ x: 2, y: 12 },
	{ x: 1, y: 12 },
	{ x: 1, y: 13 },
	{ x: 1, y: 14 },
	{ x: 2, y: 14 },
	{ x: 3, y: 14 },
	{ x: 3, y: 15 },
	{ x: 3, y: 16 },
	{ x: 3, y: 17 },
];

// Lane B (right): spawn top-right, zigzags right side
const LAVA_LANE_B: Position[] = [
	{ x: 6, y: 0 },
	{ x: 6, y: 1 },
	{ x: 6, y: 2 },
	{ x: 5, y: 2 },
	{ x: 4, y: 2 },
	{ x: 4, y: 3 },
	{ x: 4, y: 4 },
	{ x: 5, y: 4 },
	{ x: 6, y: 4 },
	{ x: 6, y: 5 },
	{ x: 6, y: 6 },
	{ x: 5, y: 6 },
	{ x: 4, y: 6 },
	{ x: 4, y: 7 },
	{ x: 4, y: 8 },
	{ x: 5, y: 8 },
	{ x: 6, y: 8 },
	{ x: 6, y: 9 },
	{ x: 6, y: 10 },
	{ x: 5, y: 10 },
	{ x: 4, y: 10 },
	{ x: 4, y: 11 },
	{ x: 4, y: 12 },
	{ x: 5, y: 12 },
	{ x: 6, y: 12 },
	{ x: 6, y: 13 },
	{ x: 6, y: 14 },
	{ x: 5, y: 14 },
	{ x: 4, y: 14 },
	{ x: 4, y: 15 },
	{ x: 4, y: 16 },
	{ x: 4, y: 17 },
];

const LAVA_ALL_PATH_CELLS = [...LAVA_LANE_A, ...LAVA_LANE_B];

const LAVA_BLOCKED: Position[] = [
	{ x: 1, y: 0 },
	{ x: 6, y: 0 },
	{ x: 3, y: 17 },
	{ x: 4, y: 17 },
];

const LAVA_BUILDABLE = buildBuildablePoints({
	width: 8,
	height: 18,
	path: LAVA_ALL_PATH_CELLS,
	blockedPlacementPoints: LAVA_BLOCKED,
});

export const LAVA_FORTRESS_MAP: MapLayout = {
	id: 'w2_forge_a',
	name: '용암 요새',
	unlockLevel: 3,
	width: 8,
	height: 18,
	tileSize: 32,
	path: LAVA_LANE_A,
	paths: [LAVA_LANE_A, LAVA_LANE_B],
	blockedPlacementPoints: LAVA_BLOCKED,
	buildablePoints: LAVA_BUILDABLE,
	spawnPoint: { x: 1, y: 0 },
	exitPoint: { x: 4, y: 17 },
	tilemapKey: 'tilemap-w2_forge_a',
	tilesetKey: 'tileset',
	rewardMultiplier: 2,
	difficultyHpMult: 1.3,
	recommendedPower: 170,
	gimmickTiles: {
		furnaceTiles: [
			{ x: 2, y: 3 },
			{ x: 5, y: 3 },
			{ x: 2, y: 9 },
			{ x: 5, y: 9 },
			{ x: 2, y: 15 },
			{ x: 5, y: 15 },
		],
	},
};

// --- Storm Citadel: 3-lane map ---
// Lane A (left)
const STORM_LANE_A: Position[] = [
	{ x: 0, y: 0 },
	{ x: 0, y: 1 },
	{ x: 0, y: 2 },
	{ x: 0, y: 3 },
	{ x: 1, y: 3 },
	{ x: 1, y: 4 },
	{ x: 1, y: 5 },
	{ x: 0, y: 5 },
	{ x: 0, y: 6 },
	{ x: 0, y: 7 },
	{ x: 1, y: 7 },
	{ x: 1, y: 8 },
	{ x: 1, y: 9 },
	{ x: 0, y: 9 },
	{ x: 0, y: 10 },
	{ x: 0, y: 11 },
	{ x: 1, y: 11 },
	{ x: 1, y: 12 },
	{ x: 1, y: 13 },
	{ x: 1, y: 14 },
	{ x: 2, y: 14 },
	{ x: 2, y: 15 },
	{ x: 3, y: 15 },
	{ x: 3, y: 16 },
	{ x: 3, y: 17 },
];

// Lane B (center)
const STORM_LANE_B: Position[] = [
	{ x: 3, y: 0 },
	{ x: 3, y: 1 },
	{ x: 3, y: 2 },
	{ x: 3, y: 3 },
	{ x: 3, y: 4 },
	{ x: 4, y: 4 },
	{ x: 4, y: 5 },
	{ x: 4, y: 6 },
	{ x: 3, y: 6 },
	{ x: 3, y: 7 },
	{ x: 3, y: 8 },
	{ x: 4, y: 8 },
	{ x: 4, y: 9 },
	{ x: 4, y: 10 },
	{ x: 3, y: 10 },
	{ x: 3, y: 11 },
	{ x: 3, y: 12 },
	{ x: 4, y: 12 },
	{ x: 4, y: 13 },
	{ x: 4, y: 14 },
	{ x: 4, y: 15 },
	{ x: 4, y: 16 },
	{ x: 4, y: 17 },
];

// Lane C (right)
const STORM_LANE_C: Position[] = [
	{ x: 7, y: 0 },
	{ x: 7, y: 1 },
	{ x: 7, y: 2 },
	{ x: 7, y: 3 },
	{ x: 6, y: 3 },
	{ x: 6, y: 4 },
	{ x: 6, y: 5 },
	{ x: 7, y: 5 },
	{ x: 7, y: 6 },
	{ x: 7, y: 7 },
	{ x: 6, y: 7 },
	{ x: 6, y: 8 },
	{ x: 6, y: 9 },
	{ x: 7, y: 9 },
	{ x: 7, y: 10 },
	{ x: 7, y: 11 },
	{ x: 6, y: 11 },
	{ x: 6, y: 12 },
	{ x: 6, y: 13 },
	{ x: 6, y: 14 },
	{ x: 5, y: 14 },
	{ x: 5, y: 15 },
	{ x: 5, y: 16 },
	{ x: 5, y: 17 },
];

const STORM_ALL_PATH_CELLS = [
	...STORM_LANE_A,
	...STORM_LANE_B,
	...STORM_LANE_C,
];

const STORM_BLOCKED: Position[] = [
	{ x: 0, y: 0 },
	{ x: 3, y: 0 },
	{ x: 7, y: 0 },
	{ x: 3, y: 17 },
	{ x: 4, y: 17 },
	{ x: 5, y: 17 },
];

const STORM_BUILDABLE = buildBuildablePoints({
	width: 8,
	height: 18,
	path: STORM_ALL_PATH_CELLS,
	blockedPlacementPoints: STORM_BLOCKED,
});

export const STORM_CITADEL_MAP: MapLayout = {
	id: 'w3_tower_a',
	name: '폭풍 성채',
	unlockLevel: 7,
	width: 8,
	height: 18,
	tileSize: 32,
	path: STORM_LANE_A,
	paths: [STORM_LANE_A, STORM_LANE_B, STORM_LANE_C],
	blockedPlacementPoints: STORM_BLOCKED,
	buildablePoints: STORM_BUILDABLE,
	spawnPoint: { x: 0, y: 0 },
	exitPoint: { x: 4, y: 17 },
	tilemapKey: 'tilemap-w3_tower_a',
	tilesetKey: 'tileset',
	rewardMultiplier: 3,
	difficultyHpMult: 1.6,
	recommendedPower: 400,
	gimmickTiles: {
		arcaneCircleTiles: [
			{ x: 2, y: 6 },
			{ x: 5, y: 12 },
		],
	},
};

// --- W1 Forest B: S-curve variant ---
const W1_FOREST_B_PATH: Position[] = [
	{ x: 4, y: 0 },
	{ x: 4, y: 1 },
	{ x: 4, y: 2 },
	{ x: 4, y: 3 },
	{ x: 3, y: 3 },
	{ x: 2, y: 3 },
	{ x: 2, y: 4 },
	{ x: 2, y: 5 },
	{ x: 2, y: 6 },
	{ x: 3, y: 6 },
	{ x: 4, y: 6 },
	{ x: 5, y: 6 },
	{ x: 5, y: 7 },
	{ x: 5, y: 8 },
	{ x: 5, y: 9 },
	{ x: 4, y: 9 },
	{ x: 3, y: 9 },
	{ x: 2, y: 9 },
	{ x: 2, y: 10 },
	{ x: 2, y: 11 },
	{ x: 2, y: 12 },
	{ x: 3, y: 12 },
	{ x: 4, y: 12 },
	{ x: 5, y: 12 },
	{ x: 5, y: 13 },
	{ x: 5, y: 14 },
	{ x: 5, y: 15 },
	{ x: 4, y: 15 },
	{ x: 3, y: 15 },
	{ x: 3, y: 16 },
	{ x: 3, y: 17 },
];

const W1_FOREST_B_BLOCKED: Position[] = [
	{ x: 4, y: 0 },
	{ x: 3, y: 17 },
];

const W1_FOREST_B_BUILDABLE = buildBuildablePoints({
	width: 8,
	height: 18,
	path: W1_FOREST_B_PATH,
	blockedPlacementPoints: W1_FOREST_B_BLOCKED,
});

export const W1_FOREST_B_MAP: MapLayout = {
	id: 'w1_forest_b',
	name: '변경의 숲 — 외곽 길',
	width: 8,
	height: 18,
	tileSize: 32,
	path: W1_FOREST_B_PATH,
	blockedPlacementPoints: W1_FOREST_B_BLOCKED,
	buildablePoints: W1_FOREST_B_BUILDABLE,
	spawnPoint: { x: 4, y: 0 },
	exitPoint: { x: 3, y: 17 },
	tilemapKey: 'tilemap-forest-gate',
	tilesetKey: 'tileset',
	rewardMultiplier: 1,
	difficultyHpMult: 1,
	recommendedPower: 120,
};

// --- W2 Forge B: lava corridor ---
const W2_FORGE_B_PATH: Position[] = [
	{ x: 3, y: 0 },
	{ x: 3, y: 1 },
	{ x: 3, y: 2 },
	{ x: 3, y: 3 },
	{ x: 4, y: 3 },
	{ x: 5, y: 3 },
	{ x: 5, y: 4 },
	{ x: 5, y: 5 },
	{ x: 5, y: 6 },
	{ x: 4, y: 6 },
	{ x: 3, y: 6 },
	{ x: 2, y: 6 },
	{ x: 2, y: 7 },
	{ x: 2, y: 8 },
	{ x: 2, y: 9 },
	{ x: 3, y: 9 },
	{ x: 4, y: 9 },
	{ x: 5, y: 9 },
	{ x: 5, y: 10 },
	{ x: 5, y: 11 },
	{ x: 5, y: 12 },
	{ x: 4, y: 12 },
	{ x: 3, y: 12 },
	{ x: 2, y: 12 },
	{ x: 2, y: 13 },
	{ x: 2, y: 14 },
	{ x: 2, y: 15 },
	{ x: 3, y: 15 },
	{ x: 4, y: 15 },
	{ x: 4, y: 16 },
	{ x: 4, y: 17 },
];

const W2_FORGE_B_BLOCKED: Position[] = [
	{ x: 3, y: 0 },
	{ x: 4, y: 17 },
];

const W2_FORGE_B_BUILDABLE = buildBuildablePoints({
	width: 8,
	height: 18,
	path: W2_FORGE_B_PATH,
	blockedPlacementPoints: W2_FORGE_B_BLOCKED,
});

export const W2_FORGE_B_MAP: MapLayout = {
	id: 'w2_forge_b',
	name: '불의 단조장 — 용암 통로',
	width: 8,
	height: 18,
	tileSize: 32,
	path: W2_FORGE_B_PATH,
	blockedPlacementPoints: W2_FORGE_B_BLOCKED,
	buildablePoints: W2_FORGE_B_BUILDABLE,
	spawnPoint: { x: 3, y: 0 },
	exitPoint: { x: 4, y: 17 },
	tilemapKey: 'tilemap-w2_forge_a',
	tilesetKey: 'tileset',
	rewardMultiplier: 2,
	difficultyHpMult: 1.3,
	recommendedPower: 350,
	gimmickTiles: {
		furnaceTiles: [
			{ x: 4, y: 4 },
			{ x: 4, y: 8 },
			{ x: 4, y: 14 },
		],
	},
};

// --- W3 Tower B: dual-lane ---
const W3_TOWER_B_LANE_A: Position[] = [
	{ x: 2, y: 0 },
	{ x: 2, y: 1 },
	{ x: 2, y: 2 },
	{ x: 2, y: 3 },
	{ x: 2, y: 4 },
	{ x: 2, y: 5 },
	{ x: 2, y: 6 },
	{ x: 2, y: 7 },
	{ x: 2, y: 8 },
	{ x: 2, y: 9 },
	{ x: 2, y: 10 },
	{ x: 2, y: 11 },
	{ x: 2, y: 12 },
	{ x: 2, y: 13 },
	{ x: 2, y: 14 },
	{ x: 2, y: 15 },
	{ x: 3, y: 15 },
	{ x: 3, y: 16 },
	{ x: 3, y: 17 },
];

const W3_TOWER_B_LANE_B: Position[] = [
	{ x: 5, y: 0 },
	{ x: 5, y: 1 },
	{ x: 5, y: 2 },
	{ x: 5, y: 3 },
	{ x: 5, y: 4 },
	{ x: 5, y: 5 },
	{ x: 5, y: 6 },
	{ x: 5, y: 7 },
	{ x: 5, y: 8 },
	{ x: 5, y: 9 },
	{ x: 5, y: 10 },
	{ x: 5, y: 11 },
	{ x: 5, y: 12 },
	{ x: 5, y: 13 },
	{ x: 5, y: 14 },
	{ x: 5, y: 15 },
	{ x: 4, y: 15 },
	{ x: 4, y: 16 },
	{ x: 4, y: 17 },
];

const W3_TOWER_B_BLOCKED: Position[] = [
	{ x: 2, y: 0 },
	{ x: 5, y: 0 },
	{ x: 3, y: 17 },
	{ x: 4, y: 17 },
];

const W3_TOWER_B_BUILDABLE = buildBuildablePoints({
	width: 8,
	height: 18,
	path: [...W3_TOWER_B_LANE_A, ...W3_TOWER_B_LANE_B],
	blockedPlacementPoints: W3_TOWER_B_BLOCKED,
});

export const W3_TOWER_B_MAP: MapLayout = {
	id: 'w3_tower_b',
	name: '마탑 성채 — 이중 회랑',
	width: 8,
	height: 18,
	tileSize: 32,
	path: W3_TOWER_B_LANE_A,
	paths: [W3_TOWER_B_LANE_A, W3_TOWER_B_LANE_B],
	blockedPlacementPoints: W3_TOWER_B_BLOCKED,
	buildablePoints: W3_TOWER_B_BUILDABLE,
	spawnPoint: { x: 2, y: 0 },
	exitPoint: { x: 3, y: 17 },
	tilemapKey: 'tilemap-w3_tower_a',
	tilesetKey: 'tileset',
	rewardMultiplier: 3,
	difficultyHpMult: 1.6,
	recommendedPower: 800,
	gimmickTiles: {
		arcaneCircleTiles: [
			{ x: 3, y: 8 },
			{ x: 4, y: 8 },
		],
	},
};

// === Phase A Long Map (8×24, tight zigzag, random-summon + merge) ===
//
// Tight zigzag across the full width (cols 0-7). 8 horizontal sweeps on
// rows 0/3/6/9/12/15/18/21, alternating right→left. 2-row buildable gaps
// between sweeps (rows 1-2, 4-5, 7-8, etc.) so towers in the gap always
// cover TWO adjacent sweep passes — no "top towers become useless" problem
// that the old one-way S-curve had.
//
//   0 1 2 3 4 5 6 7
//  0 →→→→→→→→        sweep 1 (right)  spawn=(0,0)
//  1           [tower gap]
//  2           [tower gap]     ↓ transition at col 7
//  3 ←←←←←←←←        sweep 2 (left)
//  4 [tower gap]
//  5 [tower gap]     ↓ transition at col 0
//  6 →→→→→→→→        sweep 3 (right)
//  ...
// 21 ←←←←←←←←        sweep 8 (left)   exit=(0,21)
// 22-23: extra buildable space (not on path)
//
// Towers at any height cover enemies on both the leftward and rightward
// passes above and below. A tower at (3,1) fires at sweep 1 AND sweep 2.
//
// Path: 8 × 8 (sweeps) + 7 × 2 (transitions) = 78 cells
// Buildable: 192 - 78 - 6 blocked = ~108 cells

const PHASE_A_SWEEP_ROWS = [0, 3, 6, 9, 12, 15, 18, 21] as const;

function generateZigzagPath(
	width: number,
	sweepRows: readonly number[],
): Position[] {
	const path: Position[] = [];
	for (let i = 0; i < sweepRows.length; i++) {
		const row = sweepRows[i];
		const goRight = i % 2 === 0;
		if (goRight) {
			for (let x = 0; x < width; x++) path.push({ x, y: row });
		} else {
			for (let x = width - 1; x >= 0; x--) path.push({ x, y: row });
		}
		if (i < sweepRows.length - 1) {
			const nextRow = sweepRows[i + 1];
			const transCol = goRight ? width - 1 : 0;
			for (let y = row + 1; y < nextRow; y++) {
				path.push({ x: transCol, y });
			}
		}
	}
	return path;
}

const PHASE_A_LONG_PATH = generateZigzagPath(8, PHASE_A_SWEEP_ROWS);

const PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS: Position[] = [
	{ x: 0, y: 0 },
	{ x: 0, y: 21 },
	{ x: 7, y: 0 },
	{ x: 7, y: 21 },
	{ x: 0, y: 23 },
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
	name: 'Phase A — 지그재그 회랑',
	width: 8,
	height: 24,
	tileSize: 32,
	path: PHASE_A_LONG_PATH,
	blockedPlacementPoints: PHASE_A_LONG_BLOCKED_PLACEMENT_POINTS,
	buildablePoints: PHASE_A_LONG_BUILDABLE_POINTS,
	spawnPoint: { x: 0, y: 0 },
	exitPoint: { x: 0, y: 21 },
	tilemapKey: 'tilemap-phase-a-long',
	tilesetKey: 'tileset',
	rewardMultiplier: 1,
	difficultyHpMult: 1,
	recommendedPower: 55,
};

export const MAP_REGISTRY: Record<string, MapLayout> = {
	// W1
	w1_forest_a: FOREST_GATE_MAP,
	w1_forest_b: W1_FOREST_B_MAP,
	// W2
	w2_forge_a: LAVA_FORTRESS_MAP,
	w2_forge_b: W2_FORGE_B_MAP,
	// W3
	w3_tower_a: STORM_CITADEL_MAP,
	w3_tower_b: W3_TOWER_B_MAP,
	// Phase A pivot — random-summon + merge core loop
	phase_a_long: PHASE_A_LONG_MAP,
	// Legacy aliases
	forest_gate: FOREST_GATE_MAP,
	lava_fortress: LAVA_FORTRESS_MAP,
	storm_citadel: STORM_CITADEL_MAP,
};

export const DEFAULT_MAP_ID = 'w1_forest_a';

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

/** Returns the next map in the world after the given mapId, or null if last. */
export function getNextMapInWorld(currentMapId: string): string | null {
	const keys = Object.keys(MAP_REGISTRY);
	const idx = keys.indexOf(currentMapId);
	if (idx === -1 || idx >= keys.length - 1) return null;
	return keys[idx + 1];
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
