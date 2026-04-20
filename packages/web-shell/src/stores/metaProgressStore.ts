import type { TowerFamily } from '@gld/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PerkId = string;

/**
 * Phase 9 meta progression store. Stores roguelike run-agnostic
 * progression that persists across runs:
 *  - `globalAtkPct` — flat damage multiplier applied to every tower via
 *    `TowerSystem.setGlobalModifiers()` in Game.create().
 *  - `familyPerks` — per-family perks purchased in the MetaForge.
 *  - `permanentUpgrades` — stackable global perks (crit, range, etc.).
 *
 * Kept separate from `metaStore` (profile/collection/settings) because it
 * has a narrower concern, its own localStorage key, and should be testable
 * without the save-migration machinery.
 *
 * Per 08-architecture §1: Zustand MUST live in web-shell, not @gld/shared.
 */
interface MetaState {
	version: 1;
	familyPerks: Record<TowerFamily, PerkId[]>;
	globalAtkPct: number;
	permanentUpgrades: Record<string, number>;
	addGlobalAtk: (delta: number) => void;
	addFamilyPerk: (family: TowerFamily, perk: PerkId) => void;
	stackUpgrade: (id: string) => void;
}

const emptyPerks = (): Record<TowerFamily, PerkId[]> => ({
	archer: [],
	siege: [],
	frost: [],
	stun: [],
	hybrid: [],
	ultimate: [],
});

export const useMetaProgress = create<MetaState>()(
	persist(
		(set) => ({
			version: 1,
			familyPerks: emptyPerks(),
			globalAtkPct: 0,
			permanentUpgrades: {},
			addGlobalAtk: (delta) =>
				set((s) => ({ globalAtkPct: s.globalAtkPct + delta })),
			addFamilyPerk: (family, perk) =>
				set((s) => ({
					familyPerks: {
						...s.familyPerks,
						[family]: [...s.familyPerks[family], perk],
					},
				})),
			stackUpgrade: (id) =>
				set((s) => ({
					permanentUpgrades: {
						...s.permanentUpgrades,
						[id]: (s.permanentUpgrades[id] ?? 0) + 1,
					},
				})),
		}),
		{ name: 'gld_meta_v1' },
	),
);

/**
 * Reset meta progression to zero state. Used by tests and by future
 * "reset progression" UX in the MetaForge page.
 */
export function resetMetaProgress(): void {
	useMetaProgress.setState({
		version: 1,
		familyPerks: emptyPerks(),
		globalAtkPct: 0,
		permanentUpgrades: {},
	});
}
