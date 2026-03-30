import type { TowerDef } from '@gld/shared';
import { TIER_PROBABILITIES, PITY_THRESHOLD, getTowersByTier } from '@gld/shared';

export class RandomTowerSystem {
  private consecutiveCommonRolls = 0;

  rollRandomTower(): TowerDef {
    const tier = this.rollTier();
    const towersInTier = getTowersByTier(tier);
    const tower = towersInTier[Math.floor(Math.random() * towersInTier.length)];

    if (tier === 1) {
      this.consecutiveCommonRolls++;
    } else {
      this.consecutiveCommonRolls = 0;
    }

    return tower;
  }

  private rollTier(): number {
    // Pity system: guarantee T2+ after too many T1 rolls
    if (this.consecutiveCommonRolls >= PITY_THRESHOLD) {
      this.consecutiveCommonRolls = 0;
      return this.rollWeightedTier(true);
    }
    return this.rollWeightedTier(false);
  }

  private rollWeightedTier(excludeT1: boolean): number {
    let totalWeight = 0;
    const entries: Array<[number, number]> = [];

    for (const [tierStr, weight] of Object.entries(TIER_PROBABILITIES)) {
      const tier = Number(tierStr);
      if (excludeT1 && tier === 1) continue;
      entries.push([tier, weight]);
      totalWeight += weight;
    }

    let roll = Math.random() * totalWeight;
    for (const [tier, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return tier;
    }

    return entries[entries.length - 1][0];
  }

  getConsecutiveCommonRolls(): number {
    return this.consecutiveCommonRolls;
  }

  reset(): void {
    this.consecutiveCommonRolls = 0;
  }

  destroy(): void {
    this.consecutiveCommonRolls = 0;
  }
}
