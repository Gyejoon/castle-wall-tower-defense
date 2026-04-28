import { describe, expect, it, vi } from 'vitest';
import { CombatMediator } from '../../src/scenes/runtime/CombatMediator';

type DamageEvent = {
	unitId: string;
	damage: number;
	armorPierce?: boolean;
	slow?: { factor: number; duration: number };
	stun?: { duration: number };
};

function makeTowers(events: DamageEvent[]) {
	return { update: vi.fn(() => events) };
}

function makeUnits(
	opts: {
		applyDamageResult?: ReturnType<typeof vi.fn>;
		worldPos?: { x: number; y: number } | null;
		reachedExit?: Array<{ id: string; isBoss: boolean }>;
	} = {},
) {
	const applyDamage =
		opts.applyDamageResult ??
		vi.fn(() => ({
			outcome: 'hit',
			killed: false,
			bounty: 0,
			unitDefId: 'x',
			countsTowardClear: true,
			source: 'base',
			isBoss: false,
			actualDamage: 0,
		}));
	return {
		applyDamage,
		applySlow: vi.fn(),
		applyStun: vi.fn(),
		getUnitPositions: vi.fn(() => []),
		getUnitWorldPos: vi.fn(
			() => opts.worldPos ?? ({ x: 100, y: 200 } as { x: number; y: number }),
		),
		update: vi.fn(() => ({ reachedExit: opts.reachedExit ?? [] })),
	};
}

function makeDamageNumbers() {
	return { show: vi.fn(), showMiss: vi.fn() };
}

describe('CombatMediator.tick', () => {
	it('routes hits through applyDamage and shows a floating number', () => {
		const towers = makeTowers([{ unitId: 'u1', damage: 10 }]);
		const units = makeUnits({
			applyDamageResult: vi.fn(() => ({
				outcome: 'hit',
				killed: false,
				bounty: 0,
				unitDefId: 'grunt',
				countsTowardClear: true,
				source: 'base',
				isBoss: false,
				actualDamage: 10,
			})),
		});
		const dmg = makeDamageNumbers();
		const mediator = new CombatMediator({
			towers,
			units,
			damageNumbers: dmg,
			bossBehaviors: new Map(),
			orchestrator: undefined,
			isGameMap: false,
		});

		const onKill = vi.fn();
		mediator.tick(0, 16, onKill);

		expect(units.applyDamage).toHaveBeenCalledWith('u1', 10, undefined);
		expect(dmg.show).toHaveBeenCalledWith(100, 200, 10);
		expect(dmg.showMiss).not.toHaveBeenCalled();
		expect(onKill).not.toHaveBeenCalled();
	});

	it('shows MISS for miss outcome and never fires onKill', () => {
		const towers = makeTowers([{ unitId: 'u1', damage: 1 }]);
		const units = makeUnits({
			applyDamageResult: vi.fn(() => ({
				outcome: 'miss',
				killed: false,
				bounty: 0,
				unitDefId: 'grunt',
				countsTowardClear: true,
				source: 'base',
				isBoss: false,
				actualDamage: 0,
			})),
		});
		const dmg = makeDamageNumbers();
		const onKill = vi.fn();
		new CombatMediator({
			towers,
			units,
			damageNumbers: dmg,
			bossBehaviors: new Map(),
			orchestrator: undefined,
			isGameMap: false,
		}).tick(0, 16, onKill);

		expect(dmg.show).not.toHaveBeenCalled();
		expect(dmg.showMiss).toHaveBeenCalledWith(100, 200);
		expect(onKill).not.toHaveBeenCalled();
	});

	it('invokes onKill with bounty on killed hits', () => {
		const towers = makeTowers([{ unitId: 'u1', damage: 99 }]);
		const units = makeUnits({
			applyDamageResult: vi.fn(() => ({
				outcome: 'hit',
				killed: true,
				bounty: 7,
				unitDefId: 'grunt',
				countsTowardClear: true,
				source: 'base',
				isBoss: false,
				actualDamage: 99,
			})),
		});
		const onKill = vi.fn();
		new CombatMediator({
			towers,
			units,
			damageNumbers: makeDamageNumbers(),
			bossBehaviors: new Map(),
			orchestrator: undefined,
			isGameMap: false,
		}).tick(0, 16, onKill);

		expect(onKill).toHaveBeenCalledWith({ bounty: 7 });
	});

	it('applies slow on non-boss units', () => {
		const towers = makeTowers([
			{ unitId: 'u1', damage: 0, slow: { factor: 0.5, duration: 1000 } },
		]);
		const units = makeUnits();
		new CombatMediator({
			towers,
			units,
			damageNumbers: makeDamageNumbers(),
			bossBehaviors: new Map(),
			orchestrator: undefined,
			isGameMap: false,
		}).tick(0, 16, vi.fn());

		expect(units.applySlow).toHaveBeenCalledWith('u1', 0.5, 1000);
	});

	it('skips slow on CC-immune boss', () => {
		const towers = makeTowers([
			{ unitId: 'boss-1', damage: 0, slow: { factor: 0.5, duration: 1000 } },
		]);
		const units = makeUnits();
		const bossBehaviors = new Map<string, { isCcImmune: () => boolean }>();
		bossBehaviors.set('boss-1', { isCcImmune: () => true });
		new CombatMediator({
			towers,
			units,
			damageNumbers: makeDamageNumbers(),
			bossBehaviors: bossBehaviors as never,
			orchestrator: undefined,
			isGameMap: false,
		}).tick(0, 16, vi.fn());

		expect(units.applySlow).not.toHaveBeenCalled();
	});

	it('applies slow to boss that is NOT CC-immune', () => {
		const towers = makeTowers([
			{ unitId: 'boss-1', damage: 0, slow: { factor: 0.5, duration: 1000 } },
		]);
		const units = makeUnits();
		const bossBehaviors = new Map<string, { isCcImmune: () => boolean }>();
		bossBehaviors.set('boss-1', { isCcImmune: () => false });
		new CombatMediator({
			towers,
			units,
			damageNumbers: makeDamageNumbers(),
			bossBehaviors: bossBehaviors as never,
			orchestrator: undefined,
			isGameMap: false,
		}).tick(0, 16, vi.fn());

		expect(units.applySlow).toHaveBeenCalledWith('boss-1', 0.5, 1000);
	});

	it('skips stun on CC-immune boss', () => {
		const towers = makeTowers([
			{ unitId: 'boss-1', damage: 0, stun: { duration: 500 } },
		]);
		const units = makeUnits();
		const bossBehaviors = new Map<string, { isCcImmune: () => boolean }>();
		bossBehaviors.set('boss-1', { isCcImmune: () => true });
		new CombatMediator({
			towers,
			units,
			damageNumbers: makeDamageNumbers(),
			bossBehaviors: bossBehaviors as never,
			orchestrator: undefined,
			isGameMap: false,
		}).tick(0, 16, vi.fn());

		expect(units.applyStun).not.toHaveBeenCalled();
	});

	it('applies Phase A effectAmp to slow/stun durations', () => {
		const towers = makeTowers([
			{
				unitId: 'u1',
				damage: 0,
				slow: { factor: 0.5, duration: 1000 },
				stun: { duration: 500 },
			},
		]);
		const units = makeUnits();
		const orchestrator = {
			getEffectDurationMultiplier: vi.fn(() => 2),
		};
		new CombatMediator({
			towers,
			units,
			damageNumbers: makeDamageNumbers(),
			bossBehaviors: new Map(),
			orchestrator: orchestrator as never,
			isGameMap: true,
		}).tick(0, 16, vi.fn());

		expect(units.applySlow).toHaveBeenCalledWith('u1', 0.5, 2000);
		expect(units.applyStun).toHaveBeenCalledWith('u1', 1000);
	});

	it('returns reachedExit from unitSystem.update', () => {
		const towers = makeTowers([]);
		const units = makeUnits({
			reachedExit: [{ id: 'u1', isBoss: true }],
		});
		const result = new CombatMediator({
			towers,
			units,
			damageNumbers: makeDamageNumbers(),
			bossBehaviors: new Map(),
			orchestrator: undefined,
			isGameMap: false,
		}).tick(0, 16, vi.fn());

		expect(result.reachedExit).toEqual([{ id: 'u1', isBoss: true }]);
		expect(result.damageEvents).toBe(0);
	});
});
