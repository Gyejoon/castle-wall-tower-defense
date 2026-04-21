import { BOSS_CONFIG } from '@gld/shared';

/**
 * Phase 3 refactor — boss phase transition state extracted from
 * UnitSystem. Tracks each boss's current phase (1/2/3) and fires the
 * 50%/25% HP transition descriptors. The caller (UnitSystem) performs
 * the actual tint/texture swap + EventBus emit.
 */
export type BossPhase = 1 | 2 | 3;

export interface BossPhaseTransition {
	phase: 2 | 3;
	invulnerabilityMs: number;
	tint: number;
	/** True on phase 2 only — caller should attempt rage-texture swap. */
	swapTexture: boolean;
}

export class BossPhaseTracker {
	private phases = new Map<string, BossPhase>();

	register(unitId: string): void {
		this.phases.set(unitId, 1);
	}

	getPhase(unitId: string): BossPhase {
		return this.phases.get(unitId) ?? 1;
	}

	unregister(unitId: string): void {
		this.phases.delete(unitId);
	}

	/**
	 * Check for phase transitions given the unit's current HP + max HP.
	 * Returns a transition descriptor if a new phase fires, else null.
	 * Mirrors legacy UnitSystem phase-transition block:
	 *
	 *  - Phase 1 → 2 when HP <= maxHp * phaseTransitionRatio (0.5).
	 *  - Phase 2 → 3 when HP <= maxHp * phase3TransitionRatio (0.25).
	 *  - Only fires while HP > 0 (dead units don't transition).
	 */
	onDamage(
		unitId: string,
		hp: number,
		maxHp: number,
	): BossPhaseTransition | null {
		const current = this.phases.get(unitId);
		if (!current || hp <= 0) return null;

		if (
			current === 1 &&
			hp <= maxHp * BOSS_CONFIG.phaseTransitionRatio
		) {
			this.phases.set(unitId, 2);
			return {
				phase: 2,
				invulnerabilityMs: BOSS_CONFIG.invulnerabilityMs,
				tint: BOSS_CONFIG.phase2Tint,
				swapTexture: true,
			};
		}
		if (
			current === 2 &&
			hp <= maxHp * BOSS_CONFIG.phase3TransitionRatio
		) {
			this.phases.set(unitId, 3);
			return {
				phase: 3,
				invulnerabilityMs: BOSS_CONFIG.invulnerabilityMs,
				tint: BOSS_CONFIG.phase3Tint,
				swapTexture: false,
			};
		}
		return null;
	}

	clear(): void {
		this.phases.clear();
	}
}
