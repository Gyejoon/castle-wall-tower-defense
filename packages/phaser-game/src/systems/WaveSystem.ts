import {
	FINAL_BOSS_HP_MULTIPLIER,
	getWaveScaling,
	INITIAL_PREP_MS,
	MAX_WAVE_DURATION_MS,
	UNITS,
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
 * Boss warning: emitted when a boss wave starts.
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
	private prepTimerMs = 0;
	private hasSpawnedCurrentWave = false;
	private elapsedMs = 0;
	private waveStartMs = 0;
	/**
	 * Timestamp (in `elapsedMs` clock) when the active boss unit first spawns.
	 * Used by the Phase A fast-clear energy bonus. Reset to `undefined` on
	 * each new wave; set by `markBossSpawned()` (called from the unit-spawned
	 * callback). See plan [F18].
	 */
	bossSpawnMs: number | undefined = undefined;

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
		this.waitTimerMs = 0;
		this.hasSpawnedCurrentWave = false;
		this.elapsedMs = 0;

		// 모든 전투는 prep 페이즈로 시작한다.
		// prep 중에는 타워를 자유롭게 배치할 수 있고, 에너지는 증가하지 않는다.
		this.phase = 'prep';
		this.prepTimerMs = INITIAL_PREP_MS;
		EventBus.emit('wave-prep-started', { durationMs: INITIAL_PREP_MS });
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

		if (this.phase === 'prep') {
			this.prepTimerMs -= clampedDelta;
			EventBus.emit('wave-prep-tick', {
				remainingMs: Math.max(0, this.prepTimerMs),
			});
			if (this.prepTimerMs <= 0) {
				// advanceToNextWave() sets phase based on wave.kind
				this.advanceToNextWave();
			}
			return;
		}

		if (this.phase === 'combat' || this.phase === 'boss') {
			const currentWave = this.getCurrentWaveDef();
			if (!currentWave) {
				this.phase = 'ended';
				return;
			}

			// Timer expiry: force next wave after MAX_WAVE_DURATION_MS. Skipped
			// on the final wave (run-end flow) and on any boss wave — boss
			// fights can legitimately exceed 30s and a timer-forced clear
			// strips the roguelike pick because `cleared` goes false.
			const isLastWave = this.currentWaveIndex >= this.maxWaves - 1;
			const isBossWave = currentWave.kind === 'boss';
			const timerExpired =
				!isLastWave &&
				!isBossWave &&
				this.hasSpawnedCurrentWave &&
				this.elapsedMs - this.waveStartMs > MAX_WAVE_DURATION_MS;

			// Wave cleared naturally or timer expired.
			//
			// Bug guard [post-ship]: if the player kills the last unit on the
			// SAME tick the timer expires, the old logic produced
			// `cleared = !timerExpired = false`, which blocks the Phase 4
			// boss-clear roguelike pick. Prefer the natural-clear signal:
			// activeUnitCount === 0 is authoritative, timer only matters if
			// units are still alive.
			const naturallyCleared =
				this.hasSpawnedCurrentWave && activeUnitCount === 0;
			if (naturallyCleared || timerExpired) {
				const cleared = naturallyCleared;
				EventBus.emit('wave-completed', {
					wave: currentWave.slotIndex,
					totalWaves: this.maxWaves,
					slotIndex: currentWave.slotIndex,
					delaySec: timerExpired ? 0 : currentWave.delayAfterClearSec,
					cleared,
					// Task 4.0 [F7]: surface the phase that just ended so Phase 4
					// roguelike handlers can distinguish boss vs. combat clears.
					phase: this.phase,
				});

				// Check if this was the last wave
				if (isLastWave) {
					if (activeUnitCount === 0) {
						this.phase = 'ended';
					}
					return;
				}

				// Timer expired → advance immediately; natural clear → wait.
				// A naturally-cleared wave always wins — it emits `cleared:true`
				// and takes the delay path, even if the timer happened to expire
				// on the same tick.
				if (naturallyCleared) {
					this.waitTimerMs = currentWave.delayAfterClearSec * 1000;
					this.phase = 'waiting';
				} else {
					this.advanceToNextWave();
				}
			}
		} else if (this.phase === 'waiting') {
			this.waitTimerMs -= clampedDelta;
			if (this.waitTimerMs <= 0) {
				this.advanceToNextWave();
			}
		}
	}

	getMaxWaves(): number {
		return this.maxWaves;
	}

	getWaveRemainingSec(): number {
		if (this.phase !== 'combat' && this.phase !== 'boss') return -1;
		const isLastWave = this.currentWaveIndex >= this.maxWaves - 1;
		if (isLastWave) return -1;
		const elapsed = this.elapsedMs - this.waveStartMs;
		return Math.max(0, Math.ceil((MAX_WAVE_DURATION_MS - elapsed) / 1000));
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

	/** Record the moment the first boss unit actually spawned (see [F18]). */
	markBossSpawned(): void {
		if (this.bossSpawnMs === undefined) {
			this.bossSpawnMs = this.elapsedMs;
		}
	}

	isLastWave(): boolean {
		return this.currentWaveIndex >= this.maxWaves - 1;
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
		this.waveStartMs = this.elapsedMs;
		this.bossSpawnMs = undefined;
		this.phase = wave.kind === 'boss' ? 'boss' : 'combat';

		// Emit boss warning when a boss wave starts
		if (wave.kind === 'boss') {
			const prevWave =
				this.currentWaveIndex > 0
					? this.waves[this.currentWaveIndex - 1]
					: undefined;
			EventBus.emit('boss-warning', {
				slotIndex: prevWave?.slotIndex ?? wave.slotIndex - 1,
				bossSlotIndex: wave.slotIndex,
				startAtSec: Math.round(this.elapsedMs / 1000),
			});
		}

		// Spawn units — use getWaveScaling so Phase A's endless waves keep
		// ramping HP/speed past slot 10 instead of silently flat-lining on
		// the 10-entry WAVE_SCALING table.
		const waveScale = getWaveScaling(wave.slotIndex);
		const waveHpMult = waveScale.hp;
		const waveSpeedMult = waveScale.speed;
		const isLastWaveSlot = this.currentWaveIndex >= this.maxWaves - 1;
		for (const group of wave.groups) {
			const unitDef = UNITS.find((u) => u.id === group.unitId);
			const isBoss = !!unitDef?.bossBehaviorId;
			const hpMultiplier =
				(isBoss && isLastWaveSlot ? FINAL_BOSS_HP_MULTIPLIER : 1) *
				this.difficultyHpMult *
				(group.hpMultiplier ?? 1);
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
