// packages/shared/src/types/stage.ts
import type { UnitType } from './unit';

export type WorldId =
	| 'w1_forest'
	| 'w2_forge'
	| 'w3_tower'
	| 'w4_catacombs'
	| 'w5_fallen'
	| 'w6_throne'
	| 'phase_a_lab';

export type WorldUnlockRule =
	| { kind: 'always' }
	| { kind: 'world_star_all'; worldId: WorldId; star: 1 | 2 | 3 };

export interface WorldDef {
	id: WorldId;
	name: string;
	order: number; // 1..6
	unlockRule: WorldUnlockRule;
	mapPool: string[]; // MapLayout id 목록 (2-3개)
	gimmickId: 'w2_furnace' | 'w3_arcane' | null;
	stageCount: number; // 8 (고정)
}

export interface StageDef {
	id: string; // 'w1_s1' ... 'w3_s8'
	worldId: WorldId;
	stageNumber: number; // 1..8
	name: string;
	mapId: string; // MapLayout id
	waveSetId: string; // STAGE_WAVES 키 (= stage id)
	isBossStage: boolean;
	bossUnitId?: UnitType;
	recommendedPower: number;
}

/** 해금 판정 결과 */
export interface StageLockStatus {
	locked: boolean;
	reason?: string;
}
