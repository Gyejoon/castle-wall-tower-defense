import {
	BOSS_WARNING_AT_SECS,
	TOTAL_WAVES,
	WAVE_DEFS,
	type WaveDef,
	type WavePhase,
} from '@gld/shared';
import { EventBus } from '../EventBus';
import type { UnitSystem } from './UnitSystem';

export class WaveSystem {
	private unitSystem: UnitSystem;
	private maxWaves: number;
	private elapsedMs = 0;
	private currentSlotIndex = 0;
	private phase: WavePhase = 'running';
	private emittedBossWarnings = new Set<number>();

	constructor(unitSystem: UnitSystem, maxWaves?: number) {
		this.unitSystem = unitSystem;
		this.maxWaves = this.clampMaxWaves(maxWaves ?? TOTAL_WAVES);
	}

	setMaxWaves(count: number): void {
		this.maxWaves = this.clampMaxWaves(count);
	}

	start(): void {
		this.elapsedMs = 0;
		this.currentSlotIndex = 0;
		this.phase = 'running';
		this.emittedBossWarnings.clear();
		this.startSlot(WAVE_DEFS[0]);
	}

	update(delta: number): void {
		if (this.phase === 'ended') return;

		const MAX_DELTA_MS = 5000;
		const previousElapsedMs = this.elapsedMs;
		this.elapsedMs += Math.min(delta, MAX_DELTA_MS);

		for (const warningSec of BOSS_WARNING_AT_SECS) {
			const warningMs = warningSec * 1000;
			if (
				previousElapsedMs < warningMs &&
				this.elapsedMs >= warningMs &&
				!this.emittedBossWarnings.has(warningSec)
			) {
				this.emittedBossWarnings.add(warningSec);
				const warningSlot = WAVE_DEFS.find(
					(slot) => slot.startAtSec === warningSec,
				);
				const bossSlot = WAVE_DEFS.find(
					(slot) => slot.startAtSec === warningSec + 30,
				);
				if (warningSlot && bossSlot) {
					EventBus.emit('boss-warning', {
						slotIndex: warningSlot.slotIndex,
						bossSlotIndex: bossSlot.slotIndex,
						startAtSec: warningSec,
					});
				}
			}
		}

		let nextSlot = this.getNextSlot();
		while (nextSlot && this.elapsedMs >= nextSlot.startAtSec * 1000) {
			this.finishCurrentSlot();
			this.startSlot(nextSlot);
			nextSlot = this.getNextSlot();
		}
	}

	getPhase(): WavePhase {
		return this.phase;
	}

	getCurrentWave(): number {
		return Math.min(this.currentSlotIndex, this.maxWaves);
	}

	getCurrentSlot(): WaveDef {
		return WAVE_DEFS[this.currentSlotIndex - 1] ?? WAVE_DEFS[0];
	}

	getElapsedMs(): number {
		return this.elapsedMs;
	}

	destroy(): void {
		this.phase = 'ended';
	}

	private startSlot(slot: WaveDef): void {
		this.currentSlotIndex = slot.slotIndex;
		this.phase = this.getPhaseForSlot(slot);

		if (slot.kind !== 'hard_end') {
			for (const group of slot.groups) {
				this.unitSystem.queueUnits(group.unitId, group.count, {
					source: 'base',
					countsTowardClear: true,
				});
			}
		}

		EventBus.emit('wave-started', {
			wave: Math.min(slot.slotIndex, this.maxWaves),
			totalWaves: this.maxWaves,
			slotIndex: slot.slotIndex,
			phase: this.phase,
			kind: slot.kind,
			startAtSec: slot.startAtSec,
		});

		if (slot.kind === 'sudden_death') {
			EventBus.emit('sudden-death-started', {
				slotIndex: slot.slotIndex,
				startAtSec: slot.startAtSec,
			});
		}
	}

	private finishCurrentSlot(): void {
		if (this.currentSlotIndex <= 0 || this.currentSlotIndex > this.maxWaves)
			return;

		EventBus.emit('wave-completed', {
			wave: Math.min(this.currentSlotIndex, this.maxWaves),
			totalWaves: this.maxWaves,
			slotIndex: this.currentSlotIndex,
		});
	}

	private getNextSlot(): WaveDef | null {
		const nextIndex = this.currentSlotIndex;
		const slot = WAVE_DEFS[nextIndex];
		if (!slot) return null;
		if (slot.slotIndex > this.maxWaves + 1) return null;
		return slot;
	}

	private getPhaseForSlot(slot: WaveDef): WavePhase {
		if (slot.kind === 'boss') return 'boss';
		if (slot.kind === 'sudden_death') return 'sudden_death';
		if (slot.kind === 'hard_end') return 'ended';
		return 'running';
	}

	private clampMaxWaves(count: number): number {
		return Math.max(1, Math.min(count, TOTAL_WAVES));
	}
}
