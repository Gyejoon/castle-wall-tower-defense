import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHASE_A_LONG_MAP } from '../src/constants/maps';

describe('phase-a-long-v2 overlay fixture', () => {
	it('matches the code-owned map contract', () => {
		const overlayPath = path.resolve(
			import.meta.dirname,
			'../../web-shell/public/assets/maps/phase-a-long-v2-overlay.json',
		);
		const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'));

		expect(overlay.mapId).toBe(PHASE_A_LONG_MAP.id);
		expect(overlay.version).toBe(1);
		expect(overlay.path).toEqual(PHASE_A_LONG_MAP.path);
		expect(overlay.buildablePoints).toEqual(PHASE_A_LONG_MAP.buildablePoints);
		expect(overlay.blockedPlacementPoints).toEqual(
			PHASE_A_LONG_MAP.blockedPlacementPoints,
		);
		expect(overlay.obstacles).toEqual(PHASE_A_LONG_MAP.obstacles ?? []);
		expect(overlay.spawnPoint).toEqual(PHASE_A_LONG_MAP.spawnPoint);
		expect(overlay.exitPoint).toEqual(PHASE_A_LONG_MAP.exitPoint);
	});
});
