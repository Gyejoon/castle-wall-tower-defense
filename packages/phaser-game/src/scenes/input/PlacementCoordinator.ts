import type { EventBus as EventBusType } from '../../EventBus';
import { getPlacementGuardFailure } from '../../placementRules';
import type { CoreOrchestrator } from '../../systems/CoreOrchestrator';
import type { DeckSystem } from '../../systems/DeckSystem';
import type { EnergySystem } from '../../systems/EnergySystem';
import type { TowerSystem } from '../../systems/TowerSystem';
import type { WaveSystem } from '../../systems/WaveSystem';

type Emit = typeof EventBusType.emit;

interface PlacementCoordinatorDeps {
	towers: TowerSystem;
	energy: EnergySystem;
	deck: DeckSystem;
	orchestrator: CoreOrchestrator | undefined;
	waves: WaveSystem;
	emit: Emit;
	onBeforeSuccessEmit?: () => void;
	onSuccess?: () => void;
	onFastPath?: () => void;
}

// 결정/이벤트 순서는 CoreSummonFlow.test.ts가 고정한다. 변경 시 동반 수정 필요.
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
			onFastPath,
		} = this.deps;

		// 정식 모드 소환은 orchestrator가 에너지·배치를 전담한다. tower-placed 미발행.
		if (orchestrator?.hasPendingSummon()) {
			orchestrator.completePlacement(col, row);
			onFastPath?.();
			return;
		}

		const card = deck.getCardByTowerId(towerDefId);
		if (!card) return;

		const energyCost = card.energyCost;

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

	destroy(): void {}
}
