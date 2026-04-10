import { describe, expect, it } from 'vitest';
import {
	FOREST_GATE_MAP,
	getAllPathCells,
	getMapPaths,
	getSpawnExitPairs,
	isMapUnlocked,
	LAVA_FORTRESS_MAP,
	MAP_REGISTRY,
	STORM_CITADEL_MAP,
} from '../src/constants/maps';
import type { MapLayout } from '../src/types/map';

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

// ── getMapPaths ──────────────────────────────────────────────

describe('getMapPaths', () => {
	it('single-lane map returns [map.path]', () => {
		const paths = getMapPaths(FOREST_GATE_MAP);
		expect(paths).toHaveLength(1);
		expect(paths[0]).toBe(FOREST_GATE_MAP.path);
	});

	it('multi-lane map returns map.paths', () => {
		const lavaPaths = getMapPaths(LAVA_FORTRESS_MAP);
		expect(lavaPaths).toHaveLength(2);

		const stormPaths = getMapPaths(STORM_CITADEL_MAP);
		expect(stormPaths).toHaveLength(3);
	});
});

// ── getAllPathCells ───────────────────────────────────────────

describe('getAllPathCells', () => {
	it('single-lane returns same array as path', () => {
		const cells = getAllPathCells(FOREST_GATE_MAP);
		expect(cells).toBe(FOREST_GATE_MAP.path);
	});

	it('multi-lane returns deduplicated cells', () => {
		const lavaCells = getAllPathCells(LAVA_FORTRESS_MAP);
		const keys = lavaCells.map((p) => `${p.x},${p.y}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('multi-lane includes cells from all lanes', () => {
		const stormCells = getAllPathCells(STORM_CITADEL_MAP);
		const cellSet = new Set(stormCells.map((p) => `${p.x},${p.y}`));
		const paths = STORM_CITADEL_MAP.paths;
		expect(paths).toBeDefined();
		for (const lane of paths ?? []) {
			for (const p of lane) {
				expect(cellSet.has(`${p.x},${p.y}`)).toBe(true);
			}
		}
	});
});

// ── Multi-map data integrity ─────────────────────────────────

function assertPathContinuity(path: Array<{ x: number; y: number }>) {
	for (let i = 0; i < path.length - 1; i++) {
		const dx = Math.abs(path[i + 1].x - path[i].x);
		const dy = Math.abs(path[i + 1].y - path[i].y);
		expect(dx + dy).toBe(1);
	}
}

function assertBounds(
	positions: Array<{ x: number; y: number }>,
	width: number,
	height: number,
) {
	for (const p of positions) {
		expect(p.x).toBeGreaterThanOrEqual(0);
		expect(p.x).toBeLessThan(width);
		expect(p.y).toBeGreaterThanOrEqual(0);
		expect(p.y).toBeLessThan(height);
	}
}

describe.each([
	['lava_fortress', LAVA_FORTRESS_MAP],
	['storm_citadel', STORM_CITADEL_MAP],
])('%s map data integrity', (_id, map) => {
	it('all lanes are continuous (each step adjacent)', () => {
		const paths = getMapPaths(map);
		for (const lane of paths) {
			assertPathContinuity(lane);
		}
	});

	it('each lane connects spawn row (y=0) to exit row (y=height-1)', () => {
		const paths = getMapPaths(map);
		for (const lane of paths) {
			expect(lane[0].y).toBe(0);
			expect(lane[lane.length - 1].y).toBe(map.height - 1);
		}
	});

	it('no duplicate path cells across all lanes', () => {
		const allCells = getAllPathCells(map);
		const keys = allCells.map((p) => `${p.x},${p.y}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('all positions within grid bounds', () => {
		const allCells = getAllPathCells(map);
		assertBounds(allCells, map.width, map.height);
		assertBounds(map.buildablePoints, map.width, map.height);
		assertBounds(map.blockedPlacementPoints, map.width, map.height);
	});

	it('buildable points do not overlap path or blocked cells', () => {
		const pathSet = new Set(getAllPathCells(map).map((p) => `${p.x},${p.y}`));
		const blockedSet = new Set(
			map.blockedPlacementPoints.map((p) => `${p.x},${p.y}`),
		);
		for (const bp of map.buildablePoints) {
			const key = `${bp.x},${bp.y}`;
			expect(pathSet.has(key)).toBe(false);
			expect(blockedSet.has(key)).toBe(false);
		}
	});

	it('buildable + path + blocked cover the full grid (no gaps)', () => {
		const allCells = getAllPathCells(map);
		const covered = new Set<string>();
		for (const p of allCells) covered.add(`${p.x},${p.y}`);
		for (const p of map.buildablePoints) covered.add(`${p.x},${p.y}`);
		for (const p of map.blockedPlacementPoints) covered.add(`${p.x},${p.y}`);
		expect(covered.size).toBe(map.width * map.height);
	});

	it('map is 8x18', () => {
		expect(map.width).toBe(8);
		expect(map.height).toBe(18);
	});
});

describe('MAP_REGISTRY', () => {
	it('contains all three maps', () => {
		expect(Object.keys(MAP_REGISTRY)).toEqual(
			expect.arrayContaining(['forest_gate', 'lava_fortress', 'storm_citadel']),
		);
	});
});

describe('getSpawnExitPairs', () => {
	it('단일 경로 맵은 1개 pair를 반환한다', () => {
		const pairs = getSpawnExitPairs(FOREST_GATE_MAP);
		expect(pairs).toHaveLength(1);
		expect(pairs[0].spawn).toEqual(FOREST_GATE_MAP.path[0]);
		expect(pairs[0].exit).toEqual(
			FOREST_GATE_MAP.path[FOREST_GATE_MAP.path.length - 1],
		);
	});

	it('2경로 맵(lava)은 2개 pair를 반환한다', () => {
		const pairs = getSpawnExitPairs(LAVA_FORTRESS_MAP);
		expect(pairs).toHaveLength(2);
		// Lane A: spawn (1,0) → exit (3,17)
		expect(pairs[0].spawn).toEqual({ x: 1, y: 0 });
		expect(pairs[0].exit).toEqual({ x: 3, y: 17 });
		// Lane B: spawn (6,0) → exit (4,17)
		expect(pairs[1].spawn).toEqual({ x: 6, y: 0 });
		expect(pairs[1].exit).toEqual({ x: 4, y: 17 });
	});

	it('3경로 맵(storm)은 3개 pair를 반환한다', () => {
		const pairs = getSpawnExitPairs(STORM_CITADEL_MAP);
		expect(pairs).toHaveLength(3);
	});

	it('빈 lane은 필터링된다', () => {
		const fakeMap: MapLayout = {
			...FOREST_GATE_MAP,
			paths: [FOREST_GATE_MAP.path, [], [{ x: 0, y: 0 }]],
		};
		const pairs = getSpawnExitPairs(fakeMap);
		// 빈 lane과 1포인트 lane은 제외
		expect(pairs).toHaveLength(1);
	});
});

describe('isMapUnlocked', () => {
	it('unlockLevel이 없으면 항상 해금', () => {
		expect(isMapUnlocked(FOREST_GATE_MAP, 1)).toBe(true);
		expect(isMapUnlocked(FOREST_GATE_MAP, 0)).toBe(true);
	});

	it('레벨이 unlockLevel 미만이면 잠금', () => {
		expect(isMapUnlocked(LAVA_FORTRESS_MAP, 1)).toBe(false);
		expect(isMapUnlocked(LAVA_FORTRESS_MAP, 2)).toBe(false);
	});

	it('레벨이 unlockLevel 이상이면 해금', () => {
		expect(isMapUnlocked(LAVA_FORTRESS_MAP, 3)).toBe(true);
		expect(isMapUnlocked(LAVA_FORTRESS_MAP, 10)).toBe(true);
		expect(isMapUnlocked(STORM_CITADEL_MAP, 7)).toBe(true);
	});

	it('unlockLevel: 0 은 falsy 트랩 없이 레벨 0 이상이면 해금', () => {
		const mapWithZero: MapLayout = { ...FOREST_GATE_MAP, unlockLevel: 0 };
		expect(isMapUnlocked(mapWithZero, 0)).toBe(true);
		expect(isMapUnlocked(mapWithZero, 1)).toBe(true);
	});
});
