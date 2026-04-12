export interface ScaledUnitStats {
	hp: number;
	speed: number;
	armor: number;
	bountyMultiplier: number;
	ccImmunityChance: number;
}

const BAND_MULTIPLIERS: Record<
	number,
	{ hp: number; armor: number; speed: number; bounty: number }
> = {
	1: { hp: 1, armor: 1, speed: 1, bounty: 1 },
	2: { hp: 6, armor: 4, speed: 1.15, bounty: 3 },
	3: { hp: 30, armor: 12, speed: 1.35, bounty: 8 },
};

const CC_IMMUNITY: Record<number, number> = { 1: 0, 2: 0.1, 3: 0.2 };

export function getLevelBand(level: number): number {
	return Math.min(3, Math.max(1, Math.ceil(level / 10)));
}

export function scaleUnitStats(
	base: { hp: number; speed: number; armor: number },
	level: number,
): ScaledUnitStats {
	const band = getLevelBand(level);
	const m = BAND_MULTIPLIERS[
		band
	] as (typeof BAND_MULTIPLIERS)[keyof typeof BAND_MULTIPLIERS];
	return {
		hp: Math.round(base.hp * m.hp),
		speed: base.speed * m.speed,
		armor: Math.round(base.armor * m.armor),
		bountyMultiplier: m.bounty,
		ccImmunityChance: CC_IMMUNITY[band] ?? 0,
	};
}
