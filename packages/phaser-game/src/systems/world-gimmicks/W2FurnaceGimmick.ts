import type { StarRating } from '@gld/shared';
import type { TowerInstance } from '../TowerSystem';
import { registerGimmickFactory } from './registry';
import type { GimmickContext, WorldGimmick } from './types';

type Position = { x: number; y: number };

interface CycleConfig {
	offMs: number;
	onMs: number;
	expand: boolean;
}

const CYCLE_BY_STAR: Record<StarRating, CycleConfig> = {
	1: { offMs: 12_000, onMs: 8_000, expand: false },
	2: { offMs: 10_000, onMs: 6_000, expand: false },
	3: { offMs: 10_000, onMs: 6_000, expand: true },
};

export class W2FurnaceGimmick implements WorldGimmick {
	readonly id = 'w2_furnace';
	private furnaceTiles: Position[] = [];
	private cycleStartMs = 0;

	constructor(private readonly ctx: GimmickContext) {}

	init(): void {
		this.furnaceTiles = this.ctx.map.gimmickTiles?.furnaceTiles ?? [];
	}

	onBattleStart(): void {
		this.cycleStartMs = this.ctx.getSceneTimeMs();
	}

	onWaveStart(_waveIndex: number): void {}

	onTick(_deltaMs: number): void {
		// cycle state is computed on demand
	}

	onTowerPlaced(_tower: TowerInstance): void {}

	isTowerActive(tower: TowerInstance): boolean {
		return !this.isFurnaceTileActiveAt(tower.data.position);
	}

	canPlaceTowerAt(pos: Position): boolean {
		return !this.furnaceTiles.some((t) => t.x === pos.x && t.y === pos.y);
	}

	destroy(): void {
		this.furnaceTiles = [];
	}

	/** Public helper for tests + debug overlays. */
	isFurnaceTileActiveAt(pos: Position): boolean {
		const cfg = CYCLE_BY_STAR[this.ctx.star];
		const elapsed = this.ctx.getSceneTimeMs() - this.cycleStartMs;
		if (elapsed < 0) return false;
		const period = cfg.offMs + cfg.onMs;
		const phase = elapsed % period;
		const isOnPhase = phase >= cfg.offMs;
		if (!isOnPhase) return false;

		for (const tile of this.furnaceTiles) {
			if (tile.x === pos.x && tile.y === pos.y) return true;
			if (cfg.expand) {
				const dx = Math.abs(tile.x - pos.x);
				const dy = Math.abs(tile.y - pos.y);
				if (dx + dy === 1) return true; // Manhattan distance 1 = 4-way neighbor
			}
		}
		return false;
	}
}

registerGimmickFactory('w2_forge', (ctx) => new W2FurnaceGimmick(ctx));
