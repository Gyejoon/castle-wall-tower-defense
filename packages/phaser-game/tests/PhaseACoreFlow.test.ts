import { describe, expect, it } from 'vitest';
import {
	RandomSummonSystem,
	type SummonPlacementContext,
} from '../src/systems/RandomSummonSystem';
import { SummonPoolSystem } from '../src/systems/SummonPoolSystem';

interface BoardTower {
	col: number;
	row: number;
	towerId: string;
}

class FakeBoard implements SummonPlacementContext {
	private towers: BoardTower[] = [];

	constructor(private readonly buildable: Array<[number, number]>) {}

	listBuildableTiles() {
		return this.buildable.map(([col, row]) => ({ col, row }));
	}

	isOccupied(col: number, row: number) {
		return this.towers.some((t) => t.col === col && t.row === row);
	}

	add(t: BoardTower) {
		this.towers.push(t);
	}

	count() {
		return this.towers.length;
	}
}

describe('Phase A core flow — summon (Phase 1, merge stubbed)', () => {
	it('archer 풀에서 두 번 소환하면 보드에 2개가 쌓인다', () => {
		const pool = new SummonPoolSystem(['archer'], () => 0);
		const summoner = new RandomSummonSystem(pool, () => 0);
		const board = new FakeBoard([
			[0, 0],
			[1, 0],
			[2, 0],
		]);

		const r1 = summoner.requestSummon(board);
		expect(r1.kind).toBe('success');
		if (r1.kind === 'success') {
			board.add({ col: r1.col, row: r1.row, towerId: r1.towerId });
		}

		const r2 = summoner.requestSummon(board);
		expect(r2.kind).toBe('success');
		if (r2.kind === 'success') {
			board.add({ col: r2.col, row: r2.row, towerId: r2.towerId });
		}
		expect(board.count()).toBe(2);
	});

	it('빈 칸이 모두 차면 다음 소환은 실패', () => {
		const pool = new SummonPoolSystem(['archer'], () => 0);
		const summoner = new RandomSummonSystem(pool, () => 0);
		const board = new FakeBoard([[0, 0]]);
		board.add({ col: 0, row: 0, towerId: 'archer' });
		expect(summoner.requestSummon(board)).toEqual({
			kind: 'failed',
			reason: 'no-empty-tile',
		});
	});
});
