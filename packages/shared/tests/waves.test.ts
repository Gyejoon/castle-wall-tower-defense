import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	getTotalWavesForMap,
	getWaveScaling,
	getWavesForMap,
} from '../src/constants/waves';
import { generatePhaseAWaves } from '../src/data/phaseAWaves';

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

describe('getWavesForMap (Phase A only)', () => {
	it('returns the Phase A endless wave set regardless of mapId', () => {
		expect(getWavesForMap('phase_a_long')).toEqual(getWavesForMap('anything'));
	});

	it('Phase A wave set is 50 waves long', () => {
		expect(getTotalWavesForMap('phase_a_long')).toBe(50);
	});

	it('every wave uses only known unit ids with positive counts', () => {
		const waves = getWavesForMap('phase_a_long');
		const validKinds = new Set(['normal', 'boss']);
		for (const wave of waves) {
			expect(validKinds.has(wave.kind)).toBe(true);
			expect(wave.delayAfterClearSec).toBeGreaterThanOrEqual(0);
			for (const group of wave.groups) {
				expect(validUnitIds.has(group.unitId)).toBe(true);
				expect(group.count).toBeGreaterThan(0);
			}
		}
	});
});

describe('generatePhaseAWaves', () => {
	const phaseA = generatePhaseAWaves(50);

	it('generates exactly the requested number of waves', () => {
		expect(phaseA).toHaveLength(50);
	});

	it('slotIndex is sequential 1..n', () => {
		phaseA.forEach((w, i) => {
			expect(w.slotIndex).toBe(i + 1);
		});
	});

	it('every 10th wave is a boss, others are normal', () => {
		for (const w of phaseA) {
			if (w.slotIndex % 10 === 0) {
				expect(w.kind).toBe('boss');
			} else {
				expect(w.kind).toBe('normal');
			}
		}
	});

	it('bosses alternate orc_warlord / forge_master', () => {
		const bossWaves = phaseA.filter((w) => w.kind === 'boss');
		expect(bossWaves).toHaveLength(5);
		bossWaves.forEach((w, i) => {
			const expected = i % 2 === 0 ? 'orc_warlord' : 'forge_master';
			expect(w.groups[0].unitId).toBe(expected);
			expect(w.groups[0].count).toBe(1);
		});
	});

	it('normal waves carry 30 units', () => {
		const normalWaves = phaseA.filter((w) => w.kind === 'normal');
		for (const w of normalWaves) {
			const total = w.groups.reduce((s, g) => s + g.count, 0);
			expect(total).toBe(30);
		}
	});

	it('unit composition diversifies as slot index grows', () => {
		const w1 = phaseA[0];
		const w21 = phaseA[20];
		expect(w21.groups.length).toBeGreaterThan(w1.groups.length);
	});

	it('stealth_drone starts appearing at slot 14+', () => {
		const stealthWaves = phaseA.filter((w) =>
			w.groups.some((g) => g.unitId === 'stealth_drone'),
		);
		expect(stealthWaves.length).toBeGreaterThan(0);
		expect(stealthWaves[0].slotIndex).toBeGreaterThanOrEqual(14);
	});
});

describe('getWaveScaling — endless wave formula', () => {
	it('slots 1-10 read from WAVE_SCALING table directly', () => {
		for (let slot = 1; slot <= 10; slot++) {
			const result = getWaveScaling(slot);
			expect(result.hp).toBeGreaterThan(0);
			expect(result.speed).toBeGreaterThan(0);
		}
	});

	it('slot 10 matches the last table entry (hp 3.8, speed 1.15)', () => {
		expect(getWaveScaling(10)).toEqual({ hp: 3.8, speed: 1.15 });
	});

	it('slot 11+ scales exponentially — hp ×1.12 per slot, speed +0.03', () => {
		expect(getWaveScaling(11).hp).toBeCloseTo(3.8 * 1.12, 3);
		expect(getWaveScaling(20).hp).toBeCloseTo(3.8 * 1.12 ** 10, 3);
		expect(getWaveScaling(11).speed).toBeCloseTo(1.15 + 0.03, 5);
	});

	it('speed is capped at 2.2', () => {
		expect(getWaveScaling(100).speed).toBeLessThanOrEqual(2.2);
	});

	it('slot <= 0 falls back to hp=1 speed=1', () => {
		expect(getWaveScaling(0)).toEqual({ hp: 1, speed: 1 });
		expect(getWaveScaling(-5)).toEqual({ hp: 1, speed: 1 });
	});
});
