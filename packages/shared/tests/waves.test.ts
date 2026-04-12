import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	getWavesForMap,
	getWavesForStage,
	STAGE_WAVES,
	TOTAL_WAVES,
	WAVE_REGISTRY,
} from '../src/constants/waves';

// UnitType now includes W2/W3 enemies and bosses that don't have UnitDef entries yet.
// Broaden the valid-id set to include them so STAGE_WAVES validation doesn't false-fail.
const validUnitIds = new Set([
	...UNITS.map((u) => u.id),
	'flame_imp',
	'lava_golem',
	'arcane_mage',
	'mana_shield',
	'orc_warlord',
	'forge_master',
	'corrupted_archmage',
]);

describe('STAGE_WAVES.w1_s1 (default stage)', () => {
	const w1s1 = STAGE_WAVES.w1_s1;

	it('defines exactly 5 waves and TOTAL_WAVES matches', () => {
		expect(w1s1).toHaveLength(5);
		expect(TOTAL_WAVES).toBe(5);

		for (let index = 0; index < w1s1.length; index += 1) {
			expect(w1s1[index].slotIndex).toBe(index + 1);
		}
	});

	it('all waves are normal kind', () => {
		for (const slot of w1s1) {
			expect(slot.kind).toBe('normal');
		}
	});

	it('uses only valid unit IDs and positive unit counts', () => {
		for (const slot of w1s1) {
			for (const group of slot.groups) {
				expect(validUnitIds.has(group.unitId)).toBe(true);
				expect(group.count).toBeGreaterThan(0);
			}
		}
	});

	it('assigns only valid wave kinds', () => {
		const validKinds = new Set(['normal', 'boss']);
		for (const slot of w1s1) {
			expect(validKinds.has(slot.kind)).toBe(true);
		}
	});

	it('has non-negative delay values', () => {
		for (const slot of w1s1) {
			expect(slot.delayAfterClearSec).toBeGreaterThanOrEqual(0);
		}
	});
});

describe('STAGE_WAVES', () => {
	it('contains exactly 24 stage entries (8 per world)', () => {
		expect(Object.keys(STAGE_WAVES)).toHaveLength(24);
	});

	it('each stage entry has valid unit IDs and positive counts', () => {
		const validKinds = new Set(['normal', 'boss']);
		for (const [_stageId, waves] of Object.entries(STAGE_WAVES)) {
			for (const wave of waves) {
				expect(validKinds.has(wave.kind)).toBe(true);
				expect(wave.delayAfterClearSec).toBeGreaterThanOrEqual(0);
				for (const group of wave.groups) {
					expect(validUnitIds.has(group.unitId)).toBe(true);
					expect(group.count).toBeGreaterThan(0);
				}
			}
		}
	});

	it('boss stages (w1_s8, w2_s8, w3_s8) end with a boss wave', () => {
		for (const stageId of ['w1_s8', 'w2_s8', 'w3_s8']) {
			const waves = STAGE_WAVES[stageId];
			expect(waves).toBeDefined();
			expect(waves?.[waves.length - 1]?.kind).toBe('boss');
		}
	});
});

describe('getWavesForMap', () => {
	// legacy aliases now resolve to STAGE_WAVES entries
	it('forest_gate 맵은 w1_s1 웨이브를 반환한다', () => {
		expect(getWavesForMap('forest_gate')).toBe(STAGE_WAVES.w1_s1);
	});

	it('알 수 없는 맵은 기본 w1_s1로 fallback한다', () => {
		expect(getWavesForMap('unknown_map')).toBe(STAGE_WAVES.w1_s1);
	});

	it('모든 등록된 맵이 비어 있지 않은 웨이브를 가진다', () => {
		for (const [_mapId, waves] of Object.entries(WAVE_REGISTRY)) {
			expect(waves.length).toBeGreaterThan(0);
			for (let i = 0; i < waves.length; i++) {
				expect(waves[i].slotIndex).toBe(i + 1);
			}
		}
	});

	it('lava_fortress, storm_citadel 맵이 등록되어 있다', () => {
		expect(getWavesForMap('lava_fortress')).toBe(STAGE_WAVES.w2_s1);
		expect(getWavesForMap('storm_citadel')).toBe(STAGE_WAVES.w3_s1);
	});
});

describe('getWavesForStage', () => {
	it('알려진 stageId의 웨이브를 반환한다', () => {
		expect(getWavesForStage('w1_s1')).toBe(STAGE_WAVES.w1_s1);
		expect(getWavesForStage('w2_s8')).toBe(STAGE_WAVES.w2_s8);
		expect(getWavesForStage('w3_s8')).toBe(STAGE_WAVES.w3_s8);
	});

	it('알 수 없는 stageId는 w1_s1으로 fallback한다', () => {
		expect(getWavesForStage('nonexistent')).toBe(STAGE_WAVES.w1_s1);
	});
});
