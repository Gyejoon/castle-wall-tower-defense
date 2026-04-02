import type { Position } from './grid';

export interface MapLayout {
	id: string;
	name: string;
	width: number;
	height: number;
	tileSize: number;
	path: Position[]; // ordered lane tiles from spawn to exit
	blockedPlacementPoints: Position[]; // non-buildable terrain blocked from tower placement
	buildablePoints: Position[]; // valid tower placement tiles derived from board contract
	spawnPoint: Position;
	exitPoint: Position;
	tilemapKey: string;
	tilesetKey: string;
}
