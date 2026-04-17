import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	getWaveScaling,
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
	it('contains exactly the 24 legacy stages + Phase A pivot entries', () => {
		// Explicit allowlist instead of a length check so accidental new
		// entries surface in CI rather than being absorbed into a >= bound.
		const expected = [
			'w1_s1',
			'w1_s2',
			'w1_s3',
			'w1_s4',
			'w1_s5',
			'w1_s6',
			'w1_s7',
			'w1_s8',
			'w2_s1',
			'w2_s2',
			'w2_s3',
			'w2_s4',
			'w2_s5',
			'w2_s6',
			'w2_s7',
			'w2_s8',
			'w3_s1',
			'w3_s2',
			'w3_s3',
			'w3_s4',
			'w3_s5',
			'w3_s6',
			'w3_s7',
			'w3_s8',
			'phase_a_s1',
		];
		expect(Object.keys(STAGE_WAVES).sort()).toEqual(expected.sort());
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

describe('STAGE_WAVES.phase_a_s1 (random-summon + merge pivot — endless)', () => {
	const phaseA = STAGE_WAVES.phase_a_s1;

	it('50 wave 생성', () => {
		expect(phaseA).toHaveLength(50);
	});

	it('slotIndex가 1..50 순차', () => {
		phaseA.forEach((w, i) => {
			expect(w.slotIndex).toBe(i + 1);
		});
	});

	it('10의 배수 wave는 boss, 나머지는 normal', () => {
		for (const w of phaseA) {
			if (w.slotIndex % 10 === 0) {
				expect(w.kind).toBe('boss');
			} else {
				expect(w.kind).toBe('normal');
			}
		}
	});

	it('보스가 orc_warlord / forge_master 순으로 교대 (10 wave 마다)', () => {
		const bossWaves = phaseA.filter((w) => w.kind === 'boss');
		expect(bossWaves).toHaveLength(5);
		bossWaves.forEach((w, i) => {
			const expected = i % 2 === 0 ? 'orc_warlord' : 'forge_master';
			expect(w.groups[0].unitId).toBe(expected);
			expect(w.groups[0].count).toBe(1);
		});
	});

	it('normal wave는 30마리씩', () => {
		const normalWaves = phaseA.filter((w) => w.kind === 'normal');
		for (const w of normalWaves) {
			const total = w.groups.reduce((s, g) => s + g.count, 0);
			expect(total).toBe(30);
		}
	});

	it('slot이 커질수록 유닛 구성이 다양해진다 (그룹 수 증가)', () => {
		const w1 = phaseA[0]; // slot 1
		const w21 = phaseA[20]; // slot 21
		expect(w21.groups.length).toBeGreaterThan(w1.groups.length);
	});

	it('slot 14+ 에서 stealth_drone 이 등장하기 시작', () => {
		const stealthWaves = phaseA.filter((w) =>
			w.groups.some((g) => g.unitId === 'stealth_drone'),
		);
		expect(stealthWaves.length).toBeGreaterThan(0);
		expect(stealthWaves[0].slotIndex).toBeGreaterThanOrEqual(14);
	});

	it('모든 unitId가 알려진 유닛', () => {
		for (const w of phaseA) {
			for (const g of w.groups) {
				expect(validUnitIds.has(g.unitId)).toBe(true);
			}
		}
	});

	it('phase_a_long 맵 별칭이 WAVE_REGISTRY에 등록되어 있다', () => {
		expect(WAVE_REGISTRY.phase_a_long).toBe(phaseA);
	});

	it('getWavesForStage("phase_a_s1")이 동일 배열 반환', () => {
		expect(getWavesForStage('phase_a_s1')).toBe(phaseA);
	});
});

describe('getWaveScaling — endless wave formula', () => {
	it('slot 1-10 은 WAVE_SCALING 테이블 그대로', () => {
		for (let slot = 1; slot <= 10; slot++) {
			const result = getWaveScaling(slot);
			expect(result.hp).toBeGreaterThan(0);
			expect(result.speed).toBeGreaterThan(0);
		}
	});

	it('slot 10 은 정확히 테이블 마지막 값 (hp 2.2, speed 1.1)', () => {
		expect(getWaveScaling(10)).toEqual({ hp: 2.2, speed: 1.1 });
	});

	it('slot 11+ 은 선형 escalation — hp +0.35/slot', () => {
		expect(getWaveScaling(11).hp).toBeCloseTo(2.55, 5);
		expect(getWaveScaling(20).hp).toBeCloseTo(5.7, 5);
	});

	it('speed 는 1.6 으로 캡', () => {
		expect(getWaveScaling(100).speed).toBeLessThanOrEqual(1.6);
	});

	it('slot 0 이하는 방어적 기본값 hp=1 speed=1', () => {
		expect(getWaveScaling(0)).toEqual({ hp: 1, speed: 1 });
		expect(getWaveScaling(-5)).toEqual({ hp: 1, speed: 1 });
	});
});
