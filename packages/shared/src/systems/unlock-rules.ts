import { getStagesByWorld, STAGES } from '../constants/stages';
import type { StarRating } from '../constants/starDifficulty';
import { getWorldById, WORLDS } from '../constants/worlds';
import type { StageLockStatus, WorldId } from '../types/stage';

type StageStars = Record<string, StarRating>;

export function isWorldUnlocked(worldId: WorldId, stars: StageStars): boolean {
	const world = getWorldById(worldId);
	const rule = world.unlockRule;
	if (rule.kind === 'always') return true;
	if (rule.kind === 'world_star_all') {
		const prevStages = getStagesByWorld(rule.worldId);
		if (prevStages.length === 0) return false; // prerequisite world has no playable stages
		return prevStages.every((s) => (stars[s.id] ?? 0) >= rule.star);
	}
	return false;
}

export function isStageUnlocked(stageId: string, stars: StageStars): boolean {
	const stage = STAGES[stageId];
	if (!stage) throw new Error(`Unknown stage id: ${stageId}`);

	if (!isWorldUnlocked(stage.worldId, stars)) return false;

	if (stage.stageNumber === 1) return true;

	const worldStages = getStagesByWorld(stage.worldId);
	const prev = worldStages.find((s) => s.stageNumber === stage.stageNumber - 1);
	if (!prev) return false;
	return (stars[prev.id] ?? 0) >= 1;
}

export function getStageLockStatus(
	stageId: string,
	stars: StageStars,
): StageLockStatus {
	const stage = STAGES[stageId];
	if (!stage) throw new Error(`Unknown stage id: ${stageId}`);

	if (isStageUnlocked(stageId, stars)) {
		return { locked: false };
	}

	if (!isWorldUnlocked(stage.worldId, stars)) {
		const rule = WORLDS[stage.worldId].unlockRule;
		if (rule.kind === 'world_star_all') {
			const prevWorld = WORLDS[rule.worldId];
			return {
				locked: true,
				reason: `${prevWorld.name} ★${rule.star} 전체 클리어 필요`,
			};
		}
	}

	const worldStages = getStagesByWorld(stage.worldId);
	const prev = worldStages.find((s) => s.stageNumber === stage.stageNumber - 1);
	return {
		locked: true,
		reason: prev ? `${prev.name} 클리어 필요` : '잠김',
	};
}
