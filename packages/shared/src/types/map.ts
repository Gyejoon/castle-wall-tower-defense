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
	/**
	 * Optional visual anchors for buildable cells whose art-space center differs
	 * from the regular grid center. Used by illustrated maps so towers snap to
	 * painted pads while placement logic still uses stable grid ids.
	 */
	placementAnchors?: Array<Position & { worldX: number; worldY: number }>;
	spawnPoint: Position;
	exitPoint: Position;
	tilemapKey: string;
	tilesetKey: string;
	unlockLevel?: number; // undefined = always unlocked
	/** Recommended combat power for this map. */
	recommendedPower: number;
	/** Gold and XP reward multiplier. 정식 모드 pivot keeps this at 1. */
	rewardMultiplier: number;
	/** HP multiplier applied to all spawned units. Default 1. */
	difficultyHpMult: number;
	/**
	 * Fixed obstacle tiles. Towers cannot be placed here and units cannot
	 * path through. Added in Phase 7.2 for the 정식 모드 redesign — optional so
	 * legacy test fixtures keep compiling.
	 */
	obstacles?: Position[];
	/**
	 * Tiles that render the castle wall at the exit. Usually just
	 * `[exitPoint]`; kept as an array so future maps can widen the gate.
	 */
	castleWallTiles?: Position[];
	/**
	 * Ambient decoration sprites rendered on top of terrain for visual
	 * richness. Purely cosmetic — they do NOT affect pathfinding, placement,
	 * or obstacle logic. Coordinates are grid units and may be fractional or
	 * outside the playfield (decorations placed just off-grid read as
	 * "background scenery"). Added in 정식 모드 map-decoration-boost.
	 */
	decorations?: Array<{
		x: number;
		y: number;
		kind: 'tree' | 'bush' | 'rock';
		variant?: 1 | 2 | 3 | 4;
	}>;
}
