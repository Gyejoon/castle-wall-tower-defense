import type { TowerDef } from '../types/tower';

// T1 Common (4 towers)
export const BASE_TOWERS: TowerDef[] = [
	{
		id: 'laser',
		name: '궁수 탑',
		type: 'laser',
		tier: 1,
		stats: { damage: 10, range: 3, attackSpeed: 1.5 },
		cost: 50,
		isPremium: false,
		color: '#c8a04a',
		shape: 'diamond',
	},
	{
		id: 'plasma',
		name: '투석기',
		type: 'plasma',
		tier: 1,
		stats: { damage: 25, range: 2, attackSpeed: 0.8, special: 'splash' },
		cost: 50,
		isPremium: false,
		color: '#8b4513',
		shape: 'hexagon',
	},
	{
		id: 'emp',
		name: '서리 마탑',
		type: 'emp',
		tier: 1,
		stats: { damage: 5, range: 4, attackSpeed: 1.0, special: 'slow_30%' },
		cost: 50,
		isPremium: false,
		color: '#5bc8e8',
		shape: 'circle',
	},
	{
		id: 'shield',
		name: '성기사 제단',
		type: 'shield',
		tier: 1,
		stats: {
			damage: 0,
			range: 2,
			attackSpeed: 0,
			special: 'boost_adjacent_20%',
		},
		cost: 50,
		isPremium: false,
		color: '#f0e080',
		shape: 'shield',
	},
];

// T2 Rare (5 towers)
export const RARE_TOWERS: TowerDef[] = [
	{
		id: 'twin_laser',
		name: '쌍궁 탑',
		type: 'twin_laser',
		tier: 2,
		stats: { damage: 25, range: 4, attackSpeed: 2.0 },
		cost: 0,
		isPremium: false,
		color: '#c8a04a',
		shape: 'star',
	},
	{
		id: 'disruptor',
		name: '눈보라 탑',
		type: 'disruptor',
		tier: 2,
		stats: {
			damage: 15,
			range: 5,
			attackSpeed: 1.2,
			special: 'slow_50%_splash',
		},
		cost: 0,
		isPremium: false,
		color: '#5bc8e8',
		shape: 'star',
	},
	{
		id: 'nova_cannon',
		name: '공성 대포',
		type: 'nova_cannon',
		tier: 2,
		stats: { damage: 60, range: 3, attackSpeed: 0.4, special: 'aoe_2tile' },
		cost: 0,
		isPremium: false,
		color: '#8b4513',
		shape: 'star',
	},
	{
		id: 'fortress',
		name: '수호 탑',
		type: 'fortress',
		tier: 2,
		stats: {
			damage: 15,
			range: 3,
			attackSpeed: 1.0,
			special: 'boost_adjacent_40%',
		},
		cost: 0,
		isPremium: false,
		color: '#f0e080',
		shape: 'star',
	},
	{
		id: 'stasis_field',
		name: '빙하 제단',
		type: 'stasis_field',
		tier: 2,
		stats: {
			damage: 0,
			range: 3,
			attackSpeed: 0,
			special: 'freeze_2s_cooldown_8s',
		},
		cost: 0,
		isPremium: false,
		color: '#a8def0',
		shape: 'star',
	},
];

// T3 Heroic (4 towers)
export const HEROIC_TOWERS: TowerDef[] = [
	{
		id: 'flame_tower',
		name: '화염 탑',
		type: 'flame_tower',
		tier: 3,
		stats: { damage: 40, range: 3, attackSpeed: 1.5, special: 'burn_5dps_3s' },
		cost: 0,
		isPremium: false,
		color: '#e85c2c',
		shape: 'diamond',
	},
	{
		id: 'wind_spire',
		name: '바람의 첨탑',
		type: 'wind_spire',
		tier: 3,
		stats: {
			damage: 20,
			range: 5,
			attackSpeed: 2.5,
			special: 'chain_3targets',
		},
		cost: 0,
		isPremium: false,
		color: '#7ed9a0',
		shape: 'diamond',
	},
	{
		id: 'earth_golem',
		name: '대지 골렘',
		type: 'earth_golem',
		tier: 3,
		stats: { damage: 80, range: 2, attackSpeed: 0.5, special: 'stun_1s' },
		cost: 0,
		isPremium: false,
		color: '#a0856e',
		shape: 'hexagon',
	},
	{
		id: 'holy_shrine',
		name: '신성 제단',
		type: 'holy_shrine',
		tier: 3,
		stats: { damage: 0, range: 3, attackSpeed: 0, special: 'heal_tower_5hps' },
		cost: 0,
		isPremium: false,
		color: '#f0d060',
		shape: 'shield',
	},
];

// T4 Legendary (3 towers)
export const LEGENDARY_TOWERS: TowerDef[] = [
	{
		id: 'dragon_nest',
		name: '용의 둥지',
		type: 'dragon_nest',
		tier: 4,
		stats: { damage: 100, range: 4, attackSpeed: 0.8, special: 'splash_burn' },
		cost: 0,
		isPremium: false,
		color: '#d94040',
		shape: 'star',
	},
	{
		id: 'arcane_spire',
		name: '비전 첨탑',
		type: 'arcane_spire',
		tier: 4,
		stats: { damage: 50, range: 6, attackSpeed: 1.5, special: 'ignore_armor' },
		cost: 0,
		isPremium: false,
		color: '#9060e0',
		shape: 'star',
	},
	{
		id: 'world_tree',
		name: '세계수',
		type: 'world_tree',
		tier: 4,
		stats: { damage: 30, range: 4, attackSpeed: 1.0, special: 'boost_all_30%' },
		cost: 0,
		isPremium: false,
		color: '#4aad5e',
		shape: 'star',
	},
];

// T5 God (2 towers)
export const GOD_TOWERS: TowerDef[] = [
	{
		id: 'celestial',
		name: '천상의 탑',
		type: 'celestial',
		tier: 5,
		stats: {
			damage: 200,
			range: 5,
			attackSpeed: 1.0,
			special: 'splash_slow_burn',
		},
		cost: 0,
		isPremium: false,
		color: '#ffe870',
		shape: 'star',
	},
	{
		id: 'divine_throne',
		name: '신의 옥좌',
		type: 'divine_throne',
		tier: 5,
		stats: {
			damage: 0,
			range: 999,
			attackSpeed: 0,
			special: 'boost_all_50%_heal',
		},
		cost: 0,
		isPremium: false,
		color: '#fff0b0',
		shape: 'star',
	},
];

export const ALL_TOWERS: TowerDef[] = [
	...BASE_TOWERS,
	...RARE_TOWERS,
	...HEROIC_TOWERS,
	...LEGENDARY_TOWERS,
	...GOD_TOWERS,
];

export function getTowersByTier(tier: number): TowerDef[] {
	return ALL_TOWERS.filter((t) => t.tier === tier);
}
