import type { EventBus as EventBusType } from '../../EventBus';
import { getPlacementGuardFailure } from '../../placementRules';
import type { DeckSystem } from '../../systems/DeckSystem';
import type { EnergySystem } from '../../systems/EnergySystem';
import type { PhaseAOrchestrator } from '../../systems/PhaseAOrchestrator';
import type { TowerSystem } from '../../systems/TowerSystem';
import type { WaveSystem } from '../../systems/WaveSystem';

type Emit = typeof EventBusType.emit;

interface PlacementCoordinatorDeps {
	towers: TowerSystem;
	energy: EnergySystem;
	deck: DeckSystem;
	orchestrator: PhaseAOrchestrator | undefined;
	waves: WaveSystem;
	emit: Emit;
	/**
	 * Called after a successful normal-path tower placement, *before*
	 * `tower-placed` (success) is emitted. Game.ts uses this to clear the
	 * range overlay + selection graphics so the HUD state matches the
	 * event-order the pre-Phase-5 inline code had.
	 */
	onBeforeSuccessEmit?: () => void;
	/**
	 * Called after a successful normal-path tower placement, once all
	 * `tower-placed` / `player-tower-count` events have fired. Game.ts uses
	 * this to refresh unit paths + field-renderer path chrome.
	 */
	onSuccess?: () => void;
	/**
	 * Called after a Phase A fast-path placement consumes the pending
	 * summon. Game.ts uses this to hide the buildable-zone + clear the
	 * selection overlay so the post-placement HUD matches the pre-Phase-5
	 * inline behavior.
	 */
	onPhaseAFastPath?: () => void;
}

/**
 * Owns the tower-placement decision flow. Extracted from `Game.ts.handlePlaceTower`
 * in Phase 5.
 *
 * Preserves the strict ordering the Phase 0 characterization pins
 * (`tests/characterization/PhaseASummonFlow.test.ts`):
 *
 *   1. Phase A fast-path (orchestrator.hasPendingSummon) — consumes no energy,
 *      emits no `tower-placed`. Returns immediately.
 *   2. Deck lookup — silent no-op if the tower isn't in the deck.
 *   3. Energy affordability check.
 *   4. Placement guard (phase rule).
 *   5. `towers.placeTower` call.
 *   6. Success: spend energy, clear selection, emit `tower-deselected`
 *      + `tower-placed` (success) + `player-tower-count`, run `onSuccess`.
 *
 * Failure paths emit a single `tower-placed` with `success: false` and the
 * specific reason, then return — no energy is spent, no downstream events.
 */
export class PlacementCoordinator {
	constructor(private readonly deps: PlacementCoordinatorDeps) {}

	place(col: number, row: number, towerDefId: string): void {
		const {
			towers,
			energy,
			deck,
			orchestrator,
			waves,
			emit,
			onBeforeSuccessEmit,
			onSuccess,
			onPhaseAFastPath,
		} = this.deps;

		// 1. Phase A fast-path — orchestrator owns energy + placement for
		// summoned towers. No deck lookup, no energy check, no tower-placed
		// event. The orchestrator emits its own lifecycle events.
		if (orchestrator?.hasPendingSummon()) {
			orchestrator.completePlacement(col, row);
			onPhaseAFastPath?.();
			return;
		}

		// 2. Deck lookup — silent return if the tower isn't in the deck.
		const card = deck.getCardByTowerId(towerDefId);
		if (!card) return;

		const energyCost = card.energyCost;

		// 3. Energy check.
		if (!energy.canAfford(energyCost)) {
			emit('tower-placed', {
				col,
				row,
				towerId: towerDefId,
				success: false,
				reason: 'insufficient_energy',
			});
			return;
		}

		// 4. Placement guard (phase rule).
		const guardFailure = getPlacementGuardFailure({
			phase: waves.getPhase(),
		});
		if (guardFailure) {
			emit('tower-placed', {
				col,
				row,
				towerId: towerDefId,
				success: false,
				reason: guardFailure,
			});
			return;
		}

		// 5. Actual placement.
		const placed = towers.placeTower(col, row, towerDefId);
		if (!placed.success) {
			emit('tower-placed', {
				col,
				row,
				towerId: towerDefId,
				success: false,
				reason: placed.reason,
			});
			return;
		}

		// 6. Success: spend, announce, refresh. Ordering mirrors the
		// pre-Phase-5 inline code in Game.ts.handlePlaceTower:
		//   spend → clear selection/overlay (onBeforeSuccessEmit) →
		//   tower-deselected → tower-placed(success) → player-tower-count →
		//   path refresh (onSuccess).
		energy.spend(energyCost);
		onBeforeSuccessEmit?.();
		emit('tower-deselected');
		emit('tower-placed', {
			col,
			row,
			towerId: towerDefId,
			success: true,
			energySpent: energyCost,
		});
		emit('player-tower-count', {
			count: towers.getTowers().length,
		});
		onSuccess?.();
	}

	destroy(): void {
		// No owned resources; placeholder for lifecycle symmetry with other
		// scene controllers (InputController, RangeOverlayController).
	}
}
