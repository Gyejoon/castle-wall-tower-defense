import type { Position } from '@gld/shared';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

const DIRECTIONS: Position[] = [
  { x: 0, y: -1 }, // N
  { x: 0, y: 1 },  // S
  { x: 1, y: 0 },  // E
  { x: -1, y: 0 }, // W
];

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * A* pathfinding on a 2D grid.
 * Grid values: 0 = walkable, 1 = blocked
 */
export function findPath(
  grid: number[][],
  start: Position,
  end: Position,
): Position[] | null {
  const height = grid.length;
  if (height === 0) return null;
  const width = grid[0].length;

  if (grid[start.y]?.[start.x] === 1 || grid[end.y]?.[end.x] === 1) {
    return null;
  }

  const openSet = new Map<string, PathNode>();
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };
  openSet.set(posKey(start.x, start.y), startNode);

  while (openSet.size > 0) {
    // Find node with lowest f
    let current: PathNode | null = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) {
        current = node;
      }
    }
    if (!current) break;

    // Reached the end
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current);
    }

    const currentKey = posKey(current.x, current.y);
    openSet.delete(currentKey);
    closedSet.add(currentKey);

    // Explore neighbors
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nKey = posKey(nx, ny);

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (grid[ny][nx] === 1) continue;
      if (closedSet.has(nKey)) continue;

      const g = current.g + 1;
      const existing = openSet.get(nKey);

      if (!existing || g < existing.g) {
        const h = heuristic({ x: nx, y: ny }, end);
        const node: PathNode = { x: nx, y: ny, g, h, f: g + h, parent: current };
        openSet.set(nKey, node);
      }
    }
  }

  return null; // No path found
}

function reconstructPath(node: PathNode): Position[] {
  const path: Position[] = [];
  let current: PathNode | null = node;
  while (current) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }
  path.reverse();
  return path;
}

/**
 * PathfindingSystem with caching.
 * Invalidate cache when grid changes (tower placed/removed).
 */
export class PathfindingSystem {
  private cachedPath: Position[] | null = null;

  findPath(grid: number[][], start: Position, end: Position): Position[] | null {
    if (this.cachedPath) return this.cachedPath;
    this.cachedPath = findPath(grid, start, end);
    return this.cachedPath;
  }

  invalidateCache(): void {
    this.cachedPath = null;
  }

  getCachedPath(): Position[] | null {
    return this.cachedPath;
  }
}
