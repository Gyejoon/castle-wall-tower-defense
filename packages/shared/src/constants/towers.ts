import type { TowerDef, TowerFamily, TowerId } from '../types/tower';

/**
 * Tier → cost scale used by the new family/tier model. T1 entries are the
 * ones that appear in the random summon pool (cost=20 matches
 * PHASE_A_SUMMON_COST); T2+ are reached via merging, so their "cost" is
 * informational (sale refund scaling).
 */
const TIER_COST: Record<number, number> = {
	1: 20,
	2: 40,
	3: 80,
	4: 160,
	5: 320,
	6: 640,
};

/** Family → base visual color (hex). Tier-specific overrides live per-entry. */
const FAMILY_COLOR: Record<TowerFamily, string> = {
	archer: '#c8a04a', // orange-gold
	siege: '#8b4513', // brown
	frost: '#5bc8e8', // cyan
	stun: '#f0d060', // gold
	hybrid: '#9060e0', // purple
	ultimate: '#ffe870', // rainbow-ish gold
};

/** Family → base shape. Ultimate/hybrid override to star. */
const FAMILY_SHAPE: Record<
	TowerFamily,
	'diamond' | 'circle' | 'hexagon' | 'shield' | 'star'
> = {
	archer: 'diamond',
	siege: 'hexagon',
	frost: 'circle',
	stun: 'shield',
	hybrid: 'star',
	ultimate: 'star',
};

export const TOWER_DEFS: readonly TowerDef[] = [
	// ── Archer family (attack, pierce-style) ─────────────────────
	{
		id: 'archer',
		name: '궁수탑',
		family: 'archer',
		tier: 1,
		stats: { damage: 20, range: 4, attackSpeed: 1.0, projectileSpeed: 8 },
		cost: TIER_COST[1],
		element: 'neutral',
		isPremium: false,
		color: FAMILY_COLOR.archer,
		shape: FAMILY_SHAPE.archer,
	},
	{
		id: 'wind_spire',
		name: '바람첨탑',
		family: 'archer',
		tier: 2,
		stats: { damage: 35, range: 4.5, attackSpeed: 1.2, projectileSpeed: 8 },
		cost: TIER_COST[2],
		element: 'lightning',
		isPremium: false,
		color: '#7ed9a0',
		shape: FAMILY_SHAPE.archer,
	},
	{
		id: 'flame_tower',
		name: '화염탑',
		family: 'archer',
		tier: 3,
		stats: { damage: 60, range: 5, attackSpeed: 1.3 },
		cost: TIER_COST[3],
		element: 'fire',
		isPremium: false,
		color: '#e85c2c',
		shape: FAMILY_SHAPE.archer,
	},
	{
		id: 'arcane_spire',
		name: '비전첨탑',
		family: 'archer',
		tier: 4,
		stats: { damage: 100, range: 5.5, attackSpeed: 1.5 },
		cost: TIER_COST[4],
		element: 'lightning',
		isPremium: false,
		color: '#9060e0',
		shape: 'star',
	},

	// ── Siege family (splash) ────────────────────────────────────
	{
		id: 'nova_cannon',
		name: '투석기',
		family: 'siege',
		tier: 1,
		stats: {
			damage: 30,
			range: 3.5,
			attackSpeed: 0.5,
			special: 'splash_1.2',
			projectileSpeed: 3,
		},
		cost: TIER_COST[1],
		element: 'neutral',
		isPremium: false,
		color: FAMILY_COLOR.siege,
		shape: FAMILY_SHAPE.siege,
	},
	{
		id: 'fortress',
		name: '공성대포',
		family: 'siege',
		tier: 2,
		stats: {
			damage: 55,
			range: 4,
			attackSpeed: 0.6,
			special: 'splash_1.5',
			projectileSpeed: 3,
		},
		cost: TIER_COST[2],
		element: 'fire',
		isPremium: false,
		color: FAMILY_COLOR.siege,
		shape: FAMILY_SHAPE.siege,
	},
	{
		id: 'earth_golem',
		name: '대지골렘',
		family: 'siege',
		tier: 3,
		stats: {
			damage: 90,
			range: 4.5,
			attackSpeed: 0.7,
			special: 'splash_1.8',
			projectileSpeed: 3.5,
		},
		cost: TIER_COST[3],
		element: 'neutral',
		isPremium: false,
		color: '#a0856e',
		shape: FAMILY_SHAPE.siege,
	},
	{
		id: 'celestial',
		name: '천상의탑',
		family: 'siege',
		tier: 4,
		stats: {
			damage: 150,
			range: 5,
			attackSpeed: 0.8,
			special: 'splash_2.2',
			projectileSpeed: 6,
		},
		cost: TIER_COST[4],
		element: 'lightning',
		isPremium: false,
		color: '#ffe870',
		shape: 'star',
	},

	// ── Frost family (slow) ──────────────────────────────────────
	{
		id: 'emp',
		name: '눈보라탑',
		family: 'frost',
		tier: 1,
		stats: { damage: 8, range: 3.5, attackSpeed: 0.8, special: 'slow_30%' },
		cost: TIER_COST[1],
		element: 'water',
		isPremium: false,
		color: FAMILY_COLOR.frost,
		shape: FAMILY_SHAPE.frost,
	},
	{
		id: 'stasis_field',
		name: '서리마탑',
		family: 'frost',
		tier: 2,
		stats: { damage: 14, range: 4, attackSpeed: 0.9, special: 'slow_45%' },
		cost: TIER_COST[2],
		element: 'water',
		isPremium: false,
		color: '#a8def0',
		shape: FAMILY_SHAPE.frost,
	},
	{
		id: 'disruptor',
		name: '빙하제단',
		family: 'frost',
		tier: 3,
		stats: { damage: 24, range: 4.5, attackSpeed: 1.0, special: 'slow_60%' },
		cost: TIER_COST[3],
		element: 'water',
		isPremium: false,
		color: '#5bc8e8',
		shape: FAMILY_SHAPE.frost,
	},
	{
		id: 'world_tree',
		name: '세계수',
		family: 'frost',
		tier: 4,
		stats: { damage: 40, range: 5, attackSpeed: 1.1, special: 'slow_75%' },
		cost: TIER_COST[4],
		element: 'neutral',
		isPremium: false,
		color: '#4aad5e',
		shape: 'star',
	},

	// ── Stun family (crowd control) ──────────────────────────────
	{
		id: 'shield',
		name: '성기사제단',
		family: 'stun',
		tier: 1,
		stats: { damage: 5, range: 3, attackSpeed: 0.5, special: 'stun_300ms' },
		cost: TIER_COST[1],
		element: 'neutral',
		isPremium: false,
		color: FAMILY_COLOR.stun,
		shape: FAMILY_SHAPE.stun,
	},
	{
		id: 'twin_archer',
		name: '수호탑',
		family: 'stun',
		tier: 2,
		stats: { damage: 10, range: 3.5, attackSpeed: 0.6, special: 'stun_500ms' },
		cost: TIER_COST[2],
		element: 'neutral',
		isPremium: false,
		color: FAMILY_COLOR.stun,
		shape: FAMILY_SHAPE.stun,
	},
	{
		id: 'holy_shrine',
		name: '신성제단',
		family: 'stun',
		tier: 3,
		stats: { damage: 18, range: 4, attackSpeed: 0.7, special: 'stun_800ms' },
		cost: TIER_COST[3],
		element: 'neutral',
		isPremium: false,
		color: '#f0e080',
		shape: FAMILY_SHAPE.stun,
	},
	{
		id: 'divine_throne',
		name: '신의 옥좌',
		family: 'stun',
		tier: 4,
		stats: {
			damage: 30,
			range: 4.5,
			attackSpeed: 0.8,
			special: 'stun_1200ms',
		},
		cost: TIER_COST[4],
		element: 'neutral',
		isPremium: false,
		color: '#fff0b0',
		shape: 'star',
	},

	// ── Hybrid T5 (two T4 families fused) ────────────────────────
	{
		id: 'hybrid_ab',
		name: '비전포성',
		family: 'hybrid',
		tier: 5,
		stats: {
			damage: 200,
			range: 6,
			attackSpeed: 1.4,
			special: 'splash_1.6',
			projectileSpeed: 6,
		},
		cost: TIER_COST[5],
		element: 'lightning',
		isPremium: false,
		color: FAMILY_COLOR.hybrid,
		shape: FAMILY_SHAPE.hybrid,
	},
	{
		id: 'hybrid_cd',
		name: '동결의군림',
		family: 'hybrid',
		tier: 5,
		stats: {
			damage: 80,
			range: 5.5,
			attackSpeed: 1.2,
			special: 'slow_80%_stun_600ms',
		},
		cost: TIER_COST[5],
		element: 'water',
		isPremium: false,
		color: '#a0d0ff',
		shape: FAMILY_SHAPE.hybrid,
	},

	// ── Ultimate T6 ──────────────────────────────────────────────
	{
		id: 'ultimate',
		name: '세계의 끝',
		family: 'ultimate',
		tier: 6,
		stats: {
			damage: 500,
			range: 7,
			attackSpeed: 1.6,
			special: 'splash_2.5_slow_90%_stun_1500ms',
		},
		cost: TIER_COST[6],
		element: 'neutral',
		isPremium: true,
		color: FAMILY_COLOR.ultimate,
		shape: FAMILY_SHAPE.ultimate,
	},
];

/** Legacy alias — prefer TOWER_DEFS. Kept so callers that still import
 *  ALL_TOWERS don't break in this phase. */
export const ALL_TOWERS: readonly TowerDef[] = TOWER_DEFS;

export function getTowersByFamily(family: TowerFamily): TowerDef[] {
	return TOWER_DEFS.filter((t) => t.family === family);
}

export function getTowerById(id: string): TowerDef | undefined {
	return TOWER_DEFS.find((t) => t.id === id);
}

export function getTowersByTier(tier: number): TowerDef[] {
	return TOWER_DEFS.filter((t) => t.tier === tier);
}

/**
 * Merge chain:
 *   - Same-family Tn+Tn → T(n+1) for n ∈ {1,2,3} (4 families × 3 = 12 keys)
 *   - T4 across families → T5 hybrids (archer↔siege → hybrid_ab,
 *     frost↔stun → hybrid_cd) — keyed by sorted `${idA}+${idB}`; commuted
 *     keys are populated below so either order resolves.
 *   - hybrid_ab + hybrid_cd → ultimate (also commuted).
 */
export const MERGE_CHAIN: Record<string, TowerId> = {
	// archer family
	archer_1_same: 'wind_spire',
	archer_2_same: 'flame_tower',
	archer_3_same: 'arcane_spire',
	// siege family
	siege_1_same: 'fortress',
	siege_2_same: 'earth_golem',
	siege_3_same: 'celestial',
	// frost family
	frost_1_same: 'stasis_field',
	frost_2_same: 'disruptor',
	frost_3_same: 'world_tree',
	// stun family
	stun_1_same: 'twin_archer',
	stun_2_same: 'holy_shrine',
	stun_3_same: 'divine_throne',
	// T4 cross-family hybrids
	'arcane_spire+celestial': 'hybrid_ab',
	'celestial+arcane_spire': 'hybrid_ab',
	'world_tree+divine_throne': 'hybrid_cd',
	'divine_throne+world_tree': 'hybrid_cd',
	// Ultimate
	'hybrid_ab+hybrid_cd': 'ultimate',
	'hybrid_cd+hybrid_ab': 'ultimate',
};

/**
 * Resolve the result of merging two towers.
 *
 * Rules:
 *   1. Same family + same tier, tier < 4 → same-family upgrade
 *   2. Otherwise look up `${idA}+${idB}` in MERGE_CHAIN (commuted keys)
 *   3. Otherwise null (not a valid merge)
 */
export function resolveMerge(
	towerIdA: string,
	tierA: number,
	familyA: TowerFamily,
	towerIdB: string,
	tierB: number,
	familyB: TowerFamily,
): TowerId | null {
	if (familyA === familyB && tierA === tierB && tierA < 4) {
		return MERGE_CHAIN[`${familyA}_${tierA}_same`] ?? null;
	}
	return MERGE_CHAIN[`${towerIdA}+${towerIdB}`] ?? null;
}
