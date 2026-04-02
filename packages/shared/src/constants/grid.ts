import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 18;
export const TILE_SIZE = 53;

export const ORTHO_TILE = 53;
export const ORTHO_CANVAS_W = ORTHO_TILE * GRID_WIDTH; // 424

export const BOARD_TOP_PADDING = 0;
export const GAME_CANVAS_H = 960;

export const DEFAULT_GRID_CONFIG: GridConfig = {
	width: GRID_WIDTH,
	height: GRID_HEIGHT,
	spawnPoint: { x: 3, y: 0 },
	exitPoint: { x: 4, y: 17 },
};

export const INITIAL_PLAYER_HP = 20;
export const INITIAL_GOLD = 200;
export const UNIT_SEND_COUNT = 3;
