// Side-effect import: populates the tower registry with every migrated
// family. Imported before the public exports so any consumer of
// `'../towers'` (TowerSystem) sees a ready registry.
import './instances';

export * from './types';
export {
	__resetTowerRegistry,
	createTower,
	hasTowerFactory,
	registerTower,
} from './registry';
export { BaseTower } from './BaseTower';
export { TowerVfxController } from './vfx/TowerVfxController';
