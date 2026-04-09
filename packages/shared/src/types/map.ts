import type { Position } from './grid';

export interface GimmickTileSet {
	/** W2 furnace tiles — towers on these tiles are disabled during the "ON" phase. */
	furnaceTiles?: Array<{ x: number; y: number }>;
	/** W3 arcane circle tiles — towers on these tiles get +15% damage and are immune to arcane bursts. */
	arcaneCircleTiles?: Array<{ x: number; y: number }>;
}

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
	unlockLevel?: number; // undefined = always unlocked (e.g. forest_gate)
	/** Recommended combat power for this map. Shown on StageDetailPage. */
	recommendedPower: number;
	/** Gold and XP reward multiplier. forest_gate=1, lava_fortress=2, storm_citadel=3 */
	rewardMultiplier: number;
	/** HP multiplier applied to all spawned units. Default 1. */
	difficultyHpMult: number;
	/** Optional world-gimmick tile data. Scene consults this when constructing the world gimmick. */
	gimmickTiles?: GimmickTileSet;
}
