import {
	ALL_TOWERS,
	createDefaultSave,
	enhancementCost,
	MAX_TOWER_LEVEL,
	PROMOTION_CONFIG,
	SAVE_STORAGE_KEY,
	SAVE_VERSION,
	type SaveData,
	type TowerGrade,
	xpToNextLevel,
} from '@gld/shared';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const LEGACY_DECK_KEY = 'gld-selected-deck';

interface MetaActions {
	loadSave: () => void;
	addGold: (amount: number) => void;
	addXp: (amount: number) => void;
	recordBattle: (result: 'victory' | 'defeat') => void;
	updateHighestWave: (mapId: string, wave: number) => void;
	enhanceTower: (
		defId: string,
	) => 'success' | 'max_level' | 'no_gold' | 'not_found';
	promoteTower: (
		defId: string,
		rng?: () => number,
	) => 'success' | 'fail' | 'max_grade' | 'no_gold' | 'not_found';
	setSelectedDeck: (deck: string[]) => void;
	updateSettings: (patch: Partial<SaveData['settings']>) => void;
}

type MetaState = SaveData & MetaActions;

let saveErrorNotified = false;

function writeSave(state: SaveData) {
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

function debouncedSave(state: SaveData) {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => writeSave(state), 500);
}

function flushSave() {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	// Write current state immediately
	const state = useMetaStore?.getState?.();
	if (state) writeSave(state);
}

if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', flushSave);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') flushSave();
	});
}

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

function parseSave(context?: { tutorialCompleted?: boolean }): SaveData | null {
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

function migrateLegacyDeck(save: SaveData): SaveData {
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

function applyLevelUps(profile: SaveData['profile']): SaveData['profile'] {
	let { level, xp } = profile;
	let needed = xpToNextLevel(level);
	while (xp >= needed && level < 99) {
		xp -= needed;
		level += 1;
		needed = xpToNextLevel(level);
	}
	return { ...profile, level, xp };
}

export const useMetaStore = create<MetaState>()(
	subscribeWithSelector((set, get) => {
		const defaultSave = createDefaultSave();
		return {
			...defaultSave,

			loadSave: () => {
				// Read legacy tutorial_completed key before migration
				let legacyTutorialCompleted = false;
				try {
					legacyTutorialCompleted =
						localStorage.getItem('tutorial_completed') === 'true';
				} catch {}

				let save = parseSave({ tutorialCompleted: legacyTutorialCompleted });
				if (!save) {
					save = createDefaultSave();
					save = migrateLegacyDeck(save);
				}

				// Clean up legacy key
				try {
					localStorage.removeItem('tutorial_completed');
				} catch {}

				set({
					version: save.version,
					profile: save.profile,
					collection: save.collection,
					progress: save.progress,
					settings: save.settings,
					selectedDeck: save.selectedDeck,
				});
				writeSave(save);
			},

			addGold: (amount) => {
				set((s) => ({
					profile: {
						...s.profile,
						gold: s.profile.gold + amount,
						totalGoldEarned: s.profile.totalGoldEarned + Math.max(0, amount),
					},
				}));
				debouncedSave(get());
			},

			addXp: (amount) => {
				set((s) => ({
					profile: applyLevelUps({ ...s.profile, xp: s.profile.xp + amount }),
				}));
				debouncedSave(get());
			},

			recordBattle: (result) => {
				set((s) => {
					const isWin = result === 'victory';
					const newStreak = isWin ? s.profile.winStreak + 1 : 0;
					return {
						profile: {
							...s.profile,
							wins: s.profile.wins + (isWin ? 1 : 0),
							losses: s.profile.losses + (isWin ? 0 : 1),
							winStreak: newStreak,
							bestWinStreak: Math.max(s.profile.bestWinStreak, newStreak),
						},
						progress: {
							...s.progress,
							totalBattles: s.progress.totalBattles + 1,
						},
					};
				});
				debouncedSave(get());
			},

			updateHighestWave: (mapId, wave) => {
				set((s) => ({
					progress: {
						...s.progress,
						highestWave: {
							...s.progress.highestWave,
							[mapId]: Math.max(s.progress.highestWave[mapId] ?? 0, wave),
						},
					},
				}));
				debouncedSave(get());
			},

			enhanceTower: (defId) => {
				const s = get();
				const idx = s.collection.findIndex((t) => t.defId === defId);
				if (idx === -1) return 'not_found';
				const tower = s.collection[idx];
				if (tower.level >= MAX_TOWER_LEVEL) return 'max_level';
				const towerDef = ALL_TOWERS.find((t) => t.id === defId);
				if (!towerDef) return 'not_found';
				const cost = enhancementCost(tower.level, towerDef.tier);
				if (s.profile.gold < cost) return 'no_gold';

				const newCollection = [...s.collection];
				newCollection[idx] = { ...tower, level: tower.level + 1 };
				set({
					profile: { ...s.profile, gold: s.profile.gold - cost },
					collection: newCollection,
				});
				debouncedSave(get());
				return 'success';
			},

			promoteTower: (defId, rng = Math.random) => {
				const s = get();
				const idx = s.collection.findIndex((t) => t.defId === defId);
				if (idx === -1) return 'not_found';
				const tower = s.collection[idx];
				const config = PROMOTION_CONFIG[tower.grade];
				if (!config.nextGrade) return 'max_grade';
				if (s.profile.gold < config.goldCost) return 'no_gold';

				const newGold = s.profile.gold - config.goldCost;
				const success = rng() < config.successRate;

				const newCollection = [...s.collection];
				if (success) {
					newCollection[idx] = {
						...tower,
						grade: config.nextGrade as TowerGrade,
					};
				}
				set({
					profile: { ...s.profile, gold: newGold },
					collection: newCollection,
				});
				debouncedSave(get());
				return success ? 'success' : 'fail';
			},

			setSelectedDeck: (deck) => {
				set({ selectedDeck: deck });
				debouncedSave(get());
			},

			updateSettings: (patch) => {
				set((s) => ({
					settings: { ...s.settings, ...patch },
				}));
				debouncedSave(get());
			},
		};
	}),
);
