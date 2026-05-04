import fixture from '../replay-fixtures/seed-001-slice2-poc.json';
import { runReplay, type ReplayFixture } from '../replay-runner';
import { describe, expect, it } from 'vitest';

describe('slice2 replay runner', () => {
	it('is deterministic for the same seed and placements', () => {
		const first = runReplay(fixture as ReplayFixture);
		const second = runReplay(fixture as ReplayFixture);

		expect(first).toEqual(second);
	});

	it('matches the seed-001 PoC baseline fixture', () => {
		const result = runReplay(fixture as ReplayFixture);

		expect(result.metrics).toEqual(fixture.expected);
	});
});
