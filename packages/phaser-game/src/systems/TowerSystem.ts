import type {
	ElementType,
	OwnedTower,
	PlacedTower,
	PlacementFailureReason,
	Position,
	TowerDef,
} from '@gld/shared';
import {
	ALL_TOWERS,
	CC_AURA_CONFIGS,
	getEffectiveStats,
	getElementMultiplier,
} from '@gld/shared';
import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../assets/assetManifest';
import { soundGenerator } from '../audio/SoundGenerator';
import type { GridManager } from './GridManager';
import type { PathfindingSystem } from './PathfindingSystem';
import type { WorldGimmick } from './world-gimmicks/types';

export interface TowerInstance {
	data: PlacedTower;
	def: TowerDef;
	effectiveDamage: number;
	base: Phaser.GameObjects.Graphics;
	sprite: Phaser.GameObjects.Image;
	lastAttackTime: number;
	lastAuraTime: number;
	disabledUntilMs?: number;
}

export type TowerPlacementResult =
	| { success: true; tower: PlacedTower }
	| { success: false; reason: PlacementFailureReason };

export class TowerSystem {
	private towers: Map<string, TowerInstance> = new Map();
	private lastSoundTime: Map<string, number> = new Map();
	private static readonly SOUND_THROTTLE_MS = 200;
	private static readonly SPLASH_RADIUS_SQ = 2.25; // 1.5^2
	private scene: Phaser.Scene;
	private gridManager: GridManager;
	private pathfinding: PathfindingSystem;
	private collection: OwnedTower[];
	private spawnExitPairs: Array<{ spawn: Position; exit: Position }>;
	private nextId = 0;
	private destroyed = false;
	private worldGimmick: WorldGimmick | null = null;
	private attackGraphics: Phaser.GameObjects.Graphics;
	private attackLines: Array<{
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		color: number;
		ttl: number;
		maxTtl: number;
		style: 'beam' | 'arc' | 'arrow';
		arrowIndex?: number;
		targetUnitId?: string;
		impactPending?: boolean;
	}> = [];
	private arrowPool: Phaser.GameObjects.Image[] = [];
	private arrowPoolInitialized = false;
	private static readonly ARROW_POOL_SIZE = 16;

	constructor(
		scene: Phaser.Scene,
		gridManager: GridManager,
		pathfinding: PathfindingSystem,
		collection?: OwnedTower[],
		spawnExitPairs: Array<{ spawn: Position; exit: Position }> = [],
	) {
		this.scene = scene;
		this.gridManager = gridManager;
		this.pathfinding = pathfinding;
		this.collection = collection ?? [];
		this.spawnExitPairs = spawnExitPairs;
		this.attackGraphics = scene.add.graphics();
		this.attackGraphics.setDepth(10);
	}

	setWorldGimmick(gimmick: WorldGimmick | null): void {
		this.worldGimmick = gimmick;
	}

	getAllTowers(): TowerInstance[] {
		return Array.from(this.towers.values());
	}

	private ensureArrowPool(): void {
		if (this.arrowPoolInitialized) return;
		const textureKey = 'projectile-arrow';
		if (!this.scene.textures.exists(textureKey)) return;
		this.arrowPoolInitialized = true;
		for (let i = 0; i < TowerSystem.ARROW_POOL_SIZE; i++) {
			const arrow = this.scene.add.image(0, 0, textureKey);
			arrow.setVisible(false);
			arrow.setDepth(25);
			arrow.setDisplaySize(24, 6);
			this.arrowPool.push(arrow);
		}
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

		if (!this.gridManager.canPlaceTower(gridX, gridY)) {
			return { success: false, reason: 'occupied' };
		}

		if (
			this.worldGimmick &&
			!this.worldGimmick.canPlaceTowerAt({ x: gridX, y: gridY })
		) {
			return { success: false, reason: 'occupied' };
		}

		const placed = this.gridManager.placeTower(gridX, gridY, towerDefId);
		if (!placed) return { success: false, reason: 'occupied' };

		this.pathfinding.invalidateCache();
		const walkGrid = this.gridManager.getWalkabilityGrid();
		const allClear =
			this.spawnExitPairs.length > 0
				? this.pathfinding.validateAllPaths(walkGrid, this.spawnExitPairs)
				: this.pathfinding.findPath(
						walkGrid,
						this.gridManager.spawnPoint,
						this.gridManager.exitPoint,
					) !== null;

		if (!allClear) {
			this.gridManager.removeTower(gridX, gridY);
			this.pathfinding.invalidateCache();
			return { success: false, reason: 'blocked_path' };
		}

		const instanceId = `tower_${this.nextId++}`;
		const worldPos = this.gridManager.gridToWorld(gridX, gridY);

		const owned = this.collection.find((t) => t.defId === towerDefId);
		const towerLevel = owned?.level ?? 1;
		const towerGrade = owned?.grade ?? 'normal';

		const towerData: PlacedTower = {
			instanceId,
			defId: towerDefId,
			position: { x: gridX, y: gridY },
			level: towerLevel,
		};

		const base = this.scene.add.graphics();
		const sprite = this.scene.add.image(
			worldPos.x,
			worldPos.y,
			`tower-${towerDefId}`,
		);
		sprite.setY(worldPos.y - 20);
		sprite.setDepth(this.gridManager.getDepth(gridX, gridY));
		this.renderTowerBase(base, worldPos, def);

		this.towers.set(instanceId, {
			data: towerData,
			def,
			effectiveDamage: getEffectiveStats(
				def.stats.damage,
				towerLevel,
				towerGrade,
			),
			base,
			sprite,
			lastAttackTime: 0,
			lastAuraTime: 0,
		});

		return { success: true, tower: towerData };
	}

	private static parseHexColor(hex: string): number {
		return parseInt(hex.replace('#', ''), 16);
	}

	private renderTowerBase(
		graphics: Phaser.GameObjects.Graphics,
		pos: Position,
		def: TowerDef,
	): void {
		const color = TowerSystem.parseHexColor(def.color);
		graphics.clear();

		const baseSize = this.gridManager.orthoTile * 0.45;
		graphics.fillStyle(0x0a0a14, 0.8);
		graphics.fillCircle(pos.x, pos.y + 4, baseSize / 2);
		graphics.lineStyle(1, color, 0.3);
		graphics.strokeCircle(pos.x, pos.y + 4, baseSize / 2);

		graphics.fillStyle(color, 0.08);
		graphics.fillCircle(pos.x, pos.y + 4, this.gridManager.orthoTile * 0.3);

		const rangeGrid = def.stats.range;
		if (rangeGrid > 0) {
			const dots = 32;
			const rangeR = rangeGrid * this.gridManager.orthoTile * 0.5;
			graphics.fillStyle(color, 0.1);
			for (let i = 0; i < dots; i++) {
				const a = ((Math.PI * 2) / dots) * i;
				graphics.fillCircle(
					pos.x + rangeR * Math.cos(a),
					pos.y + rangeR * Math.sin(a),
					1,
				);
			}
		}
	}

	private damageEventsBuffer: Array<{
		unitId: string;
		damage: number;
		armorPierce?: boolean;
		slow?: { factor: number; duration: number };
		stun?: { duration: number };
	}> = [];

	private parseSlowFactor(special: string): number {
		const match = special.match(/slow_(\d+)%/);
		if (!match) return 0.7;
		return 1 - parseInt(match[1], 10) / 100;
	}

	private hasSplash(special?: string): boolean {
		return special === 'splash' || (special?.endsWith('_splash') ?? false);
	}

	private isStunSpecial(special?: string): boolean {
		return special?.startsWith('stun') ?? false;
	}

	private isSlowSpecial(special?: string): boolean {
		return special?.startsWith('slow_') ?? false;
	}

	update(
		time: number,
		delta: number,
		unitPositions: Array<{
			instanceId: string;
			x: number;
			y: number;
			hp: number;
			element: ElementType;
		}>,
	): Array<{
		unitId: string;
		damage: number;
		armorPierce?: boolean;
		slow?: { factor: number; duration: number };
		stun?: { duration: number };
	}> {
		this.damageEventsBuffer.length = 0;

		for (const tower of this.towers.values()) {
			const { def, data } = tower;
			if (def.stats.attackSpeed <= 0) continue;

			if (tower.disabledUntilMs !== undefined && time < tower.disabledUntilMs) {
				continue; // tower is disabled by an enemy ranged attack
			}

			if (this.worldGimmick && !this.worldGimmick.isTowerActive(tower))
				continue;

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
				const elementMult = getElementMultiplier(
					def.element,
					closestUnit.element,
				);
				let baseDamage = Math.round(tower.effectiveDamage * elementMult);
				if (this.worldGimmick) {
					const bonus = this.worldGimmick.getDamageBonus(tower);
					if (bonus > 0) {
						baseDamage = Math.round(baseDamage * (1 + bonus));
					}
				}
				const special = def.stats.special;

				const slowEffect =
					this.isSlowSpecial(special) && special
						? { factor: this.parseSlowFactor(special), duration: 2000 }
						: undefined;
				// 집중 공격형 (no special) → armor pierce
				const armorPierce = !special;
				this.damageEventsBuffer.push({
					unitId: closestUnit.instanceId,
					damage: baseDamage,
					armorPierce,
					slow: slowEffect,
				});

				// AoE slow: apply slow to all units in range (e.g. world_tree slow_40%_aoe)
				if (slowEffect && special?.includes('_aoe')) {
					for (const unit of unitPositions) {
						if (unit.instanceId === closestUnit.instanceId || unit.hp <= 0)
							continue;
						const unitGrid = this.gridManager.worldToGridFloat(unit.x, unit.y);
						const gdx = data.position.x - unitGrid.x;
						const gdy = data.position.y - unitGrid.y;
						if (gdx * gdx + gdy * gdy <= rangeSq) {
							this.damageEventsBuffer.push({
								unitId: unit.instanceId,
								damage: 0,
								slow: slowEffect,
							});
						}
					}
				}

				if (this.isStunSpecial(special) && special) {
					const configKey = special.replace(/%/g, '');
					const stunDuration = CC_AURA_CONFIGS[configKey]?.durationMs ?? 1000;
					if (special.includes('aoe')) {
						for (const unit of unitPositions) {
							if (unit.hp <= 0) continue;
							const unitGrid = this.gridManager.worldToGridFloat(
								unit.x,
								unit.y,
							);
							const gdx = data.position.x - unitGrid.x;
							const gdy = data.position.y - unitGrid.y;
							if (gdx * gdx + gdy * gdy <= rangeSq) {
								this.damageEventsBuffer.push({
									unitId: unit.instanceId,
									damage: 0,
									stun: { duration: stunDuration },
								});
							}
						}
					} else {
						this.damageEventsBuffer.push({
							unitId: closestUnit.instanceId,
							damage: 0,
							stun: { duration: stunDuration },
						});
					}
				}

				if (this.hasSplash(special)) {
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
						if (sdx * sdx + sdy * sdy <= TowerSystem.SPLASH_RADIUS_SQ) {
							const splashElementMult = getElementMultiplier(
								def.element,
								unit.element,
							);
							this.damageEventsBuffer.push({
								unitId: unit.instanceId,
								damage: Math.round(
									tower.effectiveDamage * splashElementMult * 0.5,
								),
								slow: slowEffect,
							});
						}
					}
				}

				const color = TowerSystem.parseHexColor(def.color);
				const style = this.hasSplash(special)
					? ('arc' as const)
					: def.type === 'archer' || def.type === 'twin_archer'
						? ('arrow' as const)
						: ('beam' as const);
				let arrowIndex: number | undefined;
				if (style === 'arrow') {
					this.ensureArrowPool();
					const idx = this.arrowPool.findIndex((a) => !a.visible);
					if (idx >= 0) {
						arrowIndex = idx;
						this.arrowPool[idx].setVisible(true);
					}
				}
				const maxTtl = style === 'arrow' ? 120 : 80;
				this.attackLines.push({
					x1: towerWorld.x,
					y1: towerWorld.y,
					x2: closestUnit.x,
					y2: closestUnit.y,
					color,
					ttl: maxTtl,
					maxTtl,
					style,
					arrowIndex,
					targetUnitId: style === 'arrow' ? closestUnit.instanceId : undefined,
					impactPending: style === 'arrow',
				});
				this.spawnMuzzleVfx(def.id, towerWorld, data.position, tower.sprite);
				if (style !== 'arrow') {
					this.spawnImpactVfx(
						this.hasSplash(special)
							? 'vfx-explosion-sm'
							: 'projectile-hit-flash',
						closestUnit.x,
						closestUnit.y,
					);
				}

				const lastSound = this.lastSoundTime.get(def.type) ?? 0;
				if (time - lastSound >= TowerSystem.SOUND_THROTTLE_MS) {
					soundGenerator.playTowerAttack(def.type);
					this.lastSoundTime.set(def.type, time);
				}
			}
		}

		// Passive CC aura (attackSpeed=0 towers)
		for (const tower of this.towers.values()) {
			const { def, data } = tower;
			if (def.stats.attackSpeed > 0) continue;
			const special = def.stats.special;
			if (!special) continue;

			const configKey = special.replace(/%/g, '');
			const config = CC_AURA_CONFIGS[configKey];
			if (!config) continue;

			if (time - tower.lastAuraTime < config.cooldownMs) continue;
			tower.lastAuraTime = time;

			const rangeSq = def.stats.range ** 2;

			if (this.isStunSpecial(special)) {
				if (config.aoe) {
					for (const unit of unitPositions) {
						if (unit.hp <= 0) continue;
						const unitGrid = this.gridManager.worldToGridFloat(unit.x, unit.y);
						const gdx = data.position.x - unitGrid.x;
						const gdy = data.position.y - unitGrid.y;
						if (gdx * gdx + gdy * gdy <= rangeSq) {
							this.damageEventsBuffer.push({
								unitId: unit.instanceId,
								damage: 0,
								stun: { duration: config.durationMs },
							});
						}
					}
				} else {
					let closest: (typeof unitPositions)[0] | null = null;
					let closestDist = Infinity;
					for (const unit of unitPositions) {
						if (unit.hp <= 0) continue;
						const unitGrid = this.gridManager.worldToGridFloat(unit.x, unit.y);
						const gdx = data.position.x - unitGrid.x;
						const gdy = data.position.y - unitGrid.y;
						const d = gdx * gdx + gdy * gdy;
						if (d <= rangeSq && d < closestDist) {
							closestDist = d;
							closest = unit;
						}
					}
					if (closest) {
						this.damageEventsBuffer.push({
							unitId: closest.instanceId,
							damage: 0,
							stun: { duration: config.durationMs },
						});
					}
				}
			} else if (this.isSlowSpecial(special)) {
				const factor = this.parseSlowFactor(special);
				for (const unit of unitPositions) {
					if (unit.hp <= 0) continue;
					const unitGrid = this.gridManager.worldToGridFloat(unit.x, unit.y);
					const gdx = data.position.x - unitGrid.x;
					const gdy = data.position.y - unitGrid.y;
					if (gdx * gdx + gdy * gdy <= rangeSq) {
						this.damageEventsBuffer.push({
							unitId: unit.instanceId,
							damage: 0,
							slow: { factor, duration: config.durationMs },
						});
					}
				}
			}
		}

		// Build unit lookup map for O(1) arrow tracking
		const unitMap =
			this.attackLines.length > 0
				? new Map(unitPositions.map((u) => [u.instanceId, u]))
				: null;

		this.attackGraphics.clear();
		let write = 0;
		for (let i = 0; i < this.attackLines.length; i++) {
			const line = this.attackLines[i];
			line.ttl -= delta;

			// Track target for arrows: update x2/y2 to unit's current position
			if (line.style === 'arrow' && line.targetUnitId && unitMap) {
				const target = unitMap.get(line.targetUnitId);
				if (target && target.hp > 0) {
					line.x2 = target.x;
					line.y2 = target.y;
				}
			}

			if (line.ttl <= 0) {
				if (line.arrowIndex != null && this.arrowPool[line.arrowIndex]) {
					this.arrowPool[line.arrowIndex].setVisible(false);
				}
				// Spawn impact VFX + sound when arrow arrives
				if (line.impactPending) {
					this.spawnImpactVfx('projectile-hit-flash', line.x2, line.y2);
					soundGenerator.playArrowImpact();
				}
				continue;
			}
			const alpha = line.ttl / line.maxTtl;

			if (line.style === 'arrow') {
				const t = 1 - line.ttl / line.maxTtl; // 0→1 as arrow flies
				const dx = line.x2 - line.x1;
				const dy = line.y2 - line.y1;
				const px = line.x1 + dx * t;
				const py = line.y1 + dy * t - Math.sin(t * Math.PI) * 15; // low arc (15px)

				// Rotation angle (tangent direction)
				const nextT = Math.min(t + 0.05, 1);
				const nx = line.x1 + dx * nextT;
				const ny = line.y1 + dy * nextT - Math.sin(nextT * Math.PI) * 15;
				const angle = Math.atan2(ny - py, nx - px);

				if (line.arrowIndex != null && this.arrowPool[line.arrowIndex]) {
					const arrow = this.arrowPool[line.arrowIndex];
					arrow.setPosition(px, py);
					arrow.setRotation(angle);
					arrow.setAlpha(alpha);
					arrow.setVisible(true);
				} else {
					// Fallback: draw arrow with graphics if pool exhausted
					this.attackGraphics.fillStyle(line.color, alpha);
					this.attackGraphics.fillCircle(px, py, 3);
				}

				// Trail line behind arrow
				if (t > 0.08) {
					const trailT = t - 0.08;
					const trailX = line.x1 + dx * trailT;
					const trailY =
						line.y1 + dy * trailT - Math.sin(trailT * Math.PI) * 15;
					this.attackGraphics.lineStyle(1, line.color, alpha * 0.3);
					this.attackGraphics.beginPath();
					this.attackGraphics.moveTo(trailX, trailY);
					this.attackGraphics.lineTo(px, py);
					this.attackGraphics.strokePath();
				}
			} else if (line.style === 'arc') {
				// Parabolic arc projectile (catapult/splash towers)
				const t = 1 - line.ttl / line.maxTtl; // 0→1 as projectile flies
				const dx = line.x2 - line.x1;
				const dy = line.y2 - line.y1;
				const px = line.x1 + dx * t;
				const py = line.y1 + dy * t - Math.sin(t * Math.PI) * 40; // parabolic arc height
				// Boulder
				this.attackGraphics.fillStyle(0x5a5a5a, alpha);
				this.attackGraphics.fillCircle(px, py, 4);
				this.attackGraphics.fillStyle(0x8c8c8c, alpha * 0.7);
				this.attackGraphics.fillCircle(px - 1, py - 1, 2);
				// Trail dots
				if (t > 0.1) {
					const pt = t - 0.1;
					const trailX = line.x1 + dx * pt;
					const trailY = line.y1 + dy * pt - Math.sin(pt * Math.PI) * 40;
					this.attackGraphics.fillStyle(line.color, alpha * 0.3);
					this.attackGraphics.fillCircle(trailX, trailY, 2);
				}
			} else {
				// Beam (default)
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
			}

			if (line.style === 'beam' && line.ttl > 50) {
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
		towerSprite: Phaser.GameObjects.Image,
	): void {
		const textureKey = `tower-${towerDefId}-fire`;
		const animationKey = getOptionalAnimationKey(textureKey);
		if (
			!this.scene.textures.exists(textureKey) ||
			!this.scene.anims.exists(animationKey)
		) {
			return;
		}

		// Hide static tower during fire animation so animated frames are visible
		towerSprite.setVisible(false);

		const effect = this.scene.add.sprite(
			towerWorld.x,
			towerWorld.y - 20,
			textureKey,
		);
		effect.setDisplaySize(64, 80);
		effect.setDepth(this.gridManager.getDepth(gridPos.x, gridPos.y) + 1);
		effect.play(animationKey);
		const restoreVisibility = () => {
			if (towerSprite.active) towerSprite.setVisible(true);
		};
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
			effect.destroy();
			restoreVisibility();
		});
		effect.once(Phaser.GameObjects.Events.DESTROY, restoreVisibility);
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
		const size = textureKey === 'projectile-hit-flash' ? 16 : 32;
		effect.setDisplaySize(size, size);
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

		const refund = TowerSystem.calcRefund(targetInstance.def.cost);
		return { success: true, refund };
	}

	static calcRefund(cost: number): number {
		return Math.floor(cost * 0.5);
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

	getTowers(): PlacedTower[] {
		return Array.from(this.towers.values()).map((t) => t.data);
	}

	disableTower(towerId: string, untilMs: number): void {
		const t = this.towers.get(towerId);
		if (!t) return;
		t.disabledUntilMs = Math.max(t.disabledUntilMs ?? 0, untilMs);
	}

	getTowerSprite(instanceId: string): Phaser.GameObjects.Image | null {
		return this.towers.get(instanceId)?.sprite ?? null;
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		for (const tower of this.towers.values()) {
			tower.base.destroy();
			tower.sprite.destroy();
		}
		this.towers.clear();
		this.attackGraphics?.destroy();
		this.attackLines.length = 0;
		for (const arrow of this.arrowPool) arrow.destroy();
		this.arrowPool.length = 0;
	}
}
