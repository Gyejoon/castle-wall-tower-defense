import type { TowerGrade } from '@gld/shared';
import { describe, expect, it } from 'vitest';
import { type MergeContext, MergeSystem } from '../src/systems/MergeSystem';

function ctx(
	towers: Array<{
		col: number;
		row: number;
		towerId: string;
		grade: TowerGrade;
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

	it('다른 타워 → failed:different-tower (coords carried)', () => {
		const c = ctx([
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'plasma', grade: 'normal' },
		]);
		expect(sys.tryMerge(c, 0, 0, 1, 0)).toEqual({
			kind: 'failed',
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
			reason: 'different-tower',
		});
	});

	it('다른 등급 → failed:different-grade', () => {
		const c = ctx([
			{ col: 0, row: 0, towerId: 'archer', grade: 'normal' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'rare' },
		]);
		const r = sys.tryMerge(c, 0, 0, 1, 0);
		expect(r.kind).toBe('failed');
		if (r.kind === 'failed') {
			expect(r.reason).toBe('different-grade');
			expect(r.fromCol).toBe(0);
			expect(r.toCol).toBe(1);
		}
	});

	it('epic 등급 합성 → failed:max-grade', () => {
		const c = ctx([
			{ col: 0, row: 0, towerId: 'archer', grade: 'epic' },
			{ col: 1, row: 0, towerId: 'archer', grade: 'epic' },
		]);
		const r = sys.tryMerge(c, 0, 0, 1, 0);
		expect(r.kind).toBe('failed');
		if (r.kind === 'failed') {
			expect(r.reason).toBe('max-grade');
		}
	});

	it('빈 칸 합성 → failed:invalid-tile (from valid, to empty)', () => {
		const c = ctx([{ col: 0, row: 0, towerId: 'archer', grade: 'normal' }]);
		const r = sys.tryMerge(c, 0, 0, 99, 99);
		expect(r.kind).toBe('failed');
		if (r.kind === 'failed') {
			expect(r.reason).toBe('invalid-tile');
			expect(r.toCol).toBe(99);
		}
	});

	it('빈 칸에서 출발 → failed:invalid-tile (from empty, to valid)', () => {
		const c = ctx([{ col: 1, row: 0, towerId: 'archer', grade: 'normal' }]);
		const r = sys.tryMerge(c, 99, 99, 1, 0);
		expect(r.kind).toBe('failed');
		if (r.kind === 'failed') {
			expect(r.reason).toBe('invalid-tile');
		}
	});

	it('같은 타일 self-merge → failed:invalid-tile (무료 승급 방지)', () => {
		const c = ctx([{ col: 0, row: 0, towerId: 'archer', grade: 'normal' }]);
		const r = sys.tryMerge(c, 0, 0, 0, 0);
		expect(r.kind).toBe('failed');
		if (r.kind === 'failed') {
			expect(r.reason).toBe('invalid-tile');
		}
	});
});
