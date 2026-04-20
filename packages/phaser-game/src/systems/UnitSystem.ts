import {
	type ActiveUnit,
	BOSS_CONFIG,
	ELEMENT_TINT_COLORS,
	type ElementType,
	MIN_MOVE_SPEED,
	PHASER_COLORS,
	type PlacedTower,
	type Position,
	STUN_IMMUNITY_WINDOW_MS,
	scaleUnitStats,
	UNITS,
	type UnitDef,
} from '@gld/shared';
import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../assets/assetManifest';
import { EventBus } from '../EventBus';
import type { GridManager } from './GridManager';
import type { TowerSystem } from './TowerSystem';

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
	armorMult: number;
	ccResist: number;
}

type UnitAnimationState = 'walk' | 'idle' | 'death';

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
	bossPhase: 1 | 2 | 3;
	invulnerableMs: number;
	maxHp: number;
	baseSpeed: number;
	baseArmor: number;
	ccImmunityChance: number;
	/**
	 * Phase 11 [F16] — deterministic CC duration multiplier (0.0 = full
	 * effect, 1.0 = immune). Distinct from `ccImmunityChance` which is a
	 * probabilistic resist roll: ccResistance always shortens the applied
	 * effect duration. Bosses inherit `bossCcResist` here so a 0.5-resist
	 * boss takes a 1000ms slow as 500ms instead of dodging it entirely.
	 */
	ccResistance: number;
	/**
	 * Phase 11 [F16] — scene-time (ms) until which any new stun is rejected.
	 * Set when a stun ends (current time + STUN_IMMUNITY_WINDOW_MS) so a
	 * second stun tower can't lock the unit indefinitely.
	 */
	stunImmunityUntil: number;
	waveSlot: number;
	pathProgress: number; // continuous 1D position along lane path
	shadow: Phaser.GameObjects.Ellipse | null;
	lastRangedAttackMs?: number;
	animationState: UnitAnimationState;
	pendingDestroy: boolean;
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
	armorMult?: number;
	ccResist?: number;
}

export class UnitSystem {
	private units: Map<string, UnitInstance> = new Map();
	private scene: Phaser.Scene;
	private gridManager: GridManager;
	private towerSystem: TowerSystem | null = null;
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
	private spawnIntervalMs = 300;
	private laneUnits: Map<number, UnitInstance[]> = new Map();
	/** Called after any unit (wave-queue or additional) is physically spawned. */
	private unitSpawnedCallback:
		| ((instanceId: string, defId: string, isBoss: boolean) => void)
		| null = null;

	setSpawnInterval(ms: number): void {
		this.spawnIntervalMs = ms;
	}

	constructor(scene: Phaser.Scene, gridManager: GridManager) {
		this.scene = scene;
		this.gridManager = gridManager;
	}

	/** Inject TowerSystem for ranged_tower_attack behavior */
	setTowerSystem(towerSystem: TowerSystem): void {
		this.towerSystem = towerSystem;
	}

	/** Inject RNG for testability (CC immunity) */
	setRng(rng: () => number): void {
		this.rng = rng;
	}

	/** Register a callback to be notified whenever a unit is physically spawned. */
	setUnitSpawnedCallback(
		cb: (instanceId: string, defId: string, isBoss: boolean) => void,
	): void {
		this.unitSpawnedCallback = cb;
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
			armorMult: options.armorMult ?? 1,
			ccResist: options.ccResist ?? 0,
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
		if (entry.def.specialBehavior === 'damage_shield') {
			unitData.shieldHp = entry.def.specialParams?.shieldHp ?? 0;
		}

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
		if (entry.isBoss && entry.def.flying) {
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
			baseArmor: scaled.armor * entry.armorMult,
			ccImmunityChance: Math.min(
				1,
				scaled.ccImmunityChance +
					entry.ccResist +
					(entry.def.bossCcResist ?? 0),
			),
			// Phase 11 [F16]: deterministic CC duration cut. Reuses the unit
			// def's `bossCcResist` field — normal mobs default to 0 (no
			// reduction) while bosses inherit 0.5–0.7 from `units.ts`.
			ccResistance: Math.min(1, entry.def.bossCcResist ?? 0),
			stunImmunityUntil: 0,
			waveSlot: entry.waveSlot,
			shadow,
			pathProgress: 0,
			animationState: 'walk',
			pendingDestroy: false,
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

		this.unitSpawnedCallback?.(instanceId, entry.def.id, entry.isBoss);
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

	private setUnitAnimationState(
		unit: UnitInstance,
		state: UnitAnimationState,
	): void {
		if (unit.animationState === state || !unit.sprite.active) return;
		const animationKey = `${unit.def.id}-${state}`;
		if (!this.scene.anims.exists(animationKey)) return;
		unit.animationState = state;
		unit.sprite.play(animationKey);
	}

	applySlow(unitId: string, factor: number, durationMs: number): void {
		const unit = this.units.get(unitId);
		if (!unit) return;
		// Same pendingDestroy gate as `applyStun` — a dying unit should not
		// pick up new tint/state changes that could preempt the death anim
		// cleanup listener.
		if (unit.pendingDestroy) return;
		if (unit.ccImmunityChance > 0 && this.rng() < unit.ccImmunityChance) {
			return; // CC resisted
		}
		// Phase 11 [F16]: ccResistance is a deterministic duration cut applied
		// on top of the probabilistic ccImmunityChance dodge. Bosses with
		// resistance 0.5 take half-duration slows; speed is floored at
		// MIN_MOVE_SPEED so a fully-stacked frost setup can't pin units at 0.
		const effectiveDuration = durationMs * (1 - unit.ccResistance);
		const flooredFactor = Math.max(MIN_MOVE_SPEED, factor);
		// Keep the stronger slow (lower factor = slower)
		unit.slowFactor = Math.min(unit.slowFactor, flooredFactor);
		unit.slowRemaining = Math.max(unit.slowRemaining, effectiveDuration);
		if (unit.stunRemaining <= 0) unit.sprite.setTint(0x88ccff);
	}

	applyStun(unitId: string, durationMs: number): void {
		const unit = this.units.get(unitId);
		if (!unit) return;
		// Bug guard: once a unit is flagged for destruction the death
		// animation is already playing and its ANIMATION_COMPLETE listener
		// owns sprite cleanup. Applying stun here would call
		// `setUnitAnimationState(unit, 'idle')` which interrupts the death
		// animation, so ANIMATION_COMPLETE never fires and the ghost sprite
		// lingers on screen forever. Matches the same gate `applyDamage` has.
		if (unit.pendingDestroy) return;
		if (unit.ccImmunityChance > 0 && this.rng() < unit.ccImmunityChance) {
			return; // CC resisted
		}
		// Phase 11 [F16]: refuse re-stuns that fall inside the post-stun
		// immunity window. Window is set when a stun expires (see update()
		// loop), so the first stun lands normally.
		const now = this.scene.time?.now ?? 0;
		if (now < unit.stunImmunityUntil) return;
		const effectiveDuration = durationMs * (1 - unit.ccResistance);
		unit.stunRemaining = Math.max(unit.stunRemaining, effectiveDuration);
		unit.sprite.setTint(0xffff44);
		this.setUnitAnimationState(unit, 'idle');
	}

	applyDamage(
		unitId: string,
		rawDamage: number,
		armorPierce = false,
	): {
		outcome: 'hit' | 'miss' | 'absorbed' | 'invulnerable';
		killed: boolean;
		bounty: number;
		unitDefId: string;
		countsTowardClear: boolean;
		source: UnitSpawnSource;
		isBoss: boolean;
		actualDamage: number;
	} | null {
		const unit = this.units.get(unitId);
		if (!unit || unit.pendingDestroy) return null;

		const meta = {
			unitDefId: unit.def.id,
			countsTowardClear: unit.countsTowardClear,
			source: unit.source,
			isBoss: unit.isBoss,
		} as const;

		if (unit.invulnerableMs > 0) {
			return {
				outcome: 'invulnerable',
				killed: false,
				bounty: 0,
				...meta,
				actualDamage: 0,
			};
		}

		const armor = armorPierce ? 0 : unit.baseArmor;
		// Floor before MISS check so sub-integer surpluses (e.g. rawDamage = armor + 0.5)
		// are treated as MISS rather than silent 0-damage hits.
		let damage = Math.floor(rawDamage - armor);
		if (damage <= 0) {
			// MISS: armor fully absorbed damage (including sub-integer surpluses) — no HP reduction
			return {
				outcome: 'miss',
				killed: false,
				bounty: 0,
				...meta,
				actualDamage: 0,
			};
		}

		// Shield absorption: damage_shield enemies absorb damage until shield breaks
		if ((unit.data.shieldHp ?? 0) > 0) {
			const shieldHp = unit.data.shieldHp ?? 0;
			if (shieldHp >= damage) {
				unit.data.shieldHp = shieldHp - damage;
				damage = 0;
			} else {
				damage -= shieldHp;
				unit.data.shieldHp = 0;
			}
		}
		if (damage <= 0) {
			return {
				outcome: 'absorbed',
				killed: false,
				bounty: 0,
				...meta,
				actualDamage: 0,
			};
		}

		unit.data.hp -= damage;

		// Boss phase transition checks — only fire while still alive. Phase 2
		// is the 50% HP rage spike; phase 3 is a 25% HP "last stretch" that
		// stacks another speed bump so the back half isn't a plateau.
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
		} else if (
			unit.isBoss &&
			unit.bossPhase === 2 &&
			unit.data.hp > 0 &&
			unit.data.hp <= unit.maxHp * BOSS_CONFIG.phase3TransitionRatio
		) {
			unit.bossPhase = 3;
			unit.invulnerableMs = BOSS_CONFIG.invulnerabilityMs;
			unit.sprite?.setTint(BOSS_CONFIG.phase3Tint);
			EventBus.emit('boss-phase-change', {
				phase: 3,
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
			unit.pendingDestroy = true;
			unit.data.hp = 0;
			this.removeFromLaneUnits(unit);
			const deathGrid = this.gridManager.worldToGrid(unit.worldX, unit.worldY);
			unit.sprite.setDepth(this.gridManager.getDepth(deathGrid.x, deathGrid.y));
			const deathAnimationKey = `${unit.def.id}-death`;
			if (this.scene.anims.exists(deathAnimationKey)) {
				this.setUnitAnimationState(unit, 'death');
				unit.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
					unit.sprite.destroy();
					unit.shadow?.destroy();
					unit.hpBar.destroy();
					this.units.delete(unitId);
				});
			} else {
				unit.sprite.destroy();
				unit.shadow?.destroy();
				unit.hpBar.destroy();
				this.units.delete(unitId);
			}
			this.spawnOptionalVfx(
				unit.def.id === 'dragon' ? 'vfx-explosion-lg' : 'vfx-explosion-sm',
				unit.worldX,
				unit.worldY,
				unit.def.id === 'dragon' ? 64 : 32,
				this.gridManager.getDepth(deathGrid.x, deathGrid.y) + 1,
			);
			return {
				outcome: 'hit',
				killed: true,
				bounty: unit.bounty,
				...meta,
				actualDamage: damage,
			};
		}

		if (unit.isBoss && unit.data.hp > 0) {
			// Boss is alive in this branch — clamp floored HP to min 1 so
			// `Math.floor(0.5) → 0` doesn't render an empty HP bar on a live
			// boss (HUD then contradicts the "still alive" game state).
			EventBus.emit('boss-hp-update', {
				unitId: unit.data.instanceId,
				defId: unit.def.id,
				hp: Math.max(1, Math.floor(unit.data.hp)),
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
			outcome: 'hit',
			killed: false,
			bounty: 0,
			...meta,
			actualDamage: damage,
		};
	}

	hasActiveUnits(): boolean {
		for (const unit of this.units.values()) {
			if (!unit.pendingDestroy) return true;
		}
		return false;
	}

	hasQueuedUnits(): boolean {
		return this.spawnQueue.length > 0;
	}

	getActiveCount(): number {
		let count = 0;
		for (const unit of this.units.values()) {
			if (unit.pendingDestroy) continue;
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
		if (this.spawnTimer >= this.spawnIntervalMs && this.spawnQueue.length > 0) {
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
			if (unit.pendingDestroy) {
				continue;
			}
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
					// Phase 11 [F16]: post-stun immunity window so chained stun
					// towers can't lock the unit. Slows are unaffected.
					unit.stunImmunityUntil = time + STUN_IMMUNITY_WINDOW_MS;
					if (unit.slowRemaining <= 0) {
						this.restoreUnitTint(unit);
					} else {
						unit.sprite.setTint(0x88ccff);
					}
					this.setUnitAnimationState(unit, 'walk');
				}
				continue; // skip movement while stunned
			}

			// Enemies with ranged_tower_attack disable the nearest tower on cooldown
			if (
				unit.def.specialBehavior === 'ranged_tower_attack' &&
				this.towerSystem
			) {
				const cooldown = unit.def.specialParams?.cooldownMs ?? 3000;
				const range = unit.def.specialParams?.range ?? 2;
				const dmg = unit.def.specialParams?.damage ?? 25;
				const last = unit.lastRangedAttackMs ?? 0;
				if (time - last >= cooldown) {
					const unitX = unit.data.position.x;
					const unitY = unit.data.position.y;
					const towers = this.towerSystem.getTowers();
					let bestTower: PlacedTower | undefined;
					let bestDist = Infinity;
					for (const t of towers) {
						const dx = Math.abs(t.position.x - unitX);
						const dy = Math.abs(t.position.y - unitY);
						const cheb = Math.max(dx, dy); // Chebyshev distance on grid
						if (cheb <= range && cheb < bestDist) {
							bestDist = cheb;
							bestTower = t;
						}
					}
					if (bestTower) {
						const stunMs = Math.min(dmg * 50, 2000);
						this.towerSystem.disableTower(bestTower.instanceId, time + stunMs);
						unit.lastRangedAttackMs = time;
					}
				}
			}

			this.setUnitAnimationState(unit, 'walk');
			const nextGrid = unitLane[pathIdx + 1];
			const targetWorld = unitLaneWorld[pathIdx + 1];
			const phaseMult = !unit.isBoss
				? 1
				: unit.bossPhase === 3
					? BOSS_CONFIG.phase3SpeedMultiplier
					: unit.bossPhase === 2
						? BOSS_CONFIG.phase2SpeedMultiplier
						: 1;
			const speed =
				unit.baseSpeed *
				phaseMult *
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
			if (unit.isBoss && unit.def.flying) {
				const flyBob = Math.sin(time * 0.003) * 3;
				unit.sprite.setPosition(unit.worldX, unit.worldY - 20 + flyBob);
				if (unit.shadow) {
					unit.shadow.setPosition(unit.worldX, unit.worldY);
				}
			} else {
				unit.sprite.setPosition(unit.worldX, unit.worldY);
			}
			// Flying boss: rotate to face movement direction
			// Ground boss/units: flip sprite horizontally based on movement
			if (unit.isBoss && dist > 0.01) {
				if (unit.def.flying) {
					const moveAngle = Math.atan2(dy, dx);
					unit.sprite.setRotation(moveAngle - Math.PI / 2);
				} else {
					unit.sprite.setFlipX(dx < 0);
				}
			} else if (!unit.isBoss && dist > 0.01) {
				unit.sprite.setFlipX(dx < 0);
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
			if (unit.pendingDestroy) continue;
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

	/** Look up a live unit instance by its instanceId. Used by boss behavior pipeline. */
	getUnit(instanceId: string): UnitInstance | undefined {
		return this.units.get(instanceId);
	}

	/**
	 * Spawn a unit immediately at a given grid position, bypassing the wave queue.
	 * Used by boss behaviors (e.g. OrcWarlord summons minions).
	 */
	spawnAdditionalUnit(
		unitDefId: string,
		position: { x: number; y: number },
		metadata?: Record<string, unknown>,
	): void {
		const def = UNITS.find((u) => u.id === unitDefId);
		if (!def) return;
		if (this.lanes.length === 0 && this.currentPath.length === 0) return;

		// Pick the lane whose start is closest to the requested position
		let laneIndex = 0;
		if (this.lanes.length > 1) {
			let bestDist = Infinity;
			for (let i = 0; i < this.lanes.length; i++) {
				const start = this.lanes[i][0];
				if (!start) continue;
				const dx = start.x - position.x;
				const dy = start.y - position.y;
				const d = dx * dx + dy * dy;
				if (d < bestDist) {
					bestDist = d;
					laneIndex = i;
				}
			}
		}

		const lanePath = this.lanes[laneIndex] ?? this.currentPath;
		if (lanePath.length === 0) return;

		const instanceId = `unit_${this.nextId++}`;
		const clampedGrid = {
			x: Math.max(0, Math.min(position.x, this.gridManager.width - 1)),
			y: Math.max(0, Math.min(position.y, this.gridManager.height - 1)),
		};
		let initialPathIndex = 0;
		let bestDist = Infinity;
		for (let i = 0; i < lanePath.length; i++) {
			const dx = lanePath[i].x - clampedGrid.x;
			const dy = lanePath[i].y - clampedGrid.y;
			const d = dx * dx + dy * dy;
			if (d < bestDist) {
				bestDist = d;
				initialPathIndex = i;
			}
		}
		initialPathIndex = Math.min(
			initialPathIndex,
			Math.max(0, lanePath.length - 2),
		);
		const startGrid = clampedGrid;
		const startWorld = this.gridManager.gridToWorld(
			clampedGrid.x,
			clampedGrid.y,
		);

		EventBus.emit('unit-spawned', { unitType: def.type, count: 1 });

		const scaled = scaleUnitStats(def.stats, this.stageLevel);
		const finalHp = scaled.hp;

		const unitData: ActiveUnit = {
			instanceId,
			defId: def.id,
			position: { x: startGrid.x, y: startGrid.y },
			hp: finalHp,
			pathIndex: initialPathIndex,
			shieldHp:
				def.specialBehavior === 'damage_shield'
					? (def.specialParams?.shieldHp ?? 0)
					: undefined,
			metadata,
		};

		const textureKey = `unit-${def.id}`;
		const sprite = this.scene.add.sprite(
			startWorld.x,
			startWorld.y,
			textureKey,
		);
		sprite.setDisplaySize(40, 48);
		sprite.play(`${def.id}-walk`);
		sprite.setDepth(this.gridManager.getDepth(startGrid.x, startGrid.y));
		if (def.element !== 'neutral') {
			sprite.setTint(ELEMENT_TINT_COLORS[def.element]);
		}

		const hpBar = this.scene.add.graphics();
		this.renderHpBar(hpBar, startWorld.x, startWorld.y, finalHp, finalHp);

		const instance: UnitInstance = {
			data: unitData,
			def,
			sprite,
			hpBar,
			worldX: startWorld.x,
			worldY: startWorld.y,
			slowFactor: 1.0,
			slowRemaining: 0,
			stunRemaining: 0,
			bounty: Math.round(def.bounty * scaled.bountyMultiplier),
			countsTowardClear: false, // summoned units don't count toward wave clear
			source: 'base',
			laneIndex,
			isBoss: false,
			bossPhase: 1,
			invulnerableMs: 0,
			maxHp: finalHp,
			baseSpeed: scaled.speed,
			baseArmor: scaled.armor,
			ccImmunityChance: scaled.ccImmunityChance,
			ccResistance: Math.min(1, def.bossCcResist ?? 0),
			stunImmunityUntil: 0,
			waveSlot: 0,
			shadow: null,
			pathProgress: initialPathIndex,
			animationState: 'walk',
			pendingDestroy: false,
		};
		this.units.set(instanceId, instance);

		if (!def.flying) {
			let arr = this.laneUnits.get(laneIndex);
			if (!arr) {
				arr = [];
				this.laneUnits.set(laneIndex, arr);
			}
			arr.push(instance);
		}

		this.unitSpawnedCallback?.(instanceId, def.id, false);
	}

	private removeFromLaneUnits(unit: UnitInstance): void {
		if (unit.def.flying) return;
		const arr = this.laneUnits.get(unit.laneIndex);
		if (!arr) return;
		const idx = arr.indexOf(unit);
		if (idx !== -1) arr.splice(idx, 1);
	}

	private sweepCollisions(): void {
		// Collision disabled — monsters pass through each other
		return;
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
