import type { UnitDef } from '../types/unit';

/**
 * Phase 11 [F16] CC guardrails — minimum normalised speed multiplier any
 * unit can be slowed to. Slow effects multiply `baseSpeed * (1 - strength)`,
 * so without a floor a stacked frost setup could trivially freeze a wave at
 * `0` speed and trivialise lane management. 0.15 keeps strong frost meaningful
 * (a heavy_walker at base 0.8 t/s still moves at 0.12 t/s) without removing
 * the threat that a slowed-but-moving boss still exists.
 */
export const MIN_MOVE_SPEED = 0.15;

/**
 * Phase 11 [F16] — post-stun immunity window (ms). After a stun ends the unit
 * cannot be re-stunned for this duration; prevents stun-lock from chaining
 * shield + holy_shrine + divine_throne towers. Slows are unaffected.
 */
export const STUN_IMMUNITY_WINDOW_MS = 2000;

export const UNITS: UnitDef[] = [
	{
		id: 'scout_drone',
		name: '고블린 정찰병',
		type: 'scout_drone',
		stats: { hp: 30, speed: 3.0, armor: 0 },
		element: 'neutral',
		bounty: 5,
		isPremium: false,
	},
	{
		id: 'battle_robot',
		name: '오크 전사',
		type: 'battle_robot',
		stats: { hp: 80, speed: 1.5, armor: 5 },
		element: 'neutral',
		bounty: 12,
		isPremium: false,
	},
	{
		id: 'heavy_walker',
		name: '돌 트롤',
		type: 'heavy_walker',
		stats: { hp: 200, speed: 0.8, armor: 12 },
		element: 'fire',
		bounty: 25,
		isPremium: false,
	},
	{
		id: 'stealth_drone',
		name: '그림자 암살자',
		type: 'stealth_drone',
		stats: { hp: 50, speed: 2.5, armor: 0 },
		element: 'lightning',
		bounty: 18,
		isPremium: false,
	},
	{
		id: 'dragon',
		name: '고대 드래곤',
		type: 'dragon',
		// Wave 50 final boss. Flies so it ignores ground collisions,
		// resists CC heavily, and hits the biggest base HP in the pool so
		// family upgrades + ultimate merges are the only real answer.
		stats: { hp: 60000, speed: 0.6, armor: 35 },
		element: 'fire',
		bounty: 1500,
		isPremium: false,
		flying: true,
		bossBehaviorId: 'dragon',
		bossCcResist: 0.8,
	},
	// W2 — Forge
	{
		id: 'flame_imp',
		name: '화염 임프',
		type: 'flame_imp',
		stats: { hp: 80, speed: 2.2, armor: 0 },
		element: 'fire',
		bounty: 12,
		isPremium: false,
	},
	{
		id: 'lava_golem',
		name: '용암 골렘',
		type: 'lava_golem',
		stats: { hp: 900, speed: 0.6, armor: 30 },
		element: 'fire',
		bounty: 80,
		isPremium: false,
	},
	// W3 — Tower (arcane rendered as lightning element)
	{
		id: 'arcane_mage',
		name: '마법사 유닛',
		type: 'arcane_mage',
		stats: { hp: 180, speed: 1.0, armor: 5 },
		element: 'lightning',
		bounty: 30,
		isPremium: false,
		specialBehavior: 'ranged_tower_attack',
		specialParams: { range: 2, damage: 25, cooldownMs: 3000 },
	},
	{
		id: 'mana_shield',
		name: '마력 방패병',
		type: 'mana_shield',
		stats: { hp: 250, speed: 0.9, armor: 10 },
		element: 'lightning',
		bounty: 45,
		isPremium: false,
		specialBehavior: 'damage_shield',
		specialParams: { shieldHp: 300 },
	},
	// Bosses
	{
		id: 'orc_warlord',
		name: '오크 전쟁 대장',
		type: 'orc_warlord',
		stats: { hp: 2000, speed: 0.8, armor: 10 },
		element: 'neutral',
		bounty: 300,
		isPremium: false,
		bossBehaviorId: 'orc_warlord',
		bossCcResist: 0.5,
	},
	{
		id: 'forge_master',
		name: '단조장의 군주',
		type: 'forge_master',
		stats: { hp: 5000, speed: 0.7, armor: 15 },
		element: 'fire',
		bounty: 500,
		isPremium: false,
		bossBehaviorId: 'forge_master',
		bossCcResist: 0.7,
	},
	{
		id: 'corrupted_archmage',
		name: '타락한 대마법사',
		type: 'corrupted_archmage',
		stats: { hp: 25000, speed: 0.8, armor: 30 },
		element: 'lightning',
		bounty: 800,
		isPremium: false,
		bossBehaviorId: 'corrupted_archmage',
		bossCcResist: 0.7, // nerfed from 1.0 (full immune)
		// Effective CC application at W3 (CC_IMMUNITY[band3]=0.2 + this 0.7 = 0.9 resist): ~10% chance.
		// To raise, lower this value or adjust difficulty ccResist.
	},
];
