import type { UnitType } from '../types/unit';

export interface WaveGroup {
  unitId: UnitType;
  count: number;
}

export interface WaveDef {
  wave: number;
  groups: WaveGroup[];
  buildTime: number; // seconds
}

export const WAVE_DEFS: WaveDef[] = [
  {
    wave: 1,
    groups: [{ unitId: 'scout_drone', count: 8 }],
    buildTime: 20,
  },
  {
    wave: 2,
    groups: [
      { unitId: 'scout_drone', count: 10 },
      { unitId: 'battle_robot', count: 2 },
    ],
    buildTime: 15,
  },
  {
    wave: 3,
    groups: [{ unitId: 'battle_robot', count: 5 }],
    buildTime: 15,
  },
  {
    wave: 4,
    groups: [
      { unitId: 'scout_drone', count: 15 },
      { unitId: 'heavy_walker', count: 1 },
    ],
    buildTime: 15,
  },
  {
    wave: 5,
    groups: [
      { unitId: 'battle_robot', count: 8 },
      { unitId: 'heavy_walker', count: 2 },
    ],
    buildTime: 15,
  },
  {
    wave: 6,
    groups: [
      { unitId: 'stealth_drone', count: 3 },
      { unitId: 'battle_robot', count: 6 },
    ],
    buildTime: 15,
  },
  {
    wave: 7,
    groups: [
      { unitId: 'heavy_walker', count: 4 },
      { unitId: 'scout_drone', count: 20 },
    ],
    buildTime: 15,
  },
  {
    wave: 8,
    groups: [
      { unitId: 'stealth_drone', count: 5 },
      { unitId: 'battle_robot', count: 10 },
    ],
    buildTime: 15,
  },
  {
    wave: 9,
    groups: [
      { unitId: 'heavy_walker', count: 6 },
      { unitId: 'stealth_drone', count: 4 },
      { unitId: 'battle_robot', count: 10 },
    ],
    buildTime: 15,
  },
  {
    wave: 10,
    groups: [
      { unitId: 'titan', count: 1 },
      { unitId: 'heavy_walker', count: 3 },
      { unitId: 'battle_robot', count: 8 },
    ],
    buildTime: 20,
  },
];

export const TOTAL_WAVES = WAVE_DEFS.length;

export const GHOST_BATTLE_WAVES = 5;
