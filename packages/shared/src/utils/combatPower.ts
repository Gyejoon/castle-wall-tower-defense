import { enhancementStatMultiplier, GRADE_BONUS } from '../constants/meta';
import { ALL_TOWERS } from '../constants/towers';
import type { OwnedTower, TowerGrade } from '../types/save';

const AWAKENING_MULTIPLIER = [1.0, 1.2, 1.5, 2.0] as const;

/** Utility weight for special abilities on zero-damage towers */
const UTILITY_BASE: Record<string, number> = {
	stun: 15,
	stun_aoe_extended: 40,
	stun_aoe_global: 80,
	slow_30_aoe: 20,
};

function specialKey(special?: string): string {
	return (special ?? '').replace(/%/g, '');
}

export function calcTowerPower(tower: OwnedTower): number {
	const def = ALL_TOWERS.find((t) => t.id === tower.defId);
	if (!def) return 0;

	const { damage, attackSpeed, special } = def.stats;
	const levelMult = enhancementStatMultiplier(tower.level);
	const gradeMult = 1 + (GRADE_BONUS[tower.grade as TowerGrade] ?? 0);
	const awakenMult = AWAKENING_MULTIPLIER[tower.awakening] ?? 1;

	// DPS-based for damage towers, utility-based for support towers
	const basePower =
		damage > 0
			? damage * attackSpeed
			: (UTILITY_BASE[specialKey(special)] ?? 10);

	return Math.round(basePower * levelMult * gradeMult * awakenMult);
}

export function calcCombatPower(collection: OwnedTower[]): number {
	return collection.reduce((sum, t) => sum + calcTowerPower(t), 0);
}
