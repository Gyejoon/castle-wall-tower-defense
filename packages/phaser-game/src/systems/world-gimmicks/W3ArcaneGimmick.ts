import type { StarRating } from '@gld/shared';
import type { TowerInstance } from '../TowerSystem';
import { registerGimmickFactory } from './registry';
import type { GimmickContext, WorldGimmick } from './types';

type Position = { x: number; y: number };

interface StarConfig {
	waveInterval: number;
	areaSize: number; // 2 = 2×2, 3 = 3×3
	stunMs: number;
	maxCircles: number;
	damageBonus: number;
}

const STAR_CONFIG: Record<StarRating, StarConfig> = {
	1: {
		waveInterval: 3,
		areaSize: 2,
		stunMs: 3000,
		maxCircles: 999,
		damageBonus: 0.15,
	},
	2: {
		waveInterval: 2,
		areaSize: 2,
		stunMs: 3000,
		maxCircles: 999,
		damageBonus: 0.15,
	},
	3: {
		waveInterval: 2,
		areaSize: 3,
		stunMs: 3000,
		maxCircles: 1,
		damageBonus: 0.15,
	},
};

export class W3ArcaneGimmick implements WorldGimmick {
	readonly id = 'w3_arcane';
	private cfg!: StarConfig;
	private waveCount = 0;
	public burstCount = 0;
	public activeArcaneCircles: Position[] = [];

	constructor(private readonly ctx: GimmickContext) {}

	init(): void {
		this.cfg = STAR_CONFIG[this.ctx.star];
		const all = this.ctx.map.gimmickTiles?.arcaneCircleTiles ?? [];
		this.activeArcaneCircles = all.slice(0, this.cfg.maxCircles);
	}

	onBattleStart(): void {
		this.waveCount = 0;
		this.burstCount = 0;
	}

	onWaveStart(_waveIndex: number): void {
		this.waveCount++;
		if (this.waveCount % this.cfg.waveInterval === 0) {
			this.triggerBurst();
		}
	}

	onTick(_deltaMs: number): void {}

	onTowerPlaced(_tower: TowerInstance): void {}

	isTowerActive(_tower: TowerInstance): boolean {
		return true; // stun is applied via TowerInstance.disabledUntilMs directly
	}

	canPlaceTowerAt(_pos: Position): boolean {
		return true; // arcane circles encourage placement, never block it
	}

	destroy(): void {
		this.activeArcaneCircles = [];
	}

	isTowerOnArcaneCircle(tower: TowerInstance): boolean {
		const pos = tower.data.position;
		return this.activeArcaneCircles.some((c) => c.x === pos.x && c.y === pos.y);
	}

	getCircleDamageBonus(): number {
		return this.cfg.damageBonus;
	}

	private triggerBurst(): void {
		this.burstCount++;
		const map = this.ctx.map;
		const half = Math.floor(this.cfg.areaSize / 2);

		// Random center within map bounds (leave margin for area)
		const cx =
			half + Math.floor(Math.random() * (map.width - this.cfg.areaSize));
		const cy =
			half + Math.floor(Math.random() * (map.height - this.cfg.areaSize));

		const now = this.ctx.getSceneTimeMs();
		const stunUntil = now + this.cfg.stunMs;

		for (const tower of this.ctx.getTowers()) {
			const dx = Math.abs(tower.data.position.x - cx);
			const dy = Math.abs(tower.data.position.y - cy);
			if (dx <= half && dy <= half) {
				// Towers on arcane circles are immune
				if (this.isTowerOnArcaneCircle(tower)) continue;
				tower.disabledUntilMs = Math.max(tower.disabledUntilMs ?? 0, stunUntil);
			}
		}

		this.ctx.eventBus.emit?.('arcane_burst' as any, {
			center: { x: cx, y: cy },
			areaSize: this.cfg.areaSize,
		});
	}
}

registerGimmickFactory('w3_tower', (ctx) => new W3ArcaneGimmick(ctx));
