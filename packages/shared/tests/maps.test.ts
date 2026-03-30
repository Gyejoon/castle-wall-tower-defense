import { describe, it, expect } from 'vitest';
import { FOREST_GATE_MAP } from '../src/constants/maps';

describe('FOREST_GATE_MAP', () => {
  it('경로가 연속적이어야 한다 (각 단계가 다음 단계와 인접)', () => {
    const { path } = FOREST_GATE_MAP;
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      const dx = Math.abs(next.x - current.x);
      const dy = Math.abs(next.y - current.y);
      expect(dx + dy).toBe(1); // 인접한 타일은 맨해튼 거리 1
    }
  });

  it('spawnPoint가 경로의 첫 번째 원소와 일치해야 한다', () => {
    const { path, spawnPoint } = FOREST_GATE_MAP;
    expect(spawnPoint).toEqual(path[0]);
  });

  it('exitPoint가 경로의 마지막 원소와 일치해야 한다', () => {
    const { path, exitPoint } = FOREST_GATE_MAP;
    expect(exitPoint).toEqual(path[path.length - 1]);
  });

  it('spec 6.2에 맞게 경로가 (0,4)에서 (11,4)까지 직선이어야 한다', () => {
    expect(FOREST_GATE_MAP.spawnPoint).toEqual({ x: 0, y: 4 });
    expect(FOREST_GATE_MAP.exitPoint).toEqual({ x: 11, y: 4 });
    expect(FOREST_GATE_MAP.path).toEqual(
      Array.from({ length: 12 }, (_, x) => ({ x, y: 4 })),
    );
  });

  it('배치 포인트가 경로와 겹치지 않아야 한다', () => {
    const { path, placementPoints } = FOREST_GATE_MAP;
    const pathSet = new Set(path.map((p) => `${p.x},${p.y}`));
    for (const point of placementPoints) {
      expect(pathSet.has(`${point.x},${point.y}`)).toBe(false);
    }
  });

  it('모든 배치 포인트가 최소 하나의 경로 타일과 인접해야 한다', () => {
    const { path, placementPoints } = FOREST_GATE_MAP;
    const pathSet = new Set(path.map((p) => `${p.x},${p.y}`));
    const isAdjacentToPath = (x: number, y: number): boolean => {
      return (
        pathSet.has(`${x},${y - 1}`) ||
        pathSet.has(`${x},${y + 1}`) ||
        pathSet.has(`${x - 1},${y}`) ||
        pathSet.has(`${x + 1},${y}`)
      );
    };
    for (const point of placementPoints) {
      expect(isAdjacentToPath(point.x, point.y)).toBe(true);
    }
  });

  it('모든 위치가 경계 내에 있어야 한다 (0 ~ width-1, 0 ~ height-1)', () => {
    const { width, height, path, placementPoints, spawnPoint, exitPoint } = FOREST_GATE_MAP;
    const allPositions = [...path, ...placementPoints, spawnPoint, exitPoint];
    for (const pos of allPositions) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThan(width);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThan(height);
    }
  });

  it('배치 포인트가 15개여야 한다', () => {
    expect(FOREST_GATE_MAP.placementPoints).toHaveLength(15);
  });

  it('맵 크기가 12x8이어야 한다', () => {
    expect(FOREST_GATE_MAP.width).toBe(12);
    expect(FOREST_GATE_MAP.height).toBe(8);
  });
});
