import type { WaveDef, WaveGroup } from '../constants/waves';

/**
 * Phase A boss lineup — each boss wave is distinct so the player sees a
 * new silhouette every 10 waves. Base HP is the unit def's raw hp; the
 * per-slot `hpMultiplier` stacks on top of WAVE_SCALING to make each boss
 * a clear step up over the previous fight (the raw bases alone can't
 * carry that because some late-slot reuses happen).
 *
 *   Wave 10: orc_warlord        base 2000  → intro boss
 *   Wave 20: forge_master       base 5000  → fire tower-disable pressure
 *   Wave 30: corrupted_archmage base 25000 → arcane, clone spawns
 *   Wave 40: corrupted_archmage base 25000 × 2.5 → veteran arcane
 *   Wave 50: dragon             base 60000 → flying final
 */
interface BossSlot {
	readonly unitId:
		| 'orc_warlord'
		| 'forge_master'
		| 'corrupted_archmage'
		| 'dragon';
	readonly hpMultiplier?: number;
	/** Escort squad that spawns alongside the boss. */
	readonly escorts?: readonly { unitId: WaveGroup['unitId']; count: number }[];
}

const PHASE_A_BOSS_SLOTS: Record<number, BossSlot> = {
	10: {
		unitId: 'orc_warlord',
		escorts: [{ unitId: 'battle_robot', count: 4 }],
	},
	20: {
		unitId: 'forge_master',
		escorts: [{ unitId: 'battle_robot', count: 4 }],
	},
	30: {
		unitId: 'corrupted_archmage',
		escorts: [{ unitId: 'heavy_walker', count: 3 }],
	},
	40: {
		unitId: 'corrupted_archmage',
		hpMultiplier: 2.5,
		escorts: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'stealth_drone', count: 4 },
		],
	},
	50: {
		unitId: 'dragon',
		escorts: [{ unitId: 'flame_imp', count: 6 }],
	},
};

/**
 * Phase A endless wave generator. Boss every 10 waves (five distinct
 * bosses; see `PHASE_A_BOSS_SLOTS`). Normal waves grow composition
 * complexity with slot index: scout_drone only through slot 4, battle_robot
 * from slot 5, heavy_walker from slot 10, stealth_drone from slot 20.
 *
 * Called once at module load with count=50. `getWaveScaling`'s linear
 * HP ramp past slot 10 combined with per-boss `hpMultiplier` overrides
 * ensures that each boss slot is a clear escalation over the previous.
 */
export function generatePhaseAWaves(count: number): WaveDef[] {
	const UNITS_PER_WAVE = 30;
	const waves: WaveDef[] = [];
	for (let i = 1; i <= count; i++) {
		const isBoss = i % 10 === 0;
		if (isBoss) {
			const slot = PHASE_A_BOSS_SLOTS[i];
			if (!slot) {
				throw new Error(`phaseAWaves: missing boss slot config for wave ${i}`);
			}
			const groups: WaveGroup[] = [
				{
					unitId: slot.unitId,
					count: 1,
					...(slot.hpMultiplier !== undefined
						? { hpMultiplier: slot.hpMultiplier }
						: {}),
				},
			];
			for (const escort of slot.escorts ?? []) {
				groups.push({ unitId: escort.unitId, count: escort.count });
			}
			waves.push({
				slotIndex: i,
				kind: 'boss',
				delayAfterClearSec: 5,
				groups,
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
