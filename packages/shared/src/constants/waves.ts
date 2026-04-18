import { generatePhaseAWaves } from '../data/phaseAWaves';
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
 * wave generator keeps ramping difficulty instead of silently plateauing.
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
 * Phase A endless wave set. Generated once at module load with 50 waves;
 * `getWaveScaling` takes over beyond slot 10 to keep scaling the HP ramp.
 */
const PHASE_A_WAVES: WaveDef[] = generatePhaseAWaves(50);

export function getWavesForMap(_mapId: string): WaveDef[] {
	return PHASE_A_WAVES;
}

export function getTotalWavesForMap(mapId: string): number {
	return getWavesForMap(mapId).length;
}

/** Back-compat shim — Phase A is the only wave set. */
export const MAX_WAVE_DURATION_MS = 30_000;
