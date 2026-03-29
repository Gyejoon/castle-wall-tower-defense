export type PressureChoice = 'defend' | 'attack' | 'invest';

export interface TowerPlacement {
  col: number;
  row: number;
  towerDefId: string;
}

export interface GhostWaveAction {
  waveNumber: number;
  pressure: PressureChoice;
  towersPlaced: TowerPlacement[];
  goldSpent: number;
}

export interface GhostResult {
  wavesCompleted: number;
  goldRemaining: number;
  score: number;
}

export interface GhostRecord {
  id: string;
  playerName: string;
  timestamp: number;
  totalWaves: number;
  waves: GhostWaveAction[];
  result: GhostResult;
}

export interface MatchResult {
  playerWavesCompleted: number;
  playerGoldRemaining: number;
  ghostWavesCompleted: number;
  ghostGoldRemaining: number;
  outcome: 'victory' | 'defeat' | 'draw';
  ghostName: string;
}
