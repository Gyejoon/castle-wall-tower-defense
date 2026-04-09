import type { WorldId } from '@gld/shared';
import type { GimmickContext, GimmickFactory, WorldGimmick } from './types';

const FACTORIES = new Map<WorldId, GimmickFactory>();

export function registerGimmickFactory(
	worldId: WorldId,
	factory: GimmickFactory,
): void {
	FACTORIES.set(worldId, factory);
}

export function createWorldGimmick(
	worldId: WorldId,
	ctx: GimmickContext,
): WorldGimmick | null {
	const factory = FACTORIES.get(worldId);
	return factory ? factory(ctx) : null;
}
