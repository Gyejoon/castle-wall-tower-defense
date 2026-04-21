import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	__resetTowerRegistry,
	createTower,
	hasTowerFactory,
	registerTower,
} from '../../src/towers/registry';

describe('tower registry', () => {
	beforeEach(() => {
		__resetTowerRegistry();
	});

	it('returns null for unregistered defId', () => {
		expect(createTower('unknown', {} as never)).toBeNull();
	});

	it('invokes factory with deps and returns TowerBehavior', () => {
		const mock = { id: 'archer' } as never;
		const factory = vi.fn(() => mock);
		registerTower('archer', factory);
		const deps = { def: {} } as never;
		expect(createTower('archer', deps)).toBe(mock);
		expect(factory).toHaveBeenCalledWith(deps);
	});

	it('hasTowerFactory reflects registration state', () => {
		expect(hasTowerFactory('x')).toBe(false);
		registerTower('x', () => ({}) as never);
		expect(hasTowerFactory('x')).toBe(true);
	});
});
