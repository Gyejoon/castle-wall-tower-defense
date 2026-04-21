import { FrostFamilyTower } from '../families/FrostFamilyTower';
import { SiegeFamilyTower } from '../families/SiegeFamilyTower';
import { registerTower } from '../registry';

// T5/T6는 special 접두사의 주 효과만 적용된다. 부가 접두사(stun/slow suffix)는 vestigial.
registerTower('hybrid_ab', (deps) => new SiegeFamilyTower(deps));
registerTower('hybrid_cd', (deps) => new FrostFamilyTower(deps));
registerTower('ultimate', (deps) => new SiegeFamilyTower(deps));
