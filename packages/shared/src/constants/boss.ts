export interface BossPhaseConfig {
	/** HP ratio — transitions to phase 2 when HP falls below this */
	phaseTransitionRatio: number;
	/** HP ratio — transitions to phase 3 when HP falls below this.
	 *  Strictly less than `phaseTransitionRatio`. */
	phase3TransitionRatio: number;
	/** Invulnerability duration during phase transition (ms) */
	invulnerabilityMs: number;
	/** Phase 2 speed multiplier */
	phase2SpeedMultiplier: number;
	/** Phase 3 speed multiplier — stacks above phase 2 so the final stretch
	 *  keeps escalating instead of plateauing after the 50% spike. */
	phase3SpeedMultiplier: number;
	/** Phase 2 tint color */
	phase2Tint: number;
	/** Phase 3 tint color */
	phase3Tint: number;
}

export const BOSS_CONFIG: BossPhaseConfig = {
	phaseTransitionRatio: 0.5,
	phase3TransitionRatio: 0.25,
	// Phase 2 spike 완화 (invuln 500ms, ×1.15). Phase 3는 25% HP에서
	// 추가 속도 +35% — 50~25% 구간 평탄함 해소용 "마지막 러쉬".
	invulnerabilityMs: 500,
	phase2SpeedMultiplier: 1.15,
	phase3SpeedMultiplier: 1.35,
	phase2Tint: 0xff4444,
	phase3Tint: 0xff1a1a,
};

/** Wave 10 boss HP multiplier (nerfed from ×2 → ×1.5 for survivability) */
export const FINAL_BOSS_HP_MULTIPLIER = 1.5;
