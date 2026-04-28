import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 18;
// Tile size is 64px to match Tiny Swords source art at native resolution.
// Canvas = TILE_SIZE × GRID_WIDTH / GRID_HEIGHT (no side margin).
export const TILE_SIZE = 64;

export const ORTHO_TILE = 64;
export const ORTHO_CANVAS_W = ORTHO_TILE * GRID_WIDTH; // 512

export const BOARD_TOP_PADDING = 0;
export const GAME_CANVAS_H = ORTHO_TILE * GRID_HEIGHT; // 1152

export const DEFAULT_GRID_CONFIG: GridConfig = {
	width: GRID_WIDTH,
	height: GRID_HEIGHT,
	spawnPoint: { x: 3, y: 0 },
	exitPoint: { x: 4, y: 17 },
};

export const INITIAL_PLAYER_HP = 20;

export const HP_WALL_STAGE_2 = 13; // hp > 13 → hp3
export const HP_WALL_STAGE_1 = 6; // 7-13 → hp2, ≤6 → hp1
