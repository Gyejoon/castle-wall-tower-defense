import type { ElementType } from '../types/tower';

export type { ElementType } from '../types/tower';

export const ELEMENT_MATCHUP: Record<
	ElementType,
	Record<ElementType, number>
> = {
	fire: { fire: 1.0, water: 0.7, lightning: 1.3, neutral: 1.0 },
	water: { fire: 1.3, water: 1.0, lightning: 0.7, neutral: 1.0 },
	lightning: { fire: 0.7, water: 1.3, lightning: 1.0, neutral: 1.0 },
	neutral: { fire: 1.0, water: 1.0, lightning: 1.0, neutral: 1.0 },
};

export function getElementMultiplier(
	attackElement: ElementType,
	defenseElement: ElementType,
): number {
	return ELEMENT_MATCHUP[attackElement][defenseElement];
}

export const ELEMENT_TINT_COLORS: Record<ElementType, number> = {
	fire: 0xe74c3c,
	water: 0x3498db,
	lightning: 0xf39c12,
	neutral: 0xc8a04a,
};

export interface CcAuraConfig {
	readonly cooldownMs: number;
	readonly durationMs: number;
	readonly aoe: boolean;
}

export const CC_AURA_CONFIGS: Record<string, CcAuraConfig> = {
	stun: { cooldownMs: 3000, durationMs: 1000, aoe: false },
	stun_aoe: { cooldownMs: 3000, durationMs: 1000, aoe: true },
	stun_aoe_extended: { cooldownMs: 4000, durationMs: 1500, aoe: true },
	stun_aoe_global: { cooldownMs: 7000, durationMs: 2000, aoe: true },
	slow_30_aoe: { cooldownMs: 2000, durationMs: 1500, aoe: true },
};
