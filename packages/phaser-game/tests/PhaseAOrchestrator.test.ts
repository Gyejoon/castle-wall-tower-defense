import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mini routing EventBus mock — emit() actually fires registered handlers
// so the orchestrator's request→handle→emit roundtrip is testable.
const { EventBus, getEmits, resetBus } = vi.hoisted(() => {
	const handlers = new Map<string, Set<(payload?: unknown) => void>>();
	const emit = vi.fn((event: string, payload?: unknown) => {
		const set = handlers.get(event);
		if (set) {
			for (const fn of set) fn(payload);
		}
	});
	return {
		EventBus: {
			emit,
			on: (event: string, fn: (payload?: unknown) => void) => {
				if (!handlers.has(event)) handlers.set(event, new Set());
				handlers.get(event)?.add(fn);
			},
			off: (event: string, fn: (payload?: unknown) => void) => {
				handlers.get(event)?.delete(fn);
			},
		},
		getEmits: () => emit.mock.calls,
		resetBus: () => {
			handlers.clear();
			emit.mockClear();
		},
	};
});

vi.mock('../src/EventBus', () => ({ EventBus }));

import { PhaseAOrchestrator } from '../src/systems/PhaseAOrchestrator';

interface FakeTower {
	col: number;
	row: number;
	towerId: string;
	tier: number;
}

function makeFakeTowerSystem() {
	const towers: FakeTower[] = [];
	return {
		towers,
		playPhaseASummonVfx: vi.fn(),
		playPhaseAMergeVfx: vi.fn(),
		placeTower: vi.fn((col: number, row: number, defId: string) => {
			towers.push({ col, row, towerId: defId, tier: 1 });
			return { success: true, tower: {} };
		}),
		getTowerLocator: vi.fn((col: number, row: number) => {
			const t = towers.find((x) => x.col === col && x.row === row);
			return t ? { col, row, towerId: t.towerId, tier: t.tier } : null;
		}),
		applyMerge: vi.fn(() => false), // Phase 1 stub returns false
	};
}

function makeFakeEnergy(initial = 100) {
	let energy = initial;
	return {
		canAfford: vi.fn((cost: number) => energy >= cost),
		spend: vi.fn((cost: number) => {
			if (energy < cost) return false;
			energy -= cost;
			return true;
		}),
		add: vi.fn((amount: number) => {
			energy += amount;
		}),
		get current() {
			return energy;
		},
	};
}

beforeEach(() => {
	resetBus();
});

describe('PhaseAOrchestrator (Phase 1 — merge stubbed)', () => {
	it('request-summon-tower → draw from pool → emit phase-a-summon-ready (towerId only)', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');

		expect(orch.hasPendingSummon()).toBe(true);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		const readyCall = getEmits().find(
			([event]) => event === 'phase-a-summon-ready',
		);
		expect(readyCall?.[1]).toEqual({ towerId: 'archer' });

		orch.destroy();
	});

	it('completePlacement → placeTower + tower-summoned (no grade)', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(40);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
			summonCost: 8,
		});

		EventBus.emit('request-summon-tower');
		orch.completePlacement(2, 3);

		expect(towerSystem.placeTower).toHaveBeenCalledWith(2, 3, 'archer', {
			levelOverride: 1,
		});
		expect(energy.spend).toHaveBeenCalledWith(8);
		expect(orch.hasPendingSummon()).toBe(false);
		const summoned = getEmits().find(([e]) => e === 'tower-summoned');
		expect(summoned?.[1]).toMatchObject({ col: 2, row: 3, towerId: 'archer' });
		// grade is gone
		expect((summoned?.[1] as Record<string, unknown>).grade).toBeUndefined();
	});

	it('cancelPendingSummon clears pending state', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');
		expect(orch.hasPendingSummon()).toBe(true);
		orch.cancelPendingSummon();
		expect(orch.hasPendingSummon()).toBe(false);
	});

	it('merge request → merge-failed (not-implemented stub)', () => {
		const towerSystem = makeFakeTowerSystem();
		towerSystem.towers.push(
			{ col: 0, row: 0, towerId: 'archer', tier: 1 },
			{ col: 1, row: 0, towerId: 'archer', tier: 1 },
		);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		EventBus.emit('request-merge-towers', {
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
		});

		const failedCall = getEmits().find(([event]) => event === 'merge-failed');
		expect(failedCall?.[1]).toMatchObject({ reason: 'not-implemented' });
	});

	it('destroy() 후 emit이 더 이상 핸들러를 부르지 않는다', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		orch.destroy();
		EventBus.emit('request-summon-tower');
		EventBus.emit('request-merge-towers', {
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
		});

		expect(towerSystem.placeTower).not.toHaveBeenCalled();
	});

	it('에너지 부족이면 summon-failed:insufficient-energy emit + placeTower 미호출', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(0);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
			summonCost: 8,
		});

		EventBus.emit('request-summon-tower');

		expect(energy.canAfford).toHaveBeenCalledWith(8);
		expect(energy.spend).not.toHaveBeenCalled();
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		const failed = getEmits().find(([event]) => event === 'summon-failed');
		expect(failed?.[1]).toEqual({ reason: 'insufficient-energy' });
	});

	it('에너지 충분 시 draw 성공 → completePlacement 후 spend + tower-summoned', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(40);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
			summonCost: 8,
		});

		EventBus.emit('request-summon-tower');
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		expect(energy.spend).not.toHaveBeenCalled();

		orch.completePlacement(1, 1);
		expect(towerSystem.placeTower).toHaveBeenCalledTimes(1);
		expect(energy.spend).toHaveBeenCalledWith(8);
		expect(energy.current).toBe(32);
	});

	it('destroy()를 두 번 불러도 안전', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});
		orch.destroy();
		expect(() => orch.destroy()).not.toThrow();
	});

	it('applyUpgrade → activeUpgrades 스택 증가 + upgrade-applied emit', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		orch.applyUpgrade('dmg_up');
		expect(orch.getUpgradeStacks('dmg_up')).toBe(1);

		orch.applyUpgrade('dmg_up');
		expect(orch.getUpgradeStacks('dmg_up')).toBe(2);

		orch.destroy();
	});

	it('getModifier — dmg_up multiply: 1회=1.15, 2회=1.3225', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		expect(orch.getModifier('dmg_up')).toBe(1);
		orch.applyUpgrade('dmg_up');
		expect(orch.getModifier('dmg_up')).toBeCloseTo(1.15);
		orch.applyUpgrade('dmg_up');
		expect(orch.getModifier('dmg_up')).toBeCloseTo(1.3225);
		orch.destroy();
	});

	it('effectiveSummonCost — summon_discount 적용 (최소 5)', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			summonCost: 8,
		});

		expect(orch.effectiveSummonCost).toBe(8);
		orch.applyUpgrade('summon_discount');
		expect(orch.effectiveSummonCost).toBe(5);
		orch.applyUpgrade('summon_discount');
		expect(orch.effectiveSummonCost).toBe(5);
		orch.destroy();
	});
});
