import type {
	ElementType,
	OwnedTower,
	PlacedTower,
	PlacementFailureReason,
	Position,
	TowerDef,
	TowerFamily,
	UpgradeId,
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
import { PLATFORM_LIFT } from '../fieldAssets';
import {
	type AttackContext,
	type DamageEvent,
	type TowerBehavior,
	type UnitSnapshot,
	createTower,
	hasTowerFactory,
	TowerVfxController,
} from '../towers';
import type { AttackLineEntry } from '../towers/vfx/TowerVfxController';
import type { GridManager } from './GridManager';
import type { TowerLocator } from './MergeSystem';
import type { PathfindingSystem } from './PathfindingSystem';

export interface TowerInstance {
	data: PlacedTower;
	def: TowerDef;
	tier: number;
	effectiveDamage: number;
	base: Phaser.GameObjects.Graphics;
	sprite: Phaser.GameObjects.Image;
	barrelSprite?: Phaser.GameObjects.Image;
	idleTween?: Phaser.Tweens.Tween;
	/** Stored so post-VFX idle tween restart can reset to the exact original
	 *  scale/position. Populated at placement and in moveTower. */
	baseScaleX: number;
	baseScaleY: number;
	baseY: number;
	lastAttackTime: number;
	lastAuraTime: number;
	disabledUntilMs?: number;
}

export type TowerPlacementResult =
	| { success: true; tower: PlacedTower }
	| { success: false; reason: PlacementFailureReason };

/**
 * Phase 9: run-agnostic global modifiers applied on top of the per-run
 * roguelike upgrade stack. `atkPct` is fed in from the web-shell
 * `metaProgressStore` at Game.create() via the scene registry (see
 * PhaseA meta wiring in PhaserGame.tsx / Game.ts). Kept minimal for
 * now — future modifiers (rangePct, critChance, etc.) will extend this.
 */
export interface GlobalModifiers {
	atkPct: number;
}

/**
 * Phase 1: grade is gone — texture is identified purely by tower id. We
 * keep the helper so call sites don't scatter template literals, but it's
 * a pass-through for now. Phase 11 may add tier-specific variants.
 *
 * Phase 11 [F23]: hybrid_ab / hybrid_cd / ultimate share placeholder
 * sprites with their highest-tier ancestor. The asset manifest registers
 * `tower-hybrid_ab` etc. with the placeholder paths so most lookups
 * succeed via the texture cache; this map is the deterministic fallback
 * used by call sites that need a guaranteed-existing texture key without
 * touching the Phaser scene.
 */
const PLACEHOLDER_TEXTURE_FALLBACK: Record<string, string> = {
	hybrid_ab: 'tower-arcane_spire',
	hybrid_cd: 'tower-world_tree',
	ultimate: 'tower-divine_throne',
};

const warnedMissingTextures = new Set<string>();

export function resolveTowerTextureKey(defId: string): string {
	return `tower-${defId}`;
}

/**
 * Resolve the runtime texture key for a tower id, falling back to a known-good
 * placeholder when the manifest entry is missing or its texture failed to
 * load. Logs a single console.warn per missing key so noisy boots stay quiet.
 *
 * Centralised here so both placement and merge-spawn paths share the same
 * fallback instead of asserting.
 */
export function resolveTowerTextureKeySafe(
	scene: Phaser.Scene,
	defId: string,
): string {
	const primary = `tower-${defId}`;
	if (scene.textures.exists(primary)) return primary;
	const fallback = PLACEHOLDER_TEXTURE_FALLBACK[defId];
	if (fallback && scene.textures.exists(fallback)) {
		if (!warnedMissingTextures.has(primary)) {
			warnedMissingTextures.add(primary);
			console.warn(
				`[TowerSystem] missing texture "${primary}", using placeholder "${fallback}"`,
			);
		}
		return fallback;
	}
	if (scene.textures.exists('tower-archer')) {
		if (!warnedMissingTextures.has(primary)) {
			warnedMissingTextures.add(primary);
			console.warn(
				`[TowerSystem] missing texture "${primary}", falling back to tower-archer`,
			);
		}
		return 'tower-archer';
	}
	return primary; // last resort — Phaser will draw the missing-texture frame
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
	private modifierFn: ((upgradeId: UpgradeId) => number) | null = null;
	private familyDamageFn:
		| ((family: TowerFamily, towerId: string) => number)
		| null = null;
	private globalModifiers: GlobalModifiers = { atkPct: 0 };
	private attackGraphics: Phaser.GameObjects.Graphics;
	private attackLines: AttackLineEntry[] = [];
	private arrowPool: Phaser.GameObjects.Image[] = [];
	private arrowPoolInitialized = false;
	private static readonly ARROW_POOL_SIZE = 16;
	/** Phase 2.0: VFX controller shared by tower behaviors created via the new
	 *  strategy registry. Phase 1 ships it as a no-op shell; Phase 2.x will
	 *  port the muzzle/impact spawn + attack-line buffer into it. */
	private readonly towerVfxController: TowerVfxController;
	/** Phase 2.0: instance-scoped map of placed tower instanceId → new-strategy
	 *  behavior. Populated only when `hasTowerFactory(defId)` returns true.
	 *  Empty at runtime until Phase 2.1+ registers concrete factories. */
	private readonly newTowerInstances: Map<string, TowerBehavior> = new Map();
	/** Phase 2.0: prebound damage-push callback for `AttackContext`. Allocated
	 *  once at construction instead of per-frame per-tower inside
	 *  `buildAttackContext` (~1800 alloc/s at 30-tower full board × 60fps). */
	private readonly pushDamage = (evt: DamageEvent): void => {
		this.damageEventsBuffer.push(evt);
	};

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
		this.towerVfxController = new TowerVfxController({
			scene,
			gridManager,
			attackLines: this.attackLines,
			acquireArrow: () => this.acquireArrowIndex(),
			playTowerAttack: (defId, time) => {
				const last = this.lastSoundTime.get(defId) ?? 0;
				if (time - last >= TowerSystem.SOUND_THROTTLE_MS) {
					soundGenerator.playTowerAttack(defId);
					this.lastSoundTime.set(defId, time);
				}
			},
		});
	}

	/**
	 * Phase 2.1: ensure the arrow pool is initialized, then reserve an
	 * invisible slot and return its index. Used by `TowerVfxController` so
	 * arrow-style projectile emitters can request a pooled arrow sprite
	 * without owning the pool themselves. Returns `undefined` when the
	 * pool is exhausted or the arrow texture isn't loaded — callers
	 * fall back to drawing the projectile with Graphics.
	 */
	private acquireArrowIndex(): number | undefined {
		this.ensureArrowPool();
		const idx = this.arrowPool.findIndex((a) => !a.visible);
		if (idx < 0) return undefined;
		this.arrowPool[idx].setVisible(true);
		return idx;
	}

	setModifierFn(fn: ((upgradeId: UpgradeId) => number) | null): void {
		this.modifierFn = fn;
	}

	/** Inject the per-family damage multiplier lookup. Game.ts wires this to
	 *  `PhaseAOrchestrator.getFamilyDamageMultiplier` so energy-purchased
	 *  family upgrades compound on top of roguelike `dmg_up` and the meta
	 *  `atkPct` buff. `towerId` lets the orchestrator distinguish hybrid_ab
	 *  (archer+siege feeders) from hybrid_cd (frost+stun). */
	setFamilyDamageFn(
		fn: ((family: TowerFamily, towerId: string) => number) | null,
	): void {
		this.familyDamageFn = fn;
	}

	/**
	 * Phase 9: inject run-agnostic meta modifiers (from
	 * `metaProgressStore`). Called once from Game.create() via the scene
	 * registry; additional calls replace the value, which matters for
	 * hot-reload and test scenarios.
	 */
	setGlobalModifiers(mods: Partial<GlobalModifiers>): void {
		this.globalModifiers = { ...this.globalModifiers, ...mods };
	}

	/**
	 * Apply the global atk% multiplier on top of an already-upgraded
	 * damage value. Order: `base * elementMult * dmgUpStack * (1 + crit)`
	 * → then `* (1 + globalAtkPct)` from meta progression. Kept as a
	 * single helper so both main-hit and splash damage paths stay in
	 * sync.
	 */
	private resolveFinalDamage(baseDamage: number): number {
		return baseDamage * (1 + this.globalModifiers.atkPct);
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
		options?: { levelOverride?: number },
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
		const towerLevel = options?.levelOverride ?? owned?.level ?? 1;
		const towerTier = def.tier;

		const towerData: PlacedTower = {
			instanceId,
			defId: towerDefId,
			position: { x: gridX, y: gridY },
			level: towerLevel,
		};

		const textureKey = resolveTowerTextureKeySafe(this.scene, towerDefId);
		const base = this.scene.add.graphics();
		const lift = this.gridManager.orthoTile * PLATFORM_LIFT;
		const sprite = this.scene.add.image(
			worldPos.x,
			worldPos.y - lift,
			textureKey,
		);
		sprite.setDisplaySize(48, 60);
		sprite.setY(worldPos.y - lift - 20);
		sprite.setDepth(this.gridManager.getDepth(gridX, gridY) + 5);
		const liftedPos = { x: worldPos.x, y: worldPos.y - lift };
		this.renderTowerBase(base, liftedPos, def);

		const baseScaleX = sprite.scaleX;
		const baseScaleY = sprite.scaleY;
		const baseY = sprite.y;
		const idleTween = this.createIdleTween(
			sprite,
			baseScaleX,
			baseScaleY,
			baseY,
			(this.nextId * 137) % 1800,
		);

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
			tier: towerTier,
			effectiveDamage: getEffectiveStats(def.stats.damage, towerLevel),
			base,
			sprite,
			barrelSprite,
			idleTween,
			baseScaleX,
			baseScaleY,
			baseY,
			lastAttackTime: 0,
			lastAuraTime: 0,
		});

		// Phase 2.0: if a factory is registered for this defId, construct the
		// new-strategy behavior and record it so update() dispatches there.
		// Unregistered defIds fall through to the legacy update path. The
		// registry is empty until Phase 2.1+, so this branch is dead-code at
		// runtime today — wired now to lock in the injection point.
		if (hasTowerFactory(def.id)) {
			const behavior = createTower(def.id, {
				def,
				data: towerData,
				scene: this.scene,
				gridManager: this.gridManager,
				vfx: this.towerVfxController,
				level: towerLevel,
				sprite,
				barrelSprite,
			});
			if (behavior) {
				this.newTowerInstances.set(instanceId, behavior);
			}
		}

		// Phase 11 [F23]: tier-5/6 placeholder differentiation. Until dedicated
		// art ships, hybrid_ab/hybrid_cd/ultimate share T4 sprites; a tinted
		// pulsing aura under the sprite makes them visually distinct without
		// touching the placeholder texture itself. TODO(phase-12): replace with
		// a proper particle emitter once `upgrade-success-fx` is wired up as a
		// particle texture.
		this.spawnPlaceholderAura(towerDefId, base, liftedPos);

		return { success: true, tower: towerData };
	}

	/**
	 * Build the continuous yoyo breathing tween for a tower sprite. Extracted
	 * so placement, moveTower, and post-VFX restart paths share an identical
	 * config and reset precisely to the sprite's baseline scale/y instead of
	 * drifting after each punch animation.
	 */
	private createIdleTween(
		sprite: Phaser.GameObjects.Image,
		baseScaleX: number,
		baseScaleY: number,
		baseY: number,
		delay = 0,
	): Phaser.Tweens.Tween {
		// Reset sprite to baseline before spinning up the new tween — keeps
		// post-VFX restart visually seamless. Defensive calls so partial
		// test fakes (no setScale/setY) keep working.
		if (typeof sprite.setScale === 'function') {
			sprite.setScale(baseScaleX, baseScaleY);
		} else {
			sprite.scaleX = baseScaleX;
			sprite.scaleY = baseScaleY;
		}
		if (typeof sprite.setY === 'function') {
			sprite.setY(baseY);
		} else {
			sprite.y = baseY;
		}
		return this.scene.tweens.add({
			targets: sprite,
			scaleX: { from: baseScaleX, to: baseScaleX * 1.03 },
			scaleY: { from: baseScaleY, to: baseScaleY * 1.03 },
			y: { from: baseY, to: baseY - 1 },
			duration: 1800,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.InOut',
			delay,
		});
	}

	private spawnPlaceholderAura(
		towerDefId: string,
		base: Phaser.GameObjects.Graphics,
		worldPos: Position,
	): void {
		const auraColor =
			towerDefId === 'hybrid_ab'
				? 0xffcc33 // gold
				: towerDefId === 'hybrid_cd'
					? 0x9966ff // purple
					: towerDefId === 'ultimate'
						? 0xffffff // rainbow → neutral white pulse for now
						: null;
		if (auraColor === null) return;

		const ringRadius = this.gridManager.orthoTile * 0.55;
		base.lineStyle(2, auraColor, 0.65);
		base.strokeCircle(worldPos.x, worldPos.y + 4, ringRadius);
		base.fillStyle(auraColor, 0.12);
		base.fillCircle(worldPos.x, worldPos.y + 4, ringRadius);

		// Tween a temporary overlay to convey "aura" pulse without spawning a
		// long-lived particle emitter. Tween manager handles cleanup when the
		// scene shuts down.
		const overlay = this.scene.add.graphics();
		overlay.lineStyle(3, auraColor, 0.55);
		overlay.strokeCircle(worldPos.x, worldPos.y + 4, ringRadius);
		overlay.setDepth(this.gridManager.getDepth(worldPos.x, worldPos.y) - 1);
		this.scene.tweens.add({
			targets: overlay,
			alpha: { from: 0.85, to: 0.2 },
			duration: 1200,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.InOut',
		});
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
		// Phase 1 redesign uses `splash_<radius>` (e.g. `splash_1.5`) and
		// hybrid keys can include `splash_<radius>_slow_..._stun_...`. Match
		// the `splash` token anywhere in the special string so siege towers
		// (nova_cannon/fortress/earth_golem/celestial) keep the rock-arc
		// projectile VFX they had pre-Phase-1.
		if (!special) return false;
		return special === 'splash' || special.startsWith('splash_');
	}

	private isStunSpecial(special?: string): boolean {
		return special?.startsWith('stun') ?? false;
	}

	private isSlowSpecial(special?: string): boolean {
		return special?.startsWith('slow_') ?? false;
	}

	/**
	 * Phase 2.0: single injection point for AttackContext construction. Every
	 * new-strategy tower routes through here so Phase 2.1+ migrations don't
	 * each hand-roll the plumbing (damage events buffer, vfx controller,
	 * grid/time/delta).
	 *
	 * `effectiveDamage` is deliberately the pre-element, pre-modifier value
	 * stored on the tower instance — Phase 2.1 will refine when the first
	 * real tower migrates and reveals what it needs (element mult, dmg_up,
	 * crit_dmg, family mult, globalAtkPct). Keeping it raw here avoids
	 * prematurely committing to a shape the first migration might want to
	 * change. `primaryTarget` is null; `BaseTower.update()` rebinds it after
	 * targeting.
	 */
	private buildAttackContext(
		tower: TowerInstance,
		time: number,
		delta: number,
		unitPositions: readonly UnitSnapshot[],
	): AttackContext {
		const { def } = tower;
		// Phase 2.1: closure replicates the legacy damage math at
		// TowerSystem.ts:688-710 for a single target. Behaviors call
		// `ctx.resolveDamage(target)` right before pushing a DamageEvent so
		// the buffer always carries the fully-multiplied value.
		const resolveDamage = (target: UnitSnapshot): number => {
			const elementMult = getElementMultiplier(def.element, target.element);
			const dmgMod = this.modifierFn ? this.modifierFn('dmg_up') : 1;
			const critBonus = this.modifierFn ? this.modifierFn('crit_dmg') : 0;
			const familyMod = this.familyDamageFn
				? this.familyDamageFn(def.family, def.id)
				: 1;
			return Math.round(
				this.resolveFinalDamage(
					tower.effectiveDamage *
						elementMult *
						dmgMod *
						familyMod *
						(1 + critBonus),
				),
			);
		};
		// Phase 2.4: splash damage formula deliberately skips familyMod —
		// matches legacy TowerSystem.ts:712-720 which omits family multiplier
		// from splash damage (main damage at :607-614 has it). Half-damage
		// factor (0.5) is baked in.
		const resolveSplashDamage = (target: UnitSnapshot): number => {
			const elementMult = getElementMultiplier(def.element, target.element);
			const dmgMod = this.modifierFn ? this.modifierFn('dmg_up') : 1;
			const critBonus = this.modifierFn ? this.modifierFn('crit_dmg') : 0;
			return Math.round(
				this.resolveFinalDamage(
					tower.effectiveDamage *
						elementMult *
						0.5 *
						dmgMod *
						(1 + critBonus),
				),
			);
		};
		return {
			time,
			delta,
			units: unitPositions,
			gridManager: this.gridManager,
			effectiveDamage: tower.effectiveDamage,
			primaryTarget: null,
			pushDamage: this.pushDamage,
			vfx: this.towerVfxController,
			resolveDamage,
			resolveSplashDamage,
		};
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
			if (tower.def.id !== 'nova_cannon' || !tower.barrelSprite) continue;
			// Phase 2.4: NovaCannonT1 handles barrel rotation in its own
			// update(). Skip here to avoid double-rotation for registered
			// nova_cannon instances.
			if (this.newTowerInstances.has(tower.data.instanceId)) continue;
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

		// Update disabled tint for all towers
		for (const tower of this.towers.values()) {
			const isDisabled =
				tower.disabledUntilMs !== undefined && time < tower.disabledUntilMs;
			if (isDisabled && tower.sprite.tintTopLeft !== 0x666666) {
				tower.sprite.setTint(0x666666);
			} else if (!isDisabled && tower.sprite.tintTopLeft === 0x666666) {
				tower.sprite.clearTint();
			}
		}

		for (const tower of this.towers.values()) {
			const { def, data } = tower;

			// Phase 2.0: new-strategy dispatch. A registered behavior owns the
			// entire lifecycle for this tower (active + passive), so we hand
			// off and skip both legacy loops. Registry is empty at runtime
			// today — this is a no-op branch until Phase 2.1 migrations land.
			const behavior = this.newTowerInstances.get(data.instanceId);
			if (behavior) {
				behavior.update(
					this.buildAttackContext(
						tower,
						time,
						delta,
						unitPositions as readonly UnitSnapshot[],
					),
				);
				continue;
			}

			if (def.stats.attackSpeed <= 0) continue;

			if (tower.disabledUntilMs !== undefined && time < tower.disabledUntilMs) {
				continue; // tower is disabled by an enemy ranged attack
			}

			// Phase 4 redesign: spd_up / range_up cards were removed. Attack
			// interval and range use the base def directly.
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
				// Phase 4 [F15]: dmg_up (multiply) + crit_dmg (add). No crit
				// system yet — crit_dmg contributes as a flat damage boost on
				// every hit. TODO(phase-12): migrate to a proper
				// crit-chance+mult system that uses `crit_dmg` as the crit
				// multiplier term only.
				const dmgMod = this.modifierFn ? this.modifierFn('dmg_up') : 1;
				const critBonus = this.modifierFn ? this.modifierFn('crit_dmg') : 0;
				const familyMod = this.familyDamageFn
					? this.familyDamageFn(def.family, def.id)
					: 1;
				const baseDamage = Math.round(
					this.resolveFinalDamage(
						tower.effectiveDamage *
							elementMult *
							dmgMod *
							familyMod *
							(1 + critBonus),
					),
				);
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
							const splashDamage = Math.round(
								this.resolveFinalDamage(
									tower.effectiveDamage *
										splashElementMult *
										0.5 *
										dmgMod *
										(1 + critBonus),
								),
							);
							pendingBatch.push({
								unitId: unit.instanceId,
								damage: splashDamage,
								slow: splashSlow,
							});
						}
					}
				}

				const color = TowerSystem.parseHexColor(def.color);
				// Phase 2.1: `archer` was removed from this selector — handled by
				// ArcherFamilyTower via the new-strategy registry.
				// Phase 2.3: `twin_archer` was removed — handled by
				// StunFamilyTower (MultiShotArrowEmitter). The `'arrow'` branch
				// below is unreachable from any live legacy tower; Phase 2.Final
				// will delete the dead branch along with the arrow pool. The
				// `: 'beam' | 'arc' | 'arrow'` annotation prevents TS from
				// narrowing away the dead branch's `style === 'arrow'` checks.
				// Phase 2.4: earth_golem's explicit id branch removed — its
				// `splash_1.8` special already triggers `hasSplash(special)`.
				const style = (
					this.hasSplash(special) ? 'arc' : 'beam'
				) as 'beam' | 'arc' | 'arrow';
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
				const fireLift = this.gridManager.orthoTile * PLATFORM_LIFT;
				const fireOriginX =
					def.id === 'nova_cannon' && tower.barrelSprite
						? tower.barrelSprite.x + Math.cos(tower.barrelSprite.rotation) * 10
						: towerWorld.x;
				const fireOriginY =
					def.id === 'nova_cannon' && tower.barrelSprite
						? tower.barrelSprite.y + Math.sin(tower.barrelSprite.rotation) * 10
						: towerWorld.y - fireLift;

				// Twin archer: fire 2 arrows, each with half damage
				const shotCount = def.id === 'twin_archer' ? 2 : 1;
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
						towerType: def.id,
						arrowIndex: shotArrowIndex,
						targetUnitId: hasProjectile ? closestUnit.instanceId : undefined,
						impactPending: hasProjectile,
						pendingDamage: hasProjectile ? shotBatch : undefined,
						impactVfxKey: hasProjectile ? impactVfxKey : undefined,
					});
				}
				if (def.id === 'nova_cannon') {
					// Use the same hit-flash asset at barrel tip
					this.spawnImpactVfx('projectile-hit-flash', fireOriginX, fireOriginY);
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

				const lastSound = this.lastSoundTime.get(def.id) ?? 0;
				if (time - lastSound >= TowerSystem.SOUND_THROTTLE_MS) {
					soundGenerator.playTowerAttack(def.id);
					this.lastSoundTime.set(def.id, time);
				}
			}
		}

		// Passive CC aura (attackSpeed=0 towers)
		for (const tower of this.towers.values()) {
			const { def, data } = tower;
			// Phase 2.0: skip passive loop for towers owned by the new
			// strategy system — the registered behavior already ran above.
			if (this.newTowerInstances.has(data.instanceId)) continue;
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

			// Phase 4 redesign: range_up card was removed.
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
		// Phase 1: grade-aware fire spritesheet was removed alongside the
		// grade system. Fire VFX uses the base id — Phase 11 will revisit
		// tier-specific variants.
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

		const lift = this.gridManager.orthoTile * PLATFORM_LIFT;
		const effect = this.scene.add.sprite(
			towerWorld.x,
			towerWorld.y - lift - 20,
			textureKey,
		);
		// Fire spritesheets are authored in 64×80 source-frame coords (see
		// drawFireFrame in generate-towers.ts), but we display at the current
		// tower render size (48×60) so the animation sits exactly on top of
		// the tower sprite instead of overflowing.
		effect.setDisplaySize(48, 60);
		effect.setDepth(this.gridManager.getDepth(gridPos.x, gridPos.y) + 5);
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
		// Phase 2.0: tear down new-strategy behavior if one was attached.
		const soldBehavior = this.newTowerInstances.get(targetKey);
		if (soldBehavior) {
			soldBehavior.destroy();
			this.newTowerInstances.delete(targetKey);
		}
		this.towers.delete(targetKey);
		this.gridManager.removeTower(gridX, gridY);
		this.pathfinding.invalidateCache();

		const refund = TowerSystem.calcRefund(targetInstance.def.cost);
		return { success: true, refund };
	}

	static calcRefund(cost: number): number {
		return Math.floor(cost * 0.5);
	}

	moveTower(fromX: number, fromY: number, toX: number, toY: number): boolean {
		if (!this.gridManager.canPlaceTower(toX, toY)) return false;
		const entry = this.findTowerEntry(fromX, fromY);
		if (!entry) return false;
		const { instance } = entry;

		this.gridManager.removeTower(fromX, fromY);
		this.gridManager.placeTower(toX, toY, instance.def.id);

		instance.data.position = { x: toX, y: toY };
		const worldPos = this.gridManager.gridToWorld(toX, toY);
		const moveLift = this.gridManager.orthoTile * PLATFORM_LIFT;
		// Base/barrel sit at platform height; sprite has an extra 20px lift
		// that matches placement (sprite.setY(worldPos.y - lift - 20)). Without
		// this offset the sprite snaps down by 20px post-move while fire VFX
		// still draws at the -20 baseline, producing a visual "bob" on attack.
		const baseLiftedY = worldPos.y - moveLift;
		const spriteLiftedY = baseLiftedY - 20;
		instance.sprite.setPosition(worldPos.x, spriteLiftedY);
		instance.base.setPosition(worldPos.x, baseLiftedY);
		if (instance.barrelSprite) {
			instance.barrelSprite.setPosition(worldPos.x, spriteLiftedY);
		}
		this.renderTowerBase(
			instance.base,
			{ x: worldPos.x, y: baseLiftedY },
			instance.def,
		);

		// Recreate idle tween at new position (old tween remembers old y)
		instance.idleTween?.stop();
		instance.idleTween?.remove();
		const baseScaleX = instance.sprite.scaleX;
		const baseScaleY = instance.sprite.scaleY;
		instance.baseScaleX = baseScaleX;
		instance.baseScaleY = baseScaleY;
		instance.baseY = spriteLiftedY;
		instance.idleTween = this.createIdleTween(
			instance.sprite,
			baseScaleX,
			baseScaleY,
			spriteLiftedY,
		);

		this.pathfinding.invalidateCache();
		return true;
	}

	getTowerAt(
		gridX: number,
		gridY: number,
	): { data: PlacedTower; def: TowerDef; tier: number } | null {
		const entry = this.findTowerEntry(gridX, gridY);
		return entry
			? {
					data: entry.instance.data,
					def: entry.instance.def,
					tier: entry.instance.tier,
				}
			: null;
	}

	getTowers(): PlacedTower[] {
		return Array.from(this.towers.values()).map((t) => t.data);
	}

	/**
	 * Returns a merge-friendly locator for the tower at (col,row), or null if
	 * the tile is empty. Shape matches `MergeSystem.TowerLocator`
	 * (family+tier+instanceId) so the Phase A orchestrator can feed the value
	 * directly into `MergeSystem.tryMerge`. `x`/`y` carry the grid position
	 * of the tower so the caller can re-spawn at the same tile after a merge.
	 */
	getTowerLocator(col: number, row: number): TowerLocator | null {
		const entry = this.findTowerEntry(col, row);
		if (!entry) return null;
		return {
			instanceId: entry.instance.data.instanceId,
			towerId: entry.instance.def.id as TowerLocator['towerId'],
			family: entry.instance.def.family,
			tier: entry.instance.tier,
			x: col,
			y: row,
		};
	}

	/**
	 * Remove a tower at (col,row) without refund — used by the merge flow so
	 * consumed towers disappear before the result tower is spawned. Returns
	 * true if a tower was removed.
	 */
	removeTowerAt(col: number, row: number): boolean {
		const entry = this.findTowerEntry(col, row);
		if (!entry) return false;
		const { key, instance } = entry;
		instance.idleTween?.stop();
		instance.idleTween?.remove();
		instance.barrelSprite?.destroy();
		instance.base.destroy();
		instance.sprite.destroy();
		// Phase 2.0: tear down new-strategy behavior if one was attached.
		const removedBehavior = this.newTowerInstances.get(key);
		if (removedBehavior) {
			removedBehavior.destroy();
			this.newTowerInstances.delete(key);
		}
		this.towers.delete(key);
		this.gridManager.removeTower(col, row);
		this.pathfinding.invalidateCache();
		return true;
	}

	/**
	 * Phase A: pop-in scale punch on a freshly summoned tower. Kills the
	 * continuous idle tween for the punch, then restarts it on `onComplete`
	 * so the tower keeps breathing afterwards (bug: previously the idle
	 * tween never returned → towers went stiff after every summon).
	 */
	playPhaseASummonVfx(col: number, row: number): void {
		const entry = this.findTowerEntry(col, row);
		if (!entry) return;
		const instance = entry.instance;
		const sprite = instance.sprite;
		this.scene.tweens.killTweensOf(sprite);
		instance.idleTween = undefined;
		const { baseScaleX, baseScaleY, baseY } = instance;
		this.scene.tweens.add({
			targets: sprite,
			scaleX: baseScaleX * 1.3,
			scaleY: baseScaleY * 1.3,
			duration: 110,
			yoyo: true,
			ease: 'Cubic.Out',
			onComplete: () => {
				if (!sprite.active) return;
				instance.idleTween = this.createIdleTween(
					sprite,
					baseScaleX,
					baseScaleY,
					baseY,
				);
			},
		});
	}

	/**
	 * Phase A: stronger scale punch + gold tint flash on the kept tower after
	 * a successful merge. Tint is cleared via a follow-up tween that targets
	 * a counter and applies clearTint in onComplete, so cleanup is bound to
	 * the scene's tween manager (no orphan setTimeout / setInterval). Restarts
	 * the idle breathing tween after the punch so the tower doesn't go stiff.
	 */
	playPhaseAMergeVfx(col: number, row: number): void {
		const entry = this.findTowerEntry(col, row);
		if (!entry) return;
		const instance = entry.instance;
		const sprite = instance.sprite;
		this.scene.tweens.killTweensOf(sprite);
		instance.idleTween = undefined;
		const { baseScaleX, baseScaleY, baseY } = instance;
		this.scene.tweens.add({
			targets: sprite,
			scaleX: baseScaleX * 1.5,
			scaleY: baseScaleY * 1.5,
			duration: 140,
			yoyo: true,
			ease: 'Cubic.Out',
			onComplete: () => {
				if (!sprite.active) return;
				instance.idleTween = this.createIdleTween(
					sprite,
					baseScaleX,
					baseScaleY,
					baseY,
				);
			},
		});
		if (typeof sprite.setTint === 'function') {
			sprite.setTint(0xffd966);
			this.scene.tweens.add({
				targets: { _t: 0 },
				_t: 1,
				duration: 360,
				ease: 'Cubic.Out',
				onComplete: () => {
					if (typeof sprite.clearTint === 'function') sprite.clearTint();
				},
			});
		}
	}

	/**
	 * Phase 11 Task 11.2 — tier5/tier6 merge reveal punch. Adds a camera flash,
	 * a `Back.easeOut` scale-in tween on the new tower sprite, and a quick burst
	 * of expanding ring graphics (used in lieu of a particle emitter until
	 * `gacha-reveal-*` is wired as a particle texture in phase-12).
	 *
	 * Tracked separately from the smaller `playPhaseAMergeVfx` (which already
	 * handles the per-merge gold-tint flash for every tier). Defensive about
	 * scene API surface so unit tests with stub scenes don't have to mock the
	 * camera manager.
	 */
	playMergeRevealVfx(col: number, row: number, toTier: number): void {
		if (toTier < 5) return;
		const entry = this.findTowerEntry(col, row);
		if (!entry) return;
		const sprite = entry.instance.sprite;

		// 1. Camera flash — short, white, no callback fns required.
		const camera = this.scene.cameras?.main;
		if (camera && typeof camera.flash === 'function') {
			camera.flash(300, 255, 255, 255, false);
		}

		// 2. Scale punch on the new tower sprite (0.8 → 1.0 with Back.easeOut).
		const baseScaleX = sprite.scaleX || 1;
		const baseScaleY = sprite.scaleY || 1;
		this.scene.tweens.add({
			targets: sprite,
			scaleX: { from: baseScaleX * 0.8, to: baseScaleX },
			scaleY: { from: baseScaleY * 0.8, to: baseScaleY },
			duration: 400,
			ease: 'Back.easeOut',
		});

		// 3. Particle stand-in: expanding ring of graphics. Tier 6 uses two
		// concentric rings (gold + white) for stronger emphasis.
		const ringColor = toTier >= 6 ? 0xffe870 : 0xffd966;
		const worldPos = this.gridManager.gridToWorld(col, row);
		const ring = this.scene.add.graphics();
		ring.lineStyle(3, ringColor, 0.85);
		ring.strokeCircle(worldPos.x, worldPos.y, this.gridManager.orthoTile * 0.4);
		ring.setDepth(this.gridManager.getDepth(col, row) + 2);
		this.scene.tweens.add({
			targets: ring,
			scaleX: { from: 0.6, to: 2.4 },
			scaleY: { from: 0.6, to: 2.4 },
			alpha: { from: 0.85, to: 0 },
			duration: 600,
			ease: 'Cubic.Out',
			onComplete: () => ring.destroy(),
		});
		if (toTier >= 6) {
			const innerRing = this.scene.add.graphics();
			innerRing.lineStyle(2, 0xffffff, 0.9);
			innerRing.strokeCircle(
				worldPos.x,
				worldPos.y,
				this.gridManager.orthoTile * 0.25,
			);
			innerRing.setDepth(this.gridManager.getDepth(col, row) + 3);
			this.scene.tweens.add({
				targets: innerRing,
				scaleX: { from: 0.4, to: 3.0 },
				scaleY: { from: 0.4, to: 3.0 },
				alpha: { from: 1, to: 0 },
				duration: 700,
				ease: 'Cubic.Out',
				onComplete: () => innerRing.destroy(),
			});
		}
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
			tower.idleTween?.stop();
			tower.idleTween?.remove();
			tower.barrelSprite?.destroy();
			tower.base.destroy();
			tower.sprite.destroy();
		}
		// Phase 2.0: tear down new-strategy behaviors before clearing the map
		// so each tower's destroy() hook runs. No-op today (registry empty).
		for (const behavior of this.newTowerInstances.values()) {
			behavior.destroy();
		}
		this.newTowerInstances.clear();
		this.towerVfxController.destroy();
		this.towers.clear();
		this.attackGraphics?.destroy();
		this.attackLines.length = 0;
		for (const arrow of this.arrowPool) arrow.destroy();
		this.arrowPool.length = 0;
	}
}
