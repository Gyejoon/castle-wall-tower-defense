import type { PlacementFailureReason, WavePhase } from '@gld/shared';

interface PlacementGuardInput {
	phase: WavePhase;
}

export function getPlacementGuardFailure({
	phase,
}: PlacementGuardInput): PlacementFailureReason | null {
	if (phase === 'ended') {
		return 'combat_phase';
	}

	return null;
}
