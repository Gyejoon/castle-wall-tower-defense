import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 18;
export const TILE_SIZE = 32;

export const ISO_TILE_W = 64;
export const ISO_TILE_H = 32;
export const ISO_TILE_DEPTH = 8;
export const ISO_CANVAS_W = (GRID_WIDTH + GRID_HEIGHT) * (ISO_TILE_W / 2); // 832
export const ISO_CANVAS_H = (GRID_WIDTH + GRID_HEIGHT) * (ISO_TILE_H / 2); // 416

export const BOARD_TOP_PADDING = 96;
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
