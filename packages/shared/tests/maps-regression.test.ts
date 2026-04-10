import { describe, expect, it } from 'vitest';
import {
	FOREST_GATE_MAP,
	LAVA_FORTRESS_MAP,
	STORM_CITADEL_MAP,
} from '../src/maps';
import snapshot from './__snapshots__/maps-regression.json';

describe('map regression (post-Tiled migration)', () => {
	it('forest_gate path matches pre-migration shape', () => {
		expect(FOREST_GATE_MAP.path.length).toBe(snapshot.forest_gate.pathLength);
		expect(FOREST_GATE_MAP.spawnPoint).toEqual(snapshot.forest_gate.spawn);
		expect(FOREST_GATE_MAP.exitPoint).toEqual(snapshot.forest_gate.exit);
		expect(FOREST_GATE_MAP.buildablePoints).toHaveLength(
			snapshot.forest_gate.buildableCount,
		);
	});

	it('lava_fortress keeps 2 lanes and buildable count', () => {
		expect(LAVA_FORTRESS_MAP.paths).toHaveLength(
			snapshot.lava_fortress.laneCount,
		);
		expect(LAVA_FORTRESS_MAP.spawnPoint).toEqual(snapshot.lava_fortress.spawn);
		expect(LAVA_FORTRESS_MAP.exitPoint).toEqual(snapshot.lava_fortress.exit);
		expect(LAVA_FORTRESS_MAP.buildablePoints).toHaveLength(
			snapshot.lava_fortress.buildableCount,
		);
	});

	it('storm_citadel keeps 3 lanes and buildable count', () => {
		expect(STORM_CITADEL_MAP.paths).toHaveLength(
			snapshot.storm_citadel.laneCount,
		);
		expect(STORM_CITADEL_MAP.spawnPoint).toEqual(snapshot.storm_citadel.spawn);
		expect(STORM_CITADEL_MAP.exitPoint).toEqual(snapshot.storm_citadel.exit);
		expect(STORM_CITADEL_MAP.buildablePoints).toHaveLength(
			snapshot.storm_citadel.buildableCount,
		);
	});

	it('forest_gate terrain is all plain or road', () => {
		for (const row of FOREST_GATE_MAP.terrain) {
			for (const cell of row) {
				expect(['plain', 'road']).toContain(cell);
			}
		}
	});
});
