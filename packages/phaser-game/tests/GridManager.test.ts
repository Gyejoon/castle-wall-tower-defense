import { describe, it, expect } from 'vitest';
import { GridManager } from '../src/systems/GridManager';
import type { MapLayout } from '@gld/shared';

const TEST_MAP: MapLayout = {
  id: 'test',
  name: 'Test Map',
  width: 10,
  height: 10,
  tileSize: 32,
  path: [
    { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 },
    { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
  ],
  placementPoints: [
    { x: 1, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 4 },
    { x: 1, y: 6 }, { x: 3, y: 6 },
  ],
  spawnPoint: { x: 0, y: 5 },
  exitPoint: { x: 5, y: 5 },
  tilemapKey: 'test-map',
  tilesetKey: 'test-tileset',
};

describe('GridManager', () => {
  it('생성자가 속성을 올바르게 설정해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.width).toBe(10);
    expect(gm.height).toBe(10);
    expect(gm.tileSize).toBe(32);
    expect(gm.spawnPoint).toEqual({ x: 0, y: 5 });
    expect(gm.exitPoint).toEqual({ x: 5, y: 5 });
  });

  it('isValidPlacementPoint가 배치 포인트에 대해 true를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.isValidPlacementPoint(1, 4)).toBe(true);
    expect(gm.isValidPlacementPoint(3, 4)).toBe(true);
    expect(gm.isValidPlacementPoint(5, 4)).toBe(true);
    expect(gm.isValidPlacementPoint(1, 6)).toBe(true);
    expect(gm.isValidPlacementPoint(3, 6)).toBe(true);
  });

  it('isValidPlacementPoint가 배치 포인트가 아닌 위치에 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.isValidPlacementPoint(0, 0)).toBe(false);
    expect(gm.isValidPlacementPoint(9, 9)).toBe(false);
    expect(gm.isValidPlacementPoint(2, 3)).toBe(false);
  });

  it('isValidPlacementPoint가 경로 타일에 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.isValidPlacementPoint(0, 5)).toBe(false); // spawn (path tile)
    expect(gm.isValidPlacementPoint(2, 5)).toBe(false); // mid path
    expect(gm.isValidPlacementPoint(5, 5)).toBe(false); // exit (path tile)
  });

  it('isPlacementPointEmpty가 점유되지 않은 포인트에 true를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.isPlacementPointEmpty(1, 4)).toBe(true);
  });

  it('occupyPlacementPoint가 포인트를 점유 상태로 표시해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    const result = gm.occupyPlacementPoint(1, 4, 'tower-1');
    expect(result).toBe(true);
  });

  it('occupyPlacementPoint 후 isPlacementPointEmpty가 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    gm.occupyPlacementPoint(1, 4, 'tower-1');
    expect(gm.isPlacementPointEmpty(1, 4)).toBe(false);
  });

  it('이미 점유된 포인트에 occupyPlacementPoint가 false를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    gm.occupyPlacementPoint(1, 4, 'tower-1');
    const result = gm.occupyPlacementPoint(1, 4, 'tower-2');
    expect(result).toBe(false);
  });

  it('freePlacementPoint가 포인트를 해제해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    gm.occupyPlacementPoint(1, 4, 'tower-1');
    const result = gm.freePlacementPoint(1, 4);
    expect(result).toBe(true);
    expect(gm.isPlacementPointEmpty(1, 4)).toBe(true);
  });

  it('getPath가 고정 경로를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    const path = gm.getPath();
    expect(path).toHaveLength(6);
    expect(path[0]).toEqual({ x: 0, y: 5 });
    expect(path[5]).toEqual({ x: 5, y: 5 });
  });

  it('getPlacementPoints가 모든 배치 포인트를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    const points = gm.getPlacementPoints();
    expect(points).toHaveLength(5);
  });

  it('getOccupiedTowerId가 올바른 타워 id를 반환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    gm.occupyPlacementPoint(3, 4, 'laser-tower');
    expect(gm.getOccupiedTowerId(3, 4)).toBe('laser-tower');
    expect(gm.getOccupiedTowerId(1, 4)).toBeNull();
  });

  it('gridToWorld가 타일 중앙 픽셀 좌표로 변환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.gridToWorld(0, 0)).toEqual({ x: 16, y: 16 });
    expect(gm.gridToWorld(1, 2)).toEqual({ x: 48, y: 80 });
  });

  it('worldToGrid가 그리드 좌표로 변환해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.worldToGrid(32 * 3 + 10, 32 * 7 + 5)).toEqual({ x: 3, y: 7 });
  });

  it('isInBounds가 경계 검사를 올바르게 수행해야 한다', () => {
    const gm = new GridManager(TEST_MAP);
    expect(gm.isInBounds(0, 0)).toBe(true);
    expect(gm.isInBounds(9, 9)).toBe(true);
    expect(gm.isInBounds(-1, 0)).toBe(false);
    expect(gm.isInBounds(10, 0)).toBe(false);
    expect(gm.isInBounds(0, 10)).toBe(false);
  });
});
