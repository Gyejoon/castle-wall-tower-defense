import type { ActiveUnit, Position, UnitDef } from '@gld/shared';
import { UNITS } from '@gld/shared';
import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../assets/assetManifest';
import { EventBus } from '../EventBus';
import type { GridManager } from './GridManager';

export type UnitSpawnSource = 'base';

interface SpawnQueueEntry {
	def: UnitDef;
	remaining: number;
	bounty: number;
	countsTowardClear: boolean;
	source: UnitSpawnSource;
}

interface UnitInstance {
	data: ActiveUnit;
	def: UnitDef;
	sprite: Phaser.GameObjects.Sprite;
	hpBar: Phaser.GameObjects.Graphics;
	worldX: number;
	worldY: number;
	slowFactor: number;
	slowRemaining: number;
	bounty: number;
	countsTowardClear: boolean;
	source: UnitSpawnSource;
}

interface QueueUnitsOptions {
	bountyOverride?: number;
	countsTowardClear?: boolean;
	source?: UnitSpawnSource;
}

export class UnitSystem {
	private units: Map<string, UnitInstance> = new Map();
	private scene: Phaser.Scene;
	private gridManager: GridManager;
	private currentPath: Position[] = [];
	private currentPathWorld: Position[] = [];
	private nextId = 0;
	private spawnQueue: SpawnQueueEntry[] = [];
	private spawnTimer = 0;
	private readonly SPAWN_INTERVAL = 300;

	constructor(scene: Phaser.Scene, gridManager: GridManager) {
		this.scene = scene;
		this.gridManager = gridManager;
	}

	setPath(path: Position[]): void {
		if (path === this.currentPath) return;
		const oldPath = this.currentPath;
		this.currentPath = path;
		this.currentPathWorld = path.map((p) =>
			this.gridManager.gridToWorld(p.x, p.y),
		);

		if (oldPath.length > 0 && path.length > 0) {
			for (const unit of this.units.values()) {
				const unitGrid = unit.data.position;
				let bestIdx = 0;
				let bestDist = Infinity;
				for (let i = 0; i < path.length; i++) {
					const dx = path[i].x - unitGrid.x;
					const dy = path[i].y - unitGrid.y;
					const d = dx * dx + dy * dy;
					if (d < bestDist) {
						bestDist = d;
						bestIdx = i;
					}
				}
				unit.data.pathIndex = Math.min(bestIdx, path.length - 2);
			}
		}
	}

	queueUnits(
		unitDefId: string,
		count: number,
		options: QueueUnitsOptions = {},
	): void {
		const def = UNITS.find((u) => u.id === unitDefId);
		if (!def) return;
		this.spawnQueue.push({
			def,
			remaining: count,
			bounty: options.bountyOverride ?? def.bounty,
			countsTowardClear: options.countsTowardClear ?? true,
			source: options.source ?? 'base',
		});
	}

	private spawnUnit(entry: SpawnQueueEntry): void {
		if (this.currentPath.length === 0) return;

		const instanceId = `unit_${this.nextId++}`;
		const startGrid = this.currentPath[0];
		const startWorld = this.currentPathWorld[0];

		EventBus.emit('unit-spawned', { unitType: entry.def.type, count: 1 });

		const unitData: ActiveUnit = {
			instanceId,
			defId: entry.def.id,
			position: { x: startGrid.x, y: startGrid.y },
			hp: entry.def.stats.hp,
			pathIndex: 0,
		};

		const sprite = this.scene.add.sprite(
			startWorld.x,
			startWorld.y,
			`unit-${entry.def.id}`,
		);
		sprite.setDisplaySize(40, 48);
		sprite.play(`${entry.def.id}-walk`);
		sprite.setDepth(this.gridManager.getDepth(startGrid.x, startGrid.y));
		this.spawnOptionalVfx(
			'vfx-spawn-portal',
			startWorld.x,
			startWorld.y,
			32,
			this.gridManager.getDepth(startGrid.x, startGrid.y) - 1,
		);

		const hpBar = this.scene.add.graphics();
		this.renderHpBar(
			hpBar,
			startWorld.x,
			startWorld.y,
			entry.def,
			entry.def.stats.hp,
		);

		this.units.set(instanceId, {
			data: unitData,
			def: entry.def,
			sprite,
			hpBar,
			worldX: startWorld.x,
			worldY: startWorld.y,
			slowFactor: 1.0,
			slowRemaining: 0,
			bounty: entry.bounty,
			countsTowardClear: entry.countsTowardClear,
			source: entry.source,
		});
	}

	private renderHpBar(
		graphics: Phaser.GameObjects.Graphics,
		x: number,
		y: number,
		def: UnitDef,
		hp: number,
	): void {
		graphics.clear();
		const barWidth = 24;
		const barHeight = 2;
		const barY = y - 28;
		graphics.fillStyle(0x0a0a14, 0.8);
		graphics.fillRect(
			x - barWidth / 2 - 1,
			barY - 1,
			barWidth + 2,
			barHeight + 2,
		);
		const hpRatio = Math.max(0, hp / def.stats.hp);
		const barColor =
			hpRatio > 0.5 ? 0x2cb67d : hpRatio > 0.25 ? 0xe2b714 : 0xe53170;
		graphics.fillStyle(barColor, 1);
		graphics.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
	}

	applySlow(unitId: string, factor: number, durationMs: number): void {
		const unit = this.units.get(unitId);
		if (!unit) return;
		unit.slowFactor = factor;
		unit.slowRemaining = durationMs;
		unit.sprite.setTint(0x88ccff);
	}

	applyDamage(
		unitId: string,
		rawDamage: number,
	): {
		killed: boolean;
		bounty: number;
		unitDefId: string;
		countsTowardClear: boolean;
		source: UnitSpawnSource;
	} | null {
		const unit = this.units.get(unitId);
		if (!unit) return null;

		const armor = unit.def.stats.armor;
		const damage = Math.max(1, rawDamage - armor);
		unit.data.hp -= damage;

		if (unit.data.hp <= 0) {
			unit.sprite.destroy();
			unit.hpBar.destroy();
			const deathFx = this.scene.add.sprite(
				unit.worldX,
				unit.worldY,
				'unit-death',
			);
			deathFx.setDisplaySize(40, 48);
			const deathGrid = this.gridManager.worldToGrid(unit.worldX, unit.worldY);
			deathFx.setDepth(this.gridManager.getDepth(deathGrid.x, deathGrid.y));
			deathFx.play('unit-death');
			deathFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
				deathFx.destroy(),
			);
			this.spawnOptionalVfx(
				unit.def.id === 'titan' ? 'vfx-explosion-lg' : 'vfx-explosion-sm',
				unit.worldX,
				unit.worldY,
				unit.def.id === 'titan' ? 64 : 32,
				this.gridManager.getDepth(deathGrid.x, deathGrid.y) + 1,
			);
			this.units.delete(unitId);
			return {
				killed: true,
				bounty: unit.bounty,
				unitDefId: unit.def.id,
				countsTowardClear: unit.countsTowardClear,
				source: unit.source,
			};
		}

		this.renderHpBar(
			unit.hpBar,
			unit.worldX,
			unit.worldY,
			unit.def,
			unit.data.hp,
		);
		return {
			killed: false,
			bounty: 0,
			unitDefId: unit.def.id,
			countsTowardClear: unit.countsTowardClear,
			source: unit.source,
		};
	}

	hasActiveUnits(): boolean {
		return this.units.size > 0;
	}

	hasQueuedUnits(): boolean {
		return this.spawnQueue.length > 0;
	}

	private spawnOptionalVfx(
		textureKey: string,
		x: number,
		y: number,
		size: number,
		depth: number,
	): void {
		const animationKey = getOptionalAnimationKey(textureKey);
		if (
			!this.scene.textures?.exists(textureKey) ||
			!this.scene.anims?.exists(animationKey)
		) {
			return;
		}

		const effect = this.scene.add.sprite(x, y, textureKey);
		effect.setDisplaySize(size, size);
		effect.setDepth(depth);
		effect.play(animationKey);
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
			effect.destroy(),
		);
	}

	update(_time: number, delta: number): { reachedExit: string[] } {
		const reachedExit: string[] = [];

		this.spawnTimer += delta;
		if (this.spawnTimer >= this.SPAWN_INTERVAL && this.spawnQueue.length > 0) {
			this.spawnTimer = 0;
			const front = this.spawnQueue[0];
			this.spawnUnit(front);
			front.remaining--;
			if (front.remaining <= 0) {
				this.spawnQueue.shift();
			}
		}

		const dt = delta / 1000;

		for (const [id, unit] of this.units) {
			const pathIdx = unit.data.pathIndex;
			if (pathIdx >= this.currentPath.length - 1) {
				reachedExit.push(id);
				unit.sprite.destroy();
				unit.hpBar.destroy();
				this.units.delete(id);
				continue;
			}

			if (unit.slowRemaining > 0) {
				unit.slowRemaining -= delta;
				if (unit.slowRemaining <= 0) {
					unit.slowFactor = 1.0;
					unit.slowRemaining = 0;
					unit.sprite.clearTint();
				}
			}

			const nextGrid = this.currentPath[pathIdx + 1];
			const targetWorld = this.currentPathWorld[pathIdx + 1];
			const speed = unit.def.stats.speed * this.gridManager.orthoTile * unit.slowFactor;

			const dx = targetWorld.x - unit.worldX;
			const dy = targetWorld.y - unit.worldY;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < speed * dt) {
				unit.worldX = targetWorld.x;
				unit.worldY = targetWorld.y;
				unit.data.pathIndex++;
				unit.data.position = { x: nextGrid.x, y: nextGrid.y };
			} else {
				unit.worldX += (dx / dist) * speed * dt;
				unit.worldY += (dy / dist) * speed * dt;
			}

			unit.sprite.setPosition(unit.worldX, unit.worldY);
			const currentGrid = this.gridManager.worldToGrid(unit.worldX, unit.worldY);
			unit.sprite.setDepth(this.gridManager.getDepth(currentGrid.x, currentGrid.y));
			this.renderHpBar(unit.hpBar, unit.worldX, unit.worldY, unit.def, unit.data.hp);
		}

		return { reachedExit };
	}

	getUnitPositions(): Array<{
		instanceId: string;
		x: number;
		y: number;
		hp: number;
	}> {
		return Array.from(this.units.values()).map((unit) => ({
			instanceId: unit.data.instanceId,
			x: unit.worldX,
			y: unit.worldY,
			hp: unit.data.hp,
		}));
	}

	destroy(): void {
		for (const unit of this.units.values()) {
			unit.sprite.destroy();
			unit.hpBar.destroy();
		}
		this.units.clear();
		this.spawnQueue.length = 0;
	}
}
