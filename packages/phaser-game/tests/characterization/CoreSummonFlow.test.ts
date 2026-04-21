import { beforeEach, describe, expect, it, vi } from 'vitest';

// emit이 등록된 핸들러로 실제 dispatch하도록 만든 routing EventBus.
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

vi.mock('../../src/EventBus', () => ({ EventBus }));

import { CoreOrchestrator } from '../../src/systems/CoreOrchestrator';

interface FakeTower {
	col: number;
	row: number;
	towerId: string;
	family: string;
	tier: number;
	instanceId: string;
}

const TEST_FAMILY: Record<string, { family: string; tier: number }> = {
	archer: { family: 'archer', tier: 1 },
};

function makeFakeTowerSystem() {
	const towers: FakeTower[] = [];
	let nextId = 0;
	return {
		towers,
		playSummonVfx: vi.fn(),
		playMergeVfx: vi.fn(),
		playMergeRevealVfx: vi.fn(),
		placeTower: vi.fn((col: number, row: number, defId: string) => {
			const meta = TEST_FAMILY[defId] ?? { family: 'archer', tier: 1 };
			const instanceId = `fake_${nextId++}`;
			towers.push({
				col,
				row,
				towerId: defId,
				family: meta.family,
				tier: meta.tier,
				instanceId,
			});
			return { success: true, tower: { instanceId } };
		}),
		getTowerLocator: vi.fn(() => null),
		getTowerAt: vi.fn(() => null),
		removeTowerAt: vi.fn(() => false),
	};
}

beforeEach(() => {
	resetBus();
});

// summon → placement 사이의 ordering/상태 계약을 고정. completePlacement 이름/단계 변경 시 감지된다.
describe('Core summon → placement ordering (characterization)', () => {
	it('hasPendingSummon flips true on draw and false exactly at completePlacement', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new CoreOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		expect(orch.hasPendingSummon()).toBe(false);

		EventBus.emit('request-summon-tower');
		expect(orch.hasPendingSummon()).toBe(true);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();

		// completePlacement만이 pending을 placeTower 호출로 소비한다.
		orch.completePlacement(3, 4);
		expect(orch.hasPendingSummon()).toBe(false);
		expect(towerSystem.placeTower).toHaveBeenCalledTimes(1);
		expect(towerSystem.placeTower).toHaveBeenCalledWith(3, 4, 'archer', {
			levelOverride: 1,
		});

		orch.destroy();
	});

	it('completePlacement without a pending summon is a no-op (does not call placeTower)', () => {
		// 호출자의 가드가 빠져도 orchestrator 자체는 silent no-op으로 안전해야 한다.
		const towerSystem = makeFakeTowerSystem();
		const orch = new CoreOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		expect(orch.hasPendingSummon()).toBe(false);
		orch.completePlacement(1, 1);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		expect(orch.hasPendingSummon()).toBe(false);

		orch.destroy();
	});

	it('cancelPendingSummon — not completePlacement — is the only way to clear without placing', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new CoreOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');
		expect(orch.hasPendingSummon()).toBe(true);

		orch.cancelPendingSummon();
		expect(orch.hasPendingSummon()).toBe(false);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();

		orch.destroy();
	});
});
