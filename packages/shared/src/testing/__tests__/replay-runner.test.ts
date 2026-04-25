/**
 * replay-runner.test.ts — Phase 2 Task 2 TDD harness for the
 * shared replay runner. The runner is the headless TS twin of Unity's
 * MinimalReplayRunner; both must produce identical metric tuples for
 * the same fixture (parity gate enforced cross-runtime in Task 6).
 *
 * Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
 *   - §3.5 derives the bounded expected metrics shipped in the fixture.
 *   - §3.6 confirms the seed is recorded but unused at PoC scope (no CC
 *     towers consume RNG); determinism therefore follows from pure
 *     fixed-dt arithmetic.
 *
 * Test contract:
 *   1. runReplay(fixture) returns { events, metrics } with declared keys.
 *   2. metrics.kills equals fixture.expected.kills (point invariant).
 *   3. metrics.totalDamage falls inside fixture.expected.totalDamage.
 *   4. metrics.energyPeak falls inside fixture.expected.energyPeak.
 *   5. metrics.waveClearMs falls inside fixture.expected.waveClearMs.
 *   6. Two back-to-back runs are byte-identical when both event streams
 *      are projected through stableStringify.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stableStringify } from '../deterministic-json';
import { type ReplayFixture, runReplay } from '../replay-runner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(
	__dirname,
	'..',
	'replay-fixtures',
	'seed-001-slice2-poc.json',
);

function loadFixture(): ReplayFixture {
	const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
	return JSON.parse(raw) as ReplayFixture;
}

describe('runReplay — seed-001-slice2-poc', () => {
	it('returns the declared shape', () => {
		const fixture = loadFixture();
		const result = runReplay(fixture);
		expect(result).toHaveProperty('events');
		expect(result).toHaveProperty('metrics');
		expect(Array.isArray(result.events)).toBe(true);
		expect(typeof result.metrics).toBe('object');
		expect(result.metrics).toHaveProperty('kills');
		expect(result.metrics).toHaveProperty('totalDamage');
		expect(result.metrics).toHaveProperty('energyPeak');
		expect(result.metrics).toHaveProperty('waveClearMs');
	});

	it('matches the kills point invariant from §3.5', () => {
		const fixture = loadFixture();
		const result = runReplay(fixture);
		expect(result.metrics.kills).toBe(fixture.expected.kills);
	});

	it('totalDamage falls within the fixture-declared bound', () => {
		const fixture = loadFixture();
		const result = runReplay(fixture);
		expect(result.metrics.totalDamage).toBeGreaterThanOrEqual(
			fixture.expected.totalDamage.min,
		);
		expect(result.metrics.totalDamage).toBeLessThanOrEqual(
			fixture.expected.totalDamage.max,
		);
	});

	it('energyPeak falls within the fixture-declared bound', () => {
		const fixture = loadFixture();
		const result = runReplay(fixture);
		expect(result.metrics.energyPeak).toBeGreaterThanOrEqual(
			fixture.expected.energyPeak.min,
		);
		expect(result.metrics.energyPeak).toBeLessThanOrEqual(
			fixture.expected.energyPeak.max,
		);
	});

	it('waveClearMs falls within the fixture-declared bound', () => {
		const fixture = loadFixture();
		const result = runReplay(fixture);
		expect(result.metrics.waveClearMs).not.toBeNull();
		const t = result.metrics.waveClearMs as number;
		expect(t).toBeGreaterThanOrEqual(fixture.expected.waveClearMs.min);
		expect(t).toBeLessThanOrEqual(fixture.expected.waveClearMs.max);
	});

	it('is deterministic: two runs produce byte-identical event streams', () => {
		const fixture = loadFixture();
		const a = runReplay(fixture);
		const b = runReplay(fixture);
		expect(stableStringify(a.events)).toBe(stableStringify(b.events));
		expect(stableStringify(a.metrics)).toBe(stableStringify(b.metrics));
	});
});
