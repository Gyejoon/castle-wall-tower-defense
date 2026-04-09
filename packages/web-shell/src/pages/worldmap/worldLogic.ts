/**
 * 월드맵 해금/추천/★ 판정 교체 포인트.
 *
 * 대장정 로드맵(#112 월드 재편, #106 ★ 등급) 머지 시 이 파일만 바뀌도록
 * WorldMapPage는 절대 인라인으로 `playerLevel >= unlockLevel` 같은 판정을 하지 않는다.
 */

import { isMapUnlocked, MAP_REGISTRY, type StarRating } from '@gld/shared';
import type { WorldSlot } from './WorldLayout';

export type UnlockContext = {
	playerLevel: number;
	stagesCleared: string[];
	stageStars: Record<string, StarRating>;
};

/**
 * 월드 해금 판정.
 * - 오늘: 월드 내 스테이지 중 하나라도 `isMapUnlocked(map, playerLevel)`이면 true
 * - 내일(#112): 이전 월드 전체 ★1 클리어 시 해금
 * - placeholder 월드(W4-W6)는 항상 잠김
 */
export function isWorldUnlocked(world: WorldSlot, ctx: UnlockContext): boolean {
	if (world.placeholder) return false;
	if (world.stageIds.length === 0) return false;
	return world.stageIds.some((stageId) => {
		const map = MAP_REGISTRY[stageId];
		if (!map) return false;
		return isMapUnlocked(map, ctx.playerLevel);
	});
}

/**
 * 스테이지 해금 판정 — 오늘은 `isMapUnlocked` 그대로.
 */
export function isStageUnlocked(stageId: string, ctx: UnlockContext): boolean {
	const map = MAP_REGISTRY[stageId];
	if (!map) return false;
	return isMapUnlocked(map, ctx.playerLevel);
}

/**
 * 권장 스테이지 — 첫 미클리어 해금 stage id, 없으면 마지막 해금 stage id.
 * 내일(#106): 선택된 난이도 탭 고려.
 */
export function getRecommendedStageId(
	worlds: readonly WorldSlot[],
	ctx: UnlockContext,
): string | undefined {
	const allStageIds: string[] = [];
	for (const w of worlds) {
		if (w.placeholder) continue;
		for (const stageId of w.stageIds) allStageIds.push(stageId);
	}
	const unclearedUnlocked = allStageIds.find(
		(id) => isStageUnlocked(id, ctx) && !ctx.stagesCleared.includes(id),
	);
	if (unclearedUnlocked) return unclearedUnlocked;
	const unlocked = allStageIds.filter((id) => isStageUnlocked(id, ctx));
	return unlocked[unlocked.length - 1];
}

/**
 * ★ 획득 — 0은 "미클리어", 1~3은 해당 별 등급.
 * 오늘: stageStars[id] ?? (stagesCleared.includes(id) ? 1 : 0)
 * 내일(#106): 난이도별 ★
 *
 * 주: `StarRating` 자체는 1|2|3 (스펙 유지). 반환에만 0 추가.
 */
export function getStageStars(
	stageId: string,
	ctx: Pick<UnlockContext, 'stagesCleared' | 'stageStars'>,
): StarRating | 0 {
	const explicit = ctx.stageStars[stageId];
	if (explicit) return explicit;
	return ctx.stagesCleared.includes(stageId) ? 1 : 0;
}
