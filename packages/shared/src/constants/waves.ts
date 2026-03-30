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
  // Easy (1-5)
  { wave: 1, groups: [{ unitId: 'scout_drone', count: 6 }], buildTime: 25 },
  { wave: 2, groups: [{ unitId: 'scout_drone', count: 8 }, { unitId: 'battle_robot', count: 1 }], buildTime: 20 },
  { wave: 3, groups: [{ unitId: 'battle_robot', count: 4 }], buildTime: 18 },
  { wave: 4, groups: [{ unitId: 'scout_drone', count: 12 }, { unitId: 'battle_robot', count: 2 }], buildTime: 18 },
  { wave: 5, groups: [{ unitId: 'battle_robot', count: 6 }, { unitId: 'heavy_walker', count: 1 }], buildTime: 18 },

  // Medium (6-10)
  { wave: 6, groups: [{ unitId: 'stealth_drone', count: 3 }, { unitId: 'battle_robot', count: 5 }], buildTime: 15 },
  { wave: 7, groups: [{ unitId: 'heavy_walker', count: 3 }, { unitId: 'scout_drone', count: 15 }], buildTime: 15 },
  { wave: 8, groups: [{ unitId: 'stealth_drone', count: 5 }, { unitId: 'battle_robot', count: 8 }], buildTime: 15 },
  { wave: 9, groups: [{ unitId: 'heavy_walker', count: 4 }, { unitId: 'stealth_drone', count: 3 }, { unitId: 'battle_robot', count: 6 }], buildTime: 15 },
  { wave: 10, groups: [{ unitId: 'titan', count: 1 }, { unitId: 'heavy_walker', count: 2 }, { unitId: 'battle_robot', count: 5 }], buildTime: 18 },

  // Hard (11-15)
  { wave: 11, groups: [{ unitId: 'heavy_walker', count: 6 }, { unitId: 'stealth_drone', count: 4 }], buildTime: 15 },
  { wave: 12, groups: [{ unitId: 'scout_drone', count: 25 }, { unitId: 'battle_robot', count: 10 }], buildTime: 15 },
  { wave: 13, groups: [{ unitId: 'stealth_drone', count: 8 }, { unitId: 'heavy_walker', count: 5 }], buildTime: 15 },
  { wave: 14, groups: [{ unitId: 'titan', count: 1 }, { unitId: 'heavy_walker', count: 4 }, { unitId: 'stealth_drone', count: 5 }], buildTime: 15 },
  { wave: 15, groups: [{ unitId: 'heavy_walker', count: 8 }, { unitId: 'battle_robot', count: 12 }], buildTime: 18 },

  // Very Hard (16-20)
  { wave: 16, groups: [{ unitId: 'titan', count: 2 }, { unitId: 'heavy_walker', count: 5 }], buildTime: 15 },
  { wave: 17, groups: [{ unitId: 'scout_drone', count: 30 }, { unitId: 'stealth_drone', count: 10 }, { unitId: 'battle_robot', count: 15 }], buildTime: 15 },
  { wave: 18, groups: [{ unitId: 'titan', count: 2 }, { unitId: 'heavy_walker', count: 6 }, { unitId: 'stealth_drone', count: 6 }], buildTime: 15 },
  { wave: 19, groups: [{ unitId: 'titan', count: 3 }, { unitId: 'heavy_walker', count: 8 }, { unitId: 'battle_robot', count: 10 }], buildTime: 18 },
  { wave: 20, groups: [{ unitId: 'titan', count: 4 }, { unitId: 'heavy_walker', count: 10 }, { unitId: 'stealth_drone', count: 8 }, { unitId: 'battle_robot', count: 15 }], buildTime: 20 },
];

export const TOTAL_WAVES = WAVE_DEFS.length;
