import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 8;
export const TILE_SIZE = 32; // pixels

export const DEFAULT_GRID_CONFIG: GridConfig = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  spawnPoint: { x: 0, y: 4 },
  exitPoint: { x: 11, y: 4 },
};

export const INITIAL_PLAYER_HP = 20;
export const INITIAL_GOLD = 200;
export const UNIT_SEND_COUNT = 3;
