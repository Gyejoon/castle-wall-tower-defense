import type { MapLayout, StarRating, WorldId } from '@gld/shared';
import type { TypedEventBus } from '../../EventBus';
import type { TowerInstance } from '../TowerSystem';

type Position = { x: number; y: number };

export interface GimmickContext {
	worldId: WorldId;
	map: MapLayout;
	star: StarRating;
	eventBus: TypedEventBus;
	/** Returns the current scene time in milliseconds. Implementations should call this each tick,
	 *  not capture it — scene time advances. */
	getSceneTimeMs: () => number;
	getTowers: () => TowerInstance[];
}

export interface WorldGimmick {
	readonly id: string;
	init(): void;
	onBattleStart(): void;
	onWaveStart(waveIndex: number): void;
	onTick(deltaMs: number): void;
	onTowerPlaced(tower: TowerInstance): void;
	/** Scene consults this per tower per tick to decide if the tower can fire. */
	isTowerActive(tower: TowerInstance): boolean;
	/** Tower placement UI consults this to block/allow placement on a given cell. */
	canPlaceTowerAt(pos: Position): boolean;
	/** Returns damage multiplier bonus for this tower (e.g. arcane circle +0.15). 0 = no bonus. */
	getDamageBonus(tower: TowerInstance): number;
	destroy(): void;
}

export type GimmickFactory = (ctx: GimmickContext) => WorldGimmick;
