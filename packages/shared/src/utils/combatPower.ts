import { enhancementStatMultiplier, GRADE_BONUS } from '../constants/meta';
import { ALL_TOWERS } from '../constants/towers';
import type { OwnedTower, TowerGrade } from '../types/save';

const AWAKENING_MULTIPLIER = [1.0, 1.2, 1.5, 2.0] as const;

export function calcTowerPower(tower: OwnedTower): number {
	const def = ALL_TOWERS.find((t) => t.id === tower.defId);
	if (!def) return 0;
	const baseDmg = def.stats.damage;
	const levelMult = enhancementStatMultiplier(tower.level);
	const gradeMult = 1 + (GRADE_BONUS[tower.grade as TowerGrade] ?? 0);
	const awakenMult = AWAKENING_MULTIPLIER[tower.awakening] ?? 1;
	return Math.round(baseDmg * levelMult * gradeMult * awakenMult);
}

export function calcCombatPower(collection: OwnedTower[]): number {
	return collection.reduce((sum, t) => sum + calcTowerPower(t), 0);
}
