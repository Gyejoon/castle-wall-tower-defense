export type TowerType = 'laser' | 'plasma' | 'emp' | 'shield';

export type FusionTowerType =
  | 'twin_laser'
  | 'disruptor'
  | 'nova_cannon'
  | 'fortress'
  | 'stasis_field'
  | 'hidden';

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
  tier: number; // 1=base, 2=fusion
  stats: TowerStats;
  cost: number;
  fusionRecipe?: TowerType[]; // required base towers for fusion
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
