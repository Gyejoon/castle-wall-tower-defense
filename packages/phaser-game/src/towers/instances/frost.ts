import { FrostFamilyTower } from '../families/FrostFamilyTower';
import { registerTower } from '../registry';

registerTower('emp', (deps) => new FrostFamilyTower(deps));
registerTower('stasis_field', (deps) => new FrostFamilyTower(deps));
registerTower('disruptor', (deps) => new FrostFamilyTower(deps));
registerTower('world_tree', (deps) => new FrostFamilyTower(deps));
