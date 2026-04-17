import { ENERGY_CAP, ENERGY_PER_SEC, INITIAL_ENERGY } from '@gld/shared';
import { EventBus } from '../EventBus';

/**
 * Pure-logic energy system. No Phaser dependency.
 *
 * Energy accumulates at ENERGY_PER_SEC per second.
 * getEnergy() returns Math.floor() for UI display.
 * Delta is clamped to 5s to handle tab suspend gracefully.
 */
export class EnergySystem {
	private energy: number;
	private lastEmittedEnergy = -1;
	private cap: number;

	constructor(initial = INITIAL_ENERGY, cap = ENERGY_CAP) {
		this.energy = initial;
		this.cap = cap;
	}

	disableCap(): void {
		this.cap = Infinity;
	}

	update(deltaSec: number): void {
		const clampedDelta = Math.min(deltaSec, 5);
		this.energy = Math.min(
			this.energy + ENERGY_PER_SEC * clampedDelta,
			this.cap,
		);
		this.emitIfChanged();
	}

	canAfford(cost: number): boolean {
		return Math.floor(this.energy) >= cost;
	}

	spend(cost: number): boolean {
		if (!this.canAfford(cost)) return false;
		this.energy -= cost;
		this.emitIfChanged();
		return true;
	}

	add(amount: number): void {
		if (amount <= 0) return;
		this.energy = Math.min(this.energy + amount, this.cap);
		this.emitIfChanged();
	}

	getEnergy(): number {
		return Math.floor(this.energy);
	}

	reset(initial = INITIAL_ENERGY): void {
		this.energy = initial;
		this.lastEmittedEnergy = -1;
		this.emitIfChanged();
	}

	private emitIfChanged(): void {
		const current = this.getEnergy();
		if (current !== this.lastEmittedEnergy) {
			this.lastEmittedEnergy = current;
			EventBus.emit('energy-changed', { energy: current });
		}
	}
}
