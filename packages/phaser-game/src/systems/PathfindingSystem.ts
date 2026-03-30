import type { Position } from '@gld/shared';

export class PathfindingSystem {
  private fixedPath: Position[] = [];

  setFixedPath(path: Position[]): void {
    this.fixedPath = path;
  }

  getPath(): Position[] {
    return this.fixedPath;
  }

  // Keep for API compatibility during transition
  invalidateCache(): void { /* no-op */ }

  getCachedPath(): Position[] | null {
    return this.fixedPath.length > 0 ? this.fixedPath : null;
  }
}
