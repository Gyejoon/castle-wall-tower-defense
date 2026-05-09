import type { TowerFamily } from './tower';

export type CheckpointRewardType =
	| 'tower_upgrade'
	| 'wall_upgrade'
	| 'skill_upgrade'
	| 'global_card';

export type PlayerTacticId = 'force_move' | 'freeze';

export interface ActDef {
	actIndex: number;
	startWave: number;
	endWave: number;
}

export interface CheckpointReward {
	id: string;
	type: CheckpointRewardType;
	title: string;
	description: string;
	targetFamily?: TowerFamily;
	targetTactic?: PlayerTacticId;
}

export interface TowerSlotState {
	slotIndex: number;
	family: Extract<TowerFamily, 'archer' | 'siege' | 'frost' | 'stun'>;
	tier: number;
	unlocked: boolean;
	position: { x: number; y: number };
}

export interface WallState {
	currentHp: number;
	maxHp: number;
	repairCost: number;
	repairAmount: number;
	repairCooldownSec: number;
	repairCooldownRemainingSec: number;
	autoAttackDamage: number;
	autoAttackIntervalSec: number;
}

export interface PlayerTacticState {
	id: PlayerTacticId;
	unlocked: boolean;
	level: number;
	cooldownSec: number;
	cooldownRemainingSec: number;
}
