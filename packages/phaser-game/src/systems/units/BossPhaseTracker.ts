import { BOSS_CONFIG } from '@gld/shared';

export type BossPhase = 1 | 2 | 3;

export interface BossPhaseTransition {
	phase: 2 | 3;
	invulnerabilityMs: number;
	tint: number;
	// Phase 2 전용. Phase 3에선 rage 텍스처를 그대로 유지한다.
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

	onDamage(
		unitId: string,
		hp: number,
		maxHp: number,
	): BossPhaseTransition | null {
		const current = this.phases.get(unitId);
		if (!current || hp <= 0) return null;

		if (current === 1 && hp <= maxHp * BOSS_CONFIG.phaseTransitionRatio) {
			this.phases.set(unitId, 2);
			return {
				phase: 2,
				invulnerabilityMs: BOSS_CONFIG.invulnerabilityMs,
				tint: BOSS_CONFIG.phase2Tint,
				swapTexture: true,
			};
		}
		if (current === 2 && hp <= maxHp * BOSS_CONFIG.phase3TransitionRatio) {
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
