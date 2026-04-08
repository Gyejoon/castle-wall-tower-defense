import {
	type ActiveUnit,
	BOSS_CONFIG,
	ELEMENT_TINT_COLORS,
	type ElementType,
	PHASER_COLORS,
	type Position,
	scaleUnitStats,
	UNITS,
	type UnitDef,
} from '@gld/shared';
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
	isBoss: boolean;
	hpMultiplier: number;
	waveHpMult: number;
	waveSpeedMult: number;
	waveSlot: number;
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
	stunRemaining: number;
	bounty: number;
	countsTowardClear: boolean;
	source: UnitSpawnSource;
	laneIndex: number; // which lane this unit follows
	isBoss: boolean;
	bossPhase: 1 | 2;
	invulnerableMs: number;
	maxHp: number;
	baseSpeed: number;
	baseArmor: number;
	ccImmunityChance: number;
	waveSlot: number;
	pathProgress: number; // continuous 1D position along lane path
	shadow: Phaser.GameObjects.Ellipse | null;
}

interface QueueUnitsOptions {
	bountyOverride?: number;
	countsTowardClear?: boolean;
	source?: UnitSpawnSource;
	isBoss?: boolean;
	hpMultiplier?: number;
	waveHpMult?: number;
	waveSpeedMult?: number;
	waveSlot?: number;
}

export class UnitSystem {
	private units: Map<string, UnitInstance> = new Map();
	private scene: Phaser.Scene;
	private gridManager: GridManager;
	private currentPath: Position[] = [];
	private currentPathWorld: Position[] = [];
	private lanes: Position[][] = [];
	private lanesWorld: Position[][] = [];
	private nextId = 0;
	private nextLane = 0;
	private stageLevel = 1;
	private rng: () => number = Math.random;
	private spawnQueue: SpawnQueueEntry[] = [];
	private spawnTimer = 0;
	private readonly SPAWN_INTERVAL = 300;
	private readonly MIN_SEPARATION = 0.8; // tiles
	private readonly SPAWN_BLOCK_TIMEOUT = 2000; // ms
	private laneUnits: Map<number, UnitInstance[]> = new Map();
	private spawnBlockTimer = 0;

	constructor(scene: Phaser.Scene, gridManager: GridManager) {
		this.scene = scene;
		this.gridManager = gridManager;
	}

	/** Inject RNG for testability (CC immunity) */
	setRng(rng: () => number): void {
		this.rng = rng;
	}

	setStageLevel(level: number): void {
		this.stageLevel = level;
	}

	setPaths(paths: Position[][]): void {
		this.lanes = paths;
		this.lanesWorld = paths.map((lane) =>
			lane.map((p) => this.gridManager.gridToWorld(p.x, p.y)),
		);
		this.currentPath = paths[0] ?? [];
		this.currentPathWorld = this.lanesWorld[0] ?? [];
		this.nextLane = 0;

		// Reassign existing units to their closest point on their lane
		for (const unit of this.units.values()) {
			const lane = this.lanes[unit.laneIndex] ?? this.currentPath;
			const unitGrid = unit.data.position;
			let bestIdx = 0;
			let bestDist = Infinity;
			for (let i = 0; i < lane.length; i++) {
				const dx = lane[i].x - unitGrid.x;
				const dy = lane[i].y - unitGrid.y;
				const d = dx * dx + dy * dy;
				if (d < bestDist) {
					bestDist = d;
					bestIdx = i;
				}
			}
			unit.data.pathIndex = Math.min(bestIdx, lane.length - 2);
			unit.pathProgress = unit.data.pathIndex;
		}

		// Rebuild laneUnits from current units
		this.laneUnits.clear();
		for (const unit of this.units.values()) {
			if (unit.def.flying) continue;
			let arr = this.laneUnits.get(unit.laneIndex);
			if (!arr) {
				arr = [];
				this.laneUnits.set(unit.laneIndex, arr);
			}
			arr.push(unit);
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
			isBoss: options.isBoss ?? false,
			hpMultiplier: options.hpMultiplier ?? 1,
			waveHpMult: options.waveHpMult ?? 1,
			waveSpeedMult: options.waveSpeedMult ?? 1,
			waveSlot: options.waveSlot ?? 0,
		});
	}

	private spawnUnit(entry: SpawnQueueEntry): void {
		if (this.lanes.length === 0 && this.currentPath.length === 0) return;

		// Round-robin lane assignment
		const laneIndex =
			this.lanes.length > 1 ? this.nextLane++ % this.lanes.length : 0;
		const lanePath = this.lanes[laneIndex] ?? this.currentPath;
		const lanePathWorld = this.lanesWorld[laneIndex] ?? this.currentPathWorld;
		if (lanePath.length === 0) return;

		const instanceId = `unit_${this.nextId++}`;
		const startGrid = lanePath[0];
		const startWorld = lanePathWorld[0];

		EventBus.emit('unit-spawned', { unitType: entry.def.type, count: 1 });

		const scaled = scaleUnitStats(entry.def.stats, this.stageLevel);
		const finalHp = scaled.hp * (entry.hpMultiplier ?? 1) * entry.waveHpMult;

		const unitData: ActiveUnit = {
			instanceId,
			defId: entry.def.id,
			position: { x: startGrid.x, y: startGrid.y },
			hp: finalHp,
			pathIndex: 0,
		};

		const bossTextureKey = `unit-${entry.def.id}-boss`;
		const normalTextureKey = `unit-${entry.def.id}`;
		const bossTextureReady =
			entry.isBoss && this.scene.textures.exists(bossTextureKey);
		const textureKey = bossTextureReady ? bossTextureKey : normalTextureKey;
		const sprite = this.scene.add.sprite(
			startWorld.x,
			startWorld.y,
			textureKey,
		);
		sprite.setDisplaySize(entry.isBoss ? 60 : 40, entry.isBoss ? 72 : 48);
		const bossAnimKey = `anim-${bossTextureKey}`;
		if (bossTextureReady && this.scene.anims.exists(bossAnimKey)) {
			sprite.play(bossAnimKey);
		} else {
			sprite.play(`${entry.def.id}-walk`);
		}
		sprite.setDepth(this.gridManager.getDepth(startGrid.x, startGrid.y));
		if (entry.def.element !== 'neutral') {
			sprite.setTint(ELEMENT_TINT_COLORS[entry.def.element]);
		}
		this.spawnOptionalVfx(
			'vfx-spawn-portal',
			startWorld.x,
			startWorld.y,
			32,
			this.gridManager.getDepth(startGrid.x, startGrid.y) - 1,
		);

		// Flying boss: add ground shadow and offset sprite upward
		let shadow: Phaser.GameObjects.Ellipse | null = null;
		if (entry.isBoss) {
			shadow = this.scene.add.ellipse(
				startWorld.x,
				startWorld.y,
				40,
				16,
				0x000000,
				0.3,
			);
			shadow.setDepth(this.gridManager.getDepth(startGrid.x, startGrid.y) - 1);
			sprite.setPosition(startWorld.x, startWorld.y - 20);
		}

		const hpBar = this.scene.add.graphics();
		this.renderHpBar(hpBar, startWorld.x, startWorld.y, finalHp, finalHp);

		const instance: UnitInstance = {
			data: unitData,
			def: entry.def,
			sprite,
			hpBar,
			worldX: startWorld.x,
			worldY: startWorld.y,
			slowFactor: 1.0,
			slowRemaining: 0,
			stunRemaining: 0,
			bounty: Math.round(entry.bounty * scaled.bountyMultiplier),
			countsTowardClear: entry.countsTowardClear,
			source: entry.source,
			laneIndex,
			isBoss: entry.isBoss,
			bossPhase: 1,
			invulnerableMs: 0,
			maxHp: finalHp,
			baseSpeed: scaled.speed * entry.waveSpeedMult,
			baseArmor: scaled.armor,
			ccImmunityChance: scaled.ccImmunityChance,
			waveSlot: entry.waveSlot,
			shadow,
			pathProgress: 0,
		};
		this.units.set(instanceId, instance);

		// Add to lane-sorted array (end = lowest pathProgress)
		if (!entry.def.flying) {
			let arr = this.laneUnits.get(laneIndex);
			if (!arr) {
				arr = [];
				this.laneUnits.set(laneIndex, arr);
			}
			arr.push(instance);
		}
	}

	private renderHpBar(
		graphics: Phaser.GameObjects.Graphics,
		x: number,
		y: number,
		maxHp: number,
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
		const hpRatio = Math.max(0, hp / maxHp);
		const barColor =
			hpRatio > 0.5
				? PHASER_COLORS.success
				: hpRatio > 0.25
					? PHASER_COLORS.gold
					: PHASER_COLORS.danger;
		graphics.fillStyle(barColor, 1);
		graphics.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
	}

	private restoreUnitTint(unit: UnitInstance): void {
		if (unit.isBoss && unit.bossPhase === 2) {
			unit.sprite.setTint(BOSS_CONFIG.phase2Tint);
		} else {
			unit.sprite.clearTint();
		}
	}

	applySlow(unitId: string, factor: number, durationMs: number): void {
		const unit = this.units.get(unitId);
		if (!unit) return;
		if (unit.ccImmunityChance > 0 && this.rng() < unit.ccImmunityChance) {
			return; // CC resisted
		}
		// Keep the stronger slow (lower factor = slower)
		unit.slowFactor = Math.min(unit.slowFactor, factor);
		unit.slowRemaining = Math.max(unit.slowRemaining, durationMs);
		if (unit.stunRemaining <= 0) unit.sprite.setTint(0x88ccff);
	}

	applyStun(unitId: string, durationMs: number): void {
		const unit = this.units.get(unitId);
		if (!unit) return;
		if (unit.ccImmunityChance > 0 && this.rng() < unit.ccImmunityChance) {
			return; // CC resisted
		}
		unit.stunRemaining = Math.max(unit.stunRemaining, durationMs);
		unit.sprite.setTint(0xffff44);
	}

	applyDamage(
		unitId: string,
		rawDamage: number,
		armorPierce = false,
	): {
		killed: boolean;
		bounty: number;
		unitDefId: string;
		countsTowardClear: boolean;
		source: UnitSpawnSource;
		isBoss: boolean;
		actualDamage: number;
	} | null {
		const unit = this.units.get(unitId);
		if (!unit) return null;

		if (unit.invulnerableMs > 0) {
			return {
				killed: false,
				bounty: 0,
				unitDefId: unit.def.id,
				countsTowardClear: unit.countsTowardClear,
				source: unit.source,
				isBoss: unit.isBoss,
				actualDamage: 0,
			};
		}

		const armor = armorPierce ? 0 : unit.baseArmor;
		const damage = Math.max(1, rawDamage - armor);
		unit.data.hp -= damage;

		// Boss phase transition check — only if still alive (hp > 0)
		if (
			unit.isBoss &&
			unit.bossPhase === 1 &&
			unit.data.hp > 0 &&
			unit.data.hp <= unit.maxHp * BOSS_CONFIG.phaseTransitionRatio
		) {
			unit.bossPhase = 2;
			unit.invulnerableMs = BOSS_CONFIG.invulnerabilityMs;
			// Switch to rage texture if available
			const rageKey = `unit-${unit.def.id}-boss-rage`;
			if (this.scene.textures.exists(rageKey)) {
				unit.sprite.setTexture(rageKey);
				const rageAnimKey = `anim-${rageKey}`;
				if (this.scene.anims.exists(rageAnimKey)) {
					unit.sprite.play(rageAnimKey);
				}
			}
			unit.sprite?.setTint(BOSS_CONFIG.phase2Tint);
			EventBus.emit('boss-phase-change', {
				phase: 2,
				unitId: unit.data.instanceId,
			});
		}

		if (unit.data.hp <= 0) {
			if (unit.isBoss) {
				EventBus.emit('boss-defeated', {
					unitId: unit.data.instanceId,
					waveSlot: unit.waveSlot,
				});
			}
			unit.sprite.destroy();
			unit.shadow?.destroy();
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
			this.removeFromLaneUnits(unit);
			return {
				killed: true,
				bounty: unit.bounty,
				unitDefId: unit.def.id,
				countsTowardClear: unit.countsTowardClear,
				source: unit.source,
				isBoss: unit.isBoss,
				actualDamage: damage,
			};
		}

		if (unit.isBoss && unit.data.hp > 0) {
			EventBus.emit('boss-hp-update', {
				unitId: unit.data.instanceId,
				defId: unit.def.id,
				hp: Math.max(0, unit.data.hp),
				maxHp: unit.maxHp,
				phase: unit.bossPhase,
			});
		}

		this.renderHpBar(
			unit.hpBar,
			unit.worldX,
			unit.worldY,
			unit.maxHp,
			unit.data.hp,
		);
		return {
			killed: false,
			bounty: 0,
			unitDefId: unit.def.id,
			countsTowardClear: unit.countsTowardClear,
			source: unit.source,
			isBoss: unit.isBoss,
			actualDamage: damage,
		};
	}

	hasActiveUnits(): boolean {
		return this.units.size > 0;
	}

	hasQueuedUnits(): boolean {
		return this.spawnQueue.length > 0;
	}

	getActiveCount(): number {
		let count = 0;
		for (const unit of this.units.values()) {
			if (unit.countsTowardClear) count += 1;
		}
		for (const entry of this.spawnQueue) {
			if (entry.countsTowardClear) count += entry.remaining;
		}
		return count;
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

	private reachedExitBuffer: { id: string; isBoss: boolean }[] = [];

	update(
		time: number,
		delta: number,
	): { reachedExit: { id: string; isBoss: boolean }[] } {
		const reachedExit = this.reachedExitBuffer;
		reachedExit.length = 0;

		this.spawnTimer += delta;
		if (this.spawnTimer >= this.SPAWN_INTERVAL && this.spawnQueue.length > 0) {
			this.spawnTimer = 0;
			const front = this.spawnQueue[0];

			// Spawn blocking: check if a stunned/stuck unit blocks the spawn point
			let spawnBlocked = false;
			if (!front.def.flying) {
				const laneIndex =
					this.lanes.length > 1 ? this.nextLane % this.lanes.length : 0;
				const arr = this.laneUnits.get(laneIndex);
				if (arr) {
					// Count units near spawn. Block only if 2+ units are piled up at spawn
					let nearSpawnCount = 0;
					for (let i = arr.length - 1; i >= 0; i--) {
						if (arr[i].pathProgress < this.MIN_SEPARATION) {
							nearSpawnCount++;
						} else {
							break; // sorted array, no more near spawn
						}
					}
					if (nearSpawnCount >= 2) spawnBlocked = true;
				}
			}

			if (spawnBlocked && this.spawnBlockTimer < this.SPAWN_BLOCK_TIMEOUT) {
				this.spawnBlockTimer += this.SPAWN_INTERVAL;
			} else {
				this.spawnBlockTimer = 0;
				this.spawnUnit(front);
				front.remaining--;
				if (front.remaining <= 0) {
					this.spawnQueue.shift();
				}
			}
		}

		const dt = delta / 1000;

		for (const [id, unit] of this.units) {
			if (unit.invulnerableMs > 0) {
				unit.invulnerableMs -= delta;
			}

			const unitLane = this.lanes[unit.laneIndex] ?? this.currentPath;
			const unitLaneWorld =
				this.lanesWorld[unit.laneIndex] ?? this.currentPathWorld;
			const pathIdx = unit.data.pathIndex;
			if (pathIdx >= unitLane.length - 1) {
				reachedExit.push({ id, isBoss: unit.isBoss });
				unit.sprite.destroy();
				unit.shadow?.destroy();
				unit.hpBar.destroy();
				this.units.delete(id);
				this.removeFromLaneUnits(unit);
				continue;
			}

			if (unit.slowRemaining > 0) {
				unit.slowRemaining -= delta;
				if (unit.slowRemaining <= 0) {
					unit.slowFactor = 1.0;
					unit.slowRemaining = 0;
					if (unit.stunRemaining <= 0) {
						this.restoreUnitTint(unit);
					}
				}
			}

			if (unit.stunRemaining > 0) {
				unit.stunRemaining -= delta;
				if (unit.stunRemaining <= 0) {
					unit.stunRemaining = 0;
					if (unit.slowRemaining <= 0) {
						this.restoreUnitTint(unit);
					} else {
						unit.sprite.setTint(0x88ccff);
					}
				}
				continue; // skip movement while stunned
			}

			const nextGrid = unitLane[pathIdx + 1];
			const targetWorld = unitLaneWorld[pathIdx + 1];
			const phase2Mult =
				unit.isBoss && unit.bossPhase === 2
					? BOSS_CONFIG.phase2SpeedMultiplier
					: 1;
			const speed =
				unit.baseSpeed *
				phase2Mult *
				this.gridManager.orthoTile *
				unit.slowFactor;

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

			// Compute pathProgress after movement
			const curIdx = unit.data.pathIndex;
			if (curIdx < unitLaneWorld.length - 1) {
				const segStart = unitLaneWorld[curIdx];
				const segEnd = unitLaneWorld[curIdx + 1];
				const segDx = segEnd.x - segStart.x;
				const segDy = segEnd.y - segStart.y;
				const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
				if (segLen > 0) {
					const unitDx = unit.worldX - segStart.x;
					const unitDy = unit.worldY - segStart.y;
					const proj = (unitDx * segDx + unitDy * segDy) / segLen;
					const frac = Math.max(0, Math.min(1, proj / segLen));
					unit.pathProgress = curIdx + frac;
				} else {
					unit.pathProgress = curIdx;
				}
			}

			// Boss flies above ground with bobbing; shadow stays on ground
			if (unit.isBoss) {
				const flyBob = Math.sin(time * 0.003) * 3;
				unit.sprite.setPosition(unit.worldX, unit.worldY - 20 + flyBob);
				if (unit.shadow) {
					unit.shadow.setPosition(unit.worldX, unit.worldY);
				}
			} else {
				unit.sprite.setPosition(unit.worldX, unit.worldY);
			}
			// Rotate boss sprite to face movement direction (sprite default: head pointing down = PI/2)
			if (unit.isBoss && dist > 0.01) {
				const moveAngle = Math.atan2(dy, dx);
				unit.sprite.setRotation(moveAngle - Math.PI / 2);
			}
			const currentGrid = this.gridManager.worldToGrid(
				unit.worldX,
				unit.worldY,
			);
			const unitDepth = this.gridManager.getDepth(currentGrid.x, currentGrid.y);
			unit.sprite.setDepth(unitDepth);
			if (unit.shadow) {
				unit.shadow.setDepth(unitDepth - 1);
			}
			this.renderHpBar(
				unit.hpBar,
				unit.worldX,
				unit.worldY,
				unit.maxHp,
				unit.data.hp,
			);
		}

		// Sweep collisions for ground units
		this.sweepCollisions();

		return { reachedExit };
	}

	private unitPositionsBuffer: Array<{
		instanceId: string;
		x: number;
		y: number;
		hp: number;
		element: ElementType;
	}> = [];

	getUnitPositions(): Array<{
		instanceId: string;
		x: number;
		y: number;
		hp: number;
		element: ElementType;
	}> {
		this.unitPositionsBuffer.length = 0;
		for (const unit of this.units.values()) {
			this.unitPositionsBuffer.push({
				instanceId: unit.data.instanceId,
				x: unit.worldX,
				y: unit.worldY,
				hp: unit.data.hp,
				element: unit.def.element,
			});
		}
		return this.unitPositionsBuffer;
	}

	getUnitWorldPos(unitId: string): { x: number; y: number } | null {
		const unit = this.units.get(unitId);
		return unit ? { x: unit.worldX, y: unit.worldY } : null;
	}

	getUnitElement(unitId: string): string {
		const unit = this.units.get(unitId);
		return unit?.def.element ?? 'neutral';
	}

	private removeFromLaneUnits(unit: UnitInstance): void {
		if (unit.def.flying) return;
		const arr = this.laneUnits.get(unit.laneIndex);
		if (!arr) return;
		const idx = arr.indexOf(unit);
		if (idx !== -1) arr.splice(idx, 1);
	}

	private readonly COLLISION_LERP = 0.3; // smooth deceleration factor

	private sweepCollisions(): void {
		for (const arr of this.laneUnits.values()) {
			if (arr.length < 2) continue;
			// Sort descending by pathProgress (front first)
			arr.sort((a, b) => b.pathProgress - a.pathProgress);
			// Sweep front→back: ensure minimum separation with smooth lerp
			for (let i = 1; i < arr.length; i++) {
				const front = arr[i - 1];
				const rear = arr[i];
				const sep = front.pathProgress - rear.pathProgress;
				if (sep < this.MIN_SEPARATION) {
					const target = front.pathProgress - this.MIN_SEPARATION;
					const clamped = Math.max(0, target);
					// Lerp toward target for smooth deceleration instead of instant snap
					const lerped =
						rear.pathProgress +
						(clamped - rear.pathProgress) * this.COLLISION_LERP;
					this.setUnitPathProgress(rear, Math.max(0, lerped));
				}
			}
		}
	}

	private setUnitPathProgress(unit: UnitInstance, progress: number): void {
		const lane = this.lanesWorld[unit.laneIndex] ?? this.currentPathWorld;
		const laneGrid = this.lanes[unit.laneIndex] ?? this.currentPath;
		if (lane.length < 2) return;

		const idx = Math.min(Math.floor(progress), lane.length - 2);
		const frac = Math.max(0, Math.min(1, progress - idx));

		const startW = lane[idx];
		const endW = lane[idx + 1];
		unit.worldX = startW.x + (endW.x - startW.x) * frac;
		unit.worldY = startW.y + (endW.y - startW.y) * frac;

		unit.data.pathIndex = idx;
		unit.pathProgress = progress;

		const startG = laneGrid[idx];
		const endG = laneGrid[idx + 1];
		unit.data.position = {
			x: Math.round(startG.x + (endG.x - startG.x) * frac),
			y: Math.round(startG.y + (endG.y - startG.y) * frac),
		};

		unit.sprite.setPosition(unit.worldX, unit.worldY);
		const currentGrid = this.gridManager.worldToGrid(unit.worldX, unit.worldY);
		unit.sprite.setDepth(
			this.gridManager.getDepth(currentGrid.x, currentGrid.y),
		);
		this.renderHpBar(
			unit.hpBar,
			unit.worldX,
			unit.worldY,
			unit.maxHp,
			unit.data.hp,
		);
	}

	destroy(): void {
		for (const unit of this.units.values()) {
			unit.sprite.destroy();
			unit.shadow?.destroy();
			unit.hpBar.destroy();
		}
		this.units.clear();
		this.laneUnits.clear();
		this.spawnQueue.length = 0;
	}
}
