import type { ActiveUnit } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import { BossContextBuilder } from '../../src/scenes/runtime/BossContextBuilder';

function makeBoss(): ActiveUnit {
	return {
		instanceId: 'boss-1',
		defId: 'dragon',
		position: { x: 42, y: 84 },
		hp: 1000,
		pathIndex: 0,
	} as ActiveUnit;
}

describe('BossContextBuilder', () => {
	it('passes sceneTimeMs from the injected getter', () => {
		const builder = new BossContextBuilder({
			units: { spawnAdditionalUnit: vi.fn() } as never,
			towers: { getAllTowers: vi.fn(() => []), disableTower: vi.fn() } as never,
			getSceneTime: () => 12345,
		});
		const ctx = builder.build(makeBoss());
		expect(ctx.sceneTimeMs).toBe(12345);
		expect(ctx.boss.instanceId).toBe('boss-1');
	});

	it('spawnUnit forwards to units.spawnAdditionalUnit', () => {
		const spawnAdditionalUnit = vi.fn();
		const builder = new BossContextBuilder({
			units: { spawnAdditionalUnit } as never,
			towers: { getAllTowers: vi.fn(() => []), disableTower: vi.fn() } as never,
			getSceneTime: () => 0,
		});
		const ctx = builder.build(makeBoss());
		ctx.spawnUnit('grunt', { x: 1, y: 2 }, { lane: 3 });
		expect(spawnAdditionalUnit).toHaveBeenCalledWith(
			'grunt',
			{ x: 1, y: 2 },
			{ lane: 3 },
		);
	});

	it('disableTower(specific) forwards the id', () => {
		const disableTower = vi.fn();
		const builder = new BossContextBuilder({
			units: { spawnAdditionalUnit: vi.fn() } as never,
			towers: { getAllTowers: vi.fn(() => []), disableTower } as never,
			getSceneTime: () => 0,
		});
		const ctx = builder.build(makeBoss());
		ctx.disableTower('tower-xyz', 5000);
		expect(disableTower).toHaveBeenCalledWith('tower-xyz', 5000);
	});

	it('disableTower(__random__) picks a random live tower, or no-ops on empty', () => {
		const disableTower = vi.fn();
		const builder = new BossContextBuilder({
			units: { spawnAdditionalUnit: vi.fn() } as never,
			towers: {
				getAllTowers: vi.fn(() => [
					{ data: { instanceId: 't-1' } },
					{ data: { instanceId: 't-2' } },
				]),
				disableTower,
			} as never,
			getSceneTime: () => 0,
		});
		const ctx = builder.build(makeBoss());
		ctx.disableTower('__random__', 3000);
		expect(disableTower).toHaveBeenCalledTimes(1);
		const [id, until] = disableTower.mock.calls[0];
		expect(['t-1', 't-2']).toContain(id);
		expect(until).toBe(3000);

		// Empty tower list: no-op.
		disableTower.mockClear();
		const emptyBuilder = new BossContextBuilder({
			units: { spawnAdditionalUnit: vi.fn() } as never,
			towers: { getAllTowers: vi.fn(() => []), disableTower } as never,
			getSceneTime: () => 0,
		});
		emptyBuilder.build(makeBoss()).disableTower('__random__', 1000);
		expect(disableTower).not.toHaveBeenCalled();
	});
});
