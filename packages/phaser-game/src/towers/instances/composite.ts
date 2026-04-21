import { FrostFamilyTower } from '../families/FrostFamilyTower';
import { SiegeFamilyTower } from '../families/SiegeFamilyTower';
import { registerTower } from '../registry';

/** Composite T5/T6 registrations. Legacy behavior reduces to each
 *  tower's dominant effect, because `isSlowSpecial`/`isStunSpecial` only
 *  match when `special` starts with their keyword:
 *  - hybrid_ab (splash_1.6)            → SiegeFamilyTower (arc + splash)
 *  - hybrid_cd (slow_80%_stun_600ms)   → FrostFamilyTower (beam + slow;
 *                                        stun suffix is vestigial)
 *  - ultimate (splash_2.5_slow_...)    → SiegeFamilyTower (arc + splash;
 *                                        slow/stun suffixes vestigial)
 *
 *  If future work adds compound-effect detection, replace these with
 *  explicit composite classes that layer behaviors. Until then, mirror
 *  legacy precisely. */
registerTower('hybrid_ab', (deps) => new SiegeFamilyTower(deps));
registerTower('hybrid_cd', (deps) => new FrostFamilyTower(deps));
registerTower('ultimate', (deps) => new SiegeFamilyTower(deps));
