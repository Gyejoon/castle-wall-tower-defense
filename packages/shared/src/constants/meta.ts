import type { OwnedTower, SaveData } from '../types/save';
import { SAVE_VERSION } from '../types/save';

export function xpToNextLevel(level: number): number {
	return Math.floor(100 + (level - 1) * 50 + (level - 1) ** 2 * 5);
}

export function battleXp(wavesCleared: number, victory: boolean): number {
	return wavesCleared * 10 + (victory ? 50 : 0);
}

/** Tower enhancement cost scaling per tier (T1-T6). Phase-9 will revisit. */
const TIER_COST_MULT = [0, 1, 1.5, 2, 3, 5, 8];

export function enhancementCost(level: number, tier: number): number {
	const base = 100 + level * 40 + level * level * 3;
	const mult = TIER_COST_MULT[tier] ?? 1;
	return Math.floor(base * mult);
}

export function enhancementStatMultiplier(level: number): number {
	return 1 + (level - 1) * 0.04;
}

export function stunCooldownMultiplier(level: number): number {
	// LV.1~10: -1%/lv (누적 -9%), LV.11~30: -1%/lv 추가 (누적 -29%), LV.31~50: 플래토
	if (level <= 10) return 1 - (level - 1) * 0.01;
	if (level <= 30) return 0.91 - (level - 10) * 0.01;
	return 0.71;
}

export function stunDurationMultiplier(level: number): number {
	// LV.1~10: 1.0, LV.11~20: +2%/lv (1.0→1.2), LV.21~30: 플래토, LV.31~50: +1%/lv (1.2→1.4)
	if (level <= 10) return 1.0;
	if (level <= 20) return 1.0 + (level - 10) * 0.02;
	if (level <= 30) return 1.2;
	return 1.2 + (level - 30) * 0.01;
}

/**
 * Flat level cap across all tiers. Grade-based ascension is gone; Phase 9
 * will rebuild a real meta loop (Prestige / awakening / etc.).
 */
export const MAX_TOWER_LEVEL = 50;

/** Effective damage from base + level scaling. Grade bonus was dropped in
 *  Phase 1 — call sites should read tier from the tower def if they want
 *  balance scaling. */
export function getEffectiveStats(baseDamage: number, level: number): number {
	return baseDamage * enhancementStatMultiplier(level);
}

/** Wave 1 시작 전 플레이어 준비 시간(ms) — 튜토리얼 1회차 한정 */
export const INITIAL_PREP_MS = 5000;

const DEFAULT_STARTER_IDS = ['archer', 'nova_cannon', 'emp', 'shield'];

export function createDefaultSave(): SaveData {
	const now = Date.now();
	return {
		version: SAVE_VERSION,
		profile: {
			nickname: 'Commander',
			level: 1,
			xp: 0,
			gold: 500,
			diamond: 0,
			totalGoldEarned: 0,
			wins: 0,
			losses: 0,
			winStreak: 0,
			bestWinStreak: 0,
		},
		collection: DEFAULT_STARTER_IDS.map<OwnedTower>((defId) => ({
			defId,
			level: 1,
			tier: 1,
			acquiredAt: now,
			awakening: 0,
			duplicateCount: 0,
		})),
		progress: {
			highestWave: 0,
			totalBattles: 0,
			tutorialCompleted: false,
			gachaPityCount: 0,
			dailyFreeBoxClaimedAt: null,
			dailyAdBoxCount: 0,
			dailyResetAt: null,
		},
		settings: {
			bgmVolume: 0.7,
			sfxVolume: 0.8,
			screenShake: true,
			colorblindMode: 'off',
		},
		selectedDeck: [...DEFAULT_STARTER_IDS],
	};
}
