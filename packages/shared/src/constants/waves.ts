import type { UnitType } from '../types/unit';

export interface WaveGroup {
	unitId: UnitType;
	count: number;
}

export type WaveSlotKind = 'normal' | 'pre_boss' | 'boss';

export interface WaveDef {
	slotIndex: number;
	kind: WaveSlotKind;
	groups: WaveGroup[];
	/** Seconds to wait after this wave is cleared before spawning next */
	delayAfterClearSec: number;
}

/** GDD 6-5: forest_gate 10-wave composition */
export const WAVE_DEFS: WaveDef[] = [
	{
		slotIndex: 1,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 6 }],
	},
	{
		slotIndex: 2,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 6 },
			{ unitId: 'battle_robot', count: 2 },
		],
	},
	{
		slotIndex: 3,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'scout_drone', count: 4 },
		],
	},
	{
		slotIndex: 4,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 5,
		kind: 'boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'battle_robot', count: 3 },
		],
	},
	{
		slotIndex: 6,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 7,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'heavy_walker', count: 2 },
			{ unitId: 'scout_drone', count: 4 },
		],
	},
	{
		slotIndex: 8,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'stealth_drone', count: 6 },
			{ unitId: 'heavy_walker', count: 3 },
		],
	},
	{
		slotIndex: 9,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'heavy_walker', count: 4 },
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 10,
		kind: 'boss',
		delayAfterClearSec: 0,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
];

export const TOTAL_WAVES = WAVE_DEFS.length;
