import type { Position, MapLayout } from '@gld/shared';

export class GridManager {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly spawnPoint: Position;
  readonly exitPoint: Position;
  private readonly path: Position[];
  private readonly placementPoints: Position[];
  private readonly placementPointSet: Set<string>;
  private readonly occupiedPoints: Map<string, string>; // "x,y" -> towerId

  constructor(map: MapLayout) {
    this.width = map.width;
    this.height = map.height;
    this.tileSize = map.tileSize;
    this.spawnPoint = map.spawnPoint;
    this.exitPoint = map.exitPoint;
    this.path = map.path;
    this.placementPoints = map.placementPoints;
    this.placementPointSet = new Set(
      map.placementPoints.map((p: Position) => `${p.x},${p.y}`)
    );
    this.occupiedPoints = new Map();
  }

  isValidPlacementPoint(x: number, y: number): boolean {
    return this.placementPointSet.has(`${x},${y}`);
  }

  isPlacementPointEmpty(x: number, y: number): boolean {
    return this.isValidPlacementPoint(x, y) && !this.occupiedPoints.has(`${x},${y}`);
  }

  occupyPlacementPoint(x: number, y: number, towerId: string): boolean {
    if (!this.isPlacementPointEmpty(x, y)) return false;
    this.occupiedPoints.set(`${x},${y}`, towerId);
    return true;
  }

  freePlacementPoint(x: number, y: number): boolean {
    const key = `${x},${y}`;
    if (!this.occupiedPoints.has(key)) return false;
    this.occupiedPoints.delete(key);
    return true;
  }

  getPath(): Position[] {
    return this.path;
  }

  getPlacementPoints(): Position[] {
    return this.placementPoints;
  }

  getOccupiedTowerId(x: number, y: number): string | null {
    return this.occupiedPoints.get(`${x},${y}`) ?? null;
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** Convert grid coords to world pixel coords (center of tile) */
  gridToWorld(gridX: number, gridY: number): Position {
    return {
      x: gridX * this.tileSize + this.tileSize / 2,
      y: gridY * this.tileSize + this.tileSize / 2,
    };
  }

  /** Convert world pixel coords to grid coords */
  worldToGrid(worldX: number, worldY: number): Position {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize),
    };
  }
}
