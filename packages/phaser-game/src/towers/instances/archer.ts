import { ArcherFamilyTower } from '../families/ArcherFamilyTower';
import { registerTower } from '../registry';

registerTower('archer', (deps) => new ArcherFamilyTower(deps));
registerTower('wind_spire', (deps) => new ArcherFamilyTower(deps));
registerTower('flame_tower', (deps) => new ArcherFamilyTower(deps));
registerTower('arcane_spire', (deps) => new ArcherFamilyTower(deps));
