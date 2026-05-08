export class DeterministicRng {
	private state: number;

	constructor(seed: number) {
		this.state = seed >>> 0;
	}

	nextUint32(): number {
		this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
		return this.state;
	}

	nextFloat01(): number {
		return this.nextUint32() / 0x100000000;
	}

	nextInt(maxExclusive: number): number {
		if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
			throw new RangeError('maxExclusive must be a positive integer');
		}
		return Math.floor(this.nextFloat01() * maxExclusive);
	}

	nextRange(min: number, max: number): number {
		if (max < min) {
			throw new RangeError('max must be greater than or equal to min');
		}
		return min + (max - min) * this.nextFloat01();
	}
}
