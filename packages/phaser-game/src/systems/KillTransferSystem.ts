import { UNITS } from '@gld/shared';
import { EventBus } from '../EventBus';
import type { UnitSystem } from './UnitSystem';

interface TransferQueue {
	unitId: string;
	count: number;
}

export class KillTransferSystem {
	private playerUnitSystem: UnitSystem;
	private opponentUnitSystem: UnitSystem;
	private transferQueue: TransferQueue[] = [];

	constructor(playerUnitSystem: UnitSystem, opponentUnitSystem: UnitSystem) {
		this.playerUnitSystem = playerUnitSystem;
		this.opponentUnitSystem = opponentUnitSystem;
	}

	/** Queue a unit kill transfer from player's side to opponent's side */
	onPlayerKill(unitDefId: string): void {
		const unitDef = UNITS.find((u) => u.id === unitDefId);
		if (!unitDef) return;

		// Queue the same unit type to spawn on opponent's side
		this.transferQueue.push({ unitId: unitDefId, count: 1 });
		EventBus.emit('kill-transfer', { unitType: unitDefId, count: 1 });
	}

	/** Queue a unit kill transfer from opponent's side to player's side */
	onOpponentKill(unitDefId: string): void {
		const unitDef = UNITS.find((u) => u.id === unitDefId);
		if (!unitDef) return;

		// Transfer to player's field
		this.playerUnitSystem.queueTransferUnits(unitDefId, 1);
	}

	/** Flush queued transfers to opponent */
	flushTransfers(): void {
		for (const transfer of this.transferQueue) {
			this.opponentUnitSystem.queueTransferUnits(
				transfer.unitId,
				transfer.count,
			);
		}
		this.transferQueue = [];
	}

	destroy(): void {
		this.transferQueue = [];
	}
}
