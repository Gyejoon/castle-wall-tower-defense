import { EventBus } from '../EventBus';

/**
 * Pure-logic run-scoped gold pool. No Phaser dependency.
 *
 * Gold accumulates from kill bounty (Game.ts forwards `result.bounty` here).
 * Spending happens via in-battle enhance — `PhaseAOrchestrator` calls
 * `spend()` on the orchestrator's injected `GoldApi` surface, which is just
 * this class.
 *
 * Emits `gold-changed` whenever the integer balance moves so the React HUD
 * mirrors it into `gameStore.gold` exactly once per delta.
 */
export class GoldSystem {
	private gold: number;
	private lastEmittedGold = -1;

	constructor(initial = 0) {
		this.gold = initial;
	}

	canAfford(cost: number): boolean {
		return Math.floor(this.gold) >= cost;
	}

	spend(cost: number): boolean {
		if (!this.canAfford(cost)) return false;
		this.gold -= cost;
		this.emitIfChanged();
		return true;
	}

	add(amount: number): void {
		if (amount <= 0) return;
		this.gold += amount;
		this.emitIfChanged();
	}

	getGold(): number {
		return Math.floor(this.gold);
	}

	reset(initial = 0): void {
		this.gold = initial;
		this.lastEmittedGold = -1;
		this.emitIfChanged();
	}

	private emitIfChanged(): void {
		const current = this.getGold();
		if (current !== this.lastEmittedGold) {
			this.lastEmittedGold = current;
			EventBus.emit('gold-changed', { gold: current });
		}
	}
}
