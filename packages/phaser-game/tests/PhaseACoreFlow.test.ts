import type { Grade } from '@gld/shared';
import { describe, expect, it } from 'vitest';
import { type MergeContext, MergeSystem } from '../src/systems/MergeSystem';
import {
	RandomSummonSystem,
	type SummonPlacementContext,
} from '../src/systems/RandomSummonSystem';
import { SummonPoolSystem } from '../src/systems/SummonPoolSystem';

interface BoardTower {
	col: number;
	row: number;
	towerId: string;
	grade: Grade;
}

class FakeBoard implements MergeContext, SummonPlacementContext {
	private towers: BoardTower[] = [];

	constructor(private readonly buildable: Array<[number, number]>) {}

	listBuildableTiles() {
		return this.buildable.map(([col, row]) => ({ col, row }));
	}

	isOccupied(col: number, row: number) {
		return this.towers.some((t) => t.col === col && t.row === row);
	}

	getTowerAt(col: number, row: number) {
		return this.towers.find((t) => t.col === col && t.row === row) ?? null;
	}

	add(t: BoardTower) {
		this.towers.push(t);
	}

	remove(col: number, row: number) {
		this.towers = this.towers.filter((t) => !(t.col === col && t.row === row));
	}

	upgrade(col: number, row: number, grade: Grade) {
		const t = this.towers.find((x) => x.col === col && x.row === row);
		if (t) t.grade = grade;
	}

	count() {
		return this.towers.length;
	}
}

describe('Phase A core flow — summon → merge', () => {
	it('archer 풀에서 두 번 소환 후 합성하면 rare 등급 1개 남음', () => {
		const pool = new SummonPoolSystem(['archer'], () => 0);
		const summoner = new RandomSummonSystem(pool, () => 0);
		const merger = new MergeSystem();
		const board = new FakeBoard([
			[0, 0],
			[1, 0],
			[2, 0],
		]);

		const r1 = summoner.requestSummon(board);
		expect(r1.kind).toBe('success');
		if (r1.kind === 'success') {
			board.add({
				col: r1.col,
				row: r1.row,
				towerId: r1.towerId,
				grade: r1.grade,
			});
		}

		const r2 = summoner.requestSummon(board);
		expect(r2.kind).toBe('success');
		if (r2.kind === 'success') {
			board.add({
				col: r2.col,
				row: r2.row,
				towerId: r2.towerId,
				grade: r2.grade,
			});
		}
		expect(board.count()).toBe(2);

		const m = merger.tryMerge(board, 0, 0, 1, 0);
		expect(m.kind).toBe('success');
		if (m.kind === 'success') {
			board.remove(m.removedCol, m.removedRow);
			board.upgrade(m.keptCol, m.keptRow, m.toGrade);
		}
		expect(board.count()).toBe(1);
		expect(board.getTowerAt(1, 0)?.grade).toBe('rare');
	});

	it('빈 칸이 모두 차면 다음 소환은 실패', () => {
		const pool = new SummonPoolSystem(['archer'], () => 0);
		const summoner = new RandomSummonSystem(pool, () => 0);
		const board = new FakeBoard([[0, 0]]);
		board.add({ col: 0, row: 0, towerId: 'archer', grade: 'normal' });
		expect(summoner.requestSummon(board)).toEqual({
			kind: 'failed',
			reason: 'no-empty-tile',
		});
	});

	it('epic 등급 두 개는 합성 불가 — max-grade', () => {
		const merger = new MergeSystem();
		const board = new FakeBoard([
			[0, 0],
			[1, 0],
		]);
		board.add({ col: 0, row: 0, towerId: 'archer', grade: 'epic' });
		board.add({ col: 1, row: 0, towerId: 'archer', grade: 'epic' });
		const m = merger.tryMerge(board, 0, 0, 1, 0);
		expect(m).toEqual({ kind: 'failed', reason: 'max-grade' });
	});
});
