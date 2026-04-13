import { describe, expect, it } from 'vitest';
import { type MergeContext, MergeSystem } from '../src/systems/MergeSystem';

function ctx(
	towers: Array<{
		col: number;
		row: number;
		towerId: string;
		grade: 'normal' | 'rare' | 'unique' | 'epic';
	}>,
): MergeContext {
	return {
		getTowerAt: (col, row) =>
			towers.find((t) => t.col === col && t.row === row) ?? null,
	};
}

describe('MergeSystem.tryMerge', () => {
	const sys = new MergeSystem();

	it('같은 타워 같은 등급 → success + 등급 ↑', () => {
		const c = ctx([
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'normal' },
		]);
		const r = sys.tryMerge(c, 0, 0, 1, 0);
		expect(r.kind).toBe('success');
		if (r.kind === 'success') {
			expect(r.toGrade).toBe('rare');
			expect(r.removedCol).toBe(0);
			expect(r.removedRow).toBe(0);
		}
	});

	it('다른 타워 → failed:different-tower', () => {
		const c = ctx([
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'plasma', grade: 'normal' },
		]);
		expect(sys.tryMerge(c, 0, 0, 1, 0)).toEqual({
			kind: 'failed',
			reason: 'different-tower',
		});
	});

	it('다른 등급 → failed:different-grade', () => {
		const c = ctx([
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'rare' },
		]);
		expect(sys.tryMerge(c, 0, 0, 1, 0)).toEqual({
			kind: 'failed',
			reason: 'different-grade',
		});
	});

	it('epic 등급 합성 → failed:max-grade', () => {
		const c = ctx([
			{ col: 0, row: 0, towerId: 'archer', grade: 'epic' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'epic' },
		]);
		expect(sys.tryMerge(c, 0, 0, 1, 0)).toEqual({
			kind: 'failed',
			reason: 'max-grade',
		});
	});

	it('빈 칸 합성 → failed:invalid-tile', () => {
		const c = ctx([{ col: 0, row: 0, towerId: 'archer', grade: 'normal' }]);
		expect(sys.tryMerge(c, 0, 0, 99, 99)).toEqual({
			kind: 'failed',
			reason: 'invalid-tile',
		});
	});
});
