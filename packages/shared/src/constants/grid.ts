import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 18;
// Phase 7.1: tile size standardised to 48px ahead of the 9×18 grid rewrite.
// ORTHO_CANVAS_W is pinned to 432 (= 48 × 9) so commit 7.3's grid redesign
// lands on an already-resized canvas.
export const TILE_SIZE = 48;

export const ORTHO_TILE = 48;
export const ORTHO_CANVAS_W = ORTHO_TILE * 9; // 432 — width for the upcoming 9×18 grid

export const BOARD_TOP_PADDING = 0;
export const GAME_CANVAS_H = 960;

export const DEFAULT_GRID_CONFIG: GridConfig = {
	width: GRID_WIDTH,
	height: GRID_HEIGHT,
	spawnPoint: { x: 3, y: 0 },
	exitPoint: { x: 4, y: 17 },
};

export const INITIAL_PLAYER_HP = 20;

export const HP_WALL_STAGE_2 = 13; // hp > 13 → hp3
export const HP_WALL_STAGE_1 = 6; // 7-13 → hp2, ≤6 → hp1
