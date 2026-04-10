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
	stunCooldownMultiplier,
	stunDurationMultiplier,
} from '@gld/shared';
import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../assets/assetManifest';
import { soundGenerator } from '../audio/SoundGenerator';
import type { GridManager } from './GridManager';
import type { PathfindingSystem } from './PathfindingSystem';

interface TowerInstance {
	data: PlacedTower;
	def: TowerDef;
	effectiveDamage: number;
	base: Phaser.GameObjects.Graphics;
	sprite: Phaser.GameObjects.Image;
	barrelSprite?: Phaser.GameObjects.Image;
	idleTween?: Phaser.Tweens.Tween;
	lastAttackTime: number;
	lastAuraTime: number;
}

export type TowerPlacementResult =
	| { success: true; tower: PlacedTower }
	| { success: false; reason: PlacementFailureReason };

export function resolveTowerTextureKey(
	defId: string,
	grade: 'normal' | 'rare' | 'unique' | 'epic',
): string {
	if (grade === 'normal') return `tower-${defId}`;
	return `tower-${defId}-${grade}`;
}

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
		towerType?: string;
		arrowIndex?: number;
		targetUnitId?: string;
		impactPending?: boolean;
		pendingDamage?: Array<{
			unitId: string;
			damage: number;
			armorPierce?: boolean;
			slow?: { factor: number; duration: number };
			stun?: { duration: number };
		}>;
		impactVfxKey?: string;
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

		const textureKey = resolveTowerTextureKey(towerDefId, towerGrade);
		const base = this.scene.add.graphics();
		const sprite = this.scene.add.image(worldPos.x, worldPos.y, textureKey);
		sprite.setDisplaySize(64, 80);
		sprite.setY(worldPos.y - 20);
		sprite.setDepth(this.gridManager.getDepth(gridX, gridY));
		this.renderTowerBase(base, worldPos, def);

		const baseScaleX = sprite.scaleX;
		const baseScaleY = sprite.scaleY;
		const idleTween = this.scene.tweens.add({
			targets: sprite,
			scaleX: { from: baseScaleX, to: baseScaleX * 1.03 },
			scaleY: { from: baseScaleY, to: baseScaleY * 1.03 },
			y: { from: sprite.y, to: sprite.y - 1 },
			duration: 1800,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.InOut',
			delay: (this.nextId * 137) % 1800,
		});

		// Nova cannon: add separate rotating barrel sprite
		let barrelSprite: Phaser.GameObjects.Image | undefined;
		if (
			towerDefId === 'nova_cannon' &&
			this.scene.textures.exists('tower-nova_cannon-barrel')
		) {
			barrelSprite = this.scene.add.image(
				worldPos.x,
				sprite.y,
				'tower-nova_cannon-barrel',
			);
			barrelSprite.setDisplaySize(16, 8);
			barrelSprite.setDepth(sprite.depth + 1);
		}

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
			barrelSprite,
			idleTween,
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

		// Nova cannon barrel tracking — rotate toward nearest enemy
		for (const tower of this.towers.values()) {
			if (tower.def.type !== 'nova_cannon' || !tower.barrelSprite) continue;
			const towerWorld = this.gridManager.gridToWorld(
				tower.data.position.x,
				tower.data.position.y,
			);
			let nearestDist = Infinity;
			let nearestUnit: { x: number; y: number } | null = null;
			for (const unit of unitPositions) {
				if (unit.hp <= 0) continue;
				const dx = unit.x - towerWorld.x;
				const dy = unit.y - towerWorld.y;
				const dist = dx * dx + dy * dy;
				if (dist < nearestDist) {
					nearestDist = dist;
					nearestUnit = unit;
				}
			}
			if (nearestUnit) {
				tower.barrelSprite.rotation = Math.atan2(
					nearestUnit.y - towerWorld.y,
					nearestUnit.x - towerWorld.x,
				);
			}
		}

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
				const elementMult = getElementMultiplier(
					def.element,
					closestUnit.element,
				);
				const baseDamage = Math.round(tower.effectiveDamage * elementMult);
				const special = def.stats.special;

				const slowEffect =
					this.isSlowSpecial(special) && special
						? { factor: this.parseSlowFactor(special), duration: 2000 }
						: undefined;
				// 집중 공격형 (no special) → armor pierce
				const armorPierce = !special;

				// Collect damage events — delayed for projectile towers, instant for beams
				const pendingBatch: Array<{
					unitId: string;
					damage: number;
					armorPierce?: boolean;
					slow?: { factor: number; duration: number };
					stun?: { duration: number };
				}> = [];
				pendingBatch.push({
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
							pendingBatch.push({
								unitId: unit.instanceId,
								damage: 0,
								slow: slowEffect,
							});
						}
					}
				}

				if (this.isStunSpecial(special) && special) {
					const configKey = special.replace(/%/g, '');
					const baseDuration = CC_AURA_CONFIGS[configKey]?.durationMs ?? 1000;
					const level = tower.data.level ?? 1;
					const stunDuration = baseDuration * stunDurationMultiplier(level);
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
								pendingBatch.push({
									unitId: unit.instanceId,
									damage: 0,
									stun: { duration: stunDuration },
								});
							}
						}
					} else {
						pendingBatch.push({
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
							// slow는 tower 사거리 내 splash unit에만 적용 (#98)
							let splashSlow: typeof slowEffect;
							if (slowEffect) {
								const tdx = data.position.x - sUnitGrid.x;
								const tdy = data.position.y - sUnitGrid.y;
								if (tdx * tdx + tdy * tdy <= rangeSq) splashSlow = slowEffect;
							}
							pendingBatch.push({
								unitId: unit.instanceId,
								damage: Math.round(
									tower.effectiveDamage * splashElementMult * 0.5,
								),
								slow: splashSlow,
							});
						}
					}
				}

				const color = TowerSystem.parseHexColor(def.color);
				const style =
					this.hasSplash(special) || def.type === 'earth_golem'
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
				// Calculate TTL from projectile speed (if defined) or use defaults
				const projSpeed = def.stats.projectileSpeed;
				let maxTtl: number;
				if (projSpeed && projSpeed > 0) {
					// Distance in grid tiles → travel time in ms
					const dist = Math.sqrt(closestDistSq);
					maxTtl = Math.round((dist / projSpeed) * 1000);
					maxTtl = Math.max(40, Math.min(maxTtl, 500)); // clamp 40-500ms
				} else {
					maxTtl = style === 'arrow' ? 120 : 80;
				}

				const hasProjectile = style === 'arrow' || style === 'arc';

				// For projectile towers, defer damage until impact.
				// For beams, apply immediately.
				if (!hasProjectile) {
					for (const evt of pendingBatch) {
						this.damageEventsBuffer.push(evt);
					}
				}

				const impactVfxKey = this.hasSplash(special)
					? 'vfx-explosion-sm'
					: 'projectile-hit-flash';

				// Nova cannon: fire from barrel tip, not tower center
				const fireOriginX =
					def.type === 'nova_cannon' && tower.barrelSprite
						? tower.barrelSprite.x + Math.cos(tower.barrelSprite.rotation) * 10
						: towerWorld.x;
				const fireOriginY =
					def.type === 'nova_cannon' && tower.barrelSprite
						? tower.barrelSprite.y + Math.sin(tower.barrelSprite.rotation) * 10
						: towerWorld.y;

				// Twin archer: fire 2 arrows, each with half damage
				const shotCount = def.type === 'twin_archer' ? 2 : 1;
				const shotBatch =
					shotCount > 1
						? pendingBatch.map((evt) => ({
								...evt,
								damage: Math.round(evt.damage / 2),
							}))
						: pendingBatch;

				for (let shot = 0; shot < shotCount; shot++) {
					let shotArrowIndex: number | undefined;
					if (style === 'arrow' && shot > 0) {
						const idx = this.arrowPool.findIndex(
							(a, ai) => !a.visible && ai !== arrowIndex,
						);
						if (idx >= 0) {
							shotArrowIndex = idx;
							this.arrowPool[idx].setVisible(true);
						}
					} else {
						shotArrowIndex = arrowIndex;
					}
					const offsetY = shotCount > 1 ? (shot === 0 ? -4 : 4) : 0;
					// Stagger second arrow by 80ms so damage numbers appear separately
					const shotTtl = shot > 0 ? maxTtl + 80 : maxTtl;
					this.attackLines.push({
						x1: fireOriginX,
						y1: fireOriginY + offsetY,
						x2: closestUnit.x,
						y2: closestUnit.y + offsetY,
						color,
						ttl: shotTtl,
						maxTtl: shotTtl,
						style,
						towerType: def.type,
						arrowIndex: shotArrowIndex,
						targetUnitId: hasProjectile ? closestUnit.instanceId : undefined,
						impactPending: hasProjectile,
						pendingDamage: hasProjectile ? shotBatch : undefined,
						impactVfxKey: hasProjectile ? impactVfxKey : undefined,
					});
				}
				if (def.type === 'nova_cannon' && tower.barrelSprite) {
					// Barrel tip muzzle flash — red circle that fades quickly
					const flash = this.scene.add.circle(
						fireOriginX,
						fireOriginY,
						6,
						0xc03020,
						0.8,
					);
					flash.setDepth(tower.sprite.depth + 2);
					this.scene.tweens.add({
						targets: flash,
						alpha: 0,
						scale: 2,
						duration: 150,
						onComplete: () => flash.destroy(),
					});
				} else {
					this.spawnMuzzleVfx(def.id, towerWorld, data.position, tower.sprite);
				}

				if (!hasProjectile) {
					// Beam: instant impact VFX
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

			const level = tower.data.level ?? 1;
			const stunScaled = this.isStunSpecial(special);
			const effectiveCooldown = stunScaled
				? config.cooldownMs * stunCooldownMultiplier(level)
				: config.cooldownMs;
			const effectiveDuration = stunScaled
				? config.durationMs * stunDurationMultiplier(level)
				: config.durationMs;

			if (time - tower.lastAuraTime < effectiveCooldown) continue;
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
								stun: { duration: effectiveDuration },
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
							stun: { duration: effectiveDuration },
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

			// Track target for projectiles: update x2/y2 to unit's current position
			if (
				(line.style === 'arrow' || line.style === 'arc') &&
				line.targetUnitId &&
				unitMap
			) {
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
				// Spawn impact VFX + flush pending damage when projectile arrives
				if (line.impactPending) {
					this.spawnImpactVfx(
						line.impactVfxKey ?? 'projectile-hit-flash',
						line.x2,
						line.y2,
					);
					if (line.pendingDamage) {
						for (const evt of line.pendingDamage) {
							this.damageEventsBuffer.push(evt);
						}
					}
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
				// Projectile appearance by tower type
				const isIce =
					line.towerType === 'disruptor' || line.towerType === 'stasis_field';
				this.attackGraphics.fillStyle(isIce ? 0xa8def0 : 0x5a5a5a, alpha);
				this.attackGraphics.fillCircle(px, py, 4);
				this.attackGraphics.fillStyle(isIce ? 0xffffff : 0x8c8c8c, alpha * 0.7);
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
		// Fire spritesheets are always 64×80 regardless of base tower resolution;
		// see the note in generate-towers.ts about drawFireFrame's coordinate system.
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

		targetInstance.idleTween?.stop();
		targetInstance.idleTween?.remove();
		targetInstance.barrelSprite?.destroy();
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

	getTowerSprite(instanceId: string): Phaser.GameObjects.Image | null {
		return this.towers.get(instanceId)?.sprite ?? null;
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		for (const tower of this.towers.values()) {
			tower.idleTween?.stop();
			tower.idleTween?.remove();
			tower.barrelSprite?.destroy();
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
