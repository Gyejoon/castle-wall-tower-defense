import type { Position } from '@gld/shared';
import type { GridManager } from '../GridManager';

/**
 * Phase 3 refactor — per-unit path/lane state extracted from UnitSystem.
 *
 * Holds each unit's lane assignment plus the continuous progress along
 * that lane. The actual world-space advancement (interpolating between
 * waypoints while moving `speed * dt` pixels per frame) is performed by
 * `advance`, mirroring the existing UnitSystem update-loop semantics
 * exactly.
 */
export interface PathFollowerState {
	laneIndex: number;
	/**
	 * Continuous 1D position along the lane — integer part is the current
	 * waypoint index, fractional part is how far along segment [i, i+1]
	 * the unit is (world-space projected fraction).
	 */
	pathProgress: number;
	/** Integer waypoint index — the same value stored on `ActiveUnit.pathIndex`. */
	pathIndex: number;
}

export interface AdvanceInput {
	/** Current world position of the unit. */
	worldX: number;
	worldY: number;
	/** Pixel-per-second speed to advance by. */
	speed: number;
	/** Frame delta in milliseconds. */
	dtMs: number;
}

export interface AdvanceResult {
	/** Updated world position after advancement. */
	worldX: number;
	worldY: number;
	/** Distance that was remaining to the next waypoint before this step. */
	distToNextWaypoint: number;
	/** True when the step crossed into the next waypoint this frame. */
	advancedWaypoint: boolean;
	/** After advancement: true if pathIndex reached the lane's final waypoint. */
	reachedEnd: boolean;
	/** Updated continuous path progress for the unit. */
	pathProgress: number;
	/** Updated integer grid position (the waypoint the unit is on or headed to). */
	gridPosition: { x: number; y: number };
}

export class PathFollower {
	private states = new Map<string, PathFollowerState>();
	private lanes: Position[][] = [];
	private lanesWorld: Array<Array<{ x: number; y: number }>> = [];

	constructor(private readonly gridManager: GridManager) {}

	setPaths(paths: Position[][]): void {
		this.lanes = paths;
		this.lanesWorld = paths.map((lane) =>
			lane.map((p) => this.gridManager.gridToWorld(p.x, p.y)),
		);
	}

	getLaneCount(): number {
		return this.lanes.length;
	}

	getLane(laneIndex: number): Position[] {
		return this.lanes[laneIndex] ?? this.lanes[0] ?? [];
	}

	getLaneWorld(laneIndex: number): Array<{ x: number; y: number }> {
		return this.lanesWorld[laneIndex] ?? this.lanesWorld[0] ?? [];
	}

	/** Pick the lane whose start grid-cell is closest to `position`. */
	findClosestLane(position: { x: number; y: number }): number {
		if (this.lanes.length <= 1) return 0;
		let bestIdx = 0;
		let bestDist = Infinity;
		for (let i = 0; i < this.lanes.length; i++) {
			const start = this.lanes[i][0];
			if (!start) continue;
			const dx = start.x - position.x;
			const dy = start.y - position.y;
			const d = dx * dx + dy * dy;
			if (d < bestDist) {
				bestDist = d;
				bestIdx = i;
			}
		}
		return bestIdx;
	}

	/** Find the closest waypoint index on `lane` to `currentGridPos`. */
	findClosestWaypointIndex(
		laneIndex: number,
		currentGridPos: { x: number; y: number },
	): number {
		const lane = this.getLane(laneIndex);
		if (lane.length === 0) return 0;
		let bestIdx = 0;
		let bestDist = Infinity;
		for (let i = 0; i < lane.length; i++) {
			const dx = lane[i].x - currentGridPos.x;
			const dy = lane[i].y - currentGridPos.y;
			const d = dx * dx + dy * dy;
			if (d < bestDist) {
				bestDist = d;
				bestIdx = i;
			}
		}
		return bestIdx;
	}

	register(
		unitId: string,
		laneIndex: number,
		initialPathIndex = 0,
	): PathFollowerState {
		const state: PathFollowerState = {
			laneIndex,
			pathProgress: initialPathIndex,
			pathIndex: initialPathIndex,
		};
		this.states.set(unitId, state);
		return state;
	}

	get(unitId: string): PathFollowerState | undefined {
		return this.states.get(unitId);
	}

	unregister(unitId: string): void {
		this.states.delete(unitId);
	}

	/** Reassign a unit to its closest waypoint on its current lane.
	 *  Used by UnitSystem.setPaths to keep units on the path after
	 *  a tower placement invalidates routing. */
	reassignToClosest(
		unitId: string,
		currentGridPos: { x: number; y: number },
	): void {
		const state = this.states.get(unitId);
		if (!state) return;
		const lane = this.getLane(state.laneIndex);
		if (lane.length === 0) return;
		const bestIdx = this.findClosestWaypointIndex(state.laneIndex, currentGridPos);
		state.pathIndex = Math.min(bestIdx, Math.max(0, lane.length - 2));
		state.pathProgress = state.pathIndex;
	}

	/**
	 * Advance a unit along its lane in world-space by `speed * dt / 1000`
	 * pixels. Mirrors the advancement logic from the original
	 * `UnitSystem.update` loop exactly:
	 *
	 * 1. If `dist < speed * dt`, snap to the next waypoint and increment
	 *    `pathIndex`. Otherwise step by `(dx/dist, dy/dist) * speed * dt`.
	 * 2. Recompute `pathProgress` from the world-space projection onto the
	 *    current segment.
	 *
	 * Returns the updated world position and whether the unit crossed
	 * into a new waypoint. `reachedEnd` is true when `pathIndex >= lane.length - 1`.
	 */
	advance(unitId: string, input: AdvanceInput): AdvanceResult | null {
		const state = this.states.get(unitId);
		if (!state) return null;
		const lane = this.getLane(state.laneIndex);
		const laneWorld = this.getLaneWorld(state.laneIndex);
		if (lane.length === 0) return null;

		const dt = input.dtMs / 1000;

		// Already at or past the final waypoint.
		if (state.pathIndex >= lane.length - 1) {
			return {
				worldX: input.worldX,
				worldY: input.worldY,
				distToNextWaypoint: 0,
				advancedWaypoint: false,
				reachedEnd: true,
				pathProgress: state.pathProgress,
				gridPosition: {
					x: lane[lane.length - 1].x,
					y: lane[lane.length - 1].y,
				},
			};
		}

		const nextGrid = lane[state.pathIndex + 1];
		const targetWorld = laneWorld[state.pathIndex + 1];
		const dx = targetWorld.x - input.worldX;
		const dy = targetWorld.y - input.worldY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		let worldX = input.worldX;
		let worldY = input.worldY;
		let advancedWaypoint = false;
		let gridPosition = { x: 0, y: 0 };

		if (dist < input.speed * dt) {
			worldX = targetWorld.x;
			worldY = targetWorld.y;
			state.pathIndex += 1;
			gridPosition = { x: nextGrid.x, y: nextGrid.y };
			advancedWaypoint = true;
		} else if (dist > 0) {
			worldX += (dx / dist) * input.speed * dt;
			worldY += (dy / dist) * input.speed * dt;
			// gridPosition unchanged — caller keeps its current value when no
			// waypoint was crossed; fall back to the current waypoint cell.
			gridPosition = { x: lane[state.pathIndex].x, y: lane[state.pathIndex].y };
		} else {
			gridPosition = { x: nextGrid.x, y: nextGrid.y };
		}

		// Recompute pathProgress (mirror original loop's projection logic).
		const curIdx = state.pathIndex;
		if (curIdx < laneWorld.length - 1) {
			const segStart = laneWorld[curIdx];
			const segEnd = laneWorld[curIdx + 1];
			const segDx = segEnd.x - segStart.x;
			const segDy = segEnd.y - segStart.y;
			const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
			if (segLen > 0) {
				const unitDx = worldX - segStart.x;
				const unitDy = worldY - segStart.y;
				const proj = (unitDx * segDx + unitDy * segDy) / segLen;
				const frac = Math.max(0, Math.min(1, proj / segLen));
				state.pathProgress = curIdx + frac;
			} else {
				state.pathProgress = curIdx;
			}
		} else {
			state.pathProgress = curIdx;
		}

		return {
			worldX,
			worldY,
			distToNextWaypoint: dist,
			advancedWaypoint,
			reachedEnd: state.pathIndex >= lane.length - 1,
			pathProgress: state.pathProgress,
			gridPosition,
		};
	}

	clear(): void {
		this.states.clear();
		this.lanes = [];
		this.lanesWorld = [];
	}
}
