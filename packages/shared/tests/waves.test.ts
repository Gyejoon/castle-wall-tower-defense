import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	getTotalWavesForMap,
	getWaveScaling,
	getWavesForMap,
	HP_SLOPE,
} from '../src/constants/waves';
import { generateWaves } from '../src/data/waves';

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

describe('getWavesForMap (정식 모드 wave set)', () => {
	it('returns the wave set regardless of mapId', () => {
		expect(getWavesForMap('main_long')).toEqual(getWavesForMap('anything'));
	});

	it('wave set is 50 waves long', () => {
		expect(getTotalWavesForMap('main_long')).toBe(50);
	});

	it('every wave uses only known unit ids with positive counts', () => {
		const waves = getWavesForMap('main_long');
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

describe('generateWaves', () => {
	const waveSet = generateWaves(50);

	it('generates exactly the requested number of waves', () => {
		expect(waveSet).toHaveLength(50);
	});

	it('slotIndex is sequential 1..n', () => {
		waveSet.forEach((w, i) => {
			expect(w.slotIndex).toBe(i + 1);
		});
	});

	it('every 10th wave is a boss, others are normal', () => {
		for (const w of waveSet) {
			if (w.slotIndex % 10 === 0) {
				expect(w.kind).toBe('boss');
			} else {
				expect(w.kind).toBe('normal');
			}
		}
	});

	it('5 고유 보스 라인업 (orc → forge → archmage → archmage+hp×2.5 → dragon)', () => {
		const bossWaves = waveSet.filter((w) => w.kind === 'boss');
		expect(bossWaves).toHaveLength(5);
		const expectedBosses = [
			'orc_warlord',
			'forge_master',
			'corrupted_archmage',
			'corrupted_archmage',
			'dragon',
		];
		bossWaves.forEach((w, i) => {
			expect(w.groups[0].unitId).toBe(expectedBosses[i]);
			expect(w.groups[0].count).toBe(1);
		});
	});

	it('wave 40 archmage에 hpMultiplier 2.5 붙어 wave 30 archmage보다 확실히 세다', () => {
		const wave30 = waveSet.find((w) => w.slotIndex === 30);
		const wave40 = waveSet.find((w) => w.slotIndex === 40);
		expect(wave30?.groups[0].hpMultiplier).toBeUndefined();
		expect(wave40?.groups[0].hpMultiplier).toBe(2.5);
	});

	it('wave 50 dragon은 기본 escort로 flame_imp 6마리 동반', () => {
		const wave50 = waveSet.find((w) => w.slotIndex === 50);
		expect(wave50?.groups[0].unitId).toBe('dragon');
		const flameImps = wave50?.groups.find((g) => g.unitId === 'flame_imp');
		expect(flameImps?.count).toBe(6);
	});

	it('normal waves carry 30 units', () => {
		const normalWaves = waveSet.filter((w) => w.kind === 'normal');
		for (const w of normalWaves) {
			const total = w.groups.reduce((s, g) => s + g.count, 0);
			expect(total).toBe(w.slotIndex === 1 ? 12 : 30);
		}
	});

	it('unit composition diversifies as slot index grows', () => {
		const w1 = waveSet[0];
		const w21 = waveSet[20];
		expect(w1.groups.length).toBeGreaterThan(1);
		expect(w21.groups.length).toBeGreaterThan(1);
	});

	it('wave 1 shows every monster silhouette for asset QA', () => {
		const w1 = waveSet[0];
		const ids = new Set(w1.groups.map((g) => g.unitId));
		expect(ids).toEqual(new Set(UNITS.map((u) => u.id)));
		expect(w1.groups.reduce((sum, group) => sum + group.count, 0)).toBe(12);
	});

	it('stealth_drone appears in wave 1 showcase and regular late waves', () => {
		const stealthWaves = waveSet.filter((w) =>
			w.groups.some((g) => g.unitId === 'stealth_drone'),
		);
		expect(stealthWaves.length).toBeGreaterThan(0);
		expect(stealthWaves[0].slotIndex).toBe(1);
		expect(stealthWaves.some((wave) => wave.slotIndex >= 20)).toBe(true);
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

	it('slot 11+ scales linearly — hp += HP_SLOPE per slot, speed +0.03', () => {
		expect(getWaveScaling(11).hp).toBeCloseTo(3.8 + HP_SLOPE, 5);
		expect(getWaveScaling(20).hp).toBeCloseTo(3.8 + 10 * HP_SLOPE, 5);
		expect(getWaveScaling(11).speed).toBeCloseTo(1.15 + 0.03, 5);
	});

	it('linear slope keeps hp finite at slot 100 (exponential regression guard)', () => {
		const hp = getWaveScaling(100).hp;
		expect(Number.isFinite(hp)).toBe(true);
		// With slope 0.55 over 90 extra waves: 3.8 + 90*0.55 = 53.3 — well
		// below the exponential curve's ~1.8×10^6 at slot 100.
		expect(hp).toBeLessThan(100);
	});

	it('boss slot gap is consistent between W10 and W20 under linear scaling', () => {
		const w10 = getWaveScaling(10).hp;
		const w20 = getWaveScaling(20).hp;
		expect(w20).toBeCloseTo(w10 + 10 * HP_SLOPE, 5);
	});

	it('speed is capped at 2.2', () => {
		expect(getWaveScaling(100).speed).toBeLessThanOrEqual(2.2);
	});

	it('slot <= 0 falls back to hp=1 speed=1', () => {
		expect(getWaveScaling(0)).toEqual({ hp: 1, speed: 1 });
		expect(getWaveScaling(-5)).toEqual({ hp: 1, speed: 1 });
	});
});
