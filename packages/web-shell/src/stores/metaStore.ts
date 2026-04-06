import {
	ALL_TOWERS,
	createDefaultSave,
	enhancementCost,
	generateDailyMissions,
	generateWeeklyMissions,
	GACHA_COSTS,
	MAX_TOWER_LEVEL,
	PROMOTION_CONFIG,
	rollGacha,
	rollGacha10,
	SAVE_STORAGE_KEY,
	SAVE_VERSION,
	shouldResetDaily,
	shouldResetWeekly,
	type GachaResult,
	type MissionType,
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
	addDiamond: (amount: number) => void;
	refreshMissions: () => void;
	progressMission: (type: MissionType, amount: number) => void;
	claimMission: (missionId: string, period: 'daily' | 'weekly') => 'success' | 'not_ready' | 'not_found';
	updateProgress: (patch: Partial<SaveData['progress']>) => void;
	openGacha: (
		boxType: 'free' | 'ad' | 'diamond_single' | 'diamond_ten',
		rng?: () => number,
	) => GachaResult[] | 'no_diamond' | 'cooldown' | 'daily_limit';
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

			addDiamond: (amount) => {
				set((s) => ({
					profile: { ...s.profile, diamond: s.profile.diamond + amount },
				}));
				debouncedSave(get());
			},

			refreshMissions: () => {
				const now = new Date();
				set((s) => {
					const progress = s.progress;
					const needsDailyReset = shouldResetDaily(progress.lastDailyMissionResetAt, now);
					const needsWeeklyReset = shouldResetWeekly(progress.lastWeeklyMissionResetAt, now);

					if (!needsDailyReset && !needsWeeklyReset) return {};

					return {
						progress: {
							...progress,
							dailyMissions: needsDailyReset ? generateDailyMissions() : progress.dailyMissions,
							lastDailyMissionResetAt: needsDailyReset ? now.toISOString() : progress.lastDailyMissionResetAt,
							weeklyMissions: needsWeeklyReset ? generateWeeklyMissions() : progress.weeklyMissions,
							lastWeeklyMissionResetAt: needsWeeklyReset ? now.toISOString() : progress.lastWeeklyMissionResetAt,
						},
					};
				});
				debouncedSave(get());
			},

			progressMission: (type, amount) => {
				set((s) => {
					const updateList = (missions: typeof s.progress.dailyMissions) =>
						missions.map((m) =>
							m.type === type && !m.claimed
								? { ...m, current: Math.min(m.current + amount, m.target) }
								: m,
						);
					return {
						progress: {
							...s.progress,
							dailyMissions: updateList(s.progress.dailyMissions),
							weeklyMissions: updateList(s.progress.weeklyMissions),
						},
					};
				});
				debouncedSave(get());
			},

			claimMission: (missionId, period) => {
				// guard는 set() 내부에서 원자적으로 수행 (double-tap 방지)
				// eslint-disable-next-line prefer-const -- TS가 클로저 내 mutation을 추적 못해 as 캐스트 필요
				let outcome = 'not_found' as 'success' | 'not_ready' | 'not_found';
				set((s) => {
					const list = period === 'daily' ? s.progress.dailyMissions : s.progress.weeklyMissions;
					const mission = list.find((m) => m.id === missionId);
					if (!mission) { outcome = 'not_found'; return s; }
					if (mission.claimed || mission.current < mission.target) { outcome = 'not_ready'; return s; }

					outcome = 'success';
					const updateList = (missions: typeof list) =>
						missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m));
					return {
						profile: {
							...s.profile,
							gold: mission.reward.type === 'gold'
								? s.profile.gold + mission.reward.amount
								: s.profile.gold,
							totalGoldEarned: mission.reward.type === 'gold'
								? s.profile.totalGoldEarned + mission.reward.amount
								: s.profile.totalGoldEarned,
							diamond: mission.reward.type === 'diamond'
								? s.profile.diamond + mission.reward.amount
								: s.profile.diamond,
						},
						progress: {
							...s.progress,
							dailyMissions: period === 'daily' ? updateList(s.progress.dailyMissions) : s.progress.dailyMissions,
							weeklyMissions: period === 'weekly' ? updateList(s.progress.weeklyMissions) : s.progress.weeklyMissions,
						},
					};
				});
				if (outcome === 'success') debouncedSave(get());
				return outcome;
			},

			updateProgress: (patch) => {
				set((s) => ({ progress: { ...s.progress, ...patch } }));
				debouncedSave(get());
			},

			openGacha: (boxType, rng = Math.random) => {
				const s = get();
				const progress = s.progress;
				const now = new Date();

				// 비용/쿨다운/데일리 제한 검증
				if (boxType === 'free') {
					if (progress.dailyFreeBoxClaimedAt) {
						const last = new Date(progress.dailyFreeBoxClaimedAt);
						if (now.getTime() - last.getTime() < GACHA_COSTS.free.cooldownMs) {
							return 'cooldown';
						}
					}
				} else if (boxType === 'ad') {
					// 새 날인지 확인하여 count 리셋 여부 결정
					let effectiveAdBoxCount = progress.dailyAdBoxCount;
					if (progress.dailyResetAt) {
						const last = new Date(progress.dailyResetAt);
						const lastUTCDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
						const nowUTCDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
						if (nowUTCDay > lastUTCDay) {
							effectiveAdBoxCount = 0;
						}
					}
					if (effectiveAdBoxCount >= GACHA_COSTS.ad.dailyLimit) {
						return 'daily_limit';
					}
				} else if (boxType === 'diamond_single') {
					if (s.profile.diamond < GACHA_COSTS.diamond_single.diamond) return 'no_diamond';
				} else if (boxType === 'diamond_ten') {
					if (s.profile.diamond < GACHA_COSTS.diamond_ten.diamond) return 'no_diamond';
				}

				// 롤
				const ownedIds = s.collection.map((t) => t.defId);
				let results: GachaResult[];
				let newPityCount: number;

				if (boxType === 'diamond_ten') {
					const roll = rollGacha10(progress.gachaPityCount, ownedIds, rng);
					results = roll.results;
					newPityCount = roll.newPityCount;
				} else {
					const roll = rollGacha(progress.gachaPityCount, ownedIds, rng);
					results = [roll.result];
					newPityCount = roll.newPityCount;
				}

				// 컬렉션 업데이트 (Amendment D: 중복 → 골드 50)
				let goldGained = 0;
				const newCollection = [...s.collection];
				for (const r of results) {
					const alreadyOwned = newCollection.some((t) => t.defId === r.towerId);
					if (alreadyOwned) {
						goldGained += 50;
					} else {
						newCollection.push({
							defId: r.towerId,
							level: 1,
							grade: 'normal',
							acquiredAt: Date.now(),
						});
					}
				}

				// 다이아몬드/골드 차감 및 progress 업데이트
				// set() 내부에서 최신 state 기준으로 차감 (TOCTOU 방어)
				set((s) => {
					const cost =
						boxType === 'diamond_single' ? GACHA_COSTS.diamond_single.diamond :
						boxType === 'diamond_ten' ? GACHA_COSTS.diamond_ten.diamond : 0;
					if (cost > 0 && s.profile.diamond < cost) return {};

					const newProfile = {
						...s.profile,
						diamond: s.profile.diamond - cost,
						gold: s.profile.gold + goldGained,
						totalGoldEarned: s.profile.totalGoldEarned + goldGained,
					};

					const nowIso = now.toISOString();
					const newProgress = {
						...s.progress,
						gachaPityCount: newPityCount,
						...(boxType === 'free' ? { dailyFreeBoxClaimedAt: nowIso } : {}),
						...(boxType === 'ad' ? {
							dailyAdBoxCount: s.progress.dailyAdBoxCount + 1,
							dailyResetAt: nowIso,
						} : {}),
					};

					return {
						profile: newProfile,
						progress: newProgress,
						collection: newCollection,
					};
				});

				debouncedSave(get());
				return results;
			},
		};
	}),
);
