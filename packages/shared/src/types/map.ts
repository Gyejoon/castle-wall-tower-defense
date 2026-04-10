import type { TerrainKind } from '../constants/terrain';
import type { Position } from './grid';

export interface StructureSpec {
	id: string;
	kind: string;
	position: Position;
	width: number;
	height: number;
	blocksPlacement: boolean;
	blocksPath: boolean;
	assetKey: string;
	variant: string;
}

export interface DecorationSpec {
	x: number; // grid x
	y: number; // grid y
	assetKey: string;
	kind: string;
	variant: string;
}

export interface MapLayout {
	id: string;
	name: string;
	width: number;
	height: number;
	tileSize: number;
	path: Position[]; // primary lane (lane 0) from spawn to exit
	paths?: Position[][]; // all lanes including primary — if omitted, [path] is used
	/** 2D grid: terrain[y][x] */
	terrain: TerrainKind[][];
	structures: StructureSpec[];
	decorations: DecorationSpec[];
	blockedPlacementPoints: Position[]; // non-buildable terrain blocked from tower placement
	buildablePoints: Position[]; // valid tower placement tiles derived from board contract
	spawnPoint: Position;
	exitPoint: Position;
	tilemapKey: string;
	tilesetKey: string;
	unlockLevel?: number; // undefined = always unlocked (e.g. forest_gate)
	/** Recommended combat power for this map. Shown on StageDetailPage. */
	recommendedPower: number;
	/** Gold and XP reward multiplier. forest_gate=1, lava_fortress=2, storm_citadel=3 */
	rewardMultiplier: number;
	/** HP multiplier applied to all spawned units. Default 1. */
	difficultyHpMult: number;
}
