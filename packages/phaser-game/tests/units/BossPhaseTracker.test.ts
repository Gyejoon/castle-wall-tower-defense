import { BOSS_CONFIG } from '@gld/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { BossPhaseTracker } from '../../src/systems/units/BossPhaseTracker';

describe('BossPhaseTracker', () => {
	let tracker: BossPhaseTracker;

	beforeEach(() => {
		tracker = new BossPhaseTracker();
	});

	it('starts in phase 1 after register', () => {
		tracker.register('boss');
		expect(tracker.getPhase('boss')).toBe(1);
	});

	it('returns 1 for unregistered unit', () => {
		expect(tracker.getPhase('missing')).toBe(1);
	});

	it('transitions to phase 2 exactly at 50% HP', () => {
		tracker.register('boss');
		const t = tracker.onDamage('boss', 500, 1000);
		expect(t).not.toBeNull();
		expect(t?.phase).toBe(2);
		expect(t?.tint).toBe(BOSS_CONFIG.phase2Tint);
		expect(t?.swapTexture).toBe(true);
		expect(t?.invulnerabilityMs).toBe(BOSS_CONFIG.invulnerabilityMs);
		expect(tracker.getPhase('boss')).toBe(2);
	});

	it('does not transition above 50% HP', () => {
		tracker.register('boss');
		const t = tracker.onDamage('boss', 510, 1000); // 51% HP
		expect(t).toBeNull();
		expect(tracker.getPhase('boss')).toBe(1);
	});

	it('transitions to phase 3 exactly at 25% HP', () => {
		tracker.register('boss');
		// First get to phase 2
		tracker.onDamage('boss', 500, 1000);
		// Now trigger phase 3
		const t = tracker.onDamage('boss', 250, 1000);
		expect(t).not.toBeNull();
		expect(t?.phase).toBe(3);
		expect(t?.tint).toBe(BOSS_CONFIG.phase3Tint);
		expect(t?.swapTexture).toBe(false);
		expect(tracker.getPhase('boss')).toBe(3);
	});

	it('does not trigger transition at or below 0 HP', () => {
		tracker.register('boss');
		expect(tracker.onDamage('boss', 0, 1000)).toBeNull();
		expect(tracker.onDamage('boss', -50, 1000)).toBeNull();
	});

	it('does not re-fire a transition once already in that phase', () => {
		tracker.register('boss');
		expect(tracker.onDamage('boss', 500, 1000)).not.toBeNull(); // → 2
		// In phase 2, 40% HP still not at 25% threshold — no transition
		expect(tracker.onDamage('boss', 400, 1000)).toBeNull();
		expect(tracker.getPhase('boss')).toBe(2);
	});

	it('returns null for unregistered boss', () => {
		expect(tracker.onDamage('missing', 100, 1000)).toBeNull();
	});

	it('unregister removes the phase entry', () => {
		tracker.register('boss');
		tracker.onDamage('boss', 500, 1000); // → 2
		tracker.unregister('boss');
		expect(tracker.onDamage('boss', 100, 1000)).toBeNull();
	});

	it('clear drops all entries', () => {
		tracker.register('a');
		tracker.register('b');
		tracker.clear();
		expect(tracker.onDamage('a', 100, 1000)).toBeNull();
		expect(tracker.onDamage('b', 100, 1000)).toBeNull();
	});
});
