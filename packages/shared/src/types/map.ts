import type { Position } from './grid';

export interface MapLayout {
	id: string;
	name: string;
	width: number;
	height: number;
	tileSize: number;
	path: Position[]; // primary lane (lane 0) from spawn to exit
	paths?: Position[][]; // all lanes including primary — if omitted, [path] is used
	blockedPlacementPoints: Position[]; // non-buildable terrain blocked from tower placement
	buildablePoints: Position[]; // valid tower placement tiles derived from board contract
	spawnPoint: Position;
	exitPoint: Position;
	tilemapKey: string;
	tilesetKey: string;
	unlockLevel?: number; // undefined = always unlocked
	/** Recommended combat power for this map. */
	recommendedPower: number;
	/** Gold and XP reward multiplier. Phase A pivot keeps this at 1. */
	rewardMultiplier: number;
	/** HP multiplier applied to all spawned units. Default 1. */
	difficultyHpMult: number;
}
