export type TowerType = 'laser' | 'plasma' | 'emp' | 'shield';

export type FusionTowerType =
  | 'twin_laser'
  | 'disruptor'
  | 'nova_cannon'
  | 'fortress'
  | 'stasis_field'
  | 'flame_tower'
  | 'wind_spire'
  | 'earth_golem'
  | 'holy_shrine'
  | 'dragon_nest'
  | 'arcane_spire'
  | 'world_tree'
  | 'celestial'
  | 'divine_throne'
  | 'hidden';

export type TowerTier = 'common' | 'rare' | 'heroic' | 'legendary' | 'god';

export interface TowerStats {
  damage: number;
  range: number;
  attackSpeed: number; // attacks per second
  special?: string;
}

export interface TowerDef {
  id: string;
  name: string;
  type: TowerType | FusionTowerType;
  tier: number; // 1=common, 2=rare, 3=heroic, 4=legendary, 5=god
  stats: TowerStats;
  cost: number;
  isPremium: boolean;
  color: string; // hex color for visual
  shape: 'diamond' | 'circle' | 'hexagon' | 'shield' | 'star';
}

export interface PlacedTower {
  instanceId: string;
  defId: string;
  position: { x: number; y: number };
  level: number;
}

export const TIER_NAMES: Record<number, TowerTier> = {
  1: 'common',
  2: 'rare',
  3: 'heroic',
  4: 'legendary',
  5: 'god',
};
