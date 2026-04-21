/**
 * v7 → v8 migration (정식 모드 sole-mode).
 *
 * - Bumps `version` to 8.
 * - Drops scenario-mode fields from `progress`:
 *   - dailyMissions, weeklyMissions, lastDailyMissionResetAt,
 *     lastWeeklyMissionResetAt, lastAttendanceDate, stageStars,
 *     achievements, awakeningStones, stagesCleared, starProgress,
 *     worldUnlocks
 * - Reduces `progress.highestWave` from `Record<stageId, number>` to a
 *   single scalar — 정식 모드 uses one continuous wave counter.
 * - Preserves collection, profile, settings, selectedDeck, and the
 *   정식 모드 관련 progress fields (gacha + tutorial).
 */

const REMOVED_PROGRESS_KEYS = [
	'dailyMissions',
	'weeklyMissions',
	'lastDailyMissionResetAt',
	'lastWeeklyMissionResetAt',
	'lastAttendanceDate',
	'stageStars',
	'achievements',
	'awakeningStones',
	'stagesCleared',
	'starProgress',
	'worldUnlocks',
] as const;

const REMOVED_TOP_KEYS = [
	'selectedWorldId',
	'selectedStageId',
	'deckCards',
	'selectedCardIndex',
	'starProgress',
	'worldUnlocks',
] as const;

function collapseHighestWave(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.max(0, Math.floor(value));
	}
	if (value && typeof value === 'object') {
		let best = 0;
		for (const v of Object.values(value)) {
			if (typeof v === 'number' && Number.isFinite(v)) {
				best = Math.max(best, Math.floor(v));
			}
		}
		return best;
	}
	return 0;
}

export function migrateV7toV8(
	data: Record<string, unknown>,
): Record<string, unknown> {
	const next: Record<string, unknown> = { ...data };
	next.version = 8;

	for (const k of REMOVED_TOP_KEYS) {
		if (k in next) delete next[k];
	}

	const progress = (next.progress ?? {}) as Record<string, unknown>;
	const trimmed: Record<string, unknown> = { ...progress };
	for (const k of REMOVED_PROGRESS_KEYS) {
		if (k in trimmed) delete trimmed[k];
	}
	trimmed.highestWave = collapseHighestWave(progress.highestWave);
	trimmed.totalBattles =
		typeof progress.totalBattles === 'number' ? progress.totalBattles : 0;
	trimmed.tutorialCompleted = Boolean(progress.tutorialCompleted);
	trimmed.gachaPityCount =
		typeof progress.gachaPityCount === 'number' ? progress.gachaPityCount : 0;
	trimmed.dailyFreeBoxClaimedAt =
		typeof progress.dailyFreeBoxClaimedAt === 'string'
			? progress.dailyFreeBoxClaimedAt
			: null;
	trimmed.dailyAdBoxCount =
		typeof progress.dailyAdBoxCount === 'number' ? progress.dailyAdBoxCount : 0;
	trimmed.dailyResetAt =
		typeof progress.dailyResetAt === 'string' ? progress.dailyResetAt : null;
	next.progress = trimmed;

	return next;
}
