export interface BossPhaseConfig {
	/** HP ratio — transitions to phase 2 when HP falls below this */
	phaseTransitionRatio: number;
	/** Invulnerability duration during phase transition (ms) */
	invulnerabilityMs: number;
	/** Phase 2 speed multiplier */
	phase2SpeedMultiplier: number;
	/** Phase 2 tint color */
	phase2Tint: number;
}

export const BOSS_CONFIG: BossPhaseConfig = {
	phaseTransitionRatio: 0.5,
	invulnerabilityMs: 1000,
	phase2SpeedMultiplier: 1.3,
	phase2Tint: 0xff4444,
};

/** Wave 10 boss HP multiplier (nerfed from ×2 → ×1.5 for survivability) */
export const FINAL_BOSS_HP_MULTIPLIER = 1.5;
