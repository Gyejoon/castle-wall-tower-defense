import { SiegeFamilyTower } from '../families/SiegeFamilyTower';
import { registerTower } from '../registry';
import { NovaCannonT1 } from './NovaCannonT1';

registerTower('nova_cannon', (deps) => new NovaCannonT1(deps));
registerTower('fortress', (deps) => new SiegeFamilyTower(deps));
registerTower('earth_golem', (deps) => new SiegeFamilyTower(deps));
registerTower('celestial', (deps) => new SiegeFamilyTower(deps));
