import { MIN_MOVE_SPEED, STUN_IMMUNITY_WINDOW_MS } from '@gld/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { CCStateManager } from '../../src/systems/units/CCStateManager';

describe('CCStateManager', () => {
	let cc: CCStateManager;

	beforeEach(() => {
		cc = new CCStateManager(() => 0.99); // RNG always above any resist threshold
	});

	describe('applySlow', () => {
		it('applies slow and returns true when unit exists and roll misses', () => {
			cc.register('u1', 0, 0);
			expect(cc.applySlow('u1', 0.5, 2000)).toBe(true);
			expect(cc.get('u1')?.slowFactor).toBe(0.5);
			expect(cc.get('u1')?.slowRemaining).toBe(2000);
		});

		it('keeps the stronger slow (lower factor) and longer duration', () => {
			cc.register('u1', 0, 0);
			cc.applySlow('u1', 0.5, 1000);
			// Weaker, shorter — both should lose to existing
			cc.applySlow('u1', 0.7, 500);
			expect(cc.get('u1')?.slowFactor).toBe(0.5);
			expect(cc.get('u1')?.slowRemaining).toBe(1000);

			// Stronger, longer — both should win
			cc.applySlow('u1', 0.3, 2000);
			expect(cc.get('u1')?.slowFactor).toBe(0.3);
			expect(cc.get('u1')?.slowRemaining).toBe(2000);
		});

		it('floors the factor at MIN_MOVE_SPEED', () => {
			cc.register('u1', 0, 0);
			cc.applySlow('u1', 0.01, 1000);
			expect(cc.get('u1')?.slowFactor).toBe(MIN_MOVE_SPEED);
		});

		it('ccResistance shortens effective duration', () => {
			cc.register('u1', 0.5, 0); // 50% resistance
			cc.applySlow('u1', 0.5, 1000);
			expect(cc.get('u1')?.slowRemaining).toBe(500); // 1000 * (1 - 0.5)
		});

		it('rejects slow when ccImmunityChance > 0 and rng rolls below it', () => {
			const low = new CCStateManager(() => 0.05);
			low.register('u1', 0, 0.1); // 10% immunity, roll 0.05 < 0.1 → resist
			expect(low.applySlow('u1', 0.5, 1000)).toBe(false);
			expect(low.get('u1')?.slowFactor).toBe(1);
		});

		it('returns false for unknown unit', () => {
			expect(cc.applySlow('unknown', 0.5, 1000)).toBe(false);
		});
	});

	describe('applyStun', () => {
		it('applies stun when unit is unregistered? returns false', () => {
			expect(cc.applyStun('unknown', 500, 0)).toBe(false);
		});

		it('applies stun and stores effective duration (ccResistance)', () => {
			cc.register('u1', 0.3, 0); // 30% resist
			expect(cc.applyStun('u1', 1000, 0)).toBe(true);
			expect(cc.get('u1')?.stunRemaining).toBeCloseTo(700);
		});

		it('rejects stun within stunImmunityUntil window', () => {
			cc.register('u1', 0, 0);
			// Manually set immunity window
			const state = cc.get('u1');
			if (!state) throw new Error('state');
			state.stunImmunityUntil = 5000;
			expect(cc.applyStun('u1', 500, 1000)).toBe(false);
			expect(cc.applyStun('u1', 500, 5001)).toBe(true);
		});

		it('rejects stun via ccImmunityChance roll', () => {
			const low = new CCStateManager(() => 0.05);
			low.register('u1', 0, 0.5);
			expect(low.applyStun('u1', 500, 0)).toBe(false);
		});
	});

	describe('tick', () => {
		it('decrements slow timer and resets factor when it expires', () => {
			cc.register('u1', 0, 0);
			cc.applySlow('u1', 0.5, 200);
			const r1 = cc.tick('u1', 100, 0);
			expect(r1.speedMultiplier).toBe(0.5);
			expect(r1.slowJustEnded).toBe(false);
			const r2 = cc.tick('u1', 100, 100);
			expect(r2.slowJustEnded).toBe(true);
			expect(cc.get('u1')?.slowFactor).toBe(1);
		});

		it('decrements stun timer and reports stunJustEnded once', () => {
			cc.register('u1', 0, 0);
			cc.applyStun('u1', 100, 0);
			const r1 = cc.tick('u1', 50, 10);
			expect(r1.isStunned).toBe(true);
			expect(r1.stunJustEnded).toBe(false);
			const r2 = cc.tick('u1', 100, 200);
			expect(r2.isStunned).toBe(false);
			expect(r2.stunJustEnded).toBe(true);
			// stunImmunityUntil is now = sceneNowMs + window
			expect(cc.get('u1')?.stunImmunityUntil).toBe(
				200 + STUN_IMMUNITY_WINDOW_MS,
			);
		});

		it('decrements invulnerability timer', () => {
			cc.register('u1', 0, 0);
			cc.setInvulnerable('u1', 500);
			expect(cc.isInvulnerable('u1')).toBe(true);
			cc.tick('u1', 500, 0);
			expect(cc.isInvulnerable('u1')).toBe(false);
		});

		it('returns safe defaults for unknown unit', () => {
			const r = cc.tick('missing', 100, 0);
			expect(r).toEqual({
				speedMultiplier: 1,
				isStunned: false,
				stunJustEnded: false,
				slowJustEnded: false,
			});
		});
	});

	describe('clear / unregister', () => {
		it('clear drops all state', () => {
			cc.register('u1', 0, 0);
			cc.register('u2', 0, 0);
			cc.clear();
			expect(cc.get('u1')).toBeUndefined();
			expect(cc.get('u2')).toBeUndefined();
		});
	});
});
