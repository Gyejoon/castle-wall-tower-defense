import {
	createDefaultSave,
	SAVE_STORAGE_KEY,
	SAVE_VERSION,
	type SaveData,
} from '@gld/shared';
import { migrateV6toV7 } from './migrations/v7';
import { migrateV7toV8 } from './migrations/v8';

// ── Save writing ──────────────────────────────────────────────

let saveErrorNotified = false;

export function writeSave(state: SaveData) {
	try {
		localStorage.setItem(
			SAVE_STORAGE_KEY,
			JSON.stringify({
				version: state.version,
				profile: state.profile,
				collection: state.collection,
				progress: state.progress,
				settings: state.settings,
				selectedDeck: state.selectedDeck,
			}),
		);
		saveErrorNotified = false;
	} catch {
		if (!saveErrorNotified && typeof window !== 'undefined') {
			saveErrorNotified = true;
			window.dispatchEvent(
				new CustomEvent('gld-save-error', { detail: 'quota_exceeded' }),
			);
		}
	}
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSave(state: SaveData) {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => writeSave(state), 500);
}

/** Cancel pending debounce and write immediately. Caller provides current state. */
export function flushSaveWith(state: SaveData) {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	writeSave(state);
}

// ── Migration ─────────────────────────────────────────────────

const LEGACY_DECK_KEY = 'gld-selected-deck';

type SaveMigration = (
	data: Record<string, unknown>,
	context?: { tutorialCompleted?: boolean },
) => Record<string, unknown>;

/** Add migrations here when SAVE_VERSION increments.
 *  Key = source version, value = function that returns the next version's shape. */
const SAVE_MIGRATIONS: Record<number, SaveMigration> = {
	7: (data) => migrateV7toV8(data),
	6: (data) => migrateV6toV7(data),
	5: (data) => {
		// v5 → v6: remove showDamageNumbers from settings (always on)
		const settings = (data.settings ?? {}) as Record<string, unknown>;
		const { showDamageNumbers: _, ...restSettings } = settings;
		return {
			...data,
			version: 6,
			settings: restSettings,
		};
	},
	// v4 → v5: stage-star mapId→stageId migration — scenario fields are
	// dropped entirely by v7→v8, so the pass-through just version-bumps.
	4: (data) => ({ ...data, version: 5 }),
	3: (data) => ({ ...data, version: 4 }),
	2: (data) => ({ ...data, version: 3 }),
	1: (data, context) => {
		const settings = (data.settings ?? {}) as Record<string, unknown>;
		const soundWasEnabled = settings.soundEnabled !== false;
		const progress = (data.progress ?? {}) as Record<string, unknown>;

		return {
			...data,
			version: 2,
			profile: {
				...(data.profile as Record<string, unknown>),
				diamond: 0,
			},
			progress: {
				...progress,
				tutorialCompleted: context?.tutorialCompleted ?? false,
				gachaPityCount: 0,
				dailyFreeBoxClaimedAt: null,
				dailyAdBoxCount: 0,
				dailyResetAt: null,
			},
			settings: {
				bgmVolume: soundWasEnabled ? 0.7 : 0,
				sfxVolume: soundWasEnabled ? 0.8 : 0,
				screenShake: settings.screenShake ?? true,
				colorblindMode: 'off',
			},
		};
	},
};

function migrateSave(
	data: Record<string, unknown>,
	context?: { tutorialCompleted?: boolean },
): SaveData | null {
	let version = typeof data.version === 'number' ? data.version : 0;
	let current = data;
	while (version < SAVE_VERSION) {
		const migrate = SAVE_MIGRATIONS[version];
		if (!migrate) return null; // no migration path — reset to default
		current = migrate(current, context);
		version = typeof current.version === 'number' ? current.version : 0;
	}
	return version === SAVE_VERSION ? (current as unknown as SaveData) : null;
}

// ── Sanitization ─────────────────────────────────────────────

const _defaults = createDefaultSave();

/** Ensure all required fields exist — guards against incomplete saves. */
export function sanitizeSave(save: SaveData): SaveData {
	const dp = _defaults.progress;
	const dpr = _defaults.profile;
	const dt = _defaults.collection[0];
	const profile = save.profile ?? dpr;
	const progress = save.progress ?? dp;

	return {
		...save,
		profile: {
			...profile,
		},
		collection: Array.isArray(save.collection)
			? save.collection
					.filter((t): t is NonNullable<typeof t> => t != null)
					.map((t) => ({
						...t,
						tier: typeof t.tier === 'number' ? t.tier : dt.tier,
						awakening: t.awakening ?? dt.awakening,
						duplicateCount: t.duplicateCount ?? dt.duplicateCount,
					}))
			: _defaults.collection,
		progress: {
			...dp,
			...progress,
			highestWave:
				typeof progress.highestWave === 'number'
					? progress.highestWave
					: dp.highestWave,
		},
	};
}

export function parseSave(context?: {
	tutorialCompleted?: boolean;
}): SaveData | null {
	try {
		const raw = localStorage.getItem(SAVE_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		if (parsed.version === SAVE_VERSION)
			return sanitizeSave(parsed as SaveData);
		// Attempt migration from older version
		const migrated = migrateSave(parsed, context);
		return migrated ? sanitizeSave(migrated) : null;
	} catch {
		// corrupt JSON
	}
	return null;
}

export function migrateLegacyDeck(save: SaveData): SaveData {
	try {
		const legacy = localStorage.getItem(LEGACY_DECK_KEY);
		if (legacy) {
			const deck = JSON.parse(legacy);
			if (Array.isArray(deck) && deck.length === 4) {
				save = { ...save, selectedDeck: deck };
			}
			localStorage.removeItem(LEGACY_DECK_KEY);
		}
	} catch {
		// ignore
	}
	return save;
}
