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

import type { Position } from '@gld/shared';
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

function makeFakeGridManager(occupiedCells: Array<[number, number]> = []) {
	const set = new Set(occupiedCells.map(([c, r]) => `${c},${r}`));
	return {
		getTile: vi.fn((col: number, row: number) =>
			set.has(`${col},${row}`) ? { occupied: true } : { occupied: false },
		),
		_markOccupied: (col: number, row: number) => set.add(`${col},${row}`),
	};
}

const buildable: Position[] = [
	{ x: 0, y: 0 },
	{ x: 1, y: 0 },
	{ x: 2, y: 0 },
];

beforeEach(() => {
	resetBus();
});

describe('PhaseAOrchestrator', () => {
	it('등록 시 request-summon-tower / request-merge-towers 리스너를 붙인다', () => {
		const towerSystem = makeFakeTowerSystem();
		const gridManager = makeFakeGridManager();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
			initialPool: ['archer'],
			rng: () => 0,
		});

		// 리스너가 붙었으니 emit이 실제로 동작
		EventBus.emit('request-summon-tower');
		expect(towerSystem.placeTower).toHaveBeenCalledTimes(1);

		orch.destroy();
	});

	it('summon 성공 시 placeTower 호출 + tower-summoned emit', () => {
		const towerSystem = makeFakeTowerSystem();
		const gridManager = makeFakeGridManager();
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');

		expect(towerSystem.placeTower).toHaveBeenCalledWith(0, 0, 'archer', {
			gradeOverride: 'normal',
			levelOverride: 1,
		});
		const summonedCall = getEmits().find(
			([event]) => event === 'tower-summoned',
		);
		expect(summonedCall?.[1]).toEqual({
			col: 0,
			row: 0,
			towerId: 'archer',
			grade: 'normal',
		});
	});

	it('빈 칸이 모두 차면 summon은 silent fail', () => {
		const towerSystem = makeFakeTowerSystem();
		const gridManager = makeFakeGridManager([
			[0, 0],
			[1, 0],
			[2, 0],
		]);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');

		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		const summonedCall = getEmits().find(
			([event]) => event === 'tower-summoned',
		);
		expect(summonedCall).toBeUndefined();
	});

	it('merge 성공 시 applyMerge 호출 + towers-merged emit', () => {
		const towerSystem = makeFakeTowerSystem();
		const gridManager = makeFakeGridManager();
		// 두 개의 normal archer 미리 배치
		towerSystem.towers.push(
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'normal' },
		);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
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
		const gridManager = makeFakeGridManager();
		towerSystem.towers.push(
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'plasma', grade: 'normal' },
		);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
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
		const gridManager = makeFakeGridManager();
		towerSystem.towers.push(
			{ col: 0, row: 0, towerId: 'archer', grade: 'epic' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'epic' },
		);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
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
		const gridManager = makeFakeGridManager();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
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

	it('destroy()를 두 번 불러도 안전', () => {
		const towerSystem = makeFakeTowerSystem();
		const gridManager = makeFakeGridManager();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			gridManager: gridManager as never,
			buildablePoints: buildable,
			initialPool: ['archer'],
		});
		orch.destroy();
		expect(() => orch.destroy()).not.toThrow();
	});
});
