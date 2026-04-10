import { describe, expect, it } from 'vitest';
import { createBossBehavior } from '../registry';
import type { BossContext } from '../types';
import '../orcWarlord';
import '../forgeMaster';
import '../corruptedArchmage';

function makeBossCtx(overrides?: Partial<BossContext>): BossContext & {
	spawns: Array<{
		unitId: string;
		pos: { x: number; y: number };
		meta?: Record<string, unknown>;
	}>;
	disables: Array<{ towerId: string; untilMs: number }>;
} {
	const spawns: Array<{
		unitId: string;
		pos: { x: number; y: number };
		meta?: Record<string, unknown>;
	}> = [];
	const disables: Array<{ towerId: string; untilMs: number }> = [];
	return {
		boss: {
			instanceId: 'boss-1',
			defId: 'test',
			position: { x: 5, y: 5 },
			hp: 1000,
			pathIndex: 0,
		},
		// biome-ignore lint/suspicious/noExplicitAny: test stub
		...(undefined as any),
		sceneTimeMs: 0,
		spawnUnit: (unitId, pos, meta) => {
			spawns.push({ unitId, pos, meta });
		},
		disableTower: (towerId, untilMs) => {
			disables.push({ towerId, untilMs });
		},
		spawns,
		disables,
		...overrides,
	};
}

function assertBehavior(
	behavior: ReturnType<typeof createBossBehavior>,
): asserts behavior is NonNullable<typeof behavior> {
	expect(behavior).not.toBeNull();
}

describe('orcWarlord', () => {
	it('does NOT summon at HP > 50%', () => {
		const behavior = createBossBehavior('orc_warlord');
		assertBehavior(behavior);
		const ctx = makeBossCtx();
		behavior.onSpawn(ctx);
		behavior.onDamageTaken(ctx, 0.8);
		expect(ctx.spawns).toHaveLength(0);
	});

	it('summons 4 battle_robot at HP ≤ 50%', () => {
		const behavior = createBossBehavior('orc_warlord');
		assertBehavior(behavior);
		const ctx = makeBossCtx();
		behavior.onSpawn(ctx);
		behavior.onDamageTaken(ctx, 0.5);
		expect(ctx.spawns).toHaveLength(4);
		for (const s of ctx.spawns) {
			expect(s.unitId).toBe('battle_robot');
			expect(s.pos).toEqual({ x: 5, y: 5 });
		}
	});

	it('only summons once (second call at 30% HP does nothing)', () => {
		const behavior = createBossBehavior('orc_warlord');
		assertBehavior(behavior);
		const ctx = makeBossCtx();
		behavior.onSpawn(ctx);
		behavior.onDamageTaken(ctx, 0.5);
		behavior.onDamageTaken(ctx, 0.3);
		expect(ctx.spawns).toHaveLength(4);
	});
});

describe('forgeMaster', () => {
	it('does NOT seal before 10s', () => {
		const behavior = createBossBehavior('forge_master');
		assertBehavior(behavior);
		const spawnCtx = makeBossCtx({ sceneTimeMs: 0 });
		behavior.onSpawn(spawnCtx);
		const tickCtx = makeBossCtx({ sceneTimeMs: 9_999 });
		behavior.onTick(tickCtx, 1);
		expect(tickCtx.disables).toHaveLength(0);
	});

	it('seals with __random__ at 10s', () => {
		const behavior = createBossBehavior('forge_master');
		assertBehavior(behavior);
		const spawnCtx = makeBossCtx({ sceneTimeMs: 0 });
		behavior.onSpawn(spawnCtx);

		const tickCtx = makeBossCtx({ sceneTimeMs: 10_000 });
		// reuse the same disables array by updating sceneTimeMs on tick call
		behavior.onTick(tickCtx, 1);
		expect(tickCtx.disables).toHaveLength(1);
		expect(tickCtx.disables[0].towerId).toBe('__random__');
		expect(tickCtx.disables[0].untilMs).toBe(15_000);
	});

	it('seals again at 20s (interval repeats)', () => {
		const behavior = createBossBehavior('forge_master');
		assertBehavior(behavior);

		// onSpawn at t=0 initialises lastSealMs=0
		behavior.onSpawn(makeBossCtx({ sceneTimeMs: 0 }));

		// first seal at t=10000
		const ctx10 = makeBossCtx({ sceneTimeMs: 10_000 });
		behavior.onTick(ctx10, 1);
		expect(ctx10.disables).toHaveLength(1);

		// second seal at t=20000
		const ctx20 = makeBossCtx({ sceneTimeMs: 20_000 });
		behavior.onTick(ctx20, 1);
		expect(ctx20.disables).toHaveLength(1);
		expect(ctx20.disables[0].towerId).toBe('__random__');
		expect(ctx20.disables[0].untilMs).toBe(25_000);
	});
});

describe('corruptedArchmage', () => {
	it('spawns a clone on onSpawn (isClone=true metadata)', () => {
		const behavior = createBossBehavior('corrupted_archmage');
		assertBehavior(behavior);
		const ctx = makeBossCtx();
		behavior.onSpawn(ctx);
		expect(ctx.spawns).toHaveLength(1);
		expect(ctx.spawns[0].unitId).toBe('corrupted_archmage');
		expect(ctx.spawns[0].pos).toEqual({ x: 6, y: 5 });
		expect(ctx.spawns[0].meta).toEqual({ isClone: true });
	});

	it('does NOT spawn if boss.metadata.isClone is true (no recursion)', () => {
		const behavior = createBossBehavior('corrupted_archmage');
		assertBehavior(behavior);
		const ctx = makeBossCtx({
			boss: {
				instanceId: 'boss-clone',
				defId: 'corrupted_archmage',
				position: { x: 5, y: 5 },
				hp: 1000,
				pathIndex: 0,
				metadata: { isClone: true },
			} as BossContext['boss'],
		});
		behavior.onSpawn(ctx);
		expect(ctx.spawns).toHaveLength(0);
	});

	it('isCcImmune returns true for corrupted_archmage', () => {
		const behavior = createBossBehavior('corrupted_archmage');
		assertBehavior(behavior);
		expect(behavior.isCcImmune()).toBe(true);
	});

	it('isCcImmune returns false for orc_warlord', () => {
		const behavior = createBossBehavior('orc_warlord');
		assertBehavior(behavior);
		expect(behavior.isCcImmune()).toBe(false);
	});

	it('isCcImmune returns false for forge_master', () => {
		const behavior = createBossBehavior('forge_master');
		assertBehavior(behavior);
		expect(behavior.isCcImmune()).toBe(false);
	});
});
