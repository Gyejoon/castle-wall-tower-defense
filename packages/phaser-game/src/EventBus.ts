import type {
	DeckCardDef,
	PlacementFailureReason,
	TowerId,
	UnitType,
	UpgradeableFamily,
	UpgradeId,
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
		stats: {
			wavesCleared: number;
			totalWaves: number;
			towersPlaced: number;
			timeSurvivedSec: number;
			goldEarned: number;
			remainingHp: number;
			initialHp: number;
		};
	};
	'energy-changed': { energy: number };
	'wave-prep-started': { durationMs: number };
	'wave-prep-tick': { remainingMs: number };
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
		cleared: boolean;
		/** Phase of the wave that just ended. Added in Phase 3/Task 4.0 [F7]
		 *  so Phase 4 roguelike triggers can distinguish boss vs. combat. */
		phase: WavePhase;
	};
	'boss-warning': {
		slotIndex: number;
		bossSlotIndex: number;
		startAtSec: number;
	};
	'boss-phase-change': { phase: 1 | 2 | 3; unitId: string };
	'boss-hp-update': {
		unitId: string;
		defId: string;
		hp: number;
		maxHp: number;
		phase: 1 | 2 | 3;
	};
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
		tier: number;
	};
	'request-enter-move-mode': {
		fromCol: number;
		fromRow: number;
	};
	'request-move-tower': {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	};
	'tower-moved': {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	};
	'move-failed': {
		reason: 'invalid-tile' | 'occupied';
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
	'request-set-speed': { multiplier: 1 | 2 | 3 };
	'wave-timer-tick': { remainingSec: number; wave: number; totalWaves: number };
	'base-hp-changed': { hp: number; maxHp: number; laneIndex: number };

	// Stage select
	// Phase 8 [F22 dep] swept `stage-select-ready` and
	// `request-start-game-from-stage` — both had zero emitters/listeners
	// after the Phase 6 scenario purge.
	'request-enter-lobby': undefined;
	'request-enter-stage-select': undefined;
	'request-deck-edit': undefined;

	// Phase 6: furnace-cycle / arcane-burst events removed with
	// world-gimmicks. Scenario-only; 정식 모드에는 per-world effects가 없다.

	// Internal
	'current-scene-ready': Phaser.Scene;

	// === Random Summon + Merge System (정식 모드) ===
	'request-summon-tower': undefined;
	'request-merge-towers': {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	};
	'tower-summoned': {
		col: number;
		row: number;
		/** Tower definition id. Typed as TowerId so Phase 4/5 gacha emitters
		 *  stay type-safe; legacy string call-sites are still assignable. */
		towerId: TowerId;
		/** Instance id of the placed tower (new in Task 4.0 [F7]). Currently
		 *  emitted by CoreOrchestrator as empty string if the placement
		 *  site did not return one; future placement APIs will populate. */
		instanceId: string;
		/** Family/tier model (Phase 1). `grade` is removed. */
		tier: number;
	};
	'towers-merged': {
		col: number;
		row: number;
		towerId: string;
		fromA: string;
		fromB: string;
		toInstanceId: string;
		toTowerId: string;
		fromTier: number;
		toTier: number;
	};
	'merge-failed': {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
		reason:
			| 'same-instance'
			| 'incompatible-pair'
			| 'same-family-t4'
			| 'max-tier'
			| 'invalid-tile';
	};
	'summon-failed': {
		reason:
			| 'insufficient-energy'
			| 'no-empty-tile'
			| 'placement-failed'
			| 'occupied'
			| 'blocked-path'
			| 'out-of-bounds';
	};
	'summon-ready': {
		towerId: TowerId;
		/** Origin of the drawn tower — normal summon pool or gacha roll.
		 *  Added in Task 4.0 [F7] ahead of Phase 5 gacha wiring. */
		source: 'summon' | 'gacha';
	};

	// === Roguelike Upgrade System (정식 모드) ===
	'upgrade-choice-ready': {
		choices: Array<{
			id: UpgradeId;
			name: string;
			description: string;
			icon?: string;
		}>;
	};
	'request-apply-upgrade': { upgradeId: string };
	'upgrade-applied': { upgradeId: string; totalStacks: number };

	// === Pre-registered for Phase 4/5/8/10 [F7] ===
	/** Roguelike reroll request — Phase 4 will emit this from the upgrade
	 *  choice overlay when the user spends a reroll charge. */
	'request-upgrade-reroll': undefined;
	/** Ingame gacha summon request at a specific tier. Phase 5 GachaSystem
	 *  owns the handler. */
	'request-gacha-summon': { targetTier: 2 | 3 | 4 };
	/** Emitted when a gacha summon fails because energy is below the tier
	 *  cost. UI surfaces this as a toast/animation in Phase 5. */
	'gacha-insufficient-energy': {
		targetTier: number;
		cost: number;
		have: number;
	};
	/** Continue-run request after defeat; Phase 10 BM stub shows an ad and
	 *  restores `livesRestored` HP on success. [F11] */
	'request-continue-run': { livesRestored: number };
	/** Emitted by `CoreOrchestrator` after a successful continue — the
	 *  orchestrator has validated the ad reward and decided to revive the
	 *  run. Game.ts reverses its game-over state (lives, gameOver flag,
	 *  lifecycle subscriptions) and the React layer drops the GameOverScreen
	 *  in response. [F11] */
	'game-resumed': { livesRestored: number };
	/** Emitted when a merge is staged from a tower action sheet — React
	 *  switches into merge-target-picker mode until the next tower tap.
	 *  [F10] owns the Phase 8 handler. */
	'enter-merge-mode': { sourceId: string };

	// === Family upgrade (run-scoped, energy-paid) ===
	/** React asks the orchestrator to spend energy and bump the family's
	 *  damage-buff stack by one. */
	'request-family-upgrade': { family: UpgradeableFamily };
	/** Orchestrator confirmed the upgrade. `level` is the new (post-increment)
	 *  level; `cost` is the energy that was just spent. */
	'family-upgraded': {
		family: UpgradeableFamily;
		level: number;
		cost: number;
	};
	/** Upgrade rejected. HUD surfaces the reason as a toast/flash. */
	'family-upgrade-failed': {
		family: UpgradeableFamily;
		reason: 'insufficient-energy' | 'max-level';
		cost: number;
		have: number;
	};
}

export class TypedEventBus {
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
