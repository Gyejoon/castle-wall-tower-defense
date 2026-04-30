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
	getEffectiveStats,
	getElementMultiplier,
	TILE_SIZE,
} from '@gld/shared';
import type Phaser from 'phaser';
import { soundGenerator } from '../audio/SoundGenerator';
import { PLATFORM_LIFT } from '../fieldAssets';
import {
	type AttackContext,
	createTower,
	type DamageEvent,
	hasTowerFactory,
	type TowerBehavior,
	TowerVfxController,
	type UnitSnapshot,
} from '../towers';
import { getTowerDisplayMetrics } from '../towers/displayMetrics';
import { parseHexColor } from '../towers/vfx/colors';
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
	disabledUntilMs?: number;
}

export type TowerPlacementResult =
	| { success: true; tower: PlacedTower }
	| { success: false; reason: PlacementFailureReason };

/**
 * Phase 9: run-agnostic global modifiers applied on top of the per-run
 * roguelike upgrade stack. `atkPct` is fed in from the web-shell
 * `metaProgressStore` at Game.create() via the scene registry (see
 * 정식 모드 meta wiring in PhaserGame.tsx / Game.ts). Kept minimal for
 * now — future modifiers (rangePct, critChance, etc.) will extend this.
 */
export interface GlobalModifiers {
	atkPct: number;
}

/**
 * Phase 1: grade is gone — texture is identified purely by tower id. We keep
 * the helper so call sites don't scatter template literals. The fallback map
 * remains only as a defensive path for older caches or failed hybrid asset
 * loads; current art ships dedicated hybrid/ultimate textures.
 */
const PLACEHOLDER_TEXTURE_FALLBACK: Record<string, string> = {
	hybrid_ab: 'tower-arcane_spire',
	hybrid_cd: 'tower-world_tree',
	ultimate: 'tower-divine_throne',
};

const warnedMissingTextures = new Set<string>();

function getTowerVisualLift(gridManager: GridManager): number {
	return gridManager.hasPlacementAnchors()
		? 0
		: gridManager.orthoTile * PLATFORM_LIFT;
}

export function resolveTowerTextureKey(defId: string): string {
	return `tower-${defId}`;
}

/**
 * Resolve the runtime texture key for a tower id, falling back to a known-good
 * ancestor texture when the manifest entry is missing or its texture failed to
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
				`[TowerSystem] missing texture "${primary}", using fallback "${fallback}"`,
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
	private readonly towerVfxController: TowerVfxController;
	private readonly newTowerInstances: Map<string, TowerBehavior> = new Map();
	// 매 프레임 재할당 방지를 위해 construction 시점에 바인딩.
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

	// pool 고갈/텍스처 미로딩 시 undefined 반환 → 호출자는 Graphics로 fallback.
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
	 *  `CoreOrchestrator.getFamilyDamageMultiplier` so energy-purchased
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
			arrow.setDisplaySize(TILE_SIZE / 2, TILE_SIZE / 8);
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
		const lift = getTowerVisualLift(this.gridManager);
		const sprite = this.scene.add.image(
			worldPos.x,
			worldPos.y - lift,
			textureKey,
		);
		const towerDisplay = getTowerDisplayMetrics(this.gridManager.orthoTile);
		sprite.setDisplaySize(towerDisplay.width, towerDisplay.height);
		sprite.setY(worldPos.y - lift - towerDisplay.yOffset);
		sprite.setDepth(this.gridManager.getDepth(gridX, gridY) + 5);
		const liftedPos = { x: worldPos.x, y: worldPos.y - lift };
		this.renderTowerBase(base, liftedPos, def);

		const baseScaleX = sprite.scaleX;
		const baseScaleY = sprite.scaleY;
		const baseY = sprite.y;

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
			barrelSprite.setDisplaySize(
				towerDisplay.width / 3,
				towerDisplay.height / 8,
			);
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
			idleTween: undefined,
			baseScaleX,
			baseScaleY,
			baseY,
		});

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

		// Tier-5/6 merge results keep an aura even though dedicated sprites now
		// ship, so the merge payoff stays obvious in dense combat.
		this.spawnPlaceholderAura(towerDefId, base, liftedPos);

		return { success: true, tower: towerData };
	}

	private resetTowerSprite(
		sprite: Phaser.GameObjects.Image,
		baseScaleX: number,
		baseScaleY: number,
		baseY: number,
	): void {
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

	private renderTowerBase(
		graphics: Phaser.GameObjects.Graphics,
		pos: Position,
		def: TowerDef,
	): void {
		const color = parseHexColor(def.color);
		graphics.clear();

		if (!this.gridManager.hasPlacementAnchors()) {
			const baseSize = this.gridManager.orthoTile * 0.45;
			graphics.fillStyle(0x0a0a14, 0.8);
			graphics.fillCircle(pos.x, pos.y + 4, baseSize / 2);
			graphics.lineStyle(1, color, 0.3);
			graphics.strokeCircle(pos.x, pos.y + 4, baseSize / 2);

			graphics.fillStyle(color, 0.08);
			graphics.fillCircle(pos.x, pos.y + 4, this.gridManager.orthoTile * 0.3);
		}

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

	// effectiveDamage는 element·modifier 미적용 원시값. resolve* 클로저가 최종값 계산.
	// primaryTarget은 BaseTower.update()가 targeting 후 재바인딩한다.
	private buildAttackContext(
		tower: TowerInstance,
		time: number,
		delta: number,
		unitPositions: readonly UnitSnapshot[],
	): AttackContext {
		const { def } = tower;
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
		// Splash는 의도적으로 familyMod 미적용. 0.5 half-damage factor 포함.
		const resolveSplashDamage = (target: UnitSnapshot): number => {
			const elementMult = getElementMultiplier(def.element, target.element);
			const dmgMod = this.modifierFn ? this.modifierFn('dmg_up') : 1;
			const critBonus = this.modifierFn ? this.modifierFn('crit_dmg') : 0;
			return Math.round(
				this.resolveFinalDamage(
					tower.effectiveDamage * elementMult * 0.5 * dmgMod * (1 + critBonus),
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

		// registry 미등록 defId는 silent no-op (크래시 대신).
		for (const tower of this.towers.values()) {
			const behavior = this.newTowerInstances.get(tower.data.instanceId);
			if (!behavior) continue;
			behavior.update(
				this.buildAttackContext(
					tower,
					time,
					delta,
					unitPositions as readonly UnitSnapshot[],
				),
			);
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
					this.towerVfxController.spawnImpactVfx(
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
		const moveLift = getTowerVisualLift(this.gridManager);
		const towerDisplay = getTowerDisplayMetrics(this.gridManager.orthoTile);
		const baseLiftedY = worldPos.y - moveLift;
		const spriteLiftedY = baseLiftedY - towerDisplay.yOffset;
		instance.sprite.setPosition(worldPos.x, spriteLiftedY);
		if (instance.barrelSprite) {
			instance.barrelSprite.setPosition(worldPos.x, spriteLiftedY);
		}
		this.renderTowerBase(
			instance.base,
			{ x: worldPos.x, y: baseLiftedY },
			instance.def,
		);

		instance.idleTween?.stop();
		instance.idleTween?.remove();
		const baseScaleX = instance.sprite.scaleX;
		const baseScaleY = instance.sprite.scaleY;
		instance.baseScaleX = baseScaleX;
		instance.baseScaleY = baseScaleY;
		instance.baseY = spriteLiftedY;
		instance.idleTween = undefined;

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
	 * (family+tier+instanceId) so the core orchestrator can feed the value
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
	 * Pop-in scale punch on a freshly summoned tower. The tower returns to its
	 * fixed base pose afterwards; combat motion is handled by fire/VFX sprites.
	 */
	playSummonVfx(col: number, row: number): void {
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
				this.resetTowerSprite(sprite, baseScaleX, baseScaleY, baseY);
				instance.idleTween = undefined;
			},
		});
	}

	/**
	 * Stronger scale punch + gold tint flash on the kept tower after
	 * a successful merge. Tint is cleared via a follow-up tween that targets
	 * a counter and applies clearTint in onComplete, so cleanup is bound to
	 * the scene's tween manager (no orphan setTimeout / setInterval).
	 */
	playMergeVfx(col: number, row: number): void {
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
				this.resetTowerSprite(sprite, baseScaleX, baseScaleY, baseY);
				instance.idleTween = undefined;
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
	 * Tracked separately from the smaller `playMergeVfx` (which already
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
