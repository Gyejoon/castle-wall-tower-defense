import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/EventBus', () => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
	},
}));

import { EventBus } from '../src/EventBus';
import { KillTransferSystem } from '../src/systems/KillTransferSystem';

type TransferUnitSystem = {
	queueTransferUnits: ReturnType<typeof vi.fn>;
};

const mockPlayerUnitSystem: TransferUnitSystem = {
	queueTransferUnits: vi.fn(),
};
const mockOpponentUnitSystem: TransferUnitSystem = {
	queueTransferUnits: vi.fn(),
};

describe('KillTransferSystem', () => {
	let system: KillTransferSystem;

	beforeEach(() => {
		vi.clearAllMocks();
		system = new KillTransferSystem(
			mockPlayerUnitSystem,
			mockOpponentUnitSystem,
		);
	});

	it('onPlayerKill queues transfer and emits event', () => {
		system.onPlayerKill('scout_drone');
		expect(EventBus.emit).toHaveBeenCalledWith('kill-transfer', {
			unitType: 'scout_drone',
			count: 1,
		});
	});

	it('onPlayerKill ignores invalid unit IDs', () => {
		system.onPlayerKill('nonexistent');
		expect(EventBus.emit).not.toHaveBeenCalled();
	});

	it('onOpponentKill queues transfer to player field', () => {
		system.onOpponentKill('battle_robot');
		expect(mockPlayerUnitSystem.queueTransferUnits).toHaveBeenCalledWith(
			'battle_robot',
			1,
		);
	});

	it('onOpponentKill ignores invalid unit IDs', () => {
		system.onOpponentKill('nonexistent');
		expect(mockPlayerUnitSystem.queueTransferUnits).not.toHaveBeenCalled();
	});

	it('flushTransfers sends queued kills to opponent', () => {
		system.onPlayerKill('scout_drone');
		system.onPlayerKill('battle_robot');
		system.flushTransfers();
		expect(mockOpponentUnitSystem.queueTransferUnits).toHaveBeenCalledWith(
			'scout_drone',
			1,
		);
		expect(mockOpponentUnitSystem.queueTransferUnits).toHaveBeenCalledWith(
			'battle_robot',
			1,
		);
	});

	it('flushTransfers clears the queue', () => {
		system.onPlayerKill('scout_drone');
		system.flushTransfers();
		mockOpponentUnitSystem.queueTransferUnits.mockClear();
		system.flushTransfers();
		expect(mockOpponentUnitSystem.queueTransferUnits).not.toHaveBeenCalled();
	});

	it('destroy clears transfer queue', () => {
		system.onPlayerKill('scout_drone');
		system.destroy();
		system.flushTransfers();
		expect(mockOpponentUnitSystem.queueTransferUnits).not.toHaveBeenCalled();
	});
});
