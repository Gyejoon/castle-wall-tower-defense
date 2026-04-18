import { enhancementStatMultiplier } from '../constants/meta';
import { getTowerById } from '../constants/towers';
import type { OwnedTower } from '../types/save';

const AWAKENING_MULTIPLIER = [1.0, 1.2, 1.5, 2.0] as const;

/** 중반 적 아머의 대표값. 피어싱 없는 타워는 실제 피해 계산에서 이만큼 깎인다. */
const REFERENCE_ARMOR = 6;

/**
 * Utility weight for CC / slow effects. Key is a normalized special tag.
 * After Phase 1 the special strings are more varied (e.g. `stun_300ms`,
 * `slow_45%`, `splash_1.5`), so the key used for lookup is the *prefix*
 * (stun / slow / splash) — a coarse but phase-appropriate approximation.
 */
const UTILITY_BASE: Record<string, number> = {
	stun: 20,
	slow: 15,
	splash: 10,
};

function utilityKey(special: string): string {
	if (special.startsWith('stun')) return 'stun';
	if (special.startsWith('slow')) return 'slow';
	if (special.startsWith('splash')) return 'splash';
	return '';
}

function isPiercing(special?: string): boolean {
	return !special;
}

export function calcTowerPower(tower: OwnedTower): number {
	const def = getTowerById(tower.defId);
	if (!def) return 0;

	const { damage, attackSpeed, special } = def.stats;
	const levelMult = enhancementStatMultiplier(tower.level);
	const awakenMult = AWAKENING_MULTIPLIER[tower.awakening] ?? 1;

	// --- DPS path ---
	let dpsPower = 0;
	if (damage > 0) {
		const effectiveDamage = damage * levelMult;
		const breakthrough = isPiercing(special)
			? effectiveDamage
			: Math.max(0, effectiveDamage - REFERENCE_ARMOR);
		dpsPower = breakthrough * attackSpeed;
	}

	// --- Utility path ---
	const key = special ? utilityKey(special) : '';
	const utilityBase = UTILITY_BASE[key] ?? 0;
	let utilityValue: number;
	if (damage === 0) {
		utilityValue = utilityBase > 0 ? utilityBase : 10;
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
