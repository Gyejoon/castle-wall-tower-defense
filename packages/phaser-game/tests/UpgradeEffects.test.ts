import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same EventBus routing harness as PhaseAOrchestrator.test.ts — emit()
// actually fires handlers so we can observe event → side-effect loops.
const { EventBus, resetBus } = vi.hoisted(() => {
	const handlers = new Map<string, Set<(payload?: unknown) => void>>();
	const emit = vi.fn((event: string, payload?: unknown) => {
		const set = handlers.get(event);
		if (set) for (const fn of set) fn(payload);
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
		resetBus: () => {
			handlers.clear();
			emit.mockClear();
		},
	};
});

vi.mock('../src/EventBus', () => ({ EventBus }));

import {
	PhaseAOrchestrator,
	UPGRADE_MAX_STACKS,
} from '../src/systems/PhaseAOrchestrator';

function makeFakeTowerSystem() {
	return {
		placeTower: vi.fn(() => ({ success: true, tower: { instanceId: 'x' } })),
		getTowerLocator: vi.fn(() => null),
		getTowerAt: vi.fn(() => null),
		removeTowerAt: vi.fn(() => false),
		playPhaseASummonVfx: vi.fn(),
		playPhaseAMergeVfx: vi.fn(),
	};
}

function makeFakeEnergy() {
	let energy = 0;
	return {
		canAfford: vi.fn((c: number) => energy >= c),
		spend: vi.fn((c: number) => {
			if (energy < c) return false;
			energy -= c;
			return true;
		}),
		add: vi.fn((amt: number) => {
			energy += amt;
		}),
		get current() {
			return energy;
		},
	};
}

function makeOrchestrator(energySystem?: ReturnType<typeof makeFakeEnergy>) {
	const ts = makeFakeTowerSystem();
	return new PhaseAOrchestrator({
		towerSystem: ts as never,
		initialPool: ['archer'],
		rng: () => 0,
		energySystem,
	});
}

beforeEach(() => {
	resetBus();
});

/**
 * Phase 4 [F15] card effect wiring tests. Each card is exercised through
 * the orchestrator's public accessor — the actual application sites
 * (TowerSystem.damage, Game.processCombatField, etc.) use those accessors.
 */
describe('Upgrade card effects', () => {
	describe('dmg_up (multiply 1.20)', () => {
		it('base 100 × 1 stack → 120, × 2 stacks → 144', () => {
			const orch = makeOrchestrator();
			const base = 100;

			expect(Math.round(base * orch.getDamageMultiplier())).toBe(100);

			orch.applyUpgrade('dmg_up');
			expect(Math.round(base * orch.getDamageMultiplier())).toBe(120);

			orch.applyUpgrade('dmg_up');
			expect(Math.round(base * orch.getDamageMultiplier())).toBe(144);

			orch.destroy();
		});
	});

	describe('crit_dmg (add 0.25, flat-boost stub)', () => {
		// TODO(phase-12): migrate stub to proper crit-chance+mult system.
		// With the stub, `crit_dmg` contributes as a flat bonus applied
		// multiplicatively on every hit. 2 stacks → +0.50 bonus, i.e.
		// base 1.5 × (1 + 0.5) ≈ 2.25 on a crit model, or +50% on flat.
		it('2 stacks → crit damage bonus = 0.50', () => {
			const orch = makeOrchestrator();
			orch.applyUpgrade('crit_dmg');
			orch.applyUpgrade('crit_dmg');
			expect(orch.getCritDamageBonus()).toBeCloseTo(0.5);

			// Compose with a hypothetical base crit mult of 1.5: stub path
			// treats the bonus additively on top, giving 1.5 + 0.5 = 2.0.
			const baseCritMult = 1.5;
			expect(baseCritMult + orch.getCritDamageBonus()).toBeCloseTo(2.0);

			orch.destroy();
		});
	});

	describe('energy_harvest (add 1)', () => {
		it('3 stacks → +3 energy per kill on top of ENERGY_PER_KILL baseline', () => {
			const orch = makeOrchestrator();
			orch.applyUpgrade('energy_harvest');
			orch.applyUpgrade('energy_harvest');
			orch.applyUpgrade('energy_harvest');

			// ENERGY_PER_KILL baseline is owned by Game.ts (1 per kill).
			// The orchestrator exposes ONLY the additive bonus.
			const ENERGY_PER_KILL = 1;
			const totalForOneKill = ENERGY_PER_KILL + orch.getEnergyPerKillBonus();
			expect(totalForOneKill).toBe(4);

			orch.destroy();
		});
	});

	describe('energy_regen (interval 5000ms, amount 2)', () => {
		it('1 stack + 10s elapsed → 2 ticks × 2 = +4 energy', () => {
			const energy = makeFakeEnergy();
			const orch = makeOrchestrator(energy);
			orch.applyUpgrade('energy_regen');

			// Feed 10 seconds of frame deltas (1s each).
			for (let i = 0; i < 10; i++) orch.tickEnergyRegen(1);

			// amount=2, stacks=1 → 2 per tick, 2 ticks over 10s.
			expect(energy.add).toHaveBeenCalledTimes(2);
			expect(energy.current).toBe(4);

			orch.destroy();
		});

		it('2 stacks doubles per-tick amount', () => {
			const energy = makeFakeEnergy();
			const orch = makeOrchestrator(energy);
			orch.applyUpgrade('energy_regen');
			orch.applyUpgrade('energy_regen');

			for (let i = 0; i < 5; i++) orch.tickEnergyRegen(1);

			// 1 tick at 5s with 2 stacks × 2 amount = 4 energy.
			expect(energy.current).toBe(4);
			expect(energy.add).toHaveBeenCalledTimes(1);

			orch.destroy();
		});

		it('no stacks → never ticks', () => {
			const energy = makeFakeEnergy();
			const orch = makeOrchestrator(energy);

			for (let i = 0; i < 10; i++) orch.tickEnergyRegen(1);

			expect(energy.add).not.toHaveBeenCalled();
			orch.destroy();
		});
	});

	describe('effect_amp (multiply 1.25)', () => {
		it('1 stack → slow duration 1000 → 1250 applied', () => {
			const orch = makeOrchestrator();
			orch.applyUpgrade('effect_amp');

			const baseDuration = 1000;
			expect(baseDuration * orch.getEffectDurationMultiplier()).toBeCloseTo(
				1250,
			);

			orch.destroy();
		});

		it('2 stacks → multiplicative compounding (1.25^2 = 1.5625)', () => {
			const orch = makeOrchestrator();
			orch.applyUpgrade('effect_amp');
			orch.applyUpgrade('effect_amp');

			const baseDuration = 1000;
			expect(baseDuration * orch.getEffectDurationMultiplier()).toBeCloseTo(
				1562.5,
			);

			orch.destroy();
		});
	});

	describe('tier_odds_up (add 0.05)', () => {
		it('stack tracked; bonus returned as stackCount × 0.05', () => {
			const orch = makeOrchestrator();
			expect(orch.getTierOddsBonus()).toBe(0);

			orch.applyUpgrade('tier_odds_up');
			expect(orch.getTierOddsBonus()).toBeCloseTo(0.05);

			orch.applyUpgrade('tier_odds_up');
			expect(orch.getTierOddsBonus()).toBeCloseTo(0.1);

			orch.destroy();
		});

		it('stacks capped at UPGRADE_MAX_STACKS (10) → bonus ≤ 0.5', () => {
			const orch = makeOrchestrator();
			for (let i = 0; i < 20; i++) orch.applyUpgrade('tier_odds_up');
			expect(orch.getUpgradeStacks('tier_odds_up')).toBe(UPGRADE_MAX_STACKS);
			expect(orch.getTierOddsBonus()).toBeCloseTo(0.5);
			orch.destroy();
		});
	});
});
