import type { WaveDef, WaveGroup } from '../constants/waves';

/**
 * 정식 모드 보스 라인업 — 10 wave마다 새로운 실루엣을 보이도록 5종을 배치.
 * 각 슬롯의 `hpMultiplier`는 WAVE_SCALING 위에 누적되어, 원시 base HP만으로는
 * 만들 수 없는 보스 간 체감 격차를 보장한다.
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

const BOSS_SLOTS: Record<number, BossSlot> = {
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

const WAVE_1_SHOWCASE_GROUPS: WaveGroup[] = [
	{ unitId: 'scout_drone', count: 1 },
	{ unitId: 'battle_robot', count: 1 },
	{ unitId: 'heavy_walker', count: 1 },
	{ unitId: 'stealth_drone', count: 1 },
	{ unitId: 'flame_imp', count: 1 },
	{ unitId: 'lava_golem', count: 1, hpMultiplier: 0.2 },
	{ unitId: 'arcane_mage', count: 1 },
	{ unitId: 'mana_shield', count: 1, hpMultiplier: 0.5 },
	{ unitId: 'orc_warlord', count: 1, hpMultiplier: 0.02, asBoss: false },
	{ unitId: 'forge_master', count: 1, hpMultiplier: 0.02, asBoss: false },
	{
		unitId: 'corrupted_archmage',
		count: 1,
		hpMultiplier: 0.01,
		asBoss: false,
	},
	{ unitId: 'dragon', count: 1, hpMultiplier: 0.01, asBoss: false },
];

/**
 * 정식 모드 무한 Wave 생성기. 10 wave마다 보스(고유 5종; `BOSS_SLOTS` 참조).
 * Wave 1은 에셋/모션 QA를 위해 전체 몬스터 실루엣을 한 번에 보여준다.
 * 이후 일반 wave는 슬롯 인덱스에 따라 구성이 다양해진다: scout_drone은 슬롯 4까지,
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
		const isBoss = i % 10 === 0;
		if (isBoss) {
			const slot = BOSS_SLOTS[i];
			if (!slot) {
				throw new Error(
					`generateWaves: missing boss slot config for wave ${i}`,
				);
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
		if (i === 1) {
			waves.push({
				slotIndex: i,
				kind: 'normal',
				delayAfterClearSec: 3,
				groups: WAVE_1_SHOWCASE_GROUPS,
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
