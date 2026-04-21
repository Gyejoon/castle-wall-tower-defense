import type { Position } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PathFollower } from '../../src/systems/units/PathFollower';

function createGridManager(tileSize = 32) {
	return {
		orthoTile: tileSize,
		width: 10,
		height: 10,
		gridToWorld: vi.fn((x: number, y: number) => ({
			x: x * tileSize,
			y: y * tileSize,
		})),
		worldToGrid: vi.fn((x: number, y: number) => ({
			x: Math.floor(x / tileSize),
			y: Math.floor(y / tileSize),
		})),
		getDepth: vi.fn(() => 10),
	};
}

const LANE_A: Position[] = [
	{ x: 0, y: 0 },
	{ x: 1, y: 0 },
	{ x: 2, y: 0 },
	{ x: 3, y: 0 },
];

const LANE_B: Position[] = [
	{ x: 0, y: 2 },
	{ x: 1, y: 2 },
];

describe('PathFollower', () => {
	let grid: ReturnType<typeof createGridManager>;
	let follower: PathFollower;

	beforeEach(() => {
		grid = createGridManager();
		follower = new PathFollower(grid as never);
		follower.setPaths([LANE_A, LANE_B]);
	});

	describe('setPaths + accessors', () => {
		it('stores lane grid + precomputes world positions', () => {
			expect(follower.getLaneCount()).toBe(2);
			expect(follower.getLane(0)).toHaveLength(4);
			expect(follower.getLaneWorld(0)[0]).toEqual({ x: 0, y: 0 });
			expect(follower.getLaneWorld(0)[1]).toEqual({ x: 32, y: 0 });
		});

		it('falls back to lane 0 for unknown indices', () => {
			expect(follower.getLane(42)).toBe(follower.getLane(0));
		});
	});

	describe('register / unregister', () => {
		it('stores state keyed by unitId with correct defaults', () => {
			follower.register('u1', 0);
			const s = follower.get('u1');
			expect(s).toEqual({ laneIndex: 0, pathProgress: 0, pathIndex: 0 });
		});

		it('accepts initial pathIndex for mid-lane spawns', () => {
			follower.register('u2', 1, 3);
			const s = follower.get('u2');
			expect(s?.pathIndex).toBe(3);
			expect(s?.pathProgress).toBe(3);
		});

		it('unregister removes the entry', () => {
			follower.register('u1', 0);
			follower.unregister('u1');
			expect(follower.get('u1')).toBeUndefined();
		});
	});

	describe('findClosestLane / findClosestWaypointIndex', () => {
		it('picks lane whose start is nearest', () => {
			// LANE_A start (0,0) vs LANE_B start (0,2)
			expect(follower.findClosestLane({ x: 0, y: 0 })).toBe(0);
			expect(follower.findClosestLane({ x: 0, y: 3 })).toBe(1);
		});

		it('finds closest waypoint index within a lane', () => {
			expect(follower.findClosestWaypointIndex(0, { x: 2, y: 0 })).toBe(2);
			expect(follower.findClosestWaypointIndex(0, { x: 0, y: 0 })).toBe(0);
		});
	});

	describe('advance (mirrors UnitSystem update-loop movement)', () => {
		it('steps the unit forward by speed * dt (pixels) without snapping', () => {
			follower.register('u1', 0, 0);
			// Speed = 64 px/s, dt = 100ms = 0.1s → 6.4px step; segment is 32px so no snap.
			const result = follower.advance('u1', {
				worldX: 0,
				worldY: 0,
				speed: 64,
				dtMs: 100,
			});
			expect(result).not.toBeNull();
			expect(result?.worldX).toBeCloseTo(6.4);
			expect(result?.advancedWaypoint).toBe(false);
			expect(result?.reachedEnd).toBe(false);
			// pathProgress = 0 + frac, where frac = 6.4 / 32 = 0.2
			expect(result?.pathProgress).toBeCloseTo(0.2);
		});

		it('snaps to the next waypoint when dist < speed * dt', () => {
			follower.register('u1', 0, 0);
			// Unit at world (30, 0), target (32, 0) → dist = 2px.
			// speed = 64 px/s, dt = 100ms → step = 6.4px > 2px → snap.
			const result = follower.advance('u1', {
				worldX: 30,
				worldY: 0,
				speed: 64,
				dtMs: 100,
			});
			expect(result?.worldX).toBe(32);
			expect(result?.advancedWaypoint).toBe(true);
			expect(result?.gridPosition).toEqual({ x: 1, y: 0 });
			expect(follower.get('u1')?.pathIndex).toBe(1);
		});

		it('reports reachedEnd=true once the final waypoint is reached', () => {
			follower.register('u1', 0, 2);
			// pathIndex=2, lane has 4 waypoints → next target is (3,0).
			// Unit at (95, 0), target (96, 0) → snap to 3, pathIndex=3 (final).
			const result = follower.advance('u1', {
				worldX: 95,
				worldY: 0,
				speed: 64,
				dtMs: 100,
			});
			expect(result?.reachedEnd).toBe(true);
			expect(follower.get('u1')?.pathIndex).toBe(3);
		});

		it('projects pathProgress correctly mid-segment', () => {
			follower.register('u1', 0, 0);
			// Place unit half-way along segment [0,0] → [32,0]
			const result = follower.advance('u1', {
				worldX: 10,
				worldY: 0,
				speed: 0, // no movement — just recompute progress
				dtMs: 0,
			});
			// projection = 10 / 32 ≈ 0.3125
			expect(result?.pathProgress).toBeCloseTo(0.3125);
		});
	});

	describe('reassignToClosest', () => {
		it('snaps pathIndex to the closest waypoint, clamped to lane.length-2', () => {
			follower.register('u1', 0, 0);
			follower.reassignToClosest('u1', { x: 5, y: 0 }); // past lane end
			const s = follower.get('u1');
			// Lane has 4 waypoints → max pathIndex = 2 (length-2)
			expect(s?.pathIndex).toBe(2);
			expect(s?.pathProgress).toBe(2);
		});

		it('no-op if unit does not exist', () => {
			expect(() =>
				follower.reassignToClosest('missing', { x: 0, y: 0 }),
			).not.toThrow();
		});
	});

	describe('clear', () => {
		it('drops all state + lanes', () => {
			follower.register('u1', 0);
			follower.clear();
			expect(follower.get('u1')).toBeUndefined();
			expect(follower.getLaneCount()).toBe(0);
		});
	});
});
