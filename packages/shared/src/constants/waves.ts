import type { UnitType } from '../types/unit';

export interface WaveGroup {
	unitId: UnitType;
	count: number;
}

export type WaveSlotKind = 'normal' | 'boss';

export interface WaveDef {
	slotIndex: number;
	kind: WaveSlotKind;
	groups: WaveGroup[];
	/** Seconds to wait after this wave is cleared before spawning next */
	delayAfterClearSec: number;
}

export const WAVE_SCALING: readonly { hp: number; speed: number }[] = [
	{ hp: 1.0, speed: 1.0 }, // Wave 1  — 성공 경험
	{ hp: 1.0, speed: 1.0 }, // Wave 2  — 여전히 쉬움
	{ hp: 1.1, speed: 1.0 }, // Wave 3  — 미세 증가
	{ hp: 1.2, speed: 1.0 }, // Wave 4  — 약간 도전
	{ hp: 1.3, speed: 1.0 }, // Wave 5  — 본격 상승
	{ hp: 1.4, speed: 1.05 }, // Wave 6
	{ hp: 1.6, speed: 1.05 }, // Wave 7
	{ hp: 1.8, speed: 1.1 }, // Wave 8
	{ hp: 2.0, speed: 1.1 }, // Wave 9  — 최종 러시
	{ hp: 2.2, speed: 1.1 }, // Wave 10 — 첫 보스
];

/**
 * Wave scaling for any slot (1..infinity). Uses WAVE_SCALING table for
 * slots 1-10 and a linear escalation formula beyond, so Phase A's endless
 * wave generator keeps ramping difficulty instead of silently plateauing
 * when the table runs out.
 *
 * Formula beyond slot 10: hp grows +0.7 per slot (capped soft), speed
 * grows +0.02 per slot capped at 1.6.
 */
export function getWaveScaling(slot: number): { hp: number; speed: number } {
	if (slot <= 0) return { hp: 1, speed: 1 };
	if (slot <= WAVE_SCALING.length) {
		return WAVE_SCALING[slot - 1];
	}
	const over = slot - WAVE_SCALING.length;
	const lastEntry = WAVE_SCALING[WAVE_SCALING.length - 1];
	return {
		hp: lastEntry.hp + over * 0.35,
		speed: Math.min(lastEntry.speed + over * 0.02, 1.6),
	};
}

/**
 * Phase A endless wave generator. Boss every 10 waves (alternating
 * orc_warlord and forge_master), unit count grows linearly with slot
 * index, and the composition progressively introduces tougher units
 * (battle_robot @ slot 4, heavy_walker @ slot 9, stealth_drone @ slot 14).
 *
 * Called once at module load with count=50, which combined with
 * getWaveScaling's linear HP ramp means players naturally die somewhere
 * in wave 15~35 with casual play and wave 30~45 with optimized merges.
 * A 50-wave cap means "practically infinite" for a single session
 * without introducing runtime wave mutation in WaveSystem.
 */
export function generatePhaseAWaves(count: number): WaveDef[] {
	const UNITS_PER_WAVE = 30;
	const waves: WaveDef[] = [];
	for (let i = 1; i <= count; i++) {
		const isBoss = i % 10 === 0;
		if (isBoss) {
			const bossId =
				Math.floor(i / 10) % 2 === 1 ? 'orc_warlord' : 'forge_master';
			waves.push({
				slotIndex: i,
				kind: 'boss',
				delayAfterClearSec: 5,
				groups: [
					{ unitId: bossId, count: 1 },
					{ unitId: 'battle_robot', count: 4 },
				],
			});
			continue;
		}
		// 30 units total per wave, composition shifts with slot index
		const groups: WaveGroup[] = [];
		if (i < 5) {
			groups.push({ unitId: 'scout_drone', count: UNITS_PER_WAVE });
		} else if (i < 10) {
			const robots = Math.min(Math.floor(i * 1.5), UNITS_PER_WAVE - 5);
			groups.push({ unitId: 'scout_drone', count: UNITS_PER_WAVE - robots });
			groups.push({ unitId: 'battle_robot', count: robots });
		} else if (i < 20) {
			const heavy = Math.min(Math.floor(i / 3), 10);
			const robots = Math.floor((UNITS_PER_WAVE - heavy) / 2);
			groups.push({
				unitId: 'scout_drone',
				count: UNITS_PER_WAVE - robots - heavy,
			});
			groups.push({ unitId: 'battle_robot', count: robots });
			groups.push({ unitId: 'heavy_walker', count: heavy });
		} else {
			const heavy = Math.min(Math.floor(i / 3), 12);
			const stealth = Math.min(Math.floor(i / 5), 8);
			const robots = Math.floor((UNITS_PER_WAVE - heavy - stealth) / 2);
			const scouts = UNITS_PER_WAVE - robots - heavy - stealth;
			groups.push({ unitId: 'scout_drone', count: scouts });
			groups.push({ unitId: 'battle_robot', count: robots });
			groups.push({ unitId: 'heavy_walker', count: heavy });
			groups.push({ unitId: 'stealth_drone', count: stealth });
		}
		waves.push({
			slotIndex: i,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups,
		});
	}
	return waves;
}

// ── Stage-keyed waves (new) ──────────────────────────────────

export const STAGE_WAVES: Record<string, WaveDef[]> = {
	// W1 — Forest (no gimmick) --------------------------------
	w1_s1: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 3 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 5 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 4 },
				{ unitId: 'battle_robot', count: 2 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 4 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 6 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
	],
	w1_s2: [
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
				{ unitId: 'battle_robot', count: 3 },
				{ unitId: 'scout_drone', count: 2 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 3 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 4 },
				{ unitId: 'heavy_walker', count: 1 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 6 },
				{ unitId: 'stealth_drone', count: 3 },
			],
		},
	],
	w1_s3: [
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
			groups: [{ unitId: 'battle_robot', count: 4 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'battle_robot', count: 2 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 4 },
				{ unitId: 'scout_drone', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 5 },
				{ unitId: 'heavy_walker', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 8 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 4 },
				{ unitId: 'stealth_drone', count: 4 },
				{ unitId: 'heavy_walker', count: 1 },
			],
		},
	],
	w1_s4: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 5 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 5 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 3 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 6 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 6 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 10 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
	],
	w1_s5: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'scout_drone', count: 8 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 5 },
				{ unitId: 'stealth_drone', count: 3 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 6 },
				{ unitId: 'scout_drone', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'heavy_walker', count: 2 },
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
				{ unitId: 'battle_robot', count: 7 },
				{ unitId: 'scout_drone', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 5 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'scout_drone', count: 5 },
			],
		},
	],
	w1_s6: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 6 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'scout_drone', count: 4 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 7 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 7 },
				{ unitId: 'heavy_walker', count: 2 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 4 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 10 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 6 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'stealth_drone', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
	],
	w1_s7: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 7 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'stealth_drone', count: 8 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 5 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'stealth_drone', count: 4 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'scout_drone', count: 12 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
	],
	w1_s8: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'scout_drone', count: 6 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'stealth_drone', count: 4 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 8 },
				{ unitId: 'battle_robot', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'battle_robot', count: 3 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 10 },
				{ unitId: 'heavy_walker', count: 4 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 10,
			kind: 'boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'orc_warlord', count: 1 }],
		},
	],
	// W2 — Forge (flame_imp, lava_golem) ----------------------
	w2_s1: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'flame_imp', count: 3 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 6 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 1 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 8 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 2 },
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
	],
	w2_s2: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 8 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 6 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 2 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'lava_golem', count: 1 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 10 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 3 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'flame_imp', count: 6 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
	],
	w2_s3: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 10 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 2 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 9 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 12 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
	],
	w2_s4: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 3 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 12 },
				{ unitId: 'heavy_walker', count: 3 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 15 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
	],
	w2_s5: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 10 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'battle_robot', count: 5 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 4 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 15 },
				{ unitId: 'lava_golem', count: 2 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 5 }],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'battle_robot', count: 8 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
	],
	w2_s6: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 3 },
				{ unitId: 'flame_imp', count: 5 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 6 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 5 },
				{ unitId: 'flame_imp', count: 6 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 18 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 12 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 7 },
				{ unitId: 'flame_imp', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 6 }],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'lava_golem', count: 4 },
			],
		},
	],
	w2_s7: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 15 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'lava_golem', count: 5 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 12 },
				{ unitId: 'heavy_walker', count: 4 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 10 },
				{ unitId: 'lava_golem', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 8 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'flame_imp', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 6 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'flame_imp', count: 20 }],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'lava_golem', count: 7 },
				{ unitId: 'heavy_walker', count: 1 },
			],
		},
	],
	w2_s8: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 12 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 4 },
				{ unitId: 'flame_imp', count: 8 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'lava_golem', count: 3 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 14 },
				{ unitId: 'flame_imp', count: 8 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'flame_imp', count: 4 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'lava_golem', count: 6 },
				{ unitId: 'flame_imp', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'flame_imp', count: 20 },
				{ unitId: 'lava_golem', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'lava_golem', count: 5 },
			],
		},
		{
			slotIndex: 10,
			kind: 'boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'forge_master', count: 1 }],
		},
	],
	// W3 — Tower (arcane_mage, mana_shield) -------------------
	w3_s1: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 10 },
				{ unitId: 'arcane_mage', count: 2 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 3 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 4 },
				{ unitId: 'mana_shield', count: 2 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 5 },
				{ unitId: 'stealth_drone', count: 5 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 4 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'arcane_mage', count: 3 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 5 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
	],
	w3_s2: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 5 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 4 },
				{ unitId: 'battle_robot', count: 6 },
			],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 5 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 5 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 12 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 8 },
				{ unitId: 'mana_shield', count: 3 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 6 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'mana_shield', count: 3 },
			],
		},
	],
	w3_s3: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 5 },
				{ unitId: 'arcane_mage', count: 3 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 7 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'battle_robot', count: 14 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 6 },
				{ unitId: 'mana_shield', count: 4 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 6 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 7 }],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 7 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 5 },
				{ unitId: 'heavy_walker', count: 5 },
			],
		},
	],
	w3_s4: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 8 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 6 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 7 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 7 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 7 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 16 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 1 },
				{ unitId: 'mana_shield', count: 4 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 8 },
				{ unitId: 'heavy_walker', count: 5 },
			],
		},
	],
	w3_s5: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 14 },
				{ unitId: 'arcane_mage', count: 4 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 7 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 9 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 8 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'stealth_drone', count: 10 },
				{ unitId: 'arcane_mage', count: 5 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 8 },
				{ unitId: 'battle_robot', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 10 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 2 }],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 10 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
	],
	w3_s6: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 10 }],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 9 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 16 },
				{ unitId: 'heavy_walker', count: 5 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 8 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 12 }],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 10 },
				{ unitId: 'battle_robot', count: 10 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 12 },
				{ unitId: 'stealth_drone', count: 6 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'mana_shield', count: 5 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 10 },
				{ unitId: 'arcane_mage', count: 8 },
			],
		},
	],
	w3_s7: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 10 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'arcane_mage', count: 14 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 12 },
				{ unitId: 'battle_robot', count: 8 },
			],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 12 }],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 18 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'arcane_mage', count: 6 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 12 },
				{ unitId: 'mana_shield', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 12 },
				{ unitId: 'mana_shield', count: 8 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 2 },
				{ unitId: 'heavy_walker', count: 10 },
			],
		},
	],
	w3_s8: [
		{
			slotIndex: 1,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 10 },
				{ unitId: 'mana_shield', count: 6 },
			],
		},
		{
			slotIndex: 2,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'mana_shield', count: 12 }],
		},
		{
			slotIndex: 3,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [{ unitId: 'heavy_walker', count: 14 }],
		},
		{
			slotIndex: 4,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'arcane_mage', count: 14 },
				{ unitId: 'battle_robot', count: 10 },
			],
		},
		{
			slotIndex: 5,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 3 },
				{ unitId: 'mana_shield', count: 3 },
			],
		},
		{
			slotIndex: 6,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'mana_shield', count: 14 },
				{ unitId: 'arcane_mage', count: 8 },
			],
		},
		{
			slotIndex: 7,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'heavy_walker', count: 14 },
				{ unitId: 'arcane_mage', count: 8 },
			],
		},
		{
			slotIndex: 8,
			kind: 'normal',
			delayAfterClearSec: 3,
			groups: [
				{ unitId: 'battle_robot', count: 20 },
				{ unitId: 'mana_shield', count: 10 },
			],
		},
		{
			slotIndex: 9,
			kind: 'normal',
			delayAfterClearSec: 5,
			groups: [
				{ unitId: 'heavy_walker', count: 12 },
				{ unitId: 'arcane_mage', count: 10 },
				{ unitId: 'mana_shield', count: 6 },
			],
		},
		{
			slotIndex: 10,
			kind: 'boss',
			delayAfterClearSec: 5,
			groups: [{ unitId: 'corrupted_archmage', count: 1 }],
		},
	],

	// === Phase A pivot — random-summon + merge core loop ===
	// Endless-style wave list (50 waves) generated at module load. Boss every 5
	// waves (alternating orc_warlord / forge_master), unit count grows linearly,
	// composition adds tougher units progressively. Combined with getWaveScaling
	// beyond slot 10 this ramps past wave 15 fast enough that players naturally
	// die before hitting slot 50 — "practically infinite" for a session without
	// teaching WaveSystem to mutate waves at runtime. User feedback 2026-04-14:
	// "한 판 더 하고 싶다는 생각이 안 드네, 웨이브가 무한이어야 할 거 같음".
	phase_a_s1: generatePhaseAWaves(50),
};

// Legacy aliases + new map aliases
function getRequiredStageWaves(stageId: string): WaveDef[] {
	const waves = STAGE_WAVES[stageId];
	if (!waves) {
		throw new Error(`Missing stage waves for ${stageId}`);
	}
	return waves;
}

export const WAVE_REGISTRY: Record<string, WaveDef[]> = {
	// Legacy (pre-v5 map ids)
	forest_gate: getRequiredStageWaves('w1_s1'),
	lava_fortress: getRequiredStageWaves('w2_s1'),
	storm_citadel: getRequiredStageWaves('w3_s1'),
	// New map ids (default to first stage on that map)
	w1_forest_a: getRequiredStageWaves('w1_s1'),
	w1_forest_b: getRequiredStageWaves('w1_s5'),
	w2_forge_a: getRequiredStageWaves('w2_s1'),
	w2_forge_b: getRequiredStageWaves('w2_s5'),
	w3_tower_a: getRequiredStageWaves('w3_s1'),
	w3_tower_b: getRequiredStageWaves('w3_s5'),
	// Phase A pivot
	phase_a_long: getRequiredStageWaves('phase_a_s1'),
};

export function getWavesForMap(mapId: string): WaveDef[] {
	const waves = WAVE_REGISTRY[mapId];
	if (!waves && mapId !== 'forest_gate') {
		console.warn(
			`[getWavesForMap] No wave definitions for map "${mapId}", falling back to forest_gate`,
		);
	}
	return waves ?? STAGE_WAVES.w1_s1;
}

export function getTotalWavesForMap(mapId: string): number {
	return getWavesForMap(mapId).length;
}

export function getWavesForStage(stageId: string): WaveDef[] {
	const waves = STAGE_WAVES[stageId];
	if (!waves) {
		console.warn(
			`[getWavesForStage] No wave definitions for stage "${stageId}", falling back to w1_s1`,
		);
	}
	return waves ?? STAGE_WAVES.w1_s1;
}

export function getTotalWavesForStage(stageId: string): number {
	return getWavesForStage(stageId).length;
}

export const TOTAL_WAVES = STAGE_WAVES.w1_s1.length;

export const MAX_WAVE_DURATION_MS = 30_000;
