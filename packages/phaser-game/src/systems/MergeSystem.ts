import type { TowerDef, Position } from '@gld/shared';
import { getTowersByTier } from '@gld/shared';
import type { TowerSystem } from './TowerSystem';

export class MergeSystem {
  private towerSystem: TowerSystem;

  constructor(towerSystem: TowerSystem) {
    this.towerSystem = towerSystem;
  }

  canMerge(pos1: Position, pos2: Position): boolean {
    const tower1 = this.towerSystem.getTowerAt(pos1.x, pos1.y);
    const tower2 = this.towerSystem.getTowerAt(pos2.x, pos2.y);
    if (!tower1 || !tower2) return false;
    if (pos1.x === pos2.x && pos1.y === pos2.y) return false;
    if (tower1.def.id !== tower2.def.id) return false;
    if (tower1.def.tier >= 5) return false;
    return true;
  }

  merge(pos1: Position, pos2: Position): TowerDef | null {
    if (!this.canMerge(pos1, pos2)) return null;

    const tower1 = this.towerSystem.getTowerAt(pos1.x, pos1.y)!;
    const nextTier = tower1.def.tier + 1;

    // Remove both towers
    this.towerSystem.removeTowerAt(pos1.x, pos1.y);
    this.towerSystem.removeTowerAt(pos2.x, pos2.y);

    // Roll a random tower from the next tier
    const nextTierTowers = getTowersByTier(nextTier);
    const rolledTower = nextTierTowers[Math.floor(Math.random() * nextTierTowers.length)];

    // Place at pos2
    this.towerSystem.placeTower(pos2.x, pos2.y, rolledTower.id);

    return rolledTower;
  }

  destroy(): void {
    // Release reference to avoid retain cycles
    this.towerSystem = null!;
  }
}
