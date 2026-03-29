import type { GhostRecord, GhostWaveAction, PressureChoice } from '@gld/shared';

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
