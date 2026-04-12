import { describe, expect, it } from 'vitest';
import type { GimmickContext } from '../types';
import { W2FurnaceGimmick } from '../W2FurnaceGimmick';

function makeCtx(
	star: 1 | 2 | 3,
	furnaceTiles: Array<{ x: number; y: number }> = [{ x: 1, y: 1 }],
): GimmickContext & { _now: { value: number } } {
	const now = { value: 0 };
	return {
		worldId: 'w2_forge',
		map: {
			id: 'w2_forge_a',
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
			gimmickTiles: { furnaceTiles },
			// biome-ignore lint/suspicious/noExplicitAny: test stub
		} as any,
		// biome-ignore lint/suspicious/noExplicitAny: test stub
		star: star as any,
		// biome-ignore lint/suspicious/noExplicitAny: test stub
		eventBus: { emit: () => {}, on: () => {}, off: () => {} } as any,
		getSceneTimeMs: () => now.value,
		getTowers: () => [],
		_now: now,
	};
}

describe('W2FurnaceGimmick', () => {
	it('★1: furnace is OFF initially, ON at 12s, OFF again at 20s', () => {
		const ctx = makeCtx(1);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();

		ctx._now.value = 0;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(false);

		ctx._now.value = 11_000;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(false);

		ctx._now.value = 12_000;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(true);

		ctx._now.value = 19_000;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(true);

		ctx._now.value = 20_000;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(false);
	});

	it('★1: isTowerActive returns false when tower sits on an active furnace tile', () => {
		const ctx = makeCtx(1);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();

		// biome-ignore lint/suspicious/noExplicitAny: test stub
		const tower = { data: { position: { x: 1, y: 1 } } } as any;
		ctx._now.value = 0;
		expect(g.isTowerActive(tower)).toBe(true); // OFF phase — tower is active
		ctx._now.value = 12_000;
		expect(g.isTowerActive(tower)).toBe(false); // ON phase — tower disabled
	});

	it('★1: tower on non-furnace tile is always active', () => {
		const ctx = makeCtx(1);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();

		// biome-ignore lint/suspicious/noExplicitAny: test stub
		const tower = { data: { position: { x: 7, y: 7 } } } as any;
		ctx._now.value = 15_000;
		expect(g.isTowerActive(tower)).toBe(true);
	});

	it('★2: cycle is 10s OFF / 6s ON', () => {
		const ctx = makeCtx(2);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();

		ctx._now.value = 9_999;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(false);
		ctx._now.value = 10_000;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(true);
		ctx._now.value = 15_999;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(true);
		ctx._now.value = 16_000;
		expect(g.isFurnaceTileActiveAt({ x: 1, y: 1 })).toBe(false);
	});

	it('★1: does NOT expand to neighbors during ON phase (expand=false)', () => {
		const ctx = makeCtx(1, [{ x: 3, y: 3 }]);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();

		ctx._now.value = 12_000; // ON (★1 cycle)
		expect(g.isFurnaceTileActiveAt({ x: 3, y: 3 })).toBe(true); // center
		expect(g.isFurnaceTileActiveAt({ x: 2, y: 3 })).toBe(false); // left — no expand
		expect(g.isFurnaceTileActiveAt({ x: 4, y: 3 })).toBe(false); // right
		expect(g.isFurnaceTileActiveAt({ x: 3, y: 2 })).toBe(false); // up
		expect(g.isFurnaceTileActiveAt({ x: 3, y: 4 })).toBe(false); // down
	});

	it('★2: does NOT expand to neighbors during ON phase (expand=false)', () => {
		const ctx = makeCtx(2, [{ x: 3, y: 3 }]);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();

		ctx._now.value = 10_000; // ON (★2 cycle)
		expect(g.isFurnaceTileActiveAt({ x: 3, y: 3 })).toBe(true); // center
		expect(g.isFurnaceTileActiveAt({ x: 2, y: 3 })).toBe(false); // left — no expand
	});

	it('★3: expands to 4 cardinal neighbors during ON phase', () => {
		const ctx = makeCtx(3, [{ x: 3, y: 3 }]);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();

		ctx._now.value = 10_000; // ON (★3 cycle)
		expect(g.isFurnaceTileActiveAt({ x: 3, y: 3 })).toBe(true); // center
		expect(g.isFurnaceTileActiveAt({ x: 2, y: 3 })).toBe(true); // left
		expect(g.isFurnaceTileActiveAt({ x: 4, y: 3 })).toBe(true); // right
		expect(g.isFurnaceTileActiveAt({ x: 3, y: 2 })).toBe(true); // up
		expect(g.isFurnaceTileActiveAt({ x: 3, y: 4 })).toBe(true); // down
		expect(g.isFurnaceTileActiveAt({ x: 2, y: 2 })).toBe(false); // diagonal — not included
	});

	it('★3: during OFF phase, expanded tiles are NOT active', () => {
		const ctx = makeCtx(3, [{ x: 3, y: 3 }]);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		g.onBattleStart();
		ctx._now.value = 0;
		expect(g.isFurnaceTileActiveAt({ x: 2, y: 3 })).toBe(false);
	});

	it('canPlaceTowerAt blocks furnace tiles regardless of phase', () => {
		const ctx = makeCtx(1);
		const g = new W2FurnaceGimmick(ctx);
		g.init();
		expect(g.canPlaceTowerAt({ x: 1, y: 1 })).toBe(false);
		expect(g.canPlaceTowerAt({ x: 5, y: 5 })).toBe(true);
	});
});
