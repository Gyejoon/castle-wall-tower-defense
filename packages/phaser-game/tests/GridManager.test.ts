import { describe, it, expect } from 'vitest';
import { GridManager } from '../src/systems/GridManager';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, DEFAULT_GRID_CONFIG } from '@gld/shared';

describe('GridManager', () => {
  it('creates a grid with correct dimensions', () => {
    const gm = new GridManager();
    expect(gm.width).toBe(GRID_WIDTH);
    expect(gm.height).toBe(GRID_HEIGHT);
  });

  it('all tiles start walkable and unoccupied', () => {
    const gm = new GridManager();
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = gm.getTile(x, y);
        expect(tile).not.toBeNull();
        expect(tile!.walkable).toBe(true);
        expect(tile!.occupied).toBe(false);
      }
    }
  });

  it('isInBounds returns correctly', () => {
    const gm = new GridManager();
    expect(gm.isInBounds(0, 0)).toBe(true);
    expect(gm.isInBounds(19, 19)).toBe(true);
    expect(gm.isInBounds(-1, 0)).toBe(false);
    expect(gm.isInBounds(20, 0)).toBe(false);
  });

  it('places a tower and marks tile occupied', () => {
    const gm = new GridManager();
    const result = gm.placeTower(5, 5, 'laser');
    expect(result).toBe(true);
    expect(gm.isWalkable(5, 5)).toBe(false);
    const tile = gm.getTile(5, 5);
    expect(tile!.occupied).toBe(true);
    expect(tile!.towerId).toBe('laser');
  });

  it('prevents placing on spawn point', () => {
    const gm = new GridManager();
    const result = gm.placeTower(DEFAULT_GRID_CONFIG.spawnPoint.x, DEFAULT_GRID_CONFIG.spawnPoint.y, 'laser');
    expect(result).toBe(false);
  });

  it('prevents placing on exit point', () => {
    const gm = new GridManager();
    const result = gm.placeTower(DEFAULT_GRID_CONFIG.exitPoint.x, DEFAULT_GRID_CONFIG.exitPoint.y, 'laser');
    expect(result).toBe(false);
  });

  it('removes a tower', () => {
    const gm = new GridManager();
    gm.placeTower(5, 5, 'laser');
    const result = gm.removeTower(5, 5);
    expect(result).toBe(true);
    expect(gm.isWalkable(5, 5)).toBe(true);
  });

  it('converts grid to world coords (center of tile)', () => {
    const gm = new GridManager();
    const world = gm.gridToWorld(0, 0);
    expect(world.x).toBe(TILE_SIZE / 2);
    expect(world.y).toBe(TILE_SIZE / 2);
  });

  it('converts world to grid coords', () => {
    const gm = new GridManager();
    const grid = gm.worldToGrid(TILE_SIZE * 3 + 10, TILE_SIZE * 7 + 5);
    expect(grid.x).toBe(3);
    expect(grid.y).toBe(7);
  });

  it('generates walkability grid', () => {
    const gm = new GridManager();
    gm.placeTower(5, 5, 'laser');
    const walkGrid = gm.getWalkabilityGrid();
    expect(walkGrid[5][5]).toBe(1); // blocked
    expect(walkGrid[0][0]).toBe(0); // walkable
    expect(walkGrid.length).toBe(GRID_HEIGHT);
    expect(walkGrid[0].length).toBe(GRID_WIDTH);
  });
});
