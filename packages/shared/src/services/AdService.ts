/**
 * BM (business-model) ad stub contract. Shared across phaser-game (orchestrator)
 * and web-shell (GameOverScreen) so both sides reference the same types.
 *
 * Phase 10 wires `MockAdService` as the default implementation — it logs the
 * placement and returns `'rewarded'` after a short delay. Production-grade
 * provider integration (AdMob / Unity Ads / etc.) slots in behind this
 * interface without touching call sites.
 */

/**
 * Where in the game flow the ad is shown. Phase 10 defines two placements:
 * - `continue` → post-defeat "이어서 하기" revival.
 * - `reroll`   → in-run upgrade-choice reroll.
 */
export type AdPlacement = 'continue' | 'reroll';

/**
 * Outcome of a single ad watch.
 * - `rewarded` → viewer completed the ad; grant the reward.
 * - `skipped`  → viewer dismissed before completion; no reward.
 * - `error`    → provider-side failure (offline, quota, etc.); no reward,
 *   caller may allow a retry.
 */
export type AdResult = 'rewarded' | 'skipped' | 'error';

export interface AdService {
	watchAd(placement: AdPlacement): Promise<AdResult>;
}

/**
 * Phase 10 stub — always resolves to `'rewarded'` after a 500 ms delay so the
 * UI can surface a loading state. Swap for a real provider in Phase 12+.
 */
export const MockAdService: AdService = {
	async watchAd(placement) {
		console.info(`[ad] watch ${placement}`);
		await new Promise((r) => setTimeout(r, 500));
		return 'rewarded';
	},
};
