export interface ScaledUnitStats {
	hp: number;
	speed: number;
	armor: number;
	ccImmunityChance: number;
}

const BAND_MULTIPLIERS: Record<
	number,
	{ hp: number; armor: number; speed: number }
> = {
	1: { hp: 1, armor: 1, speed: 1 },
	2: { hp: 8, armor: 5, speed: 1.2 },
	3: { hp: 50, armor: 20, speed: 1.5 },
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
	const m = BAND_MULTIPLIERS[band]!;
	return {
		hp: Math.round(base.hp * m.hp),
		speed: base.speed * m.speed,
		armor: Math.round(base.armor * m.armor),
		ccImmunityChance: CC_IMMUNITY[band] ?? 0,
	};
}
