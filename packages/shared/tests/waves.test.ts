import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	BOSS_SLOT_AT_SECS,
	BOSS_WARNING_AT_SECS,
	getNextEligiblePressureSlot,
	getWaveSlotAtTime,
	HARD_END_AT_SEC,
	PRESSURE_ACTIVE_WINDOWS,
	PRESSURE_CLEAR_DEADLINE_OFFSET_SEC,
	PRESSURE_LOCK_AT_SEC,
	PRESSURE_PACKET_BY_TIER,
	PRESSURE_TOKEN_CAP,
	SLOT_DURATION_SEC,
	SUDDEN_DEATH_AT_SEC,
	TOTAL_WAVES,
	WAVE_DEFS,
} from '../src/constants/waves';

const validUnitIds = new Set(UNITS.map((u) => u.id));

describe('WAVE_DEFS', () => {
	it('keeps the approved 30-second slot timeline and excludes hard end from TOTAL_WAVES', () => {
		expect(TOTAL_WAVES).toBe(20);
		expect(WAVE_DEFS).toHaveLength(21);

		for (let index = 0; index < WAVE_DEFS.length; index += 1) {
			expect(WAVE_DEFS[index].slotIndex).toBe(index + 1);
			expect(WAVE_DEFS[index].startAtSec).toBe(index * SLOT_DURATION_SEC);
		}

		expect(WAVE_DEFS.at(-1)?.kind).toBe('hard_end');
		expect(WAVE_DEFS.at(-1)?.startAtSec).toBe(HARD_END_AT_SEC);
	});

	it('matches the documented boss, sudden death, and hard-end checkpoints', () => {
		expect(BOSS_WARNING_AT_SECS).toEqual([210, 390]);
		expect(BOSS_SLOT_AT_SECS).toEqual([240, 420]);
		expect(SUDDEN_DEATH_AT_SEC).toBe(540);
		expect(HARD_END_AT_SEC).toBe(600);

		expect(getWaveSlotAtTime(210).kind).toBe('pre_boss');
		expect(getWaveSlotAtTime(240).kind).toBe('boss');
		expect(getWaveSlotAtTime(540).kind).toBe('sudden_death');
		expect(getWaveSlotAtTime(600).kind).toBe('hard_end');
	});

	it('defines the documented pressure contract in constants', () => {
		expect(PRESSURE_TOKEN_CAP).toBe(2);
		expect(PRESSURE_CLEAR_DEADLINE_OFFSET_SEC).toBe(8);
		expect(PRESSURE_LOCK_AT_SEC).toBe(535);
		expect(PRESSURE_ACTIVE_WINDOWS).toEqual([
			{ startAtSec: 60, endAtSec: 210, tier: 1 },
			{ startAtSec: 270, endAtSec: 390, tier: 2 },
			{ startAtSec: 450, endAtSec: 535, tier: 3 },
		]);
		expect(PRESSURE_PACKET_BY_TIER[1].name).toBe('정찰 압박');
		expect(PRESSURE_PACKET_BY_TIER[2].name).toBe('혼합 압박');
		expect(PRESSURE_PACKET_BY_TIER[3].name).toBe('돌파 압박');
	});

	it('marks only eligible normal slots as pressure-enabled and resolves the next eligible slot', () => {
		const pressureSlots = WAVE_DEFS.filter((slot) => slot.pressureEnabled);
		expect(pressureSlots.map((slot) => slot.slotIndex)).toEqual([
			3, 4, 5, 6, 7, 10, 11, 12, 13, 16, 17, 18,
		]);

		for (const slot of pressureSlots) {
			expect(slot.kind).toBe('normal');
			expect(slot.pressureTier).not.toBeNull();
		}

		expect(getNextEligiblePressureSlot(8)?.slotIndex).toBe(10);
		expect(getNextEligiblePressureSlot(15)?.slotIndex).toBe(16);
		expect(getNextEligiblePressureSlot(18)).toBeNull();
	});

	it('uses only valid unit IDs and positive unit counts', () => {
		for (const slot of WAVE_DEFS) {
			for (const group of slot.groups) {
				expect(validUnitIds.has(group.unitId)).toBe(true);
				expect(group.count).toBeGreaterThan(0);
			}
		}
	});
});
