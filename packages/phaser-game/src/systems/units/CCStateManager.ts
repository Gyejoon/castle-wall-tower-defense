import { MIN_MOVE_SPEED, STUN_IMMUNITY_WINDOW_MS } from '@gld/shared';

// ccResistance(결정적 duration 감소)와 ccImmunityChance(확률적 회피)는 별개다.
export interface CCState {
	slowFactor: number;
	slowRemaining: number;
	stunRemaining: number;
	invulnerableMs: number;
	ccResistance: number;
	ccImmunityChance: number;
	stunImmunityUntil: number;
}

export interface CCTickResult {
	speedMultiplier: number;
	isStunned: boolean;
	stunJustEnded: boolean;
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

	// 강한 slow와 긴 duration이 승리 (Math.min / Math.max).
	applySlow(unitId: string, factor: number, durationMs: number): boolean {
		const state = this.states.get(unitId);
		if (!state) return false;
		if (state.ccImmunityChance > 0 && this.rng() < state.ccImmunityChance) {
			return false;
		}
		const effectiveDuration = durationMs * (1 - state.ccResistance);
		const flooredFactor = Math.max(MIN_MOVE_SPEED, factor);
		state.slowFactor = Math.min(state.slowFactor, flooredFactor);
		state.slowRemaining = Math.max(state.slowRemaining, effectiveDuration);
		return true;
	}

	// post-stun immunity window 내에는 거부된다.
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

	// stun 종료 시 stunImmunityUntil을 자동 설정한다.
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

		let slowJustEnded = false;
		if (state.slowRemaining > 0) {
			state.slowRemaining = Math.max(0, state.slowRemaining - dtMs);
			if (state.slowRemaining === 0) {
				state.slowFactor = 1;
				slowJustEnded = true;
			}
		}

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

	setInvulnerable(unitId: string, durationMs: number): void {
		const state = this.states.get(unitId);
		if (!state) return;
		state.invulnerableMs = durationMs;
	}

	isInvulnerable(unitId: string): boolean {
		const state = this.states.get(unitId);
		return (state?.invulnerableMs ?? 0) > 0;
	}

	isSlowed(unitId: string): boolean {
		const state = this.states.get(unitId);
		return (state?.slowRemaining ?? 0) > 0;
	}

	isStunned(unitId: string): boolean {
		const state = this.states.get(unitId);
		return (state?.stunRemaining ?? 0) > 0;
	}

	clear(): void {
		this.states.clear();
	}
}
