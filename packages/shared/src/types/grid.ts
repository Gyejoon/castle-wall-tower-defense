export interface Position {
	x: number;
	y: number;
}

export interface Tile {
	position: Position;
	walkable: boolean;
	occupied: boolean;
	towerId: string | null;
}

export type Grid = Tile[][];

export interface GridConfig {
	width: number;
	height: number;
	spawnPoint: Position;
	exitPoint: Position;
}
