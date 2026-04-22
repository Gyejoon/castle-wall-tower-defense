import { describe, expect, it } from 'vitest';
import {
	getAllPathCells,
	getMapById,
	getMapPaths,
	getSpawnExitPairs,
	isMapUnlocked,
	MAP_REGISTRY,
	PHASE_A_LONG_MAP,
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

describe('PHASE_A_LONG_MAP (sole mode since Phase 7)', () => {
	it('map id is phase_a_long', () => {
		expect(PHASE_A_LONG_MAP.id).toBe('phase_a_long');
	});

	it('Phase A v2 uses the widened portrait board contract', () => {
		expect(PHASE_A_LONG_MAP.width).toBe(12);
		expect(PHASE_A_LONG_MAP.height).toBe(20);
		expect(PHASE_A_LONG_MAP.tilemapKey).toBe('tilemap-phase-a-long-v2');
	});

	it('Phase A v2 locks the path, buildable budget, and fortress contract exactly', () => {
		expect(PHASE_A_LONG_MAP.path.length).toBe(120);
		expect(PHASE_A_LONG_MAP.buildablePoints.length).toBe(66);
		expect(PHASE_A_LONG_MAP.spawnPoint).toEqual({ x: 0, y: 3 });
		expect(PHASE_A_LONG_MAP.exitPoint).toEqual({ x: 0, y: 12 });
		expect(PHASE_A_LONG_MAP.castleWallTiles).toEqual([{ x: 0, y: 12 }]);
	});

	it('path is continuous — each step is adjacent to the next', () => {
		const { path } = PHASE_A_LONG_MAP;
		for (let i = 0; i < path.length - 1; i++) {
			const cur = path[i];
			const next = path[i + 1];
			expect(Math.abs(next.x - cur.x) + Math.abs(next.y - cur.y)).toBe(1);
		}
	});

	it('spawnPoint and exitPoint align with path start/end', () => {
		expect(PHASE_A_LONG_MAP.path[0]).toEqual(PHASE_A_LONG_MAP.spawnPoint);
		expect(PHASE_A_LONG_MAP.path[PHASE_A_LONG_MAP.path.length - 1]).toEqual(
			PHASE_A_LONG_MAP.exitPoint,
		);
	});

	it('path zigzags with enough turns for merge-friendly tower placement', () => {
		expect(countTurns(PHASE_A_LONG_MAP.path)).toBeGreaterThanOrEqual(14);
	});

	it('all path/blocked/buildable coords are within grid bounds', () => {
		const { width, height, path, blockedPlacementPoints, buildablePoints } =
			PHASE_A_LONG_MAP;
		for (const p of [...path, ...blockedPlacementPoints, ...buildablePoints]) {
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThan(width);
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThan(height);
		}
	});

	it('buildable points never overlap path or blocked points', () => {
		const pathSet = new Set(PHASE_A_LONG_MAP.path.map((p) => `${p.x},${p.y}`));
		const blockedSet = new Set(
			PHASE_A_LONG_MAP.blockedPlacementPoints.map((p) => `${p.x},${p.y}`),
		);
		for (const p of PHASE_A_LONG_MAP.buildablePoints) {
			const key = `${p.x},${p.y}`;
			expect(pathSet.has(key)).toBe(false);
			expect(blockedSet.has(key)).toBe(false);
		}
	});

	it('MAP_REGISTRY and getMapById both resolve phase_a_long', () => {
		expect(MAP_REGISTRY.phase_a_long).toBe(PHASE_A_LONG_MAP);
		expect(getMapById('phase_a_long')).toBe(PHASE_A_LONG_MAP);
	});
});

describe('getMapPaths', () => {
	it('single-lane map returns [map.path]', () => {
		const paths = getMapPaths(PHASE_A_LONG_MAP);
		expect(paths).toHaveLength(1);
		expect(paths[0]).toBe(PHASE_A_LONG_MAP.path);
	});
});

describe('getAllPathCells', () => {
	it('returns the same array as path for single-lane maps', () => {
		const cells = getAllPathCells(PHASE_A_LONG_MAP);
		expect(cells).toBe(PHASE_A_LONG_MAP.path);
	});
});

describe('getSpawnExitPairs', () => {
	it('single-lane map returns 1 pair', () => {
		const pairs = getSpawnExitPairs(PHASE_A_LONG_MAP);
		expect(pairs).toHaveLength(1);
		expect(pairs[0].spawn).toEqual(PHASE_A_LONG_MAP.path[0]);
		expect(pairs[0].exit).toEqual(
			PHASE_A_LONG_MAP.path[PHASE_A_LONG_MAP.path.length - 1],
		);
	});
});

describe('isMapUnlocked', () => {
	it('maps without unlockLevel are always unlocked', () => {
		expect(isMapUnlocked(PHASE_A_LONG_MAP, 1)).toBe(true);
		expect(isMapUnlocked(PHASE_A_LONG_MAP, 0)).toBe(true);
	});
});

describe('MAP_REGISTRY', () => {
	it('contains only phase_a_long since Phase 7', () => {
		expect(Object.keys(MAP_REGISTRY)).toEqual(['phase_a_long']);
	});
});
