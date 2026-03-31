import type { UnitType } from '../types/unit';

export interface WaveGroup {
	unitId: UnitType;
	count: number;
}

export type WaveSlotKind =
	| 'normal'
	| 'pre_boss'
	| 'boss'
	| 'sudden_death'
	| 'hard_end';

export type PressureTier = 1 | 2 | 3;

export type PressurePacketId =
	| 'scout_pressure'
	| 'mixed_pressure'
	| 'breach_pressure';

export interface PressurePacketDef {
	id: PressurePacketId;
	name: string;
	tier: PressureTier;
	groups: WaveGroup[];
}

export interface WaveDef {
	slotIndex: number;
	startAtSec: number;
	kind: WaveSlotKind;
	pressureEnabled: boolean;
	pressureTier: PressureTier | null;
	groups: WaveGroup[];
}

export interface PressureWindowDef {
	startAtSec: number;
	endAtSec: number;
	tier: PressureTier;
}

export const SLOT_DURATION_SEC = 30;
export const BOSS_WARNING_AT_SECS = [210, 390] as const;
export const BOSS_SLOT_AT_SECS = [240, 420] as const;
export const SUDDEN_DEATH_AT_SEC = 540;
export const HARD_END_AT_SEC = 600;

export const PRESSURE_TOKEN_CAP = 2;
export const PRESSURE_CLEAR_DEADLINE_OFFSET_SEC = 8;
export const PRESSURE_LOCK_AT_SEC = 535;
export const PRESSURE_EXPIRES_AT_SEC = SUDDEN_DEATH_AT_SEC;

export const PRESSURE_ACTIVE_WINDOWS: PressureWindowDef[] = [
	{ startAtSec: 60, endAtSec: 210, tier: 1 },
	{ startAtSec: 270, endAtSec: 390, tier: 2 },
	{ startAtSec: 450, endAtSec: 535, tier: 3 },
];

export const PRESSURE_PACKET_DEFS: Record<PressurePacketId, PressurePacketDef> =
	{
		scout_pressure: {
			id: 'scout_pressure',
			name: '정찰 압박',
			tier: 1,
			groups: [{ unitId: 'scout_drone', count: 4 }],
		},
		mixed_pressure: {
			id: 'mixed_pressure',
			name: '혼합 압박',
			tier: 2,
			groups: [
				{ unitId: 'scout_drone', count: 4 },
				{ unitId: 'stealth_drone', count: 1 },
			],
		},
		breach_pressure: {
			id: 'breach_pressure',
			name: '돌파 압박',
			tier: 3,
			groups: [
				{ unitId: 'battle_robot', count: 2 },
				{ unitId: 'stealth_drone', count: 1 },
			],
		},
	};

export const PRESSURE_PACKET_BY_TIER: Record<PressureTier, PressurePacketDef> =
	{
		1: PRESSURE_PACKET_DEFS.scout_pressure,
		2: PRESSURE_PACKET_DEFS.mixed_pressure,
		3: PRESSURE_PACKET_DEFS.breach_pressure,
	};

export const WAVE_DEFS: WaveDef[] = [
	{
		slotIndex: 1,
		startAtSec: 0,
		kind: 'normal',
		pressureEnabled: false,
		pressureTier: null,
		groups: [{ unitId: 'scout_drone', count: 6 }],
	},
	{
		slotIndex: 2,
		startAtSec: 30,
		kind: 'normal',
		pressureEnabled: false,
		pressureTier: null,
		groups: [
			{ unitId: 'scout_drone', count: 8 },
			{ unitId: 'battle_robot', count: 1 },
		],
	},
	{
		slotIndex: 3,
		startAtSec: 60,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 1,
		groups: [{ unitId: 'battle_robot', count: 4 }],
	},
	{
		slotIndex: 4,
		startAtSec: 90,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 1,
		groups: [
			{ unitId: 'scout_drone', count: 12 },
			{ unitId: 'battle_robot', count: 2 },
		],
	},
	{
		slotIndex: 5,
		startAtSec: 120,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 1,
		groups: [
			{ unitId: 'battle_robot', count: 6 },
			{ unitId: 'heavy_walker', count: 1 },
		],
	},
	{
		slotIndex: 6,
		startAtSec: 150,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 1,
		groups: [
			{ unitId: 'stealth_drone', count: 3 },
			{ unitId: 'battle_robot', count: 5 },
		],
	},
	{
		slotIndex: 7,
		startAtSec: 180,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 1,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'scout_drone', count: 15 },
		],
	},
	{
		slotIndex: 8,
		startAtSec: 210,
		kind: 'pre_boss',
		pressureEnabled: false,
		pressureTier: null,
		groups: [
			{ unitId: 'stealth_drone', count: 5 },
			{ unitId: 'battle_robot', count: 8 },
		],
	},
	{
		slotIndex: 9,
		startAtSec: 240,
		kind: 'boss',
		pressureEnabled: false,
		pressureTier: null,
		groups: [{ unitId: 'titan', count: 1 }],
	},
	{
		slotIndex: 10,
		startAtSec: 270,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 2,
		groups: [
			{ unitId: 'heavy_walker', count: 4 },
			{ unitId: 'stealth_drone', count: 3 },
			{ unitId: 'battle_robot', count: 6 },
		],
	},
	{
		slotIndex: 11,
		startAtSec: 300,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 2,
		groups: [
			{ unitId: 'heavy_walker', count: 6 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 12,
		startAtSec: 330,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 2,
		groups: [
			{ unitId: 'scout_drone', count: 25 },
			{ unitId: 'battle_robot', count: 10 },
		],
	},
	{
		slotIndex: 13,
		startAtSec: 360,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 2,
		groups: [
			{ unitId: 'heavy_walker', count: 8 },
			{ unitId: 'battle_robot', count: 12 },
		],
	},
	{
		slotIndex: 14,
		startAtSec: 390,
		kind: 'pre_boss',
		pressureEnabled: false,
		pressureTier: null,
		groups: [
			{ unitId: 'stealth_drone', count: 8 },
			{ unitId: 'heavy_walker', count: 5 },
		],
	},
	{
		slotIndex: 15,
		startAtSec: 420,
		kind: 'boss',
		pressureEnabled: false,
		pressureTier: null,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 2 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 16,
		startAtSec: 450,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 3,
		groups: [
			{ unitId: 'titan', count: 2 },
			{ unitId: 'heavy_walker', count: 5 },
		],
	},
	{
		slotIndex: 17,
		startAtSec: 480,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 3,
		groups: [
			{ unitId: 'titan', count: 2 },
			{ unitId: 'heavy_walker', count: 6 },
			{ unitId: 'stealth_drone', count: 6 },
		],
	},
	{
		slotIndex: 18,
		startAtSec: 510,
		kind: 'normal',
		pressureEnabled: true,
		pressureTier: 3,
		groups: [
			{ unitId: 'titan', count: 3 },
			{ unitId: 'heavy_walker', count: 8 },
			{ unitId: 'battle_robot', count: 10 },
		],
	},
	{
		slotIndex: 19,
		startAtSec: 540,
		kind: 'sudden_death',
		pressureEnabled: false,
		pressureTier: null,
		groups: [
			{ unitId: 'scout_drone', count: 30 },
			{ unitId: 'stealth_drone', count: 10 },
			{ unitId: 'battle_robot', count: 15 },
		],
	},
	{
		slotIndex: 20,
		startAtSec: 570,
		kind: 'sudden_death',
		pressureEnabled: false,
		pressureTier: null,
		groups: [
			{ unitId: 'titan', count: 4 },
			{ unitId: 'heavy_walker', count: 10 },
			{ unitId: 'stealth_drone', count: 8 },
			{ unitId: 'battle_robot', count: 15 },
		],
	},
	{
		slotIndex: 21,
		startAtSec: 600,
		kind: 'hard_end',
		pressureEnabled: false,
		pressureTier: null,
		groups: [],
	},
];

export const TOTAL_WAVES = WAVE_DEFS.filter(
	(slot) => slot.kind !== 'hard_end',
).length;

export function getWaveSlotAtTime(elapsedSec: number): WaveDef {
	const normalized = Math.max(0, elapsedSec);
	for (let index = WAVE_DEFS.length - 1; index >= 0; index -= 1) {
		if (normalized >= WAVE_DEFS[index].startAtSec) {
			return WAVE_DEFS[index];
		}
	}

	return WAVE_DEFS[0];
}

export function getNextEligiblePressureSlot(
	fromSlotIndex: number,
): WaveDef | null {
	return (
		WAVE_DEFS.find(
			(slot) =>
				slot.slotIndex > fromSlotIndex &&
				slot.kind === 'normal' &&
				slot.pressureEnabled,
		) ?? null
	);
}
