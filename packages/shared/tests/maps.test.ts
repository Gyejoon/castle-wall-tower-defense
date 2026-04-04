import { describe, expect, it } from 'vitest';
import { FOREST_GATE_MAP } from '../src/constants/maps';

function countTurns(path: Array<{ x: number; y: number }>): number {
	let turns = 0;
	for (let i = 1; i < path.length - 1; i++) {
		const prev = path[i - 1];
		const current = path[i];
		const next = path[i + 1];
		const dx1 = current.x - prev.x;
		const dy1 = current.y - prev.y;
		const dx2 = next.x - current.x;
		const dy2 = next.y - current.y;
		if (dx1 !== dx2 || dy1 !== dy2) {
			turns++;
		}
	}
	return turns;
}

describe('FOREST_GATE_MAP', () => {
	it('경로가 연속적이어야 한다 (각 단계가 다음 단계와 인접)', () => {
		const { path } = FOREST_GATE_MAP;
		for (let i = 0; i < path.length - 1; i++) {
			const current = path[i];
			const next = path[i + 1];
			const dx = Math.abs(next.x - current.x);
			const dy = Math.abs(next.y - current.y);
			expect(dx + dy).toBe(1);
		}
	});

	it('spawnPoint와 exitPoint가 경로 시작과 끝에 고정되어야 한다', () => {
		expect(FOREST_GATE_MAP.spawnPoint).toEqual({ x: 3, y: 0 });
		expect(FOREST_GATE_MAP.exitPoint).toEqual({ x: 4, y: 17 });
		expect(FOREST_GATE_MAP.path[0]).toEqual(FOREST_GATE_MAP.spawnPoint);
		expect(FOREST_GATE_MAP.path[FOREST_GATE_MAP.path.length - 1]).toEqual(
			FOREST_GATE_MAP.exitPoint,
		);
	});

	it('경로가 세로 포트레이트 레인으로 여러 번 꺾여야 한다', () => {
		expect(countTurns(FOREST_GATE_MAP.path)).toBeGreaterThanOrEqual(12);
	});

	it('맵 크기가 8x18이어야 한다', () => {
		expect(FOREST_GATE_MAP.width).toBe(8);
		expect(FOREST_GATE_MAP.height).toBe(18);
	});

	it('blocked placement에 spawn/exit과 코너 차단 타일이 포함되어야 한다', () => {
		expect(FOREST_GATE_MAP.blockedPlacementPoints).toContainEqual({
			x: 3,
			y: 0,
		});
		expect(FOREST_GATE_MAP.blockedPlacementPoints).toContainEqual({
			x: 4,
			y: 17,
		});
		expect(FOREST_GATE_MAP.blockedPlacementPoints).toContainEqual({
			x: 0,
			y: 0,
		});
		expect(FOREST_GATE_MAP.blockedPlacementPoints).toContainEqual({
			x: 7,
			y: 17,
		});
	});

	it('buildable points가 경로 및 blocked placement와 겹치지 않아야 한다', () => {
		const blockedSet = new Set(
			FOREST_GATE_MAP.blockedPlacementPoints.map((p) => `${p.x},${p.y}`),
		);
		const pathSet = new Set(FOREST_GATE_MAP.path.map((p) => `${p.x},${p.y}`));

		for (const point of FOREST_GATE_MAP.buildablePoints) {
			expect(pathSet.has(`${point.x},${point.y}`)).toBe(false);
			expect(blockedSet.has(`${point.x},${point.y}`)).toBe(false);
		}
	});

	it('buildable points가 레인 밖 타일에서 충분히 유지되어야 한다', () => {
		expect(FOREST_GATE_MAP.buildablePoints.length).toBeGreaterThan(16);
		expect(FOREST_GATE_MAP.buildablePoints).toContainEqual({ x: 1, y: 1 });
		expect(FOREST_GATE_MAP.buildablePoints).toContainEqual({ x: 6, y: 16 });
	});

	it('모든 위치가 경계 내에 있어야 한다 (0 ~ width-1, 0 ~ height-1)', () => {
		const {
			width,
			height,
			path,
			blockedPlacementPoints,
			buildablePoints,
			spawnPoint,
			exitPoint,
		} = FOREST_GATE_MAP;
		const allPositions = [
			...path,
			...blockedPlacementPoints,
			...buildablePoints,
			spawnPoint,
			exitPoint,
		];
		for (const pos of allPositions) {
			expect(pos.x).toBeGreaterThanOrEqual(0);
			expect(pos.x).toBeLessThan(width);
			expect(pos.y).toBeGreaterThanOrEqual(0);
			expect(pos.y).toBeLessThan(height);
		}
	});
});
