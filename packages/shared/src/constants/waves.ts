import { generateWaves } from '../data/waves';
import type { UnitType } from '../types/unit';

export interface WaveGroup {
	unitId: UnitType;
	count: number;
	/** Optional per-group HP boost that stacks on top of WAVE_SCALING. Used
	 *  to make specific boss slots (e.g. wave 40) noticeably tougher than
	 *  the previous boss even when base stats are identical. Default 1. */
	hpMultiplier?: number;
}

export type WaveSlotKind = 'normal' | 'boss';

export interface WaveDef {
	slotIndex: number;
	kind: WaveSlotKind;
	groups: WaveGroup[];
	/** Seconds to wait after this wave is cleared before spawning next */
	delayAfterClearSec: number;
}

/**
 * Post-slot-10 HP growth per wave (linear). Replaces the previous ×1.12
 * compounding curve whose W10→W20→W30 boss gaps (×7.8 then ×15.5) produced
 * step-function difficulty cliffs. A flat slope keeps each boss slot 2×–3×
 * harder than the previous one once hpMultiplier and base HP are folded in,
 * without the pathological late-game explosion (W50 would hit ×354 of W10).
 */
export const HP_SLOPE = 0.55;

export const WAVE_SCALING: readonly { hp: number; speed: number }[] = [
	{ hp: 1.0, speed: 1.0 }, // Wave 1  — 성공 경험
	{ hp: 1.0, speed: 1.0 }, // Wave 2  — 여전히 쉬움
	{ hp: 1.2, speed: 1.0 }, // Wave 3  — 미세 증가
	{ hp: 1.4, speed: 1.0 }, // Wave 4  — 약간 도전
	{ hp: 1.6, speed: 1.05 }, // Wave 5  — 본격 상승
	{ hp: 1.9, speed: 1.05 }, // Wave 6
	{ hp: 2.3, speed: 1.1 }, // Wave 7
	{ hp: 2.7, speed: 1.1 }, // Wave 8
	{ hp: 3.2, speed: 1.15 }, // Wave 9  — 최종 러시
	{ hp: 3.8, speed: 1.15 }, // Wave 10 — 첫 보스
];

/**
 * Wave scaling for any slot (1..infinity). Uses WAVE_SCALING table for
 * slots 1-10 and a linear escalation formula beyond (hp += HP_SLOPE per
 * wave, speed += 0.03 per wave capped at 2.2). Linear keeps boss-slot
 * jumps roughly even instead of the ×1.12 curve's runaway late-game growth.
 */
export function getWaveScaling(slot: number): { hp: number; speed: number } {
	if (slot <= 0) return { hp: 1, speed: 1 };
	if (slot <= WAVE_SCALING.length) {
		return WAVE_SCALING[slot - 1];
	}
	const over = slot - WAVE_SCALING.length;
	const lastEntry = WAVE_SCALING[WAVE_SCALING.length - 1];
	return {
		hp: lastEntry.hp + over * HP_SLOPE,
		speed: Math.min(lastEntry.speed + over * 0.03, 2.2),
	};
}

/**
 * 정식 모드 무한 Wave 세트. 모듈 로드 시 50 wave로 한 번 생성되고,
 * 슬롯 10 이후는 getWaveScaling의 선형 HP 램프가 이어받는다.
 */
const WAVES: WaveDef[] = generateWaves(50);

export function getWavesForMap(_mapId: string): WaveDef[] {
	return WAVES;
}

export function getTotalWavesForMap(mapId: string): number {
	return getWavesForMap(mapId).length;
}

/** Back-compat shim — 정식 모드가 유일한 wave set. */
export const MAX_WAVE_DURATION_MS = 30_000;
