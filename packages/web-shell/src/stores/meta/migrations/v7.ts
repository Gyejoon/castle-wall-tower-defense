/**
 * v6 → v7 migration (정식 모드 family/tier model).
 *
 * - Bumps `version` to 7.
 * - Converts legacy `grade` (normal/rare/unique/epic) to `tier` (1-4).
 * - Removes towers whose ids are no longer in the catalog (plasma, dragon_nest).
 * - Purges scenario-mode keys that 정식 모드 no longer uses.
 * - Preserves missions + achievements (they're reused for the meta loop).
 */

const GRADE_TO_TIER: Record<string, number> = {
	normal: 1,
	rare: 2,
	unique: 3,
	epic: 4,
};

const REMOVED_TOWER_IDS = new Set(['plasma', 'dragon_nest']);

const SCENARIO_ONLY_KEYS = [
	'selectedWorldId',
	'selectedStageId',
	'deckCards',
	'selectedCardIndex',
	'starProgress',
	'worldUnlocks',
] as const;

export function migrateV6toV7(
	data: Record<string, unknown>,
): Record<string, unknown> {
	const next = structuredClone(data);
	next.version = 7;

	// Purge scenario-only top-level keys.
	for (const k of SCENARIO_ONLY_KEYS) {
		if (k in next) delete next[k];
	}

	const collection = Array.isArray(next.collection)
		? (next.collection as Array<Record<string, unknown>>)
		: [];
	const cleaned: Array<Record<string, unknown>> = [];
	for (const tower of collection) {
		const id = tower.defId;
		if (typeof id !== 'string') continue;
		if (REMOVED_TOWER_IDS.has(id)) continue;
		const grade = tower.grade;
		const tier =
			typeof grade === 'string'
				? (GRADE_TO_TIER[grade] ?? 1)
				: typeof tower.tier === 'number'
					? (tower.tier as number)
					: 1;
		const { grade: _grade, ...rest } = tower;
		cleaned.push({ ...rest, tier });
	}
	next.collection = cleaned;

	// Drop removed towers from selectedDeck as well.
	if (Array.isArray(next.selectedDeck)) {
		next.selectedDeck = (next.selectedDeck as unknown[]).filter(
			(id) => typeof id === 'string' && !REMOVED_TOWER_IDS.has(id),
		);
	}

	return next;
}
