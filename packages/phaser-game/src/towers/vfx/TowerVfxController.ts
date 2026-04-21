import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../../assets/assetManifest';
import { PLATFORM_LIFT } from '../../fieldAssets';
import type { GridManager } from '../../systems/GridManager';

/** Attack-line entry shape shared with TowerSystem. Kept identical to the
 *  legacy `attackLines` array element so the render loop in
 *  `TowerSystem.update()` can consume entries pushed from either path. */
export interface AttackLineEntry {
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
}

/** Dependencies injected by TowerSystem. Everything the controller needs
 *  lives on the TowerSystem side (attackLines buffer, arrow pool slot
 *  allocator, sound throttle). Each callback is bound by TowerSystem's
 *  constructor. */
export interface TowerVfxDeps {
	scene: Phaser.Scene;
	gridManager: GridManager;
	/** Shared mutable buffer — TowerSystem clears + mutates each frame. */
	attackLines: AttackLineEntry[];
	/** Reserve an invisible arrow pool slot and return its index, or
	 *  `undefined` if the pool is exhausted (fallback to graphics draw). */
	acquireArrow: () => number | undefined;
	/** Plays the per-tower attack sound respecting the SOUND_THROTTLE_MS
	 *  window. Throttle state lives on TowerSystem. */
	playTowerAttack: (defId: string, time: number) => void;
}

/** Phase 2.Final: single source of truth for tower VFX spawning. Owns
 *  the muzzle/impact spritesheet lookups that every registered tower
 *  behavior calls through `ctx.vfx`. Legacy TowerSystem.spawnMuzzleVfx /
 *  spawnImpactVfx instance methods were deleted in Phase 2.Final now
 *  that the render loop's projectile-impact branch also delegates here. */
export class TowerVfxController {
	constructor(private readonly deps: TowerVfxDeps) {}

	pushAttackLine(line: AttackLineEntry): void {
		this.deps.attackLines.push(line);
	}

	acquireArrow(): number | undefined {
		return this.deps.acquireArrow();
	}

	playTowerAttackThrottled(defId: string, time: number): void {
		this.deps.playTowerAttack(defId, time);
	}

	/** Spawns the animated fire spritesheet on top of a tower, hiding the
	 *  static sprite for the animation's duration. */
	spawnMuzzleVfx(
		towerDefId: string,
		towerWorld: { x: number; y: number },
		gridPos: { x: number; y: number },
		towerSprite: Phaser.GameObjects.Image,
	): void {
		const textureKey = `tower-${towerDefId}-fire`;
		const animationKey = getOptionalAnimationKey(textureKey);
		if (
			!this.deps.scene.textures.exists(textureKey) ||
			!this.deps.scene.anims.exists(animationKey)
		) {
			return;
		}

		towerSprite.setVisible(false);

		const lift = this.deps.gridManager.orthoTile * PLATFORM_LIFT;
		const effect = this.deps.scene.add.sprite(
			towerWorld.x,
			towerWorld.y - lift - 20,
			textureKey,
		);
		effect.setDisplaySize(48, 60);
		effect.setDepth(this.deps.gridManager.getDepth(gridPos.x, gridPos.y) + 5);
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

	/** Spawns an instant impact VFX sprite at (x,y). Beam-style towers
	 *  (wind_spire/flame_tower/arcane_spire) call this immediately on
	 *  fire; arrow-style (archer) defers to the render loop's impact
	 *  branch in `TowerSystem.update()`, which also delegates here. */
	spawnImpactVfx(textureKey: string, x: number, y: number): void {
		const animationKey = getOptionalAnimationKey(textureKey);
		if (
			!this.deps.scene.textures.exists(textureKey) ||
			!this.deps.scene.anims.exists(animationKey)
		) {
			return;
		}

		const effect = this.deps.scene.add.sprite(x, y, textureKey);
		const size = textureKey === 'projectile-hit-flash' ? 16 : 32;
		effect.setDisplaySize(size, size);
		effect.setDepth(30);
		effect.play(animationKey);
		effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
			effect.destroy(),
		);
	}

	destroy(): void {}
}
