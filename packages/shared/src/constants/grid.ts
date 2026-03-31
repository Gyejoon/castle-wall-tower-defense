import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 8;
export const TILE_SIZE = 32; // pixels

export const ISO_TILE_W = 64; // isometric diamond width
export const ISO_TILE_H = 32; // isometric diamond height
export const ISO_TILE_DEPTH = 8; // isometric tile 3D depth
export const ISO_CANVAS_W = (GRID_WIDTH + GRID_HEIGHT) * (ISO_TILE_W / 2); // 640
export const ISO_CANVAS_H = (GRID_WIDTH + GRID_HEIGHT) * (ISO_TILE_H / 2); // 320

/** Height for HUD buttons area below both grids */
export const HUD_HEIGHT = 48;
/** Total canvas height for dual-grid layout: AI field + player field + HUD */
export const DUAL_CANVAS_H = ISO_CANVAS_H * 2 + HUD_HEIGHT; // 688

export const DEFAULT_GRID_CONFIG: GridConfig = {
	width: GRID_WIDTH,
	height: GRID_HEIGHT,
	spawnPoint: { x: 0, y: 4 },
	exitPoint: { x: 11, y: 4 },
};

export const INITIAL_PLAYER_HP = 20;
export const INITIAL_GOLD = 200;
export const UNIT_SEND_COUNT = 3;
