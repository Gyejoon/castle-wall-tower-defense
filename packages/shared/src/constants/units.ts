import type { UnitDef } from '../types/unit';

export const UNITS: UnitDef[] = [
  {
    id: 'scout_drone',
    name: 'Scout Drone',
    type: 'scout_drone',
    stats: { hp: 30, speed: 3.0, armor: 0 },
    sendCost: 20,
    bounty: 5,
    isPremium: false,
  },
  {
    id: 'battle_robot',
    name: 'Battle Robot',
    type: 'battle_robot',
    stats: { hp: 80, speed: 1.5, armor: 2 },
    sendCost: 50,
    bounty: 12,
    isPremium: false,
  },
  {
    id: 'heavy_walker',
    name: 'Heavy Walker',
    type: 'heavy_walker',
    stats: { hp: 200, speed: 0.8, armor: 5 },
    sendCost: 100,
    bounty: 25,
    isPremium: false,
  },
  {
    id: 'stealth_drone',
    name: 'Stealth Drone',
    type: 'stealth_drone',
    stats: { hp: 50, speed: 2.5, armor: 0, special: 'invisible_until_attacked' },
    sendCost: 70,
    bounty: 18,
    isPremium: false,
  },
  {
    id: 'titan',
    name: 'Titan',
    type: 'titan',
    stats: { hp: 500, speed: 0.5, armor: 10, special: 'boss_regen_2hp_s' },
    sendCost: 250,
    bounty: 60,
    isPremium: false,
  },
];
