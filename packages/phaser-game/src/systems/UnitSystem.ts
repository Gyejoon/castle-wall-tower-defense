import {
	type ActiveUnit,
	BOSS_CONFIG,
	ELEMENT_TINT_COLORS,
	type ElementType,
	MAIN_MAP_ID,
	PHASER_COLORS,
	type PlacedTower,
	type Position,
	scaleUnitStats,
	UNITS,
	type UnitDef,
} from '@gld/shared';
import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../assets/assetManifest';
import { EventBus } from '../EventBus';
import type { GridManager } from './GridManager';
import type { TowerSystem } from './TowerSystem';
import { BossPhaseTracker } from './units/BossPhaseTracker';
import { CCStateManager } from './units/CCStateManager';
import { PathFollower } from './units/PathFollower';

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
	bounty: number;
	countsTowardClear: boolean;
	source: UnitSpawnSource;
	laneIndex: number;
	isBoss: boolean;
	maxHp: number;
	baseSpeed: number;
	baseArmor: number;
	waveSlot: number;
	shadow: Phaser.GameObjects.Ellipse | null;
	lastRangedAttackMs?: number;
	animationState: UnitAnimationState;
	pendingDestroy: boolean;
	// CC·boss·path 필드는 하위 매니저의 라이브 getter 프록시다.
	readonly slowFactor: number;
	readonly slowRemaining: number;
	readonly stunRemaining: number;
	readonly invulnerableMs: number;
	readonly ccResistance: number;
	readonly ccImmunityChance: number;
	readonly stunImmunityUntil: number;
	readonly pathProgress: number;
	readonly bossPhase: 1 | 2 | 3;
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

const NORMAL_UNIT_DISPLAY_SIZE = { width: 20, height: 26 };
const BOSS_UNIT_DISPLAY_SIZE = { width: 30, height: 36 };
const FLYING_BOSS_Y_OFFSET = 12;
const FLYING_BOSS_SHADOW_SIZE = { width: 26, height: 10 };
const MAIN_LONG_UNIT_SPEED_MULTIPLIER = 0.55;

export class UnitSystem {
	private units: Map<string, UnitInstance> = new Map();
	private scene: Phaser.Scene;
	private gridManager: GridManager;
	private towerSystem: TowerSystem | null = null;
	private nextId = 0;
	private nextLane = 0;
	private stageLevel = 1;
	private rng: () => number = Math.random;
	private spawnQueue: SpawnQueueEntry[] = [];
	private spawnTimer = 0;
	private spawnIntervalMs = 300;
	private laneUnits: Map<number, UnitInstance[]> = new Map();
	private pathFollower: PathFollower;
	private cc: CCStateManager;
	private bossPhase: BossPhaseTracker;
	private unitSpawnedCallback:
		| ((instanceId: string, defId: string, isBoss: boolean) => void)
		| null = null;

	setSpawnInterval(ms: number): void {
		this.spawnIntervalMs = ms;
	}

	constructor(scene: Phaser.Scene, gridManager: GridManager) {
		this.scene = scene;
		this.gridManager = gridManager;
		this.pathFollower = new PathFollower(gridManager);
		this.cc = new CCStateManager(this.rng);
		this.bossPhase = new BossPhaseTracker();
	}

	/** Inject TowerSystem for ranged_tower_attack behavior */
	setTowerSystem(towerSystem: TowerSystem): void {
		this.towerSystem = towerSystem;
	}

	/** Inject RNG for testability (CC immunity) */
	setRng(rng: () => number): void {
		this.rng = rng;
		this.cc.setRng(rng);
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
		this.pathFollower.setPaths(paths);
		this.nextLane = 0;

		for (const unit of this.units.values()) {
			this.pathFollower.reassignToClosest(
				unit.data.instanceId,
				unit.data.position,
			);
			const follower = this.pathFollower.get(unit.data.instanceId);
			if (follower) {
				unit.data.pathIndex = follower.pathIndex;
			}
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
		if (this.pathFollower.getLaneCount() === 0) return;

		// Round-robin lane assignment
		const laneCount = this.pathFollower.getLaneCount();
		const laneIndex = laneCount > 1 ? this.nextLane++ % laneCount : 0;
		const lanePath = this.pathFollower.getLane(laneIndex);
		const lanePathWorld = this.pathFollower.getLaneWorld(laneIndex);
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
		const displaySize = entry.isBoss
			? BOSS_UNIT_DISPLAY_SIZE
			: NORMAL_UNIT_DISPLAY_SIZE;
		sprite.setDisplaySize(displaySize.width, displaySize.height);
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
				FLYING_BOSS_SHADOW_SIZE.width,
				FLYING_BOSS_SHADOW_SIZE.height,
				0x000000,
				0.3,
			);
			shadow.setDepth(this.gridManager.getDepth(startGrid.x, startGrid.y) - 1);
			sprite.setPosition(startWorld.x, startWorld.y - FLYING_BOSS_Y_OFFSET);
		}

		const hpBar = this.scene.add.graphics();
		this.renderHpBar(hpBar, startWorld.x, startWorld.y, finalHp, finalHp);

		// UnitInstance의 live accessor가 첫 읽기에 state를 풀 수 있도록 선등록.
		this.pathFollower.register(instanceId, laneIndex, 0);
		const ccImmunityChance = Math.min(
			1,
			scaled.ccImmunityChance + entry.ccResist + (entry.def.bossCcResist ?? 0),
		);
		const ccResistance = Math.min(1, entry.def.bossCcResist ?? 0);
		this.cc.register(instanceId, ccResistance, ccImmunityChance);
		if (entry.isBoss) {
			this.bossPhase.register(instanceId);
		}

		const instance = this.buildUnitInstance({
			instanceId,
			data: unitData,
			def: entry.def,
			sprite,
			hpBar,
			worldX: startWorld.x,
			worldY: startWorld.y,
			bounty: Math.round(entry.bounty * scaled.bountyMultiplier),
			countsTowardClear: entry.countsTowardClear,
			source: entry.source,
			laneIndex,
			isBoss: entry.isBoss,
			maxHp: finalHp,
			baseSpeed: scaled.speed * entry.waveSpeedMult,
			baseArmor: scaled.armor * entry.armorMult,
			waveSlot: entry.waveSlot,
			shadow,
		});

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

	// 호출 전에 해당 instanceId가 모든 하위 매니저에 등록되어 있어야 한다.
	private buildUnitInstance(
		init: Omit<
			UnitInstance,
			| 'slowFactor'
			| 'slowRemaining'
			| 'stunRemaining'
			| 'invulnerableMs'
			| 'ccResistance'
			| 'ccImmunityChance'
			| 'stunImmunityUntil'
			| 'pathProgress'
			| 'bossPhase'
			| 'animationState'
			| 'pendingDestroy'
		> & { instanceId: string },
	): UnitInstance {
		const { instanceId: id, ...rest } = init;
		const base: Record<string, unknown> = {
			...rest,
			animationState: 'walk',
			pendingDestroy: false,
		};
		const ccGet = (k: keyof NonNullable<ReturnType<CCStateManager['get']>>) =>
			(this.cc.get(id)?.[k] as number | undefined) ?? 0;
		Object.defineProperties(base, {
			slowFactor: {
				enumerable: true,
				get: () => this.cc.get(id)?.slowFactor ?? 1,
			},
			slowRemaining: { enumerable: true, get: () => ccGet('slowRemaining') },
			stunRemaining: { enumerable: true, get: () => ccGet('stunRemaining') },
			invulnerableMs: { enumerable: true, get: () => ccGet('invulnerableMs') },
			ccResistance: { enumerable: true, get: () => ccGet('ccResistance') },
			ccImmunityChance: {
				enumerable: true,
				get: () => ccGet('ccImmunityChance'),
			},
			stunImmunityUntil: {
				enumerable: true,
				get: () => ccGet('stunImmunityUntil'),
			},
			pathProgress: {
				enumerable: true,
				get: () => this.pathFollower.get(id)?.pathProgress ?? 0,
			},
			bossPhase: { enumerable: true, get: () => this.bossPhase.getPhase(id) },
		});
		return base as unknown as UnitInstance;
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
		if (unit.isBoss && this.bossPhase.getPhase(unit.data.instanceId) === 2) {
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
		const applied = this.cc.applySlow(unitId, factor, durationMs);
		if (!applied) return;
		// Stun tint가 slow tint보다 시각적으로 우선한다.
		if (!this.cc.isStunned(unitId)) {
			unit.sprite.setTint(0x88ccff);
		}
	}

	applyStun(unitId: string, durationMs: number): void {
		const unit = this.units.get(unitId);
		if (!unit) return;
		// pendingDestroy 상태에 stun을 적용하면 idle 애니메이션이 death 애니메이션을
		// 가로채 ANIMATION_COMPLETE가 발화되지 않아 고스트 스프라이트가 남는다.
		if (unit.pendingDestroy) return;
		const now = this.scene.time?.now ?? 0;
		const applied = this.cc.applyStun(unitId, durationMs, now);
		if (!applied) return;
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

		if (this.cc.isInvulnerable(unitId)) {
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

		if (unit.isBoss) {
			const transition = this.bossPhase.onDamage(
				unitId,
				unit.data.hp,
				unit.maxHp,
			);
			if (transition) {
				this.cc.setInvulnerable(unitId, transition.invulnerabilityMs);
				if (transition.swapTexture) {
					const rageKey = `unit-${unit.def.id}-boss-rage`;
					if (this.scene.textures.exists(rageKey)) {
						unit.sprite.setTexture(rageKey);
						const rageAnimKey = `anim-${rageKey}`;
						if (this.scene.anims.exists(rageAnimKey)) {
							unit.sprite.play(rageAnimKey);
						}
					}
				}
				unit.sprite?.setTint(transition.tint);
				EventBus.emit('boss-phase-change', {
					phase: transition.phase,
					unitId: unit.data.instanceId,
				});
			}
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
					this.pathFollower.unregister(unitId);
					this.cc.unregister(unitId);
					this.bossPhase.unregister(unitId);
				});
			} else {
				unit.sprite.destroy();
				unit.shadow?.destroy();
				unit.hpBar.destroy();
				this.units.delete(unitId);
				this.pathFollower.unregister(unitId);
				this.cc.unregister(unitId);
				this.bossPhase.unregister(unitId);
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
				phase: this.bossPhase.getPhase(unitId),
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

		for (const [id, unit] of this.units) {
			if (unit.pendingDestroy) {
				continue;
			}

			// stunJustEnded 시 CCStateManager 내부에서 stunImmunityUntil이 설정된다.
			const ccTick = this.cc.tick(id, delta, time);

			const unitLane = this.pathFollower.getLane(unit.laneIndex);
			const pathIdx = unit.data.pathIndex;
			if (pathIdx >= unitLane.length - 1) {
				reachedExit.push({ id, isBoss: unit.isBoss });
				unit.sprite.destroy();
				unit.shadow?.destroy();
				unit.hpBar.destroy();
				this.units.delete(id);
				this.pathFollower.unregister(id);
				this.cc.unregister(id);
				this.bossPhase.unregister(id);
				this.removeFromLaneUnits(unit);
				continue;
			}

			if (ccTick.slowJustEnded && !ccTick.isStunned) {
				this.restoreUnitTint(unit);
			}

			// stun 해제 시 slow가 남아있으면 slow tint 유지, 아니면 base tint 복원.
			if (ccTick.stunJustEnded) {
				if (this.cc.isSlowed(id)) {
					unit.sprite.setTint(0x88ccff);
				} else {
					this.restoreUnitTint(unit);
				}
				this.setUnitAnimationState(unit, 'walk');
			}

			if (ccTick.isStunned) continue;

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

			const bossPhaseNum = unit.isBoss ? this.bossPhase.getPhase(id) : 1;
			const phaseMult = !unit.isBoss
				? 1
				: bossPhaseNum === 3
					? BOSS_CONFIG.phase3SpeedMultiplier
					: bossPhaseNum === 2
						? BOSS_CONFIG.phase2SpeedMultiplier
						: 1;
			const speed =
				unit.baseSpeed *
				phaseMult *
				this.gridManager.orthoTile *
				ccTick.speedMultiplier *
				this.getMapSpeedMultiplier();

			// flip/rotation은 advance 전 방향 벡터를 사용해야 한다. advance 후
			// snap된 위치를 기준으로 하면 다음-다음 셀 방향을 바라보게 된다.
			const unitLaneWorld = this.pathFollower.getLaneWorld(unit.laneIndex);
			const preTarget = unitLaneWorld[unit.data.pathIndex + 1] ?? {
				x: unit.worldX,
				y: unit.worldY,
			};
			const dx = preTarget.x - unit.worldX;
			const dy = preTarget.y - unit.worldY;

			const adv = this.pathFollower.advance(id, {
				worldX: unit.worldX,
				worldY: unit.worldY,
				speed,
				dtMs: delta,
			});
			if (!adv) continue;

			unit.worldX = adv.worldX;
			unit.worldY = adv.worldY;
			if (adv.advancedWaypoint) {
				unit.data.pathIndex =
					this.pathFollower.get(id)?.pathIndex ?? unit.data.pathIndex;
				unit.data.position = adv.gridPosition;
			}

			// Boss flies above ground with bobbing; shadow stays on ground
			if (unit.isBoss && unit.def.flying) {
				const flyBob = Math.sin(time * 0.003) * 3;
				unit.sprite.setPosition(
					unit.worldX,
					unit.worldY - FLYING_BOSS_Y_OFFSET + flyBob,
				);
				if (unit.shadow) {
					unit.shadow.setPosition(unit.worldX, unit.worldY);
				}
			} else {
				unit.sprite.setPosition(unit.worldX, unit.worldY);
			}
			const dist = Math.sqrt(dx * dx + dy * dy);
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
		if (this.pathFollower.getLaneCount() === 0) return;

		// Pick the lane whose start is closest to the requested position
		const laneIndex = this.pathFollower.findClosestLane(position);
		const lanePath = this.pathFollower.getLane(laneIndex);
		if (lanePath.length === 0) return;

		const instanceId = `unit_${this.nextId++}`;
		const clampedGrid = {
			x: Math.max(0, Math.min(position.x, this.gridManager.width - 1)),
			y: Math.max(0, Math.min(position.y, this.gridManager.height - 1)),
		};
		let initialPathIndex = this.pathFollower.findClosestWaypointIndex(
			laneIndex,
			clampedGrid,
		);
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
		sprite.setDisplaySize(
			NORMAL_UNIT_DISPLAY_SIZE.width,
			NORMAL_UNIT_DISPLAY_SIZE.height,
		);
		sprite.play(`${def.id}-walk`);
		sprite.setDepth(this.gridManager.getDepth(startGrid.x, startGrid.y));
		if (def.element !== 'neutral') {
			sprite.setTint(ELEMENT_TINT_COLORS[def.element]);
		}

		const hpBar = this.scene.add.graphics();
		this.renderHpBar(hpBar, startWorld.x, startWorld.y, finalHp, finalHp);

		// UnitInstance의 live accessor가 첫 읽기에 state를 풀 수 있도록 선등록.
		// 소환된 미니언은 보스가 아니므로 BossPhaseTracker는 건너뛴다.
		this.pathFollower.register(instanceId, laneIndex, initialPathIndex);
		this.cc.register(
			instanceId,
			Math.min(1, def.bossCcResist ?? 0),
			scaled.ccImmunityChance,
		);

		const instance = this.buildUnitInstance({
			instanceId,
			data: unitData,
			def,
			sprite,
			hpBar,
			worldX: startWorld.x,
			worldY: startWorld.y,
			bounty: Math.round(def.bounty * scaled.bountyMultiplier),
			countsTowardClear: false, // summoned units don't count toward wave clear
			source: 'base',
			laneIndex,
			isBoss: false,
			maxHp: finalHp,
			baseSpeed: scaled.speed,
			baseArmor: scaled.armor,
			waveSlot: 0,
			shadow: null,
		});

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

	private getMapSpeedMultiplier(): number {
		return this.gridManager.mapId === MAIN_MAP_ID
			? MAIN_LONG_UNIT_SPEED_MULTIPLIER
			: 1;
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
		this.pathFollower.clear();
		this.cc.clear();
		this.bossPhase.clear();
	}
}
