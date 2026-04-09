import { describe, expect, it } from 'vitest';
import type { GimmickContext } from '../types';
import { W3ArcaneGimmick } from '../W3ArcaneGimmick';

function makeCtx(
	star: 1 | 2 | 3,
): GimmickContext & { _now: { value: number } } {
	const now = { value: 0 };
	return {
		worldId: 'w3_tower',
		map: {
			id: 'w3_tower_a',
			name: 'test',
			width: 8,
			height: 18,
			tileSize: 32,
			path: [],
			blockedPlacementPoints: [],
			buildablePoints: [],
			spawnPoint: { x: 0, y: 0 },
			exitPoint: { x: 0, y: 0 },
			tilemapKey: '',
			tilesetKey: '',
			rewardMultiplier: 1,
			difficultyHpMult: 1,
			recommendedPower: 0,
			gimmickTiles: { arcaneCircleTiles: [{ x: 4, y: 4 }] },
		} as any,
		star: star as any,
		eventBus: { emit: () => {}, on: () => {}, off: () => {} } as any,
		getSceneTimeMs: () => now.value,
		getTowers: () => [],
		_now: now,
	};
}

describe('W3ArcaneGimmick', () => {
	it('★1: burst does NOT trigger on waves 1, 2; triggers on wave 3', () => {
		const ctx = makeCtx(1);
		const g = new W3ArcaneGimmick(ctx);
		g.init();
		g.onBattleStart();

		g.onWaveStart(0); // wave 1
		expect(g.burstCount).toBe(0);
		g.onWaveStart(1); // wave 2
		expect(g.burstCount).toBe(0);
		g.onWaveStart(2); // wave 3 → burst!
		expect(g.burstCount).toBe(1);
	});

	it('★2: burst triggers every 2 waves (wave 2, 4, 6...)', () => {
		const ctx = makeCtx(2);
		const g = new W3ArcaneGimmick(ctx);
		g.init();
		g.onBattleStart();

		g.onWaveStart(0);
		expect(g.burstCount).toBe(0);
		g.onWaveStart(1);
		expect(g.burstCount).toBe(1);
		g.onWaveStart(2);
		expect(g.burstCount).toBe(1);
		g.onWaveStart(3);
		expect(g.burstCount).toBe(2);
	});

	it('★3: only 1 arcane circle tile (even if map has more)', () => {
		const ctx = makeCtx(3);
		// override to provide 3 tiles
		(ctx.map.gimmickTiles as any).arcaneCircleTiles = [
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
			{ x: 3, y: 3 },
		];
		const g = new W3ArcaneGimmick(ctx);
		g.init();
		expect(g.activeArcaneCircles.length).toBe(1);
	});

	it('★1: all arcane circles active (up to 999)', () => {
		const ctx = makeCtx(1);
		(ctx.map.gimmickTiles as any).arcaneCircleTiles = [
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
		];
		const g = new W3ArcaneGimmick(ctx);
		g.init();
		expect(g.activeArcaneCircles.length).toBe(2);
	});

	it('canPlaceTowerAt returns true for any position (arcane circles encourage placement)', () => {
		const ctx = makeCtx(1);
		const g = new W3ArcaneGimmick(ctx);
		g.init();
		expect(g.canPlaceTowerAt({ x: 4, y: 4 })).toBe(true);
		expect(g.canPlaceTowerAt({ x: 0, y: 0 })).toBe(true);
	});

	it('isTowerOnArcaneCircle correctly identifies circle towers', () => {
		const ctx = makeCtx(1);
		const g = new W3ArcaneGimmick(ctx);
		g.init();
		const onCircle = { data: { position: { x: 4, y: 4 } } } as any;
		const offCircle = { data: { position: { x: 7, y: 7 } } } as any;
		expect(g.isTowerOnArcaneCircle(onCircle)).toBe(true);
		expect(g.isTowerOnArcaneCircle(offCircle)).toBe(false);
	});

	it('getCircleDamageBonus returns 0.15', () => {
		const ctx = makeCtx(1);
		const g = new W3ArcaneGimmick(ctx);
		g.init();
		expect(g.getCircleDamageBonus()).toBe(0.15);
	});
});
