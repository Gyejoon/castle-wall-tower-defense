import { StunFamilyTower } from '../families/StunFamilyTower';
import { registerTower } from '../registry';

registerTower('shield', (deps) => new StunFamilyTower(deps));
registerTower('twin_archer', (deps) => new StunFamilyTower(deps));
registerTower('holy_shrine', (deps) => new StunFamilyTower(deps));
registerTower('divine_throne', (deps) => new StunFamilyTower(deps));
