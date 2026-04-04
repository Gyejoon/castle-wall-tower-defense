import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	TOTAL_WAVES,
	WAVE_DEFS,
} from '../src/constants/waves';

const validUnitIds = new Set(UNITS.map((u) => u.id));

describe('WAVE_DEFS', () => {
	it('defines exactly 10 waves', () => {
		expect(TOTAL_WAVES).toBe(10);
		expect(WAVE_DEFS).toHaveLength(10);

		for (let index = 0; index < WAVE_DEFS.length; index += 1) {
			expect(WAVE_DEFS[index].slotIndex).toBe(index + 1);
		}
	});

	it('has boss waves at positions 5 and 10', () => {
		expect(WAVE_DEFS[4].kind).toBe('boss');
		expect(WAVE_DEFS[4].slotIndex).toBe(5);
		expect(WAVE_DEFS[9].kind).toBe('boss');
		expect(WAVE_DEFS[9].slotIndex).toBe(10);
	});

	it('has pre_boss warnings before each boss', () => {
		expect(WAVE_DEFS[3].kind).toBe('pre_boss');
		expect(WAVE_DEFS[8].kind).toBe('pre_boss');
	});

	it('uses only valid unit IDs and positive unit counts', () => {
		for (const slot of WAVE_DEFS) {
			for (const group of slot.groups) {
				expect(validUnitIds.has(group.unitId)).toBe(true);
				expect(group.count).toBeGreaterThan(0);
			}
		}
	});

	it('assigns only valid wave kinds', () => {
		const validKinds = new Set(['normal', 'pre_boss', 'boss']);
		for (const slot of WAVE_DEFS) {
			expect(validKinds.has(slot.kind)).toBe(true);
		}
	});

	it('has non-negative delay values', () => {
		for (const slot of WAVE_DEFS) {
			expect(slot.delayAfterClearSec).toBeGreaterThanOrEqual(0);
		}
	});
});
