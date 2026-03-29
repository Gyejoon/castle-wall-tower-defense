import type { GhostRecord, GhostWaveAction, PressureChoice } from '@gld/shared';
import type { UnitSystem } from './UnitSystem';

const GHOST_ATTACK_UNIT_ID = 'scout_drone';
const GHOST_ATTACK_UNIT_COUNT = 3;

export class GhostPlayer {
  private ghost: GhostRecord | null = null;
  private active: boolean = false;

  loadGhost(ghost: GhostRecord): void {
    this.ghost = ghost;
    this.active = true;
  }

  isActive(): boolean {
    return this.active;
  }

  getGhostName(): string {
    return this.ghost?.playerName ?? '';
  }

  getGhostResult(): { wavesCompleted: number; goldRemaining: number } | null {
    if (!this.ghost) return null;
    return {
      wavesCompleted: this.ghost.result.wavesCompleted,
      goldRemaining: this.ghost.result.goldRemaining,
    };
  }

  applyWaveAction(waveNumber: number, unitSystem: UnitSystem): void {
    if (!this.ghost || !this.active) return;

    const action = this.findWaveAction(waveNumber);
    if (!action) return;

    if (action.pressure === 'attack') {
      unitSystem.queueUnits(GHOST_ATTACK_UNIT_ID, GHOST_ATTACK_UNIT_COUNT);
    }
  }

  getWavePressure(waveNumber: number): PressureChoice | null {
    if (!this.ghost) return null;

    const action = this.findWaveAction(waveNumber);
    return action?.pressure ?? null;
  }

  reset(): void {
    this.ghost = null;
    this.active = false;
  }

  private findWaveAction(waveNumber: number): GhostWaveAction | undefined {
    return this.ghost?.waves.find((w: GhostWaveAction) => w.waveNumber === waveNumber);
  }
}
