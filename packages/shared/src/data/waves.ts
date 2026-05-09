import type { WaveDef, WaveGroup } from '../constants/waves';

/**
 * 정식 모드 보스 라인업 — v1 활성 아크는 wave 5/10/15/20 보스 체험을 기준으로 한다.
 * 20 wave 이후 슬롯은 밸런스/디버그 확장용으로 유지한다.
 *
 *   Wave 5:  orc_warlord        → intro boss
 *   Wave 10: forge_master       → fire tower-disable pressure
 *   Wave 15: corrupted_archmage → clone / CC pressure
 *   Wave 20: corrupted_archmage ×1.8 → v1 final pressure
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

const BOSS_SLOTS: Record<number, BossSlot> = {
	5: {
		unitId: 'orc_warlord',
		escorts: [{ unitId: 'battle_robot', count: 2 }],
	},
	10: {
		unitId: 'forge_master',
		escorts: [{ unitId: 'battle_robot', count: 4 }],
	},
	15: {
		unitId: 'corrupted_archmage',
		escorts: [{ unitId: 'heavy_walker', count: 2 }],
	},
	20: {
		unitId: 'corrupted_archmage',
		hpMultiplier: 1.8,
		escorts: [
			{ unitId: 'heavy_walker', count: 3 },
			{ unitId: 'stealth_drone', count: 2 },
		],
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
 * 정식 모드 Wave 생성기. v1 활성 구간은 5/10/15/20 보스 슬롯을 사용한다.
 * 일반 wave는 슬롯 인덱스에 따라 구성이 다양해진다: scout_drone은 슬롯 4까지,
 * battle_robot은 슬롯 5부터, heavy_walker는 슬롯 10부터, stealth_drone은
 * 슬롯 20부터 등장.
 *
 * 모듈 로드 시점에 count=50으로 한 번 호출된다. 슬롯 10 이후 `getWaveScaling`
 * 의 선형 HP 램프와 보스별 `hpMultiplier`가 합쳐져 보스마다 직전 대비 명확한
 * 상승이 보장된다.
 */
export function generateWaves(count: number): WaveDef[] {
	const UNITS_PER_WAVE = 30;
	const waves: WaveDef[] = [];
	for (let i = 1; i <= count; i++) {
		const slot = BOSS_SLOTS[i];
		if (slot) {
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
