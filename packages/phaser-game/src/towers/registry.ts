import type { TowerBehavior, TowerConstructorDeps, TowerFactory } from './types';

const FACTORIES = new Map<string, TowerFactory>();

/** Re-registering the same defId silently replaces the previous factory
 *  (last-write-wins, via Map.set semantics). Phase 2 migrations should
 *  import-once from ./instances to avoid accidental replacement in tests. */
export function registerTower(defId: string, factory: TowerFactory): void {
	FACTORIES.set(defId, factory);
}

export function createTower(defId: string, deps: TowerConstructorDeps): TowerBehavior | null {
	const factory = FACTORIES.get(defId);
	return factory ? factory(deps) : null;
}

export function hasTowerFactory(defId: string): boolean {
	return FACTORIES.has(defId);
}

/** Test-only helper for isolating registry state between specs. Matches the
 *  intent of existing boss-ai tests that side-effect-import per test. */
export function __resetTowerRegistry(): void {
	FACTORIES.clear();
}
