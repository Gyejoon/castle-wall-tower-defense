import { WAVE_DEFS, TOTAL_WAVES } from '@gld/shared';
import type { WavePhase } from '@gld/shared';
import type { UnitSystem } from './UnitSystem';
import { EventBus } from '../EventBus';

export class WaveSystem {
  private currentWave = 0;
  private phase: WavePhase = 'building';
  private countdownMs = 0;
  private lastTickSecond = -1;
  private combatStartedThisFrame = false;
  private unitSystem: UnitSystem;
  private maxWaves: number;

  constructor(unitSystem: UnitSystem, maxWaves?: number) {
    this.unitSystem = unitSystem;
    this.maxWaves = this.clampMaxWaves(maxWaves ?? TOTAL_WAVES);
  }

  setMaxWaves(count: number): void {
    this.maxWaves = this.clampMaxWaves(count);
  }

  start(): void {
    this.currentWave = 0;
    this.beginBuildingPhase();
  }

  skipCountdown(): void {
    if (this.phase !== 'building') return;
    this.countdownMs = 0;
  }

  update(delta: number): void {
    if (this.phase === 'ended') return;

    if (this.phase === 'building') {
      this.updateBuilding(delta);
    } else if (this.phase === 'combat') {
      this.updateCombat();
    }
  }

  private beginBuildingPhase(): void {
    this.phase = 'building';
    const nextWaveIndex = this.currentWave; // 0-indexed: currentWave is the next wave's index
    const buildTime = WAVE_DEFS[nextWaveIndex].buildTime;
    this.countdownMs = buildTime * 1000;
    this.lastTickSecond = buildTime;
    EventBus.emit('building-phase-started', { nextWave: this.currentWave + 1, countdown: buildTime });
    EventBus.emit('countdown-tick', { secondsLeft: buildTime });
  }

  private updateBuilding(delta: number): void {
    this.countdownMs -= delta;

    const secondsLeft = Math.ceil(this.countdownMs / 1000);
    if (secondsLeft !== this.lastTickSecond && secondsLeft >= 0) {
      this.lastTickSecond = secondsLeft;
      EventBus.emit('countdown-tick', { secondsLeft: Math.max(0, secondsLeft) });
    }

    if (this.countdownMs <= 0) {
      this.startNextWave();
    }
  }

  private startNextWave(): void {
    this.currentWave++;
    const waveDef = WAVE_DEFS[this.currentWave - 1];

    for (const group of waveDef.groups) {
      this.unitSystem.queueUnits(group.unitId, group.count);
    }

    this.phase = 'combat';
    this.combatStartedThisFrame = true;
    EventBus.emit('wave-started', { wave: this.currentWave, totalWaves: this.maxWaves });
  }

  private updateCombat(): void {
    if (this.combatStartedThisFrame) {
      this.combatStartedThisFrame = false;
      return;
    }

    if (this.unitSystem.hasActiveUnits() || this.unitSystem.hasQueuedUnits()) {
      return;
    }

    // Wave cleared
    EventBus.emit('wave-completed', { wave: this.currentWave, totalWaves: this.maxWaves });

    if (this.currentWave >= this.maxWaves) {
      this.phase = 'ended';
      EventBus.emit('game-won');
      return;
    }

    this.beginBuildingPhase();
  }

  getPhase(): WavePhase {
    return this.phase;
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  destroy(): void {
    this.phase = 'ended';
  }

  private clampMaxWaves(count: number): number {
    return Math.max(1, Math.min(count, WAVE_DEFS.length));
  }
}
