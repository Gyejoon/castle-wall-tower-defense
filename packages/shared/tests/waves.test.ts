import { describe, expect, it } from 'vitest';
import { UNITS } from '../src/constants/units';
import {
	getTotalWavesForMap,
	getWaveScaling,
	getWavesForMap,
	ACTS,
	CHECKPOINT_WAVES,
	HP_SLOPE,
	getActForWave,
	isCheckpointWave,
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

	it('active v1 wave set is 20 waves long', () => {
		expect(getTotalWavesForMap('main_long')).toBe(20);
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
	const waveSet = generateWaves(20);

	it('generates exactly the requested number of waves', () => {
		expect(waveSet).toHaveLength(20);
	});

	it('slotIndex is sequential 1..n', () => {
		waveSet.forEach((w, i) => {
			expect(w.slotIndex).toBe(i + 1);
		});
	});

	it('GDD v1 boss slots are waves 5, 10, 15, and 20', () => {
		const bossSlots = new Set(CHECKPOINT_WAVES);
		for (const w of waveSet) {
			if (bossSlots.has(w.slotIndex)) {
				expect(w.kind).toBe('boss');
			} else {
				expect(w.kind).toBe('normal');
			}
		}
	});

	it('maps active waves into four 5-wave Acts and checkpoint waves', () => {
		expect(ACTS).toEqual([
			{ actIndex: 1, startWave: 1, endWave: 5 },
			{ actIndex: 2, startWave: 6, endWave: 10 },
			{ actIndex: 3, startWave: 11, endWave: 15 },
			{ actIndex: 4, startWave: 16, endWave: 20 },
		]);
		expect(getActForWave(1).actIndex).toBe(1);
		expect(getActForWave(6).actIndex).toBe(2);
		expect(getActForWave(20).actIndex).toBe(4);
		expect([5, 10, 15, 20].every(isCheckpointWave)).toBe(true);
		expect(isCheckpointWave(11)).toBe(false);
	});

	it('v1 uses a compact 2-3 boss lineup across the active 20 waves', () => {
		const bossWaves = waveSet.filter((w) => w.kind === 'boss');
		expect(bossWaves).toHaveLength(4);
		const uniqueBosses = new Set(bossWaves.map((w) => w.groups[0].unitId));
		expect(uniqueBosses.size).toBeGreaterThanOrEqual(2);
		expect(uniqueBosses.size).toBeLessThanOrEqual(3);
		bossWaves.forEach((w) => {
			expect(w.groups[0].count).toBe(1);
		});
	});

	it('wave 20 is the active v1 final boss pressure point', () => {
		const wave15 = waveSet.find((w) => w.slotIndex === 15);
		const wave20 = waveSet.find((w) => w.slotIndex === 20);
		expect(wave15?.kind).toBe('boss');
		expect(wave20?.kind).toBe('boss');
		expect(wave20?.groups[0].hpMultiplier ?? 1).toBeGreaterThan(
			wave15?.groups[0].hpMultiplier ?? 1,
		);
	});

	it('normal waves carry 30 units', () => {
		const normalWaves = waveSet.filter((w) => w.kind === 'normal');
		for (const w of normalWaves) {
			const total = w.groups.reduce((s, g) => s + g.count, 0);
			expect(total).toBe(30);
		}
	});

	it('unit composition diversifies as slot index grows', () => {
		const w1 = waveSet[0];
		const w16 = waveSet[15];
		expect(w1.groups).toEqual([{ unitId: 'scout_drone', count: 30 }]);
		expect(w16.groups.length).toBeGreaterThan(1);
	});

	it('wave 1 starts with the basic scout pack', () => {
		const w1 = waveSet[0];
		expect(w1.groups).toEqual([{ unitId: 'scout_drone', count: 30 }]);
	});

	it('stealth_drone remains available in debug waves beyond the v1 active arc', () => {
		const debugWaves = generateWaves(50);
		const stealthWaves = debugWaves.filter((w) =>
			w.groups.some((g) => g.unitId === 'stealth_drone'),
		);
		expect(stealthWaves.length).toBeGreaterThan(0);
		expect(stealthWaves[0].slotIndex).toBeGreaterThanOrEqual(20);
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
