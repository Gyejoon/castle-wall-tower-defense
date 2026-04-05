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
});

describe('findPath (standalone)', () => {
	it('경로가 있으면 Position 배열을 반환한다', () => {
		const path = findPath(openGrid(), { x: 0, y: 0 }, { x: 4, y: 4 });
		expect(path).not.toBeNull();
		expect(path![0]).toEqual({ x: 0, y: 0 });
		expect(path![path!.length - 1]).toEqual({ x: 4, y: 4 });
	});

	it('경로가 막히면 null을 반환한다', () => {
		const grid = openGrid(3, 3);
		grid[1][0] = 1;
		grid[1][1] = 1;
		grid[1][2] = 1;
		const path = findPath(grid, { x: 0, y: 0 }, { x: 0, y: 2 });
		expect(path).toBeNull();
	});
});
