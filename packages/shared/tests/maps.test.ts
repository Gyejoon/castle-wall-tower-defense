import { describe, expect, it } from 'vitest';
import {
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	isMapUnlocked,
	MAIN_LONG_MAP,
	MAP_REGISTRY,
} from '../src/constants/maps';

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

describe('정식 모드 메인 맵', () => {
	it('map id is main_long', () => {
		expect(MAIN_LONG_MAP.id).toBe('main_long');
	});

	it('all lanes are visually continuous', () => {
		for (const path of getMapPaths(MAIN_LONG_MAP)) {
			for (let i = 0; i < path.length - 1; i++) {
				const cur = path[i];
				const next = path[i + 1];
				const dx = next.x - cur.x;
				const dy = next.y - cur.y;
				expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(2);
			}
		}
	});

	it('spawnPoint and exitPoint align with path start/end', () => {
		expect(MAIN_LONG_MAP.path[0]).toEqual(MAIN_LONG_MAP.spawnPoint);
		expect(MAIN_LONG_MAP.path[MAIN_LONG_MAP.path.length - 1]).toEqual(
			MAIN_LONG_MAP.exitPoint,
		);
	});

	it('path zigzags with enough turns for merge-friendly tower placement', () => {
		for (const path of getMapPaths(MAIN_LONG_MAP)) {
			expect(countTurns(path)).toBeGreaterThanOrEqual(8);
		}
	});

	it('all path/blocked/buildable coords are within grid bounds', () => {
		const { width, height, path, blockedPlacementPoints, buildablePoints } =
			MAIN_LONG_MAP;
		for (const p of [...path, ...blockedPlacementPoints, ...buildablePoints]) {
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThan(width);
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThan(height);
		}
	});

	it('buildable points never overlap path or blocked points', () => {
		const pathSet = new Set(MAIN_LONG_MAP.path.map((p) => `${p.x},${p.y}`));
		const blockedSet = new Set(
			MAIN_LONG_MAP.blockedPlacementPoints.map((p) => `${p.x},${p.y}`),
		);
		for (const p of MAIN_LONG_MAP.buildablePoints) {
			const key = `${p.x},${p.y}`;
			expect(pathSet.has(key)).toBe(false);
			expect(blockedSet.has(key)).toBe(false);
		}
	});

	it('MAP_REGISTRY and getMapById both resolve main_long', () => {
		expect(MAP_REGISTRY.main_long).toBe(MAIN_LONG_MAP);
		expect(getMapById('main_long')).toBe(MAIN_LONG_MAP);
	});
});

describe('getMapPaths', () => {
	it('main_long returns all illustrated lanes', () => {
		const paths = getMapPaths(MAIN_LONG_MAP);
		expect(paths).toHaveLength(4);
		expect(paths[0]).toBe(MAIN_LONG_MAP.path);
	});
});

describe('getAllPathCells', () => {
	it('deduplicates path cells across all lanes', () => {
		const cells = getAllPathCells(MAIN_LONG_MAP);
		const uniqueKeys = new Set(cells.map((point) => `${point.x},${point.y}`));

		expect(cells).toHaveLength(uniqueKeys.size);
		expect(cells.length).toBeGreaterThan(MAIN_LONG_MAP.path.length);
		for (const path of getMapPaths(MAIN_LONG_MAP)) {
			for (const point of path) {
				expect(uniqueKeys.has(`${point.x},${point.y}`)).toBe(true);
			}
		}
	});
});

describe('getSpawnExitPairs', () => {
	it('returns a spawn/exit pair per illustrated lane', () => {
		const pairs = getSpawnExitPairs(MAIN_LONG_MAP);
		const paths = getMapPaths(MAIN_LONG_MAP);

		expect(pairs).toHaveLength(paths.length);
		for (const [index, pair] of pairs.entries()) {
			const path = paths[index];
			expect(pair.spawn).toEqual(path[0]);
			expect(pair.exit).toEqual(path[path.length - 1]);
		}
	});
});

describe('isMapUnlocked', () => {
	it('maps without unlockLevel are always unlocked', () => {
		expect(isMapUnlocked(MAIN_LONG_MAP, 1)).toBe(true);
		expect(isMapUnlocked(MAIN_LONG_MAP, 0)).toBe(true);
	});
});

describe('MAP_REGISTRY', () => {
	it('contains only main_long since Phase 7', () => {
		expect(Object.keys(MAP_REGISTRY)).toEqual(['main_long']);
	});
});
