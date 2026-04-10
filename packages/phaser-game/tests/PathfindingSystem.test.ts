import { describe, expect, it } from 'vitest';
import { findPath, PathfindingSystem } from '../src/systems/PathfindingSystem';

// 5x5 open grid (0 = walkable, 1 = blocked)
function openGrid(w = 5, h = 5): number[][] {
	return Array.from({ length: h }, () => Array(w).fill(0));
}

describe('PathfindingSystem.validateAllPaths', () => {
	it('모든 경로가 열려 있으면 true를 반환한다', () => {
		const sys = new PathfindingSystem();
		const grid = openGrid();
		const pairs = [
			{ spawn: { x: 0, y: 0 }, exit: { x: 4, y: 4 } },
			{ spawn: { x: 4, y: 0 }, exit: { x: 0, y: 4 } },
		];
		expect(sys.validateAllPaths(grid, pairs)).toBe(true);
	});

	it('하나의 경로가 막히면 false를 반환한다', () => {
		const sys = new PathfindingSystem();
		const grid = openGrid();
		// Block entire row 2 — no way through for any path
		grid[2][0] = 1;
		grid[2][1] = 1;
		grid[2][2] = 1;
		grid[2][3] = 1;
		grid[2][4] = 1;

		const pairs = [
			{ spawn: { x: 0, y: 0 }, exit: { x: 0, y: 4 } }, // blocked by wall
			{ spawn: { x: 4, y: 0 }, exit: { x: 4, y: 4 } }, // also blocked
		];
		expect(sys.validateAllPaths(grid, pairs)).toBe(false);
	});

	it('하나의 경로만 막히고 다른 경로는 열려 있어도 false를 반환한다', () => {
		const sys = new PathfindingSystem();
		// 4x4 grid, block column 3 completely
		const grid = openGrid(4, 4);
		grid[0][3] = 1;
		grid[1][3] = 1;
		grid[2][3] = 1;
		grid[3][3] = 1;

		const pairs = [
			{ spawn: { x: 0, y: 0 }, exit: { x: 0, y: 3 } }, // open
			{ spawn: { x: 3, y: 0 }, exit: { x: 3, y: 3 } }, // blocked (start is blocked)
		];
		expect(sys.validateAllPaths(grid, pairs)).toBe(false);
	});

	it('빈 pairs 배열이면 true를 반환한다', () => {
		const sys = new PathfindingSystem();
		expect(sys.validateAllPaths(openGrid(), [])).toBe(true);
	});

	it('validateAllPaths도 costGrid를 사용해 비싼 경로를 우회한다', () => {
		const sys = new PathfindingSystem();
		const grid = openGrid(3, 3);
		const costGrid = [
			[1, 50, 1],
			[1, 1, 1],
			[1, 1, 1],
		];
		const pairs = [{ spawn: { x: 0, y: 0 }, exit: { x: 2, y: 0 } }];
		expect(sys.validateAllPaths(grid, pairs, costGrid)).toBe(true);
		expect(
			sys.findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }, costGrid),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
			{ x: 2, y: 0 },
		]);
	});

	it('invalidateCache 후 costGrid가 다르면 새 경로를 계산한다', () => {
		const sys = new PathfindingSystem();
		const grid = openGrid(3, 3);
		const cheapTop = [
			[1, 1, 1],
			[50, 50, 50],
			[1, 1, 1],
		];
		const cheapBottom = [
			[1, 50, 1],
			[1, 1, 1],
			[1, 1, 1],
		];
		const first = sys.findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }, cheapTop);
		sys.invalidateCache();
		const second = sys.findPath(
			grid,
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			cheapBottom,
		);
		expect(first).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
		]);
		expect(second).toEqual([
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
			{ x: 2, y: 0 },
		]);
	});
});

describe('findPath (standalone)', () => {
	it('경로가 있으면 Position 배열을 반환한다', () => {
		const path = findPath(openGrid(), { x: 0, y: 0 }, { x: 4, y: 4 });
		expect(path).not.toBeNull();
		expect(path?.[0]).toEqual({ x: 0, y: 0 });
		expect(path?.[path?.length - 1]).toEqual({ x: 4, y: 4 });
	});

	it('경로가 막히면 null을 반환한다', () => {
		const grid = openGrid(3, 3);
		grid[1][0] = 1;
		grid[1][1] = 1;
		grid[1][2] = 1;
		const path = findPath(grid, { x: 0, y: 0 }, { x: 0, y: 2 });
		expect(path).toBeNull();
	});

	it('costGrid가 주어지면 더 싼 경로를 선택한다', () => {
		const grid = openGrid(3, 3);
		const costGrid = [
			[1, 50, 1],
			[1, 1, 1],
			[1, 1, 1],
		];
		const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }, costGrid);
		expect(path).toEqual([
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
			{ x: 2, y: 0 },
		]);
	});

	it('costGrid의 Infinity는 추가 차단 타일로 취급한다', () => {
		const grid = openGrid(3, 2);
		const costGrid = [
			[1, Number.POSITIVE_INFINITY, 1],
			[1, 1, 1],
		];
		const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }, costGrid);
		expect(path).toEqual([
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
			{ x: 2, y: 0 },
		]);
	});
});
