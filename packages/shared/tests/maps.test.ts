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

function bucketPlacementPoints(
	points: Array<{ x: number; y: number }>,
	path: Array<{ x: number; y: number }>,
) {
	const segmentSize = Math.ceil(path.length / 3);
	const buckets = { early: 0, mid: 0, late: 0 };

	for (const point of points) {
		let nearestPathIndex = -1;
		let nearestDistance = Number.POSITIVE_INFINITY;

		for (let i = 0; i < path.length; i++) {
			const distance =
				Math.abs(point.x - path[i].x) + Math.abs(point.y - path[i].y);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestPathIndex = i;
			}
		}

		if (nearestPathIndex < segmentSize) {
			buckets.early++;
		} else if (nearestPathIndex < segmentSize * 2) {
			buckets.mid++;
		} else {
			buckets.late++;
		}
	}

	return buckets;
}

describe('FOREST_GATE_MAP', () => {
	it('경로가 연속적이어야 한다 (각 단계가 다음 단계와 인접)', () => {
		const { path } = FOREST_GATE_MAP;
		for (let i = 0; i < path.length - 1; i++) {
			const current = path[i];
			const next = path[i + 1];
			const dx = Math.abs(next.x - current.x);
			const dy = Math.abs(next.y - current.y);
			expect(dx + dy).toBe(1); // 인접한 타일은 맨해튼 거리 1
		}
	});

	it('spawnPoint가 경로의 첫 번째 원소와 일치해야 한다', () => {
		const { path, spawnPoint } = FOREST_GATE_MAP;
		expect(spawnPoint).toEqual(path[0]);
	});

	it('exitPoint가 경로의 마지막 원소와 일치해야 한다', () => {
		const { path, exitPoint } = FOREST_GATE_MAP;
		expect(exitPoint).toEqual(path[path.length - 1]);
	});

	it('경로가 지그재그 협곡 루트로 3회 이상 꺾여야 한다', () => {
		expect(countTurns(FOREST_GATE_MAP.path)).toBeGreaterThanOrEqual(3);
	});

	it('spawn과 exit가 경계에 붙은 채 지그재그 루트를 형성해야 한다', () => {
		expect(FOREST_GATE_MAP.spawnPoint).toEqual({ x: 0, y: 6 });
		expect(FOREST_GATE_MAP.exitPoint).toEqual({ x: 11, y: 4 });
		expect(FOREST_GATE_MAP.path[0]).toEqual(FOREST_GATE_MAP.spawnPoint);
		expect(FOREST_GATE_MAP.path[FOREST_GATE_MAP.path.length - 1]).toEqual(
			FOREST_GATE_MAP.exitPoint,
		);
	});

	it('배치 포인트가 경로와 겹치지 않아야 한다', () => {
		const { path, placementPoints } = FOREST_GATE_MAP;
		const pathSet = new Set(path.map((p) => `${p.x},${p.y}`));
		for (const point of placementPoints) {
			expect(pathSet.has(`${point.x},${point.y}`)).toBe(false);
		}
	});

	it('모든 배치 포인트가 최소 하나의 경로 타일과 인접해야 한다', () => {
		const { path, placementPoints } = FOREST_GATE_MAP;
		const pathSet = new Set(path.map((p) => `${p.x},${p.y}`));
		const isAdjacentToPath = (x: number, y: number): boolean => {
			return (
				pathSet.has(`${x},${y - 1}`) ||
				pathSet.has(`${x},${y + 1}`) ||
				pathSet.has(`${x - 1},${y}`) ||
				pathSet.has(`${x + 1},${y}`)
			);
		};
		for (const point of placementPoints) {
			expect(isAdjacentToPath(point.x, point.y)).toBe(true);
		}
	});

	it('모든 위치가 경계 내에 있어야 한다 (0 ~ width-1, 0 ~ height-1)', () => {
		const { width, height, path, placementPoints, spawnPoint, exitPoint } =
			FOREST_GATE_MAP;
		const allPositions = [...path, ...placementPoints, spawnPoint, exitPoint];
		for (const pos of allPositions) {
			expect(pos.x).toBeGreaterThanOrEqual(0);
			expect(pos.x).toBeLessThan(width);
			expect(pos.y).toBeGreaterThanOrEqual(0);
			expect(pos.y).toBeLessThan(height);
		}
	});

	it('배치 포인트가 15개여야 한다', () => {
		expect(FOREST_GATE_MAP.placementPoints).toHaveLength(15);
	});

	it('배치 포인트가 초반/중반/후반 구간에 모두 분산되어야 한다', () => {
		expect(
			bucketPlacementPoints(
				FOREST_GATE_MAP.placementPoints,
				FOREST_GATE_MAP.path,
			),
		).toEqual({
			early: expect.any(Number),
			mid: expect.any(Number),
			late: expect.any(Number),
		});

		const buckets = bucketPlacementPoints(
			FOREST_GATE_MAP.placementPoints,
			FOREST_GATE_MAP.path,
		);
		expect(buckets.early).toBeGreaterThanOrEqual(4);
		expect(buckets.mid).toBeGreaterThanOrEqual(4);
		expect(buckets.late).toBeGreaterThanOrEqual(4);
	});

	it('맵 크기가 12x8이어야 한다', () => {
		expect(FOREST_GATE_MAP.width).toBe(12);
		expect(FOREST_GATE_MAP.height).toBe(8);
	});
});
