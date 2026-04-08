import {
	FINAL_BOSS_HP_MULTIPLIER,
	WAVE_SCALING,
	type WaveDef,
	type WavePhase,
} from '@gld/shared';
import { EventBus } from '../EventBus';
import type { UnitSystem } from './UnitSystem';

/**
 * Event-based wave progression system.
 *
 * State machine:
 *   spawning → combat (units alive) → waiting (delay timer) → spawning (next wave)
 *   After final wave cleared → ended
 *
 * Boss warning: emitted when a pre_boss wave transitions to waiting.
 */
export class WaveSystem {
	private unitSystem: UnitSystem;
	private maxWaves: number;
	private waves: WaveDef[];
	private difficultyHpMult: number;
	private armorMult: number;
	private speedMult: number;
	private ccResist: number;

	private currentWaveIndex = -1; // index into waves (0-based)
	private phase: WavePhase = 'combat';
	private waitTimerMs = 0;
	private hasSpawnedCurrentWave = false;
	private elapsedMs = 0;

	constructor(
		unitSystem: UnitSystem,
		waves: WaveDef[],
		maxWaves?: number,
		options?: {
			difficultyHpMult?: number;
			armorMult?: number;
			speedMult?: number;
			ccResist?: number;
		},
	) {
		this.unitSystem = unitSystem;
		this.waves = waves;
		this.maxWaves = Math.max(
			1,
			Math.min(maxWaves ?? waves.length, waves.length),
		);
		this.difficultyHpMult = options?.difficultyHpMult ?? 1;
		this.armorMult = options?.armorMult ?? 1;
		this.speedMult = options?.speedMult ?? 1;
		this.ccResist = options?.ccResist ?? 0;
	}

	setMaxWaves(count: number): void {
		this.maxWaves = Math.max(1, Math.min(count, this.waves.length));
	}

	start(): void {
		this.currentWaveIndex = -1;
		this.phase = 'combat';
		this.waitTimerMs = 0;
		this.hasSpawnedCurrentWave = false;
		this.elapsedMs = 0;
		this.advanceToNextWave();
	}

	/**
	 * @param delta Frame delta in milliseconds
	 * @param activeUnitCount Number of alive + queued units from UnitSystem
	 */
	update(delta: number, activeUnitCount: number): void {
		if (this.phase === 'ended') return;

		const MAX_DELTA_MS = 5000;
		const clampedDelta = Math.min(delta, MAX_DELTA_MS);
		this.elapsedMs += clampedDelta;

		if (this.phase === 'combat' || this.phase === 'boss') {
			// Wait for all units to be cleared (killed or leaked)
			if (this.hasSpawnedCurrentWave && activeUnitCount === 0) {
				const currentWave = this.getCurrentWaveDef();
				if (!currentWave) {
					this.phase = 'ended';
					return;
				}

				// Emit wave completed
				EventBus.emit('wave-completed', {
					wave: currentWave.slotIndex,
					totalWaves: this.maxWaves,
					slotIndex: currentWave.slotIndex,
					delaySec: currentWave.delayAfterClearSec,
				});

				// Check if this was the last wave
				if (this.currentWaveIndex >= this.maxWaves - 1) {
					this.phase = 'ended';
					return;
				}

				// Emit boss warning when pre_boss wave is cleared
				if (currentWave.kind === 'pre_boss') {
					const nextWave = this.waves[this.currentWaveIndex + 1];
					if (nextWave) {
						EventBus.emit('boss-warning', {
							slotIndex: currentWave.slotIndex,
							bossSlotIndex: nextWave.slotIndex,
							startAtSec: Math.round(this.elapsedMs / 1000),
						});
					}
				}

				// Transition to waiting
				this.waitTimerMs = currentWave.delayAfterClearSec * 1000;
				this.phase = 'waiting';
			}
		} else if (this.phase === 'waiting') {
			this.waitTimerMs -= clampedDelta;
			if (this.waitTimerMs <= 0) {
				this.advanceToNextWave();
			}
		}
	}

	getPhase(): WavePhase {
		return this.phase;
	}

	getCurrentWave(): number {
		const wave = this.getCurrentWaveDef();
		return wave ? wave.slotIndex : 0;
	}

	getCurrentSlot(): WaveDef {
		return this.getCurrentWaveDef() ?? this.waves[0];
	}

	getElapsedMs(): number {
		return this.elapsedMs;
	}

	destroy(): void {
		this.phase = 'ended';
	}

	private getCurrentWaveDef(): WaveDef | undefined {
		if (
			this.currentWaveIndex < 0 ||
			this.currentWaveIndex >= this.waves.length
		) {
			return undefined;
		}
		return this.waves[this.currentWaveIndex];
	}

	private advanceToNextWave(): void {
		this.currentWaveIndex += 1;

		if (this.currentWaveIndex >= this.maxWaves) {
			this.phase = 'ended';
			return;
		}

		const wave = this.waves[this.currentWaveIndex];
		if (!wave) {
			this.phase = 'ended';
			return;
		}

		this.hasSpawnedCurrentWave = false;
		this.phase = wave.kind === 'boss' ? 'boss' : 'combat';

		// Spawn units
		const waveScale = WAVE_SCALING[wave.slotIndex - 1];
		const waveHpMult = waveScale?.hp ?? 1;
		const waveSpeedMult = waveScale?.speed ?? 1;
		for (const group of wave.groups) {
			const isBoss = group.unitId === 'titan';
			const hpMultiplier =
				(isBoss && wave.slotIndex === 10 ? FINAL_BOSS_HP_MULTIPLIER : 1) *
				this.difficultyHpMult;
			this.unitSystem.queueUnits(group.unitId, group.count, {
				source: 'base',
				countsTowardClear: true,
				isBoss,
				hpMultiplier,
				waveHpMult,
				waveSpeedMult: waveSpeedMult * this.speedMult,
				waveSlot: wave.slotIndex,
				armorMult: this.armorMult,
				ccResist: this.ccResist,
			});
		}
		this.hasSpawnedCurrentWave = true;

		// Emit wave started
		EventBus.emit('wave-started', {
			wave: wave.slotIndex,
			totalWaves: this.maxWaves,
			slotIndex: wave.slotIndex,
			phase: this.phase,
			kind: wave.kind,
			startAtSec: Math.round(this.elapsedMs / 1000),
		});
	}
}
