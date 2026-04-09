import type { BossBehavior, BossBehaviorFactory } from './types';

const FACTORIES = new Map<string, BossBehaviorFactory>();

export function registerBossBehavior(
	id: string,
	factory: BossBehaviorFactory,
): void {
	FACTORIES.set(id, factory);
}

export function createBossBehavior(id: string): BossBehavior | null {
	const factory = FACTORIES.get(id);
	return factory ? factory() : null;
}
