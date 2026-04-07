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

/** forest_gate: 입문 — 아키타입 학습 */
export const WAVE_DEFS: WaveDef[] = [
	{
		slotIndex: 1,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 4 }],
	},
	{
		slotIndex: 2,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 8 }],
	},
	{
		slotIndex: 3,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'battle_robot', count: 3 },
			{ unitId: 'heavy_walker', count: 1 },
		],
	},
	{
		slotIndex: 4,
		kind: 'normal',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'stealth_drone', count: 4 },
			{ unitId: 'scout_drone', count: 3 },
		],
	},
	{
		slotIndex: 5,
		kind: 'boss',
		delayAfterClearSec: 5,
		groups: [{ unitId: 'titan', count: 1 }],
	},
	{
		slotIndex: 6,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 6 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 7,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 2 },
		],
	},
	{
		slotIndex: 8,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 4 },
			{ unitId: 'battle_robot', count: 3 },
			{ unitId: 'stealth_drone', count: 2 },
		],
	},
	{
		slotIndex: 9,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 2 },
		],
	},
	{
		slotIndex: 10,
		kind: 'boss',
		delayAfterClearSec: 0,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 2 },
			{ unitId: 'battle_robot', count: 3 },
		],
	},
];

/** lava_fortress: 탱크 중심 — 지속 딜/CC 필요 */
export const LAVA_FORTRESS_WAVES: WaveDef[] = [
	{
		slotIndex: 1,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [{ unitId: 'scout_drone', count: 5 }],
	},
	{
		slotIndex: 2,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'heavy_walker', count: 1 },
		],
	},
	{
		slotIndex: 3,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 5 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 4,
		kind: 'normal',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 3 },
		],
	},
	{
		slotIndex: 5,
		kind: 'boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 2 },
		],
	},
	{
		slotIndex: 6,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'stealth_drone', count: 6 },
			{ unitId: 'scout_drone', count: 4 },
		],
	},
	{
		slotIndex: 7,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 4 },
			{ unitId: 'battle_robot', count: 2 },
		],
	},
	{
		slotIndex: 8,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 4 },
			{ unitId: 'battle_robot', count: 3 },
			{ unitId: 'heavy_walker', count: 2 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 9,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'heavy_walker', count: 4 },
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 2 },
		],
	},
	{
		slotIndex: 10,
		kind: 'boss',
		delayAfterClearSec: 0,
		groups: [
			{ unitId: 'titan', count: 1 },
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
		],
	},
];

/** storm_citadel: 스피드/스텔스 중심 — 빠른 타게팅 필요 */
export const STORM_CITADEL_WAVES: WaveDef[] = [
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
			{ unitId: 'stealth_drone', count: 5 },
			{ unitId: 'scout_drone', count: 3 },
		],
	},
	{
		slotIndex: 3,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'heavy_walker', count: 1 },
		],
	},
	{
		slotIndex: 4,
		kind: 'normal',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'scout_drone', count: 8 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 5,
		kind: 'boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'titan', count: 2 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
	{
		slotIndex: 6,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'stealth_drone', count: 7 },
			{ unitId: 'scout_drone', count: 5 },
		],
	},
	{
		slotIndex: 7,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
		],
	},
	{
		slotIndex: 8,
		kind: 'normal',
		delayAfterClearSec: 3,
		groups: [
			{ unitId: 'scout_drone', count: 6 },
			{ unitId: 'stealth_drone', count: 4 },
			{ unitId: 'battle_robot', count: 3 },
		],
	},
	{
		slotIndex: 9,
		kind: 'pre_boss',
		delayAfterClearSec: 5,
		groups: [
			{ unitId: 'battle_robot', count: 5 },
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	{
		slotIndex: 10,
		kind: 'boss',
		delayAfterClearSec: 0,
		groups: [
			{ unitId: 'titan', count: 2 },
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'battle_robot', count: 4 },
			{ unitId: 'stealth_drone', count: 3 },
		],
	},
];

export const WAVE_SCALING: readonly { hp: number; speed: number }[] = [
	{ hp: 1.0, speed: 1.0 }, // Wave 1  — 성공 경험
	{ hp: 1.0, speed: 1.0 }, // Wave 2  — 여전히 쉬움
	{ hp: 1.1, speed: 1.0 }, // Wave 3  — 미세 증가
	{ hp: 1.2, speed: 1.0 }, // Wave 4  — 약간 도전
	{ hp: 1.5, speed: 1.05 }, // Wave 5  — 중간보스, 본격 상승
	{ hp: 1.8, speed: 1.05 }, // Wave 6
	{ hp: 2.2, speed: 1.1 }, // Wave 7
	{ hp: 2.6, speed: 1.1 }, // Wave 8
	{ hp: 3.0, speed: 1.15 }, // Wave 9  — 최종 러시
	{ hp: 3.5, speed: 1.15 }, // Wave 10 — 최종보스
];

export const WAVE_REGISTRY: Record<string, WaveDef[]> = {
	forest_gate: WAVE_DEFS,
	lava_fortress: LAVA_FORTRESS_WAVES,
	storm_citadel: STORM_CITADEL_WAVES,
};

export function getWavesForMap(mapId: string): WaveDef[] {
	const waves = WAVE_REGISTRY[mapId];
	if (!waves && mapId !== 'forest_gate') {
		console.warn(
			`[getWavesForMap] No wave definitions for map "${mapId}", falling back to forest_gate`,
		);
	}
	return waves ?? WAVE_DEFS;
}

export function getTotalWavesForMap(mapId: string): number {
	return getWavesForMap(mapId).length;
}

export const TOTAL_WAVES = WAVE_DEFS.length;
