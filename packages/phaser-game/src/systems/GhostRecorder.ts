import type { GhostRecord, GhostWaveAction, PressureChoice, TowerPlacement } from '@gld/shared';

const STORAGE_PREFIX = 'gld-ghost-';

export class GhostRecorder {
  private playerName: string = 'Player';
  private waveActions: GhostWaveAction[] = [];
  private currentWaveTowers: TowerPlacement[] = [];
  private currentWaveGoldSpent: number = 0;
  private currentWavePressure: PressureChoice = 'defend';
  private recording: boolean = false;

  startRecording(playerName: string): void {
    this.reset();
    this.playerName = playerName;
    this.recording = true;
  }

  startWave(_waveNumber: number): void {
    if (!this.recording) return;
    this.currentWaveTowers = [];
    this.currentWaveGoldSpent = 0;
    // Don't reset currentWavePressure here — it was already set during
    // the building phase via recordPressure(). Resetting would overwrite
    // the player's actual choice with 'defend'.
  }

  recordTowerPlacement(col: number, row: number, towerDefId: string): void {
    if (!this.recording) return;
    this.currentWaveTowers.push({ col, row, towerDefId });
  }

  recordGoldSpent(amount: number): void {
    if (!this.recording) return;
    this.currentWaveGoldSpent += amount;
  }

  recordPressure(choice: PressureChoice): void {
    if (!this.recording) return;
    this.currentWavePressure = choice;
  }

  endWave(waveNumber: number): void {
    if (!this.recording) return;

    const action: GhostWaveAction = {
      waveNumber,
      pressure: this.currentWavePressure,
      towersPlaced: [...this.currentWaveTowers],
      goldSpent: this.currentWaveGoldSpent,
    };

    this.waveActions.push(action);

    // Reset pressure for the next wave's building phase
    this.currentWavePressure = 'defend';
  }

  finalize(wavesCompleted: number, goldRemaining: number): GhostRecord {
    this.recording = false;

    const score = wavesCompleted * 100 + goldRemaining;

    return {
      id: crypto.randomUUID(),
      playerName: this.playerName,
      timestamp: Date.now(),
      totalWaves: this.waveActions.length,
      waves: [...this.waveActions],
      result: {
        wavesCompleted,
        goldRemaining,
        score,
      },
    };
  }

  saveToLocalStorage(record: GhostRecord): void {
    const key = `${STORAGE_PREFIX}${record.id}`;
    localStorage.setItem(key, JSON.stringify(record));
  }

  static loadFromLocalStorage(): GhostRecord[] {
    const records: GhostRecord[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as GhostRecord;
            records.push(parsed);
          } catch {
            continue;
          }
        }
      }
    }

    return records;
  }

  reset(): void {
    this.playerName = 'Player';
    this.waveActions = [];
    this.currentWaveTowers = [];
    this.currentWaveGoldSpent = 0;
    this.currentWavePressure = 'defend';
    this.recording = false;
  }
}
