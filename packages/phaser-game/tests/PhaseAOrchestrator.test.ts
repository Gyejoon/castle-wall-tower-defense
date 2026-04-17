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
	grade: 'normal' | 'rare' | 'unique' | 'epic';
}

function makeFakeTowerSystem() {
	const towers: FakeTower[] = [];
	return {
		towers,
		playPhaseASummonVfx: vi.fn(),
		playPhaseAMergeVfx: vi.fn(),
		placeTower: vi.fn(
			(
				col: number,
				row: number,
				defId: string,
				opts?: { gradeOverride?: 'normal' | 'rare' | 'unique' | 'epic' },
			) => {
				towers.push({
					col,
					row,
					towerId: defId,
					grade: opts?.gradeOverride ?? 'normal',
				});
				return { success: true, tower: {} };
			},
		),
		getTowerLocator: vi.fn((col: number, row: number) => {
			const t = towers.find((x) => x.col === col && x.row === row);
			return t ? { col, row, towerId: t.towerId, grade: t.grade } : null;
		}),
		applyMerge: vi.fn(
			(
				removedCol: number,
				removedRow: number,
				keptCol: number,
				keptRow: number,
				newGrade: 'normal' | 'rare' | 'unique' | 'epic',
			) => {
				const removedIdx = towers.findIndex(
					(t) => t.col === removedCol && t.row === removedRow,
				);
				const keptIdx = towers.findIndex(
					(t) => t.col === keptCol && t.row === keptRow,
				);
				if (removedIdx < 0 || keptIdx < 0) return false;
				towers.splice(removedIdx, 1);
				const newKeptIdx = towers.findIndex(
					(t) => t.col === keptCol && t.row === keptRow,
				);
				towers[newKeptIdx].grade = newGrade;
				return true;
			},
		),
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

describe('PhaseAOrchestrator', () => {
	it('request-summon-tower → draw from pool → emit phase-a-summon-ready (step 1)', () => {
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
		expect(readyCall?.[1]).toEqual({ towerId: 'archer', grade: 'normal' });

		orch.destroy();
	});

	it('completePlacement → placeTower + tower-summoned (step 2)', () => {
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
			gradeOverride: 'normal',
			levelOverride: 1,
		});
		expect(energy.spend).toHaveBeenCalledWith(8);
		expect(orch.hasPendingSummon()).toBe(false);
		const summoned = getEmits().find(([e]) => e === 'tower-summoned');
		expect(summoned?.[1]).toMatchObject({ col: 2, row: 3, towerId: 'archer' });
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

	it('merge 성공 시 applyMerge 호출 + towers-merged emit', () => {
		const towerSystem = makeFakeTowerSystem();
		towerSystem.towers.push(
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'normal' },
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

		expect(towerSystem.applyMerge).toHaveBeenCalledWith(0, 0, 1, 0, 'rare');
		const mergedCall = getEmits().find(([event]) => event === 'towers-merged');
		expect(mergedCall?.[1]).toEqual({
			col: 1,
			row: 0,
			towerId: 'archer',
			fromGrade: 'normal',
			toGrade: 'rare',
		});
	});

	it('merge 실패 시 merge-failed emit (다른 타워)', () => {
		const towerSystem = makeFakeTowerSystem();
		towerSystem.towers.push(
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'plasma', grade: 'normal' },
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

		expect(towerSystem.applyMerge).not.toHaveBeenCalled();
		const failedCall = getEmits().find(([event]) => event === 'merge-failed');
		expect(failedCall?.[1]).toEqual({
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
			reason: 'different-tower',
		});
	});

	it('merge 실패 시 merge-failed emit (max-grade)', () => {
		const towerSystem = makeFakeTowerSystem();
		towerSystem.towers.push(
			{ col: 0, row: 0, towerId: 'archer', grade: 'epic' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'epic' },
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
		expect(failedCall?.[1]).toMatchObject({ reason: 'max-grade' });
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
		expect(towerSystem.applyMerge).not.toHaveBeenCalled();
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

		const appliedCalls = getEmits().filter(
			([event]) => event === 'upgrade-applied',
		);
		expect(appliedCalls).toHaveLength(2);
		expect(appliedCalls[0][1]).toEqual({ upgradeId: 'dmg_up', totalStacks: 1 });
		expect(appliedCalls[1][1]).toEqual({ upgradeId: 'dmg_up', totalStacks: 2 });

		orch.destroy();
	});

	it('getModifier — dmg_up multiply 타입: 1회=1.15, 2회=1.3225', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		// 0 stacks → identity multiplier
		expect(orch.getModifier('dmg_up')).toBe(1);

		orch.applyUpgrade('dmg_up');
		expect(orch.getModifier('dmg_up')).toBeCloseTo(1.15);

		orch.applyUpgrade('dmg_up');
		expect(orch.getModifier('dmg_up')).toBeCloseTo(1.3225);

		orch.destroy();
	});

	it('getModifier — range_up add 타입: 1회=0.5, 2회=1.0', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		// 0 stacks → 0 (additive)
		expect(orch.getModifier('range_up')).toBe(0);

		orch.applyUpgrade('range_up');
		expect(orch.getModifier('range_up')).toBeCloseTo(0.5);

		orch.applyUpgrade('range_up');
		expect(orch.getModifier('range_up')).toBeCloseTo(1.0);

		orch.destroy();
	});

	it('effectiveSummonCost — summon_discount 적용 (최소 5)', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			summonCost: 8,
		});

		// No discount → base cost
		expect(orch.effectiveSummonCost).toBe(8);

		// 1 stack of summon_discount (baseValue=3) → 8-3=5
		orch.applyUpgrade('summon_discount');
		expect(orch.effectiveSummonCost).toBe(5);

		// 2 stacks → 8-6=2 → clamped to 5
		orch.applyUpgrade('summon_discount');
		expect(orch.effectiveSummonCost).toBe(5);

		orch.destroy();
	});

	it('tickEnergyRegen — 5초마다 에너지 추가', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(10);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			energySystem: energy,
		});

		// No stacks → tick does nothing
		orch.tickEnergyRegen(5);
		expect(energy.add).not.toHaveBeenCalled();

		// Apply 2 stacks of energy_regen
		orch.applyUpgrade('energy_regen');
		orch.applyUpgrade('energy_regen');

		// 3 seconds → not yet
		orch.tickEnergyRegen(3);
		expect(energy.add).not.toHaveBeenCalled();

		// 2 more seconds (total 5) → trigger
		orch.tickEnergyRegen(2);
		expect(energy.add).toHaveBeenCalledWith(2);
		expect(energy.current).toBe(12);

		orch.destroy();
	});

	it('request-apply-upgrade EventBus 리스너 동작', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		EventBus.emit('request-apply-upgrade', { upgradeId: 'spd_up' });
		expect(orch.getUpgradeStacks('spd_up')).toBe(1);

		const appliedCall = getEmits().find(
			([event]) => event === 'upgrade-applied',
		);
		expect(appliedCall?.[1]).toEqual({ upgradeId: 'spd_up', totalStacks: 1 });

		orch.destroy();
	});

	it('effectiveSummonCost가 소환 비용에 실제 적용됨', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(40);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
			summonCost: 8,
		});

		// Apply summon_discount (baseValue=3) → effectiveCost = 5
		orch.applyUpgrade('summon_discount');
		expect(orch.effectiveSummonCost).toBe(5);

		// Summon + place → should spend 5, not 8
		EventBus.emit('request-summon-tower');
		orch.completePlacement(0, 0);

		expect(energy.spend).toHaveBeenCalledWith(5);
		expect(energy.current).toBe(35);

		orch.destroy();
	});
});
