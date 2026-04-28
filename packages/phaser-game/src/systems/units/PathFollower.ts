import type { Position } from '@gld/shared';
import type { GridManager } from '../GridManager';

export interface PathFollowerState {
	laneIndex: number;
	// 정수부는 현재 waypoint 인덱스, 소수부는 구간 [i, i+1]의 진행 비율.
	pathProgress: number;
	pathIndex: number;
}

export interface AdvanceInput {
	worldX: number;
	worldY: number;
	speed: number;
	dtMs: number;
}

export interface AdvanceResult {
	worldX: number;
	worldY: number;
	distToNextWaypoint: number;
	advancedWaypoint: boolean;
	reachedEnd: boolean;
	pathProgress: number;
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

	reassignToClosest(
		unitId: string,
		currentGridPos: { x: number; y: number },
	): void {
		const state = this.states.get(unitId);
		if (!state) return;
		const lane = this.getLane(state.laneIndex);
		if (lane.length === 0) return;
		const bestIdx = this.findClosestWaypointIndex(
			state.laneIndex,
			currentGridPos,
		);
		state.pathIndex = Math.min(bestIdx, Math.max(0, lane.length - 2));
		state.pathProgress = state.pathIndex;
	}

	advance(unitId: string, input: AdvanceInput): AdvanceResult | null {
		const state = this.states.get(unitId);
		if (!state) return null;
		const lane = this.getLane(state.laneIndex);
		const laneWorld = this.getLaneWorld(state.laneIndex);
		if (lane.length === 0) return null;

		const dt = input.dtMs / 1000;

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
			gridPosition = { x: lane[state.pathIndex].x, y: lane[state.pathIndex].y };
		} else {
			gridPosition = { x: nextGrid.x, y: nextGrid.y };
		}

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
