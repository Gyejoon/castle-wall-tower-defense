import type { TowerFamily, TowerId } from '@gld/shared';
import { resolveMerge } from '@gld/shared';

/**
 * Phase 2: family/tier-aware merge locator. Carries everything the merge
 * resolver needs (family/tier) plus instance identity so callers can remove
 * consumed towers by id. `x`/`y` are the locator's world or grid coordinates
 * — MergeSystem doesn't interpret them, they flow through so the caller can
 * decide where to spawn the result tower.
 */
export interface TowerLocator {
	instanceId: string;
	towerId: TowerId;
	family: TowerFamily;
	tier: number;
	x: number;
	y: number;
}

export type MergeFailReason =
	| 'same-instance'
	| 'incompatible-pair'
	| 'max-tier';

export type MergeResult =
	| {
			kind: 'success';
			toTowerId: TowerId;
			toTier: number;
			consumedA: string;
			consumedB: string;
	  }
	| { kind: 'failure'; reason: MergeFailReason };

/**
 * Family/tier merge resolver. See `resolveMerge` in @gld/shared for the
 * full chain table. This class is stateless — `tryMerge` is static.
 */
export class MergeSystem {
	static tryMerge(a: TowerLocator, b: TowerLocator): MergeResult {
		if (a.instanceId === b.instanceId) {
			return { kind: 'failure', reason: 'same-instance' };
		}
		if (a.tier >= 6 || b.tier >= 6) {
			return { kind: 'failure', reason: 'max-tier' };
		}
		const next = resolveMerge(
			a.towerId,
			a.tier,
			a.family,
			b.towerId,
			b.tier,
			b.family,
		);
		if (!next) return { kind: 'failure', reason: 'incompatible-pair' };
		const nextTier =
			a.tier === b.tier ? a.tier + 1 : Math.max(a.tier, b.tier) + 1;
		return {
			kind: 'success',
			toTowerId: next,
			toTier: nextTier,
			consumedA: a.instanceId,
			consumedB: b.instanceId,
		};
	}
}
