import { MIN_MOVE_SPEED, STUN_IMMUNITY_WINDOW_MS } from '@gld/shared';

/**
 * Phase 3 refactor — per-unit CC (slow/stun) state extracted from
 * UnitSystem. Keeps the deterministic `ccResistance` duration cut
 * separate from the probabilistic `ccImmunityChance` resist roll,
 * mirroring the legacy UnitSystem semantics exactly.
 */
export interface CCState {
	/** 1.0 = no slow, < 1.0 = slower. Floored at MIN_MOVE_SPEED when applied. */
	slowFactor: number;
	slowRemaining: number;
	stunRemaining: number;
	/** Boss phase-transition invulnerability window (ms). */
	invulnerableMs: number;
	/** 0..1 deterministic duration cut for applied CC. */
	ccResistance: number;
	/** 0..1 probabilistic resist roll — dodge chance per CC application. */
	ccImmunityChance: number;
	/** Scene-time (ms) until which new stuns are rejected. */
	stunImmunityUntil: number;
}

export interface CCTickResult {
	/** Speed multiplier to apply to the unit's base move speed (1 = full,
	 *  < 1 for slow). Equal to `slowFactor`. */
	speedMultiplier: number;
	/** True if the unit is currently stunned. */
	isStunned: boolean;
	/** True if the stun just ended this tick. Caller applies the
	 *  `stunImmunityUntil = sceneNowMs + STUN_IMMUNITY_WINDOW_MS` window. */
	stunJustEnded: boolean;
	/** True if the slow just ended this tick. */
	slowJustEnded: boolean;
}

export class CCStateManager {
	private states = new Map<string, CCState>();

	constructor(private rng: () => number = Math.random) {}

	setRng(rng: () => number): void {
		this.rng = rng;
	}

	register(
		unitId: string,
		ccResistance: number,
		ccImmunityChance: number,
	): CCState {
		const state: CCState = {
			slowFactor: 1,
			slowRemaining: 0,
			stunRemaining: 0,
			invulnerableMs: 0,
			ccResistance,
			ccImmunityChance,
			stunImmunityUntil: 0,
		};
		this.states.set(unitId, state);
		return state;
	}

	get(unitId: string): CCState | undefined {
		return this.states.get(unitId);
	}

	unregister(unitId: string): void {
		this.states.delete(unitId);
	}

	/**
	 * Apply a slow effect. Mirrors legacy `UnitSystem.applySlow`:
	 *  - `ccImmunityChance > 0 && rng() < ccImmunityChance` → resisted.
	 *  - Duration multiplied by `(1 - ccResistance)`.
	 *  - Factor floored at `MIN_MOVE_SPEED`.
	 *  - Stronger slow wins (`Math.min` on factor); longer duration wins
	 *    (`Math.max` on remaining).
	 *
	 * Returns true if the slow was applied; false if resisted.
	 */
	applySlow(unitId: string, factor: number, durationMs: number): boolean {
		const state = this.states.get(unitId);
		if (!state) return false;
		if (state.ccImmunityChance > 0 && this.rng() < state.ccImmunityChance) {
			return false; // CC resisted
		}
		const effectiveDuration = durationMs * (1 - state.ccResistance);
		const flooredFactor = Math.max(MIN_MOVE_SPEED, factor);
		state.slowFactor = Math.min(state.slowFactor, flooredFactor);
		state.slowRemaining = Math.max(state.slowRemaining, effectiveDuration);
		return true;
	}

	/**
	 * Apply a stun effect. Mirrors legacy `UnitSystem.applyStun`:
	 *  - Resist roll as above.
	 *  - Refused inside the post-stun immunity window.
	 *  - Duration multiplied by `(1 - ccResistance)`.
	 *
	 * Returns true if the stun was applied; false if resisted / inside immunity window.
	 */
	applyStun(unitId: string, durationMs: number, sceneNowMs: number): boolean {
		const state = this.states.get(unitId);
		if (!state) return false;
		if (state.ccImmunityChance > 0 && this.rng() < state.ccImmunityChance) {
			return false;
		}
		if (sceneNowMs < state.stunImmunityUntil) return false;
		const effectiveDuration = durationMs * (1 - state.ccResistance);
		state.stunRemaining = Math.max(state.stunRemaining, effectiveDuration);
		return true;
	}

	/**
	 * Per-frame tick: decrements slow/stun/invuln timers and reports the
	 * unit's current movement state. Sets `stunImmunityUntil` automatically
	 * when a stun ends.
	 */
	tick(unitId: string, dtMs: number, sceneNowMs: number): CCTickResult {
		const state = this.states.get(unitId);
		if (!state) {
			return {
				speedMultiplier: 1,
				isStunned: false,
				stunJustEnded: false,
				slowJustEnded: false,
			};
		}

		if (state.invulnerableMs > 0) {
			state.invulnerableMs = Math.max(0, state.invulnerableMs - dtMs);
		}

		// Slow tick
		let slowJustEnded = false;
		if (state.slowRemaining > 0) {
			state.slowRemaining = Math.max(0, state.slowRemaining - dtMs);
			if (state.slowRemaining === 0) {
				state.slowFactor = 1;
				slowJustEnded = true;
			}
		}

		// Stun tick
		const wasStunned = state.stunRemaining > 0;
		if (state.stunRemaining > 0) {
			state.stunRemaining = Math.max(0, state.stunRemaining - dtMs);
		}
		const stunJustEnded = wasStunned && state.stunRemaining === 0;
		if (stunJustEnded) {
			state.stunImmunityUntil = sceneNowMs + STUN_IMMUNITY_WINDOW_MS;
		}

		return {
			speedMultiplier: state.slowFactor,
			isStunned: state.stunRemaining > 0,
			stunJustEnded,
			slowJustEnded,
		};
	}

	/** For boss phase transitions — set invulnerability directly. */
	setInvulnerable(unitId: string, durationMs: number): void {
		const state = this.states.get(unitId);
		if (!state) return;
		state.invulnerableMs = durationMs;
	}

	isInvulnerable(unitId: string): boolean {
		const state = this.states.get(unitId);
		return (state?.invulnerableMs ?? 0) > 0;
	}

	/** True iff a slow is currently active. */
	isSlowed(unitId: string): boolean {
		const state = this.states.get(unitId);
		return (state?.slowRemaining ?? 0) > 0;
	}

	/** True iff a stun is currently active. */
	isStunned(unitId: string): boolean {
		const state = this.states.get(unitId);
		return (state?.stunRemaining ?? 0) > 0;
	}

	clear(): void {
		this.states.clear();
	}
}
