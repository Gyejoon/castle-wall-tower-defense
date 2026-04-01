import type { PressurePacketId, WaveSlotKind } from '../constants/waves';
import type { WavePhase } from './game-state';
import type { Position } from './grid';
import type { PlacementFailureReason } from './placement';

export interface WaveStartedEventPayload {
	wave: number;
	totalWaves: number;
	slotIndex: number;
	phase: WavePhase;
	kind: WaveSlotKind;
	startAtSec: number;
}

export interface PressureEventPayload {
	ownerId: string;
	slotIndex: number;
	pressureTokens: number;
	packetId: PressurePacketId;
}

// React → Game Engine
export type ReactToGameEvent =
	| { type: 'REQUEST_START_GAME' }
	| { type: 'REQUEST_SELECT_TOWER'; towerDefId: string }
	| { type: 'REQUEST_CLEAR_TOWER_SELECTION' }
	| { type: 'REQUEST_PLACE_TOWER'; towerId: string; position: Position }
	| { type: 'REQUEST_PAUSE' }
	| { type: 'REQUEST_RESUME' };

// Game Engine → React
export type GameToReactEvent =
	| { type: 'GAME_READY' }
	| {
			type: 'TOWER_PLACED';
			towerId: string;
			position: Position;
			success: boolean;
			reason?: PlacementFailureReason;
	  }
	| { type: 'UNIT_SPAWNED'; unitId: string; count: number }
	| {
			type: 'PLAYER_DAMAGED';
			playerId: string;
			damage: number;
			remainingHp: number;
	  }
	| { type: 'PATH_UPDATED'; path: Position[] }
	| { type: 'GOLD_CHANGED'; gold: number }
	| ({ type: 'WAVE_STARTED' } & WaveStartedEventPayload)
	| {
			type: 'WAVE_COMPLETED';
			wave: number;
			totalWaves: number;
			slotIndex: number;
	  }
	| ({ type: 'PRESSURE_EARNED' } & PressureEventPayload)
	| ({ type: 'PRESSURE_QUEUED' } & PressureEventPayload & {
				targetSlotIndex: number;
			})
	| ({ type: 'PRESSURE_EXPIRED' } & PressureEventPayload)
	| {
			type: 'BOSS_WARNING';
			slotIndex: number;
			bossSlotIndex: number;
			startAtSec: number;
	  }
	| { type: 'SUDDEN_DEATH_STARTED'; slotIndex: number; startAtSec: number }
	| { type: 'BUY_COOLDOWN_UPDATED'; remainingMs: number }
	| {
			type: 'TOWER_MERGE_RESOLVED';
			success: boolean;
			fromPos: Position;
			toPos: Position;
			newTowerId?: string;
			failureReason?: string;
	  }
	| { type: 'GAME_OVER'; winnerId: string };
