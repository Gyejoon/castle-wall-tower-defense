import Phaser from 'phaser';
import { getOptionalAnimationKey } from '../../assets/assetManifest';
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
		_towerDefId: string,
		_towerWorld: { x: number; y: number },
		_gridPos: { x: number; y: number },
		_towerSprite: Phaser.GameObjects.Image,
	): void {
		// Full-body `tower-*-fire` sheets move vertically between frames.
		// Keep the base tower fixed and let projectile / impact VFX carry the attack.
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
