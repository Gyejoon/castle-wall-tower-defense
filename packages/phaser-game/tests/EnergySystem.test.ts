import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	Events: {
		EventEmitter: class {
			on() {
				return this;
			}
			off() {
				return this;
			}
			emit() {
				return false;
			}
		},
	},
}));

import { EventBus } from '../src/EventBus';
import { EnergySystem } from '../src/systems/EnergySystem';

describe('EnergySystem', () => {
	let emitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		emitSpy = vi.spyOn(EventBus, 'emit');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('starts with INITIAL_ENERGY (10)', () => {
		const system = new EnergySystem();
		expect(system.getEnergy()).toBe(10);
	});

	it('accumulates energy at 1/sec', () => {
		const system = new EnergySystem(0);
		system.update(3); // 3 seconds
		expect(system.getEnergy()).toBe(3);
	});

	it('returns floor of accumulated energy', () => {
		const system = new EnergySystem(0);
		system.update(1.7);
		expect(system.getEnergy()).toBe(1); // floor(1.7)
	});

	it('caps energy at ENERGY_CAP (100)', () => {
		const system = new EnergySystem(99);
		system.update(5);
		expect(system.getEnergy()).toBe(100);
	});

	it('clamps delta to 5 seconds (tab suspend protection)', () => {
		const system = new EnergySystem(0);
		system.update(60); // 60s tab suspend → clamped to 5
		expect(system.getEnergy()).toBe(5);
	});

	it('canAfford checks floor value', () => {
		const system = new EnergySystem(9);
		system.update(0.9); // 9.9 internal
		expect(system.canAfford(10)).toBe(false);
		system.update(0.2); // 10.1 internal
		expect(system.canAfford(10)).toBe(true);
	});

	it('spend deducts and returns true when affordable', () => {
		const system = new EnergySystem(20);
		expect(system.spend(10)).toBe(true);
		expect(system.getEnergy()).toBe(10);
	});

	it('spend returns false when insufficient', () => {
		const system = new EnergySystem(5);
		expect(system.spend(10)).toBe(false);
		expect(system.getEnergy()).toBe(5);
	});

	it('emits energy-changed on value change', () => {
		const system = new EnergySystem(0);
		system.update(1);
		expect(emitSpy).toHaveBeenCalledWith('energy-changed', { energy: 1 });
	});

	it('does not emit when floor value is unchanged', () => {
		const system = new EnergySystem(10);
		// Force initial emit so lastEmittedEnergy is set
		system.update(0);
		emitSpy.mockClear();
		system.update(0.1); // 10.1 → floor 10, no change
		expect(emitSpy).not.toHaveBeenCalled();
	});

	it('reset restores to specified initial value', () => {
		const system = new EnergySystem(50);
		system.spend(30);
		system.reset(20);
		expect(system.getEnergy()).toBe(20);
	});

	it('add() increases energy up to cap', () => {
		const system = new EnergySystem(0);
		system.add(5);
		expect(system.getEnergy()).toBe(5);
	});

	it('add() does not exceed ENERGY_CAP', () => {
		const system = new EnergySystem(99);
		system.add(10);
		expect(system.getEnergy()).toBe(100);
	});
});
