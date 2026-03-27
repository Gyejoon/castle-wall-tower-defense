import { describe, it, expect } from 'vitest';
import { findPath, PathfindingSystem } from '../src/systems/PathfindingSystem';

function makeGrid(width: number, height: number, blocked: [number, number][] = []): number[][] {
  const grid = Array.from({ length: height }, () => Array(width).fill(0));
  for (const [x, y] of blocked) {
    grid[y][x] = 1;
  }
  return grid;
}

describe('findPath (A*)', () => {
  it('finds a straight horizontal path', () => {
    const grid = makeGrid(5, 1);
    const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(5);
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![4]).toEqual({ x: 4, y: 0 });
  });

  it('navigates around obstacles', () => {
    // Grid:
    // S . # . E
    // . . # . .
    // . . . . .
    const grid = makeGrid(5, 3, [[2, 0], [2, 1]]);
    const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    // Path must go around the wall
    expect(path!.some((p) => p.x === 2 && p.y === 2)).toBe(true);
  });

  it('returns null when no path exists', () => {
    // Full wall blocking
    const grid = makeGrid(5, 3, [[2, 0], [2, 1], [2, 2]]);
    const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).toBeNull();
  });

  it('returns single node when start equals end', () => {
    const grid = makeGrid(3, 3);
    const path = findPath(grid, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(path).toEqual([{ x: 1, y: 1 }]);
  });

  it('returns null when start is blocked', () => {
    const grid = makeGrid(3, 3, [[0, 0]]);
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(path).toBeNull();
  });

  it('handles 20x20 grid (game-size)', () => {
    const grid = makeGrid(20, 20);
    const path = findPath(grid, { x: 0, y: 10 }, { x: 19, y: 10 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(20); // straight line
    expect(path![0]).toEqual({ x: 0, y: 10 });
    expect(path![19]).toEqual({ x: 19, y: 10 });
  });
});

describe('PathfindingSystem (caching)', () => {
  it('caches the path result', () => {
    const ps = new PathfindingSystem();
    const grid = makeGrid(5, 1);
    const path1 = ps.findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    const path2 = ps.findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path1).toBe(path2); // same reference (cached)
  });

  it('invalidates cache', () => {
    const ps = new PathfindingSystem();
    const grid = makeGrid(5, 1);
    ps.findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    ps.invalidateCache();
    expect(ps.getCachedPath()).toBeNull();
  });
});
