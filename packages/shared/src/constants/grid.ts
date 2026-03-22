import type { GridConfig } from '../types/grid';

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 20;
export const TILE_SIZE = 32; // pixels

export const DEFAULT_GRID_CONFIG: GridConfig = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  spawnPoint: { x: 0, y: 10 },
  exitPoint: { x: 19, y: 10 },
};
