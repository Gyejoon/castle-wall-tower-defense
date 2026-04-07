import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	getWavesForMap,
	TOTAL_WAVES,
	WAVE_DEFS,
	WAVE_REGISTRY,
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

	it('has pre_boss warning before final boss', () => {
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

describe('getWavesForMap', () => {
	it('forest_gate 맵은 기본 WAVE_DEFS를 반환한다', () => {
		expect(getWavesForMap('forest_gate')).toBe(WAVE_DEFS);
	});

	it('알 수 없는 맵은 기본 WAVE_DEFS로 fallback한다', () => {
		expect(getWavesForMap('unknown_map')).toBe(WAVE_DEFS);
	});

	it('모든 등록된 맵이 10개 웨이브를 가진다', () => {
		for (const [mapId, waves] of Object.entries(WAVE_REGISTRY)) {
			expect(waves).toHaveLength(10);
			for (let i = 0; i < waves.length; i++) {
				expect(waves[i].slotIndex).toBe(i + 1);
			}
		}
	});

	it('lava_fortress, storm_citadel 맵이 등록되어 있다', () => {
		expect(getWavesForMap('lava_fortress')).not.toBe(WAVE_DEFS);
		expect(getWavesForMap('storm_citadel')).not.toBe(WAVE_DEFS);
		expect(getWavesForMap('lava_fortress')).toHaveLength(10);
		expect(getWavesForMap('storm_citadel')).toHaveLength(10);
	});
});
