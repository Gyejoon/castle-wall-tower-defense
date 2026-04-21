import type { GridManager } from '../../systems/GridManager';
import type { TargetingStrategy, UnitSnapshot } from '../types';

/** Pick the in-range living unit whose grid-distance-squared is smallest.
 *  Mirrors the legacy targeting loop in `TowerSystem.update()` at
 *  TowerSystem.ts:671-684. */
export class NearestInRange implements TargetingStrategy {
	pick(
		towerGrid: { x: number; y: number },
		rangeSq: number,
		units: readonly UnitSnapshot[],
		gridManager: GridManager,
	): UnitSnapshot | null {
		let closest: UnitSnapshot | null = null;
		let closestDistSq = Infinity;
		for (const unit of units) {
			if (unit.hp <= 0) continue;
			const unitGrid = gridManager.worldToGridFloat(unit.x, unit.y);
			const gdx = towerGrid.x - unitGrid.x;
			const gdy = towerGrid.y - unitGrid.y;
			const gridDistSq = gdx * gdx + gdy * gdy;
			if (gridDistSq <= rangeSq && gridDistSq < closestDistSq) {
				closestDistSq = gridDistSq;
				closest = unit;
			}
		}
		return closest;
	}
}
