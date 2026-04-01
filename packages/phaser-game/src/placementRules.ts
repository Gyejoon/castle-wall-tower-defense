import type { PlacementFailureReason, WavePhase } from '@gld/shared';

interface PlacementGuardInput {
	phase: WavePhase;
	gold: number;
	towerCost: number;
}

export function getPlacementGuardFailure({
	phase,
	gold,
	towerCost,
}: PlacementGuardInput): PlacementFailureReason | null {
	if (phase === 'ended') {
		return 'combat_phase';
	}

	if (gold < towerCost) {
		return 'insufficient_gold';
	}

	return null;
}
