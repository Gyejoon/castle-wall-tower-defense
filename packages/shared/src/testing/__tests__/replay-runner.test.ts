import { describe, expect, it } from 'vitest';
import seed001 from '../replay-fixtures/seed-001-slice2-poc.json';
import seed002 from '../replay-fixtures/seed-002-gacha-stack.json';
import seed003 from '../replay-fixtures/seed-003-boss-wave-10-hp-bag.json';
import seed004 from '../replay-fixtures/seed-004-merge-chain.json';
import seed005 from '../replay-fixtures/seed-005-fast-clear-bonus.json';
import seed006 from '../replay-fixtures/seed-006-energy-cap.json';
import seed007 from '../replay-fixtures/seed-007-continue-run.json';
import seed008 from '../replay-fixtures/seed-008-meta-global-atk.json';
import seed009 from '../replay-fixtures/seed-009-3x-speed.json';
import seed010 from '../replay-fixtures/seed-010-tutorial-completion.json';
import {
	type ReplayFixture,
	replayMetricsToCsv,
	runReplay,
} from '../replay-runner';

const fixtures = [
	seed001,
	seed002,
	seed003,
	seed004,
	seed005,
	seed006,
	seed007,
	seed008,
	seed009,
	seed010,
] as ReplayFixture[];

describe('slice2 replay runner', () => {
	it('is deterministic for the same seed and placements', () => {
		const first = runReplay(seed001 as ReplayFixture);
		const second = runReplay(seed001 as ReplayFixture);

		expect(first).toEqual(second);
	});

	it('matches every Phase 3 baseline fixture that is not Phase 4 dependent', () => {
		for (const fixture of fixtures.filter(
			(item) => item.phase4_dependent !== true,
		)) {
			const result = runReplay(fixture);
			expect(result.metrics, fixture.fixtureId).toEqual(fixture.expected);
		}
	});

	it('marks deferred fixtures as Phase 4 dependent', () => {
		const deferred = fixtures
			.filter((item) => item.phase4_dependent === true)
			.map((item) => item.fixtureId);

		expect(deferred).toEqual([
			'seed-002-gacha-stack',
			'seed-004-merge-chain',
			'seed-007-continue-run',
			'seed-010-tutorial-completion',
		]);
	});

	it('emits a per-wave CSV ledger', () => {
		const rows = fixtures.flatMap((fixture) => runReplay(fixture).perWave);
		const csv = replayMetricsToCsv(rows);

		expect(csv.split('\n')[0]).toBe(
			'fixture_id,seed,wave,ts_damage,ts_kills,ts_clear_ms,phase4_dependent',
		);
		expect(csv).toContain('seed-009-3x-speed,66666,1,150,5,3083,false');
	});
});
