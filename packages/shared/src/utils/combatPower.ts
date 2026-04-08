import type { OwnedTower } from '../types/save';
import { ALL_TOWERS } from '../constants/towers';
import { enhancementStatMultiplier } from '../constants/meta';

const GRADE_MULTIPLIER: Record<string, number> = {
	normal: 1.0,
	rare: 1.1,
	unique: 1.25,
	epic: 1.45,
};

const AWAKENING_MULTIPLIER = [1.0, 1.2, 1.5, 2.0] as const;

export function calcTowerPower(tower: OwnedTower): number {
	const def = ALL_TOWERS.find((t) => t.id === tower.defId);
	if (!def) return 0;
	const baseDmg = def.stats.damage;
	const levelMult = enhancementStatMultiplier(tower.level);
	const gradeMult = GRADE_MULTIPLIER[tower.grade] ?? 1;
	const awakenMult = AWAKENING_MULTIPLIER[tower.awakening] ?? 1;
	return Math.round(baseDmg * levelMult * gradeMult * awakenMult);
}

export function calcCombatPower(collection: OwnedTower[]): number {
	return collection.reduce((sum, t) => sum + calcTowerPower(t), 0);
}
