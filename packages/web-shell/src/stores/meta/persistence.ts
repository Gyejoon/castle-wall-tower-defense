import {
	createDefaultSave,
	SAVE_STORAGE_KEY,
	SAVE_VERSION,
	type SaveData,
} from '@gld/shared';

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

const MAP_TO_WORLD_STAGES: Record<string, string[]> = {
	forest_gate: [
		'w1_s1',
		'w1_s2',
		'w1_s3',
		'w1_s4',
		'w1_s5',
		'w1_s6',
		'w1_s7',
		'w1_s8',
	],
	lava_fortress: [
		'w2_s1',
		'w2_s2',
		'w2_s3',
		'w2_s4',
		'w2_s5',
		'w2_s6',
		'w2_s7',
		'w2_s8',
	],
	storm_citadel: [
		'w3_s1',
		'w3_s2',
		'w3_s3',
		'w3_s4',
		'w3_s5',
		'w3_s6',
		'w3_s7',
		'w3_s8',
	],
};

/** Add migrations here when SAVE_VERSION increments.
 *  Key = source version, value = function that returns the next version's shape. */
const SAVE_MIGRATIONS: Record<number, SaveMigration> = {
	4: (data) => {
		const progress = (data.progress ?? {}) as Record<string, unknown>;
		const oldStars = (progress.stageStars ?? {}) as Record<string, unknown>;
		const oldHighestWave = (progress.highestWave ?? {}) as Record<
			string,
			unknown
		>;
		const oldStagesCleared = Array.isArray(progress.stagesCleared)
			? progress.stagesCleared
			: [];
		const newStars: Record<string, unknown> = {};
		const newHighestWave: Record<string, unknown> = {};
		const newStagesCleared = new Set<string>();

		// Process old-format (mapId) keys first so new-format (stageId) keys win on conflict
		for (const [mapId, starRating] of Object.entries(oldStars)) {
			const stages = MAP_TO_WORLD_STAGES[mapId];
			if (stages) {
				for (const stageId of stages) {
					newStars[stageId] = starRating;
				}
			}
		}
		for (const [key, starRating] of Object.entries(oldStars)) {
			if (!MAP_TO_WORLD_STAGES[key]) {
				// new-format stageId or unknown key: preserve (overwrites spread values)
				newStars[key] = starRating;
			}
		}

		for (const [mapId, wave] of Object.entries(oldHighestWave)) {
			const stages = MAP_TO_WORLD_STAGES[mapId];
			if (stages) {
				for (const stageId of stages) {
					newHighestWave[stageId] = wave;
				}
			} else {
				newHighestWave[mapId] = wave;
			}
		}

		for (const entry of oldStagesCleared) {
			if (typeof entry !== 'string') continue;
			const stages = MAP_TO_WORLD_STAGES[entry];
			if (stages) {
				for (const stageId of stages) {
					newStagesCleared.add(stageId);
				}
			} else {
				newStagesCleared.add(entry);
			}
		}

		return {
			...data,
			version: 5,
			progress: {
				...progress,
				stageStars: newStars,
				highestWave: newHighestWave,
				stagesCleared: [...newStagesCleared],
			},
		};
	},
	3: (data) => {
		const progress = (data.progress ?? {}) as Record<string, unknown>;
		const profile = (data.profile ?? {}) as Record<string, unknown>;
		const selectedDeck = (data.selectedDeck ?? []) as string[];
		const collection = (
			Array.isArray(data.collection) ? data.collection : []
		) as Record<string, unknown>[];

		const renameId = (id: string) =>
			id === 'laser' ? 'archer' : id === 'twin_laser' ? 'twin_archer' : id;

		return {
			...data,
			version: 4,
			profile: {
				...profile,
				combatPower: 0,
			},
			selectedDeck: selectedDeck.map(renameId),
			collection: collection.map((t) => ({
				...t,
				defId: typeof t.defId === 'string' ? renameId(t.defId) : t.defId,
				awakening: (t.awakening as number) ?? 0,
				duplicateCount: (t.duplicateCount as number) ?? 0,
			})),
			progress: {
				...progress,
				stageStars: {},
				achievements: { claimed: [], progress: {} },
				awakeningStones: 0,
			},
		};
	},
	2: (data) => {
		const progress = (data.progress ?? {}) as Record<string, unknown>;
		return {
			...data,
			version: 3,
			progress: {
				...progress,
				lastAttendanceDate: null,
			},
		};
	},
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
				lastAttendanceDate: null,
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

// ── Sanitization ─────────────────────────────────────────────

const _defaults = createDefaultSave();

/** Ensure all v5 required fields exist — guards against incomplete saves. */
export function sanitizeV5Save(save: SaveData): SaveData {
	const dp = _defaults.progress;
	const dpr = _defaults.profile;
	const dt = _defaults.collection[0];
	const profile = save.profile ?? dpr;
	const progress = save.progress ?? dp;

	return {
		...save,
		profile: {
			...profile,
			combatPower: profile.combatPower ?? dpr.combatPower,
		},
		collection: Array.isArray(save.collection)
			? save.collection
					.filter((t): t is NonNullable<typeof t> => t != null)
					.map((t) => ({
						...t,
						awakening: t.awakening ?? dt.awakening,
						duplicateCount: t.duplicateCount ?? dt.duplicateCount,
					}))
			: _defaults.collection,
		progress: {
			...progress,
			stageStars: progress.stageStars ?? dp.stageStars,
			achievements: progress.achievements ?? dp.achievements,
			awakeningStones: progress.awakeningStones ?? dp.awakeningStones,
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
			return sanitizeV5Save(parsed as SaveData);
		// Attempt migration from older version
		const migrated = migrateSave(parsed, context);
		return migrated ? sanitizeV5Save(migrated) : null;
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
