import { SAVE_STORAGE_KEY, SAVE_VERSION, type SaveData } from '@gld/shared';

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
				dailyMissions: [],
				weeklyMissions: [],
				lastDailyMissionResetAt: null,
				lastWeeklyMissionResetAt: null,
			},
			settings: {
				bgmVolume: soundWasEnabled ? 0.7 : 0,
				sfxVolume: soundWasEnabled ? 0.8 : 0,
				screenShake: settings.screenShake ?? true,
				showDamageNumbers: settings.showDamageNumbers ?? true,
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

export function parseSave(context?: {
	tutorialCompleted?: boolean;
}): SaveData | null {
	try {
		const raw = localStorage.getItem(SAVE_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		if (parsed.version === SAVE_VERSION) return parsed as SaveData;
		// Attempt migration from older version
		return migrateSave(parsed, context);
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
