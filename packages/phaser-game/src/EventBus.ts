import type {
	PlacementFailureReason,
	Position,
	PressurePacketId,
	TowerDef,
	UnitType,
	WavePhase,
	WaveSlotKind,
} from '@gld/shared';
import { Events } from 'phaser';

export interface GameEventMap {
	// Game → React
	'game-ready': undefined;
	'tower-placed': {
		col: number;
		row: number;
		towerId: string;
		success: boolean;
		reason?: PlacementFailureReason;
	};
	'unit-spawned': { unitType: UnitType; count: number };
	'player-damaged': { playerId: string; damage: number; remainingHp: number };
	'path-updated': { path: Position[] };
	'game-over': { winnerId: string };
	'gold-changed': { gold: number };
	'wave-started': {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		phase: WavePhase;
		kind: WaveSlotKind;
		startAtSec: number;
	};
	'wave-completed': { wave: number; totalWaves: number; slotIndex: number };
	'pressure-earned': {
		ownerId: string;
		slotIndex: number;
		pressureTokens: number;
		packetId: PressurePacketId;
	};
	'pressure-queued': {
		ownerId: string;
		slotIndex: number;
		pressureTokens: number;
		packetId: PressurePacketId;
		targetSlotIndex: number;
	};
	'pressure-expired': {
		ownerId: string;
		slotIndex: number;
		pressureTokens: number;
		packetId: PressurePacketId;
	};
	'boss-warning': {
		slotIndex: number;
		bossSlotIndex: number;
		startAtSec: number;
	};
	'sudden-death-started': { slotIndex: number; startAtSec: number };
	'buy-cooldown-updated': { remainingMs: number };
	'tower-merge-resolved': {
		success: boolean;
		fromPos: Position;
		toPos: Position;
		newTowerId?: string;
		failureReason?: string;
	};

	// Tower sell
	'tower-sold': { col: number; row: number; refund: number };
	'player-tower-count': { count: number };

	// Wave preview
	'wave-preview': {
		wave: number;
		groups: Array<{ unitId: string; unitName: string; count: number }>;
	};

	// Random tower system
	'random-tower-rolled': { towerId: string; towerDef: TowerDef };

	// Merge system
	'tower-merged': {
		fromPos: Position;
		toPos: Position;
		newTowerId: string;
		newTowerDef: TowerDef;
	};
	'tower-merge-failed': { reason: string };

	// Opponent / Kill transfer
	'opponent-damaged': { damage: number; remainingHp: number };
	'opponent-state': { gold: number; hp: number; towerCount: number };
	'kill-transfer': { unitType: string; count: number };

	// Emotes
	'send-emote': { emoteId: string };
	'emote-received': { emoteId: string; playerId: string };

	// React → Game
	'request-buy-random-tower': undefined;
	'request-select-tower': { towerDefId: string };
	'request-clear-tower-selection': undefined;
	'request-place-tower': { col: number; row: number; towerDefId: string };
	'request-sell-tower': { col: number; row: number };
	'request-start-game': undefined;
	'request-reset-run': undefined;
	'request-pause': undefined;
	'request-resume': undefined;

	// Internal
	'current-scene-ready': Phaser.Scene;
}

class TypedEventBus {
	private emitter = new Events.EventEmitter();

	emit<K extends keyof GameEventMap>(
		event: K,
		...args: GameEventMap[K] extends undefined ? [] : [GameEventMap[K]]
	): void {
		this.emitter.emit(event, ...args);
	}

	on<K extends keyof GameEventMap>(
		event: K,
		fn: GameEventMap[K] extends undefined
			? () => void
			: (data: GameEventMap[K]) => void,
		context?: unknown,
	): void {
		this.emitter.on(event, fn as (...args: unknown[]) => void, context);
	}

	off<K extends keyof GameEventMap>(
		event: K,
		fn: GameEventMap[K] extends undefined
			? () => void
			: (data: GameEventMap[K]) => void,
		context?: unknown,
	): void {
		this.emitter.off(event, fn as (...args: unknown[]) => void, context);
	}

	removeAllListeners(): void {
		this.emitter.removeAllListeners();
	}
}

export const EventBus = new TypedEventBus();
