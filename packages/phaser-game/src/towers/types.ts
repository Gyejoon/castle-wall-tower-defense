import type { PlacedTower, TowerDef, ElementType } from '@gld/shared';
import type Phaser from 'phaser';
import type { GridManager } from '../systems/GridManager';
import type { TowerVfxController } from './vfx/TowerVfxController';

export interface UnitSnapshot {
	readonly instanceId: string;
	readonly x: number;
	readonly y: number;
	readonly hp: number;
	readonly element: ElementType;
}

export interface DamageEvent {
	unitId: string;
	damage: number;
	armorPierce?: boolean;
	slow?: { factor: number; duration: number };
	stun?: { duration: number };
}

export interface TowerRuntimeRef {
	readonly def: TowerDef;
	readonly data: PlacedTower;
	readonly level: number;
	readonly sprite: Phaser.GameObjects.Image;
	readonly barrelSprite?: Phaser.GameObjects.Image;
	readonly worldPos: { readonly x: number; readonly y: number };
}

export interface AttackContext {
	readonly time: number;
	readonly delta: number;
	readonly units: readonly UnitSnapshot[];
	readonly gridManager: GridManager;
	readonly effectiveDamage: number;
	readonly primaryTarget: UnitSnapshot | null;
	pushDamage(evt: DamageEvent): void;
	readonly vfx: TowerVfxController;
}

export interface TargetingStrategy {
	pick(
		towerGrid: { x: number; y: number },
		rangeSq: number,
		units: readonly UnitSnapshot[],
		gridManager: GridManager,
	): UnitSnapshot | null;
}

export interface AttackBehavior {
	readonly id: string;
	apply(ctx: AttackContext, tower: TowerRuntimeRef): void;
}

export interface ProjectileEmitter {
	emit(
		origin: { x: number; y: number },
		target: UnitSnapshot,
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	): void;
}

export interface TowerBehavior {
	readonly id: string;
	readonly runtime: TowerRuntimeRef;
	update(ctx: AttackContext): void;
	disable(untilMs: number): void;
	destroy(): void;
}

export interface TowerConstructorDeps {
	def: TowerDef;
	data: PlacedTower;
	scene: Phaser.Scene;
	gridManager: GridManager;
	vfx: TowerVfxController;
	level: number;
	sprite: Phaser.GameObjects.Image;
	barrelSprite?: Phaser.GameObjects.Image;
}

export type TowerFactory = (deps: TowerConstructorDeps) => TowerBehavior;
