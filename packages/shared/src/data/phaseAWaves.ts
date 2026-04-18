import type { WaveDef, WaveGroup } from '../constants/waves';

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
