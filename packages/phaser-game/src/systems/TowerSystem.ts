import type {
	PlacedTower,
	PlacementFailureReason,
	Position,
	TowerDef,
} from '@gld/shared';
import { ALL_TOWERS, ISO_TILE_H, ISO_TILE_W } from '@gld/shared';
import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../assets/assetManifest';
import { soundGenerator } from '../audio/SoundGenerator';
import type { GridManager } from './GridManager';
import type { PathfindingSystem } from './PathfindingSystem';

interface TowerInstance {
	data: PlacedTower;
	def: TowerDef;
	base: Phaser.GameObjects.Graphics;
	sprite: Phaser.GameObjects.Image;
	lastAttackTime: number;
}

export type TowerPlacementResult =
	| { success: true; tower: PlacedTower }
	| { success: false; reason: PlacementFailureReason };

export class TowerSystem {
	private towers: Map<string, TowerInstance> = new Map();
	private lastSoundTime: Map<string, number> = new Map();
	private static readonly SOUND_THROTTLE_MS = 200;
	private scene: Phaser.Scene;
	private gridManager: GridManager;
	private pathfinding: PathfindingSystem;
	private nextId = 0;
	private attackGraphics: Phaser.GameObjects.Graphics;
	private attackLines: Array<{
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		color: number;
		ttl: number;
	}> = [];

	constructor(
		scene: Phaser.Scene,
		gridManager: GridManager,
		pathfinding: PathfindingSystem,
	) {
		this.scene = scene;
		this.gridManager = gridManager;
		this.pathfinding = pathfinding;
		this.attackGraphics = scene.add.graphics();
		this.attackGraphics.setDepth(10);
	}

	placeTower(
		gridX: number,
		gridY: number,
		towerDefId: string,
	): TowerPlacementResult {
		const def = ALL_TOWERS.find((t) => t.id === towerDefId);
		if (!def) return { success: false, reason: 'out_of_bounds' };

		if (!this.gridManager.isInBounds(gridX, gridY)) {
			return { success: false, reason: 'out_of_bounds' };
		}

		if (!this.gridManager.isWalkable(gridX, gridY)) {
			return { success: false, reason: 'occupied' };
		}

		const placed = this.gridManager.placeTower(gridX, gridY, towerDefId);
		if (!placed) return { success: false, reason: 'occupied' };

		this.pathfinding.invalidateCache();
		const walkGrid = this.gridManager.getWalkabilityGrid();
		const path = this.pathfinding.findPath(
			walkGrid,
			this.gridManager.spawnPoint,
			this.gridManager.exitPoint,
		);

		if (!path) {
			this.gridManager.removeTower(gridX, gridY);
			this.pathfinding.invalidateCache();
			return { success: false, reason: 'blocked_path' };
		}

		const instanceId = `tower_${this.nextId++}`;
		const worldPos = this.gridManager.gridToWorld(gridX, gridY);

		const towerData: PlacedTower = {
			instanceId,
			defId: towerDefId,
			position: { x: gridX, y: gridY },
			level: 1,
		};

		const base = this.scene.add.graphics();
		const sprite = this.scene.add.image(
			worldPos.x,
			worldPos.y,
			`tower-${towerDefId}`,
		);
		sprite.setY(worldPos.y - 20);
		sprite.setDepth(this.gridManager.getIsoDepth(gridX, gridY));
		this.renderTowerBase(base, worldPos, def);

		this.towers.set(instanceId, {
			data: towerData,
			def,
			base,
			sprite,
			lastAttackTime: 0,
		});

		return { success: true, tower: towerData };
	}

	private renderTowerBase(
		graphics: Phaser.GameObjects.Graphics,
		pos: Position,
		def: TowerDef,
	): void {
		const color = parseInt(def.color.replace('#', ''), 16);
		graphics.clear();

		graphics.fillStyle(0x0a0a14, 0.8);
		graphics.fillEllipse(
			pos.x,
			pos.y + 4,
			ISO_TILE_W * 0.45,
			ISO_TILE_H * 0.45,
		);
		graphics.lineStyle(1, color, 0.3);
		graphics.strokeEllipse(
			pos.x,
			pos.y + 4,
			ISO_TILE_W * 0.45,
			ISO_TILE_H * 0.45,
		);

		graphics.fillStyle(color, 0.08);
		graphics.fillEllipse(pos.x, pos.y + 4, ISO_TILE_W * 0.6, ISO_TILE_H * 0.6);

		const rangeGrid = def.stats.range;
		if (rangeGrid > 0) {
			const dots = 32;
			const rangeW = rangeGrid * ISO_TILE_W * 0.5;
			const rangeH = rangeGrid * ISO_TILE_H * 0.5;
			graphics.fillStyle(color, 0.1);
			for (let i = 0; i < dots; i++) {
				const a = ((Math.PI * 2) / dots) * i;
				graphics.fillCircle(
					pos.x + rangeW * Math.cos(a),
					pos.y + rangeH * Math.sin(a),
					1,
				);
			}
		}
	}

	private damageEventsBuffer: Array<{
		unitId: string;
		damage: number;
		slow?: { factor: number; duration: number };
	}> = [];

	private getBoostMultiplier(gridX: number, gridY: number): number {
		let boostCount = 0;
		for (const tower of this.towers.values()) {
			const special = tower.def.stats.special;
			if (!special?.startsWith('boost_adjacent')) continue;
			const dx = Math.abs(tower.data.position.x - gridX);
			const dy = Math.abs(tower.data.position.y - gridY);
			if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
				const match = special.match(/boost_adjacent_(\d+)%/);
				if (match) boostCount += parseInt(match[1], 10) / 100;
			}
		}
		return 1 + boostCount;
	}

	update(
		time: number,
		delta: number,
		unitPositions: Array<{
			instanceId: string;
			x: number;
			y: number;
			hp: number;
		}>,
	): Array<{
		unitId: string;
		damage: number;
		slow?: { factor: number; duration: number };
	}> {
		this.damageEventsBuffer.length = 0;

		for (const tower of this.towers.values()) {
			const { def, data } = tower;
			if (def.stats.attackSpeed <= 0) continue;

			const attackInterval = 1000 / def.stats.attackSpeed;
			if (time - tower.lastAttackTime < attackInterval) continue;

			const towerWorld = this.gridManager.gridToWorld(
				data.position.x,
				data.position.y,
			);
			const rangeSq = def.stats.range ** 2;

			let closestUnit: (typeof unitPositions)[0] | null = null;
			let closestDistSq = Infinity;

			for (const unit of unitPositions) {
				if (unit.hp <= 0) continue;
				const unitGrid = this.gridManager.worldToGridFloat(unit.x, unit.y);
				const gdx = data.position.x - unitGrid.x;
				const gdy = data.position.y - unitGrid.y;
				const gridDistSq = gdx * gdx + gdy * gdy;
				if (gridDistSq <= rangeSq && gridDistSq < closestDistSq) {
					closestDistSq = gridDistSq;
					closestUnit = unit;
				}
			}

			if (closestUnit) {
				tower.lastAttackTime = time;
				const boostMult = this.getBoostMultiplier(
					data.position.x,
					data.position.y,
				);
				const boostedDamage = Math.round(def.stats.damage * boostMult);
				const special = def.stats.special;

				const slowEffect = special?.startsWith('slow_')
					? { factor: 0.7, duration: 2000 }
					: undefined;
				this.damageEventsBuffer.push({
					unitId: closestUnit.instanceId,
					damage: boostedDamage,
					slow: slowEffect,
				});

				if (special === 'splash') {
					const splashRadiusSq = 1.5 * 1.5;
					const closestGrid = this.gridManager.worldToGridFloat(
						closestUnit.x,
						closestUnit.y,
					);
					for (const unit of unitPositions) {
						if (unit.instanceId === closestUnit.instanceId || unit.hp <= 0)
							continue;
						const sUnitGrid = this.gridManager.worldToGridFloat(unit.x, unit.y);
						const sdx = closestGrid.x - sUnitGrid.x;
						const sdy = closestGrid.y - sUnitGrid.y;
						if (sdx * sdx + sdy * sdy <= splashRadiusSq) {
							this.damageEventsBuffer.push({
								unitId: unit.instanceId,
								damage: Math.round(boostedDamage * 0.5),
							});
						}
					}
				}

				const color = parseInt(def.color.replace('#', ''), 16);
				this.attackLines.push({
					x1: towerWorld.x,
					y1: towerWorld.y,
					x2: closestUnit.x,
					y2: closestUnit.y,
					color,
					ttl: 80,
				});
				this.spawnMuzzleVfx(def.id, towerWorld, data.position);
				this.spawnImpactVfx(
					special === 'splash' ? 'vfx-explosion-sm' : 'projectile-hit-flash',
					closestUnit.x,
					closestUnit.y,
				);

				const lastSound = this.lastSoundTime.get(def.type) ?? 0;
				if (time - lastSound >= TowerSystem.SOUND_THROTTLE_MS) {
					soundGenerator.playTowerAttack(def.type);
					this.lastSoundTime.set(def.type, time);
				}
			}
		}

		this.attackGraphics.clear();
		let write = 0;
		for (let i = 0; i < this.attackLines.length; i++) {
			const line = this.attackLines[i];
			line.ttl -= delta;
			if (line.ttl <= 0) continue;
			const alpha = line.ttl / 80;
			this.attackGraphics.lineStyle(2, line.color, alpha * 0.8);
			this.attackGraphics.beginPath();
			this.attackGraphics.moveTo(line.x1, line.y1);
			this.attackGraphics.lineTo(line.x2, line.y2);
			this.attackGraphics.strokePath();
			this.attackGraphics.lineStyle(4, line.color, alpha * 0.2);
			this.attackGraphics.beginPath();
			this.attackGraphics.moveTo(line.x1, line.y1);
			this.attackGraphics.lineTo(line.x2, line.y2);
			this.attackGraphics.strokePath();
			if (line.ttl > 50) {
				this.attackGraphics.fillStyle(0xffffff, alpha * 0.6);
				this.attackGraphics.fillCircle(line.x2, line.y2, 4);
			}
			this.attackLines[write++] = line;
		}
		this.attackLines.length = write;

		return this.damageEventsBuffer;
	}

	private spawnMuzzleVfx(
		towerDefId: string,
		towerWorld: Position,
		gridPos: Position,
	): void {
		const textureKey = `tower-${towerDefId}-fire`;
		const animationKey = getOptionalAnimationKey(textureKey);
		if (
			!this.scene.textures.exists(textureKey) ||
			!this.scene.anims.exists(animationKey)
		) {
			return;
		}

		const effect = this.scene.add.sprite(
			towerWorld.x,
			towerWorld.y - 20,
			textureKey,
		);
		effect.setDisplaySize(64, 80);
		effect.setDepth(this.gridManager.getIsoDepth(gridPos.x, gridPos.y) + 1);
		effect.play(animationKey);
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
			effect.destroy(),
		);
	}

	private spawnImpactVfx(textureKey: string, x: number, y: number): void {
		const animationKey = getOptionalAnimationKey(textureKey);
		if (
			!this.scene.textures.exists(textureKey) ||
			!this.scene.anims.exists(animationKey)
		) {
			return;
		}

		const effect = this.scene.add.sprite(x, y, textureKey);
		effect.setDisplaySize(
			textureKey === 'projectile-hit-flash' ? 16 : 32,
			textureKey === 'projectile-hit-flash' ? 16 : 32,
		);
		effect.setDepth(30);
		effect.play(animationKey);
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
			effect.destroy(),
		);
	}

	private findTowerEntry(
		gridX: number,
		gridY: number,
	): { key: string; instance: TowerInstance } | null {
		for (const [key, tower] of this.towers) {
			if (tower.data.position.x === gridX && tower.data.position.y === gridY) {
				return { key, instance: tower };
			}
		}
		return null;
	}

	sellTower(
		gridX: number,
		gridY: number,
	): { success: boolean; refund: number } {
		const entry = this.findTowerEntry(gridX, gridY);
		if (!entry) return { success: false, refund: 0 };
		const { key: targetKey, instance: targetInstance } = entry;

		targetInstance.base.destroy();
		targetInstance.sprite.destroy();
		this.towers.delete(targetKey);
		this.gridManager.removeTower(gridX, gridY);
		this.pathfinding.invalidateCache();

		const refund = Math.floor(targetInstance.def.cost * 0.7);
		return { success: true, refund };
	}

	hasTowerAt(gridX: number, gridY: number): boolean {
		return this.findTowerEntry(gridX, gridY) !== null;
	}

	getTowerAt(
		gridX: number,
		gridY: number,
	): { data: PlacedTower; def: TowerDef } | null {
		const entry = this.findTowerEntry(gridX, gridY);
		return entry
			? { data: entry.instance.data, def: entry.instance.def }
			: null;
	}

	removeTowerAt(gridX: number, gridY: number): boolean {
		const result = this.sellTower(gridX, gridY);
		return result.success;
	}

	getTowers(): PlacedTower[] {
		return Array.from(this.towers.values()).map((t) => t.data);
	}

	getTowerSprite(instanceId: string): Phaser.GameObjects.Image | null {
		return this.towers.get(instanceId)?.sprite ?? null;
	}

	destroy(): void {
		for (const tower of this.towers.values()) {
			tower.base.destroy();
			tower.sprite.destroy();
		}
		this.towers.clear();
		this.attackGraphics?.destroy();
		this.attackLines = [];
	}
}
