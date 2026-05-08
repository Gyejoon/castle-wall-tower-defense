import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '../deterministic-rng';

const SEED_12345_FIRST_20 = [
	87628868, 71072467, 2332836374, 2726892157, 3908547000, 483019191, 2129828778,
	2355140353, 2560230508, 3364893915, 171172990, 3194601925, 4148119648,
	316399679, 3004788882, 1976948425, 1702883732, 4121112547, 1744294886,
	4092090893,
];

describe('DeterministicRng', () => {
	it('matches the golden LCG sequence for seed 12345', () => {
		const rng = new DeterministicRng(12345);

		expect(Array.from({ length: 20 }, () => rng.nextUint32())).toEqual(
			SEED_12345_FIRST_20,
		);
	});

	it('normalizes signed and large seeds to uint32 state', () => {
		const negative = new DeterministicRng(-1);
		const uint = new DeterministicRng(0xffffffff);

		expect(negative.nextUint32()).toBe(uint.nextUint32());
	});

	it('returns bounded ints and ranges', () => {
		const rng = new DeterministicRng(12345);

		for (let i = 0; i < 100; i++) {
			const n = rng.nextInt(7);
			expect(n).toBeGreaterThanOrEqual(0);
			expect(n).toBeLessThan(7);
		}

		const ranged = rng.nextRange(10, 20);
		expect(ranged).toBeGreaterThanOrEqual(10);
		expect(ranged).toBeLessThanOrEqual(20);
	});
});
