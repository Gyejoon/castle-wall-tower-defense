// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Bun's runtime overrides globalThis.localStorage with a minimal shim that
 * lacks `.clear()` / `.setItem()`. We install a proper Storage-like mock at
 * module-load time (via `vi.hoisted`) so Zustand's `persist` middleware
 * — which captures `window.localStorage` when the store module is first
 * imported — sees a working implementation on both `window` and
 * `globalThis`.
 */
const mockStorage = vi.hoisted(() => {
	const store = new Map<string, string>();
	const storage: Storage = {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (k) => store.get(k) ?? null,
		setItem: (k, v) => {
			store.set(k, String(v));
		},
		removeItem: (k) => {
			store.delete(k);
		},
		key: (i) => Array.from(store.keys())[i] ?? null,
	};
	const descriptor: PropertyDescriptor = {
		value: storage,
		configurable: true,
		writable: true,
	};
	Object.defineProperty(globalThis, 'localStorage', descriptor);
	if (typeof window !== 'undefined') {
		Object.defineProperty(window, 'localStorage', descriptor);
	}
	return { store, storage };
});

const { resetMetaProgress, useMetaProgress } = await import(
	'../metaProgressStore'
);

describe('metaProgressStore', () => {
	beforeEach(() => {
		mockStorage.store.clear();
		resetMetaProgress();
	});

	it('defaults globalAtkPct to 0', () => {
		expect(useMetaProgress.getState().globalAtkPct).toBe(0);
	});

	it('defaults all family perks to empty arrays', () => {
		const { familyPerks } = useMetaProgress.getState();
		expect(familyPerks.archer).toEqual([]);
		expect(familyPerks.siege).toEqual([]);
		expect(familyPerks.frost).toEqual([]);
		expect(familyPerks.stun).toEqual([]);
		expect(familyPerks.hybrid).toEqual([]);
		expect(familyPerks.ultimate).toEqual([]);
	});

	it('addGlobalAtk accumulates deltas (+10%, +15% → +25%)', () => {
		useMetaProgress.getState().addGlobalAtk(0.1);
		useMetaProgress.getState().addGlobalAtk(0.15);
		expect(useMetaProgress.getState().globalAtkPct).toBeCloseTo(0.25, 6);
	});

	it('addFamilyPerk appends perk ids to the correct family', () => {
		useMetaProgress.getState().addFamilyPerk('archer', 'perk1');
		expect(useMetaProgress.getState().familyPerks.archer).toEqual(['perk1']);
		expect(useMetaProgress.getState().familyPerks.siege).toEqual([]);

		useMetaProgress.getState().addFamilyPerk('archer', 'perk2');
		expect(useMetaProgress.getState().familyPerks.archer).toEqual([
			'perk1',
			'perk2',
		]);
	});

	it('stackUpgrade increments the stored count for a given id', () => {
		useMetaProgress.getState().stackUpgrade('crit_dmg');
		useMetaProgress.getState().stackUpgrade('crit_dmg');
		expect(useMetaProgress.getState().permanentUpgrades.crit_dmg).toBe(2);

		useMetaProgress.getState().stackUpgrade('range_up');
		expect(useMetaProgress.getState().permanentUpgrades.range_up).toBe(1);
	});

	it('persists state under localStorage key gld_meta_v1', () => {
		useMetaProgress.getState().addGlobalAtk(0.3);
		useMetaProgress.getState().addFamilyPerk('frost', 'frozen_heart');
		useMetaProgress.getState().stackUpgrade('crit_dmg');

		const raw = globalThis.localStorage.getItem('gld_meta_v1');
		expect(raw).toBeTruthy();
		const parsed = JSON.parse(raw ?? '{}') as {
			state?: {
				globalAtkPct: number;
				familyPerks: Record<string, string[]>;
				permanentUpgrades: Record<string, number>;
			};
		};
		expect(parsed.state?.globalAtkPct).toBeCloseTo(0.3, 6);
		expect(parsed.state?.familyPerks.frost).toEqual(['frozen_heart']);
		expect(parsed.state?.permanentUpgrades.crit_dmg).toBe(1);
	});

	it('resetMetaProgress restores zero state', () => {
		useMetaProgress.getState().addGlobalAtk(0.5);
		useMetaProgress.getState().addFamilyPerk('siege', 'boom');
		useMetaProgress.getState().stackUpgrade('range_up');

		resetMetaProgress();

		const s = useMetaProgress.getState();
		expect(s.globalAtkPct).toBe(0);
		expect(s.familyPerks.siege).toEqual([]);
		expect(s.permanentUpgrades).toEqual({});
	});
});
