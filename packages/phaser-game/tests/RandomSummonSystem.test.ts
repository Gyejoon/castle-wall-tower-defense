import { describe, expect, it } from 'vitest';
import {
	RandomSummonSystem,
	type SummonPlacementContext,
} from '../src/systems/RandomSummonSystem';
import { SummonPoolSystem } from '../src/systems/SummonPoolSystem';

function ctx(
	buildable: Array<[number, number]>,
	occupied: Array<[number, number]>,
): SummonPlacementContext {
	const occSet = new Set(occupied.map(([c, r]) => `${c},${r}`));
	return {
		listBuildableTiles: () => buildable.map(([col, row]) => ({ col, row })),
		isOccupied: (col, row) => occSet.has(`${col},${row}`),
	};
}

describe('RandomSummonSystem.requestSummon', () => {
	it('빈 칸이 있으면 success — 첫 빈 칸 + draw 결과', () => {
		const pool = new SummonPoolSystem(['archer'], () => 0);
		const sys = new RandomSummonSystem(pool, () => 0);
		const r = sys.requestSummon(
			ctx(
				[
					[0, 0],
					[1, 0],
				],
				[[0, 0]],
			),
		);
		expect(r.kind).toBe('success');
		if (r.kind === 'success') {
			expect(r.col).toBe(1);
			expect(r.row).toBe(0);
			expect(r.towerId).toBe('archer');
			expect(r.grade).toBe('normal');
		}
	});

	it('모든 칸이 차 있으면 failed:no-empty-tile', () => {
		const pool = new SummonPoolSystem(['archer']);
		const sys = new RandomSummonSystem(pool);
		const r = sys.requestSummon(ctx([[0, 0]], [[0, 0]]));
		expect(r).toEqual({ kind: 'failed', reason: 'no-empty-tile' });
	});

	it('buildable 리스트가 빈 배열이면 failed:no-empty-tile', () => {
		const pool = new SummonPoolSystem(['archer']);
		const sys = new RandomSummonSystem(pool);
		expect(sys.requestSummon(ctx([], []))).toEqual({
			kind: 'failed',
			reason: 'no-empty-tile',
		});
	});

	it('빈 칸 후보 중 rng 기반 선택 — rng=0.99이면 마지막 빈 칸', () => {
		const pool = new SummonPoolSystem(['archer'], () => 0);
		const sys = new RandomSummonSystem(pool, () => 0.99);
		const r = sys.requestSummon(
			ctx(
				[
					[0, 0],
					[1, 0],
					[2, 0],
				],
				[],
			),
		);
		expect(r.kind).toBe('success');
		if (r.kind === 'success') {
			expect(r.col).toBe(2);
		}
	});
});
