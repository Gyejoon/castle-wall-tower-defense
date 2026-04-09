// packages/shared/src/constants/worlds.ts
import type { WorldDef, WorldId } from '../types/stage';

export const WORLDS: Record<WorldId, WorldDef> = {
	w1_forest: {
		id: 'w1_forest',
		name: '변경의 숲',
		order: 1,
		unlockRule: { kind: 'always' },
		mapPool: ['w1_forest_a', 'w1_forest_b'],
		gimmickId: null,
		stageCount: 8,
	},
	w2_forge: {
		id: 'w2_forge',
		name: '불의 단조장',
		order: 2,
		unlockRule: { kind: 'world_star_all', worldId: 'w1_forest', star: 1 },
		mapPool: ['w2_forge_a', 'w2_forge_b'],
		gimmickId: 'w2_furnace',
		stageCount: 8,
	},
	w3_tower: {
		id: 'w3_tower',
		name: '마탑 성채',
		order: 3,
		unlockRule: { kind: 'world_star_all', worldId: 'w2_forge', star: 1 },
		mapPool: ['w3_tower_a', 'w3_tower_b'],
		gimmickId: 'w3_arcane',
		stageCount: 8,
	},
	w4_catacombs: {
		id: 'w4_catacombs',
		name: '왕가의 지하묘지',
		order: 4,
		unlockRule: { kind: 'world_star_all', worldId: 'w3_tower', star: 1 },
		mapPool: [],
		gimmickId: null,
		stageCount: 0,
	},
	w5_fallen: {
		id: 'w5_fallen',
		name: '몰락한 왕국',
		order: 5,
		unlockRule: { kind: 'world_star_all', worldId: 'w4_catacombs', star: 2 },
		mapPool: [],
		gimmickId: null,
		stageCount: 0,
	},
	w6_throne: {
		id: 'w6_throne',
		name: '마왕의 왕좌',
		order: 6,
		unlockRule: { kind: 'world_star_all', worldId: 'w5_fallen', star: 2 },
		mapPool: [],
		gimmickId: null,
		stageCount: 0,
	},
};

export const WORLD_ORDER: WorldId[] = [
	'w1_forest',
	'w2_forge',
	'w3_tower',
	'w4_catacombs',
	'w5_fallen',
	'w6_throne',
];

export function getWorldById(id: WorldId): WorldDef {
	const world = WORLDS[id];
	if (!world) throw new Error(`Unknown world id: ${id}`);
	return world;
}
