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
 *   7. Underfunded `place_tower` emits `place_rejected` and does not
 *      consume energy.
 *   8. Projectiles whose impactTMs > durationMs surface as
 *      `projectile_dropped` events (no silent damage gap).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
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
	let fixture: ReplayFixture;

	beforeAll(() => {
		// Hoisted so all tests share the same parsed object — strengthens
		// the determinism check (catches in-place mutation regressions
		// that two separate parses would mask) and avoids 6× disk reads.
		fixture = loadFixture();
	});

	it('returns the declared shape', () => {
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
		const result = runReplay(fixture);
		expect(result.metrics.kills).toBe(fixture.expected.kills);
	});

	it('totalDamage falls within the fixture-declared bound', () => {
		const result = runReplay(fixture);
		expect(result.metrics.totalDamage).toBeGreaterThanOrEqual(
			fixture.expected.totalDamage.min,
		);
		expect(result.metrics.totalDamage).toBeLessThanOrEqual(
			fixture.expected.totalDamage.max,
		);
	});

	it('energyPeak falls within the fixture-declared bound', () => {
		const result = runReplay(fixture);
		expect(result.metrics.energyPeak).toBeGreaterThanOrEqual(
			fixture.expected.energyPeak.min,
		);
		expect(result.metrics.energyPeak).toBeLessThanOrEqual(
			fixture.expected.energyPeak.max,
		);
	});

	it('waveClearMs falls within the fixture-declared bound', () => {
		const result = runReplay(fixture);
		expect(result.metrics.waveClearMs).not.toBeNull();
		const t = result.metrics.waveClearMs as number;
		expect(t).toBeGreaterThanOrEqual(fixture.expected.waveClearMs.min);
		expect(t).toBeLessThanOrEqual(fixture.expected.waveClearMs.max);
	});

	it('is deterministic: two runs produce byte-identical event streams', () => {
		const a = runReplay(fixture);
		const b = runReplay(fixture);
		expect(stableStringify(a.events)).toBe(stableStringify(b.events));
		expect(stableStringify(a.metrics)).toBe(stableStringify(b.metrics));
	});
});

describe('runReplay — place_rejected on insufficient funds', () => {
	it('emits place_rejected and does not consume energy', () => {
		const base = loadFixture();
		// Archer cost is 20 ⚡; start with 10 ⚡ and gate regen so the
		// placement at t=100ms cannot succeed even with passive regen.
		const fixture: ReplayFixture = {
			...base,
			fixtureId: 'test-place-rejected',
			durationMs: 1000,
			energy: {
				initial: 10,
				regenPerSec: 0,
				cap: 10,
				regenGatedDuringPrep: false,
			},
			wave: { ...base.wave, count: 0 },
			events: [
				{ tMs: 100, kind: 'place_tower', towerId: 'archer', cell: [3, 14] },
			],
			expected: {
				kills: 0,
				totalDamage: { min: 0, max: 0 },
				waveClearMs: { min: 0, max: 0 },
				energyPeak: { min: 10, max: 10 },
			},
		};

		const result = runReplay(fixture);

		const rejected = result.events.filter((e) => e.kind === 'place_rejected');
		expect(rejected).toHaveLength(1);
		expect(rejected[0]).toMatchObject({
			tMs: 100,
			kind: 'place_rejected',
			towerId: 'archer',
			cell: [3, 14],
			reason: 'insufficient_funds',
		});

		// No tower was placed → no projectile launches, no kills.
		expect(result.events.some((e) => e.kind === 'tower_placed')).toBe(false);
		expect(result.metrics.kills).toBe(0);

		// Energy was NOT consumed: peak still equals the (constant) initial.
		expect(result.metrics.energyPeak).toBe(10);
	});
});

describe('runReplay — projectile_dropped on mid-flight termination', () => {
	it('emits projectile_dropped for hits scheduled past durationMs', () => {
		const base = loadFixture();
		// Truncate the run between an archer projectile's launch and its
		// scheduled impact. The locked fixture's first projectile launches
		// at ~7583ms with impactTMs ~8081ms (TTL 498ms); choosing
		// durationMs = 7700ms ends the sim mid-flight so flushPendingDamage
		// must emit at least one projectile_dropped event.
		const fixture: ReplayFixture = {
			...base,
			fixtureId: 'test-projectile-dropped',
			durationMs: 7700,
			expected: {
				kills: 0,
				totalDamage: { min: 0, max: 1000 },
				waveClearMs: { min: 0, max: 7700 },
				energyPeak: { min: 0, max: 200 },
			},
		};

		const result = runReplay(fixture);

		const dropped = result.events.filter(
			(e) => e.kind === 'projectile_dropped',
		);
		expect(dropped.length).toBeGreaterThan(0);

		for (const e of dropped) {
			// Convention: dropped events stamp tMs = durationMs and the
			// scheduled impact must lie strictly past it.
			expect(e.tMs).toBe(fixture.durationMs);
			if (e.kind === 'projectile_dropped') {
				expect(e.scheduledImpactTMs).toBeGreaterThan(fixture.durationMs);
			}
		}

		// Damage from a dropped projectile must NOT have been applied: every
		// dropped (tower, target, scheduledImpactTMs) tuple should match a
		// projectile_launched but never a damage_applied at that impact.
		const damageImpacts = new Set(
			result.events
				.filter((e) => e.kind === 'damage_applied')
				.map((e) => `${e.targetInstanceId}@${e.tMs}`),
		);
		for (const e of dropped) {
			if (e.kind !== 'projectile_dropped') continue;
			expect(
				damageImpacts.has(`${e.targetInstanceId}@${e.scheduledImpactTMs}`),
			).toBe(false);
		}
	});
});
