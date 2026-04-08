import type {
	DeckCardDef,
	PlacementFailureReason,
	StarRating,
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
		energySpent?: number;
	};
	'deck-loaded': { cards: readonly DeckCardDef[] };
	'unit-spawned': { unitType: UnitType; count: number };
	'player-damaged': { playerId: string; damage: number; remainingHp: number };
	'game-over': {
		result: 'victory' | 'defeat';
		reason: 'all_waves_cleared' | 'base_hp_depleted';
		finalSlot: number;
		selectedStar: StarRating;
		starCleared: boolean;
		hpRemaining: number;
		stats: {
			wavesCleared: number;
			towersPlaced: number;
			timeSurvivedSec: number;
			goldEarned: number;
			rewardMultiplier: number;
		};
	};
	'energy-changed': { energy: number };
	'wave-started': {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		phase: WavePhase;
		kind: WaveSlotKind;
		startAtSec: number;
	};
	'wave-completed': {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		delaySec: number;
	};
	'boss-warning': {
		slotIndex: number;
		bossSlotIndex: number;
		startAtSec: number;
	};
	'boss-phase-change': { phase: 1 | 2; unitId: string };
	'boss-hp-update': { unitId: string; defId: string; hp: number; maxHp: number; phase: 1 | 2 };
	'boss-defeated': { unitId: string; waveSlot: number };
	'player-tower-count': { count: number };
	'wave-preview': {
		wave: number;
		groups: Array<{ unitId: string; unitName: string; count: number }>;
	};
	'tower-sold': { col: number; row: number; refund: number };
	'tower-selected': {
		towerDefId: string;
		towerName: string;
		col: number;
		row: number;
		refund: number;
	};
	'tower-deselected': undefined;
	'tutorial-step': { step: number; message: string };
	'tutorial-highlight-tiles': { tiles: Array<{ col: number; row: number }> };
	'tutorial-action-completed': { step: number };
	'tutorial-completed': undefined;
	// React → Game
	'request-select-tower': { towerDefId: string };
	'request-clear-tower-selection': undefined;
	'request-place-tower': { col: number; row: number; towerDefId: string };
	'request-sell-tower': { col: number; row: number };
	'request-start-game': undefined;
	'request-reset-run': undefined;
	'request-pause': undefined;
	'request-resume': undefined;
	'request-tutorial-advance': undefined;
	'request-set-speed': { multiplier: 1 | 2 };

	'base-hp-changed': { hp: number; maxHp: number; laneIndex: number };

	// Stage select
	'stage-select-ready': undefined;
	'request-enter-lobby': undefined;
	'request-start-game-from-stage': { mapId: string };
	'request-deck-edit': undefined;

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
