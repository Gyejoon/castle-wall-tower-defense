// 정식 모드 energy constants.
// Wave-clear energy bonus is removed; energy now comes from passive regen,
// kills, and boss-kill rewards. See docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md.

export const ENERGY_PER_SECOND = 1;
export const ENERGY_INITIAL = 40;
export const ENERGY_MAX = 200;
export const ENERGY_PER_KILL = 1;
export const ENERGY_PER_WAVE_CLEAR = 20;
export const ENERGY_PER_BOSS_KILL = 20;
export const ENERGY_PER_BOSS_FAST_CLEAR = 20;
export const FAST_CLEAR_THRESHOLD_MS = 30_000;

export const INGAME_GACHA = {
	tier2: { cost: 40, successRate: 0.6 },
	tier3: { cost: 80, successRate: 0.2 },
	tier4: { cost: 160, successRate: 0.05 },
} as const;

// Legacy aliases kept to minimise churn during the Phase 3 migration.
// Downstream callers should migrate to the names above; these re-exports
// let existing imports continue to compile.
export const ENERGY_PER_SEC = ENERGY_PER_SECOND;
export const INITIAL_ENERGY = ENERGY_INITIAL;
export const ENERGY_CAP = ENERGY_MAX;
