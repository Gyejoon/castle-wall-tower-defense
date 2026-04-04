import type { UnitDef } from '../types/unit';

export const UNITS: UnitDef[] = [
	{
		id: 'scout_drone',
		name: '고블린 정찰병',
		type: 'scout_drone',
		stats: { hp: 30, speed: 3.0, armor: 0 },

		bounty: 5,
		isPremium: false,
	},
	{
		id: 'battle_robot',
		name: '오크 전사',
		type: 'battle_robot',
		stats: { hp: 80, speed: 1.5, armor: 2 },

		bounty: 12,
		isPremium: false,
	},
	{
		id: 'heavy_walker',
		name: '돌 트롤',
		type: 'heavy_walker',
		stats: { hp: 200, speed: 0.8, armor: 5 },

		bounty: 25,
		isPremium: false,
	},
	{
		id: 'stealth_drone',
		name: '그림자 암살자',
		type: 'stealth_drone',
		stats: { hp: 50, speed: 2.5, armor: 0 },

		bounty: 18,
		isPremium: false,
	},
	{
		id: 'titan',
		name: '고대 드래곤',
		type: 'titan',
		stats: { hp: 500, speed: 0.5, armor: 10 },

		bounty: 60,
		isPremium: false,
	},
];
