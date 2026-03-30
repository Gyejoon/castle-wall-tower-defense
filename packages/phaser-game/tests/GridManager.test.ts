import { describe, it, expect } from 'vitest';
import { GridManager } from '../src/systems/GridManager';
import type { GridConfig } from '@gld/shared';

const TEST_CONFIG: GridConfig = {
  width: 10,
  height: 10,
  spawnPoint: { x: 0, y: 5 },
  exitPoint: { x: 5, y: 5 },
};

describe('GridManager', () => {
  it('생성자가 속성을 올바르게 설정해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.width).toBe(10);
    expect(gm.height).toBe(10);
    expect(gm.tileSize).toBe(32);
    expect(gm.spawnPoint).toEqual({ x: 0, y: 5 });
    expect(gm.exitPoint).toEqual({ x: 5, y: 5 });
  });

  it('isInBounds가 경계 검사를 올바르게 수행해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.isInBounds(0, 0)).toBe(true);
    expect(gm.isInBounds(9, 9)).toBe(true);
    expect(gm.isInBounds(-1, 0)).toBe(false);
    expect(gm.isInBounds(10, 0)).toBe(false);
    expect(gm.isInBounds(0, 10)).toBe(false);
  });

  it('isWalkable이 빈 타일에 true를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.isWalkable(1, 1)).toBe(true);
    expect(gm.isWalkable(3, 3)).toBe(true);
  });

  it('isWalkable이 범위 밖에 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.isWalkable(-1, 0)).toBe(false);
    expect(gm.isWalkable(10, 0)).toBe(false);
  });

  it('placeTower가 빈 타일에 배치하고 true를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    const result = gm.placeTower(1, 1, 'tower-1');
    expect(result).toBe(true);
  });

  it('placeTower 후 isWalkable이 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    gm.placeTower(1, 1, 'tower-1');
    expect(gm.isWalkable(1, 1)).toBe(false);
  });

  it('이미 점유된 타일에 placeTower가 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    gm.placeTower(1, 1, 'tower-1');
    const result = gm.placeTower(1, 1, 'tower-2');
    expect(result).toBe(false);
  });

  it('placeTower가 스폰 포인트에 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.placeTower(0, 5, 'tower-1')).toBe(false);
  });

  it('placeTower가 출구 포인트에 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.placeTower(5, 5, 'tower-1')).toBe(false);
  });

  it('removeTower가 타워를 제거하고 true를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    gm.placeTower(1, 1, 'tower-1');
    const result = gm.removeTower(1, 1);
    expect(result).toBe(true);
    expect(gm.isWalkable(1, 1)).toBe(true);
  });

  it('removeTower가 빈 타일에 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.removeTower(1, 1)).toBe(false);
  });

  it('getTile이 타일 정보를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    const tile = gm.getTile(1, 1);
    expect(tile).not.toBeNull();
    expect(tile!.walkable).toBe(true);
    expect(tile!.occupied).toBe(false);
    expect(tile!.towerId).toBeNull();
  });

  it('getTile이 placeTower 후 올바른 towerId를 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    gm.placeTower(3, 4, 'laser-tower');
    const tile = gm.getTile(3, 4);
    expect(tile!.towerId).toBe('laser-tower');
    expect(tile!.occupied).toBe(true);
  });

  it('getTile이 범위 밖에 null을 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.getTile(-1, 0)).toBeNull();
    expect(gm.getTile(10, 0)).toBeNull();
  });

  it('gridToWorld가 타일 중앙 픽셀 좌표로 변환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.gridToWorld(0, 0)).toEqual({ x: 16, y: 16 });
    expect(gm.gridToWorld(1, 2)).toEqual({ x: 48, y: 80 });
  });

  it('worldToGrid가 그리드 좌표로 변환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    expect(gm.worldToGrid(32 * 3 + 10, 32 * 7 + 5)).toEqual({ x: 3, y: 7 });
  });

  it('getWalkabilityGrid가 올바른 2D 배열을 반환해야 한다', () => {
    const gm = new GridManager(TEST_CONFIG);
    gm.placeTower(2, 3, 'tower-1');
    const grid = gm.getWalkabilityGrid();
    expect(grid[3][2]).toBe(1); // occupied = blocked
    expect(grid[0][0]).toBe(0); // empty = walkable
  });
});
