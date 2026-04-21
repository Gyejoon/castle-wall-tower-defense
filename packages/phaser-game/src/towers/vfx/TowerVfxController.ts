import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../../assets/assetManifest';
import { PLATFORM_LIFT } from '../../fieldAssets';
import type { GridManager } from '../../systems/GridManager';

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

export interface TowerVfxDeps {
	scene: Phaser.Scene;
	gridManager: GridManager;
	// TowerSystem이 매 프레임 clear/mutate하는 공유 버퍼.
	attackLines: AttackLineEntry[];
	acquireArrow: () => number | undefined;
	playTowerAttack: (defId: string, time: number) => void;
}

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
