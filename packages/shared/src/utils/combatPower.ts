import { enhancementStatMultiplier, GRADE_BONUS } from '../constants/meta';
import { ALL_TOWERS } from '../constants/towers';
import type { OwnedTower, TowerGrade } from '../types/save';

const AWAKENING_MULTIPLIER = [1.0, 1.2, 1.5, 2.0] as const;

/** 중반 적 아머의 대표값. 피어싱 없는 타워는 실제 피해 계산에서 이만큼 깎인다. */
const REFERENCE_ARMOR = 6;

/** Utility weight for CC / slow effects. Key is special value with % stripped. */
const UTILITY_BASE: Record<string, number> = {
	// Stun
	stun: 15,
	stun_aoe: 25,
	stun_aoe_extended: 40,
	stun_aoe_global: 80,
	// Slow
	slow_30: 10,
	slow_30_aoe: 20,
	slow_40_aoe: 28,
	slow_50_splash: 22,
};

function specialKey(special?: string): string {
	return (special ?? '').replace(/%/g, '');
}

/** `!special` → 피어싱. 실제 TowerSystem.ts:418 의 `armorPierce = !special` 와 동일. */
function isPiercing(special?: string): boolean {
	return !special;
}

export function calcTowerPower(tower: OwnedTower): number {
	const def = ALL_TOWERS.find((t) => t.id === tower.defId);
	if (!def) return 0;

	const { damage, attackSpeed, special } = def.stats;
	const levelMult = enhancementStatMultiplier(tower.level);
	const gradeMult = 1 + (GRADE_BONUS[tower.grade as TowerGrade] ?? 0);
	const awakenMult = AWAKENING_MULTIPLIER[tower.awakening] ?? 1;

	// --- DPS path ---
	let dpsPower = 0;
	if (damage > 0) {
		const effectiveDamage = damage * levelMult * gradeMult;
		const breakthrough = isPiercing(special)
			? effectiveDamage
			: Math.max(0, effectiveDamage - REFERENCE_ARMOR);
		dpsPower = breakthrough * attackSpeed;
	}

	// --- Utility path ---
	const key = specialKey(special);
	const utilityBase = UTILITY_BASE[key] ?? 0;
	// Pure utility towers (damage=0): full weight. Hybrids (damage+slow/splash): half weight.
	let utilityValue: number;
	if (damage === 0) {
		utilityValue = utilityBase > 0 ? utilityBase : 10; // 알 수 없는 유틸 폴백
	} else {
		utilityValue = utilityBase * 0.5;
	}

	return Math.round((dpsPower + utilityValue) * awakenMult);
}

export function calcCombatPower(
	collection: OwnedTower[],
	deckIds?: string[],
): number {
	const towers = deckIds
		? collection.filter((t) => deckIds.includes(t.defId))
		: collection;
	return towers.reduce((sum, t) => sum + calcTowerPower(t), 0);
}
