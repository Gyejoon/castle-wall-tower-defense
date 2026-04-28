import type {
	TowerBehavior,
	TowerConstructorDeps,
	TowerFactory,
} from './types';

const FACTORIES = new Map<string, TowerFactory>();

// 동일 defId 재등록은 조용히 덮어쓴다 (last-write-wins).
export function registerTower(defId: string, factory: TowerFactory): void {
	FACTORIES.set(defId, factory);
}

export function createTower(
	defId: string,
	deps: TowerConstructorDeps,
): TowerBehavior | null {
	const factory = FACTORIES.get(defId);
	return factory ? factory(deps) : null;
}

export function hasTowerFactory(defId: string): boolean {
	return FACTORIES.has(defId);
}

// 테스트 격리용 헬퍼.
export function __resetTowerRegistry(): void {
	FACTORIES.clear();
}
