import { describe, expect, it } from 'vitest';
import { createBossBehavior } from '../../src/systems/boss-ai/registry';
// Side-effect registrations — importing the module files wires each boss into
// the registry. Without these, createBossBehavior() returns null.
import '../../src/systems/boss-ai/orcWarlord';
import '../../src/systems/boss-ai/forgeMaster';
import '../../src/systems/boss-ai/corruptedArchmage';
import '../../src/systems/boss-ai/dragon';

/**
 * Pure predicate lifted from `Game.ts:1146-1161` (the `processCombatField`
 * CC-immunity guard). Extracting it here lets the characterization suite pin
 * the rule without instantiating the Game scene — when Phase 5/6 moves this
 * logic into a dedicated runtime module, the new home can pass the same
 * invariants.
 *
 * Game.ts shape today:
 *   if (evt.slow) {
 *     const behavior = bossBehaviors.get(evt.unitId);
 *     if (!behavior?.isCcImmune()) unitSystem.applySlow(...);
 *   }
 *   if (evt.stun) {
 *     const behavior = bossBehaviors.get(evt.unitId);
 *     if (!behavior?.isCcImmune()) unitSystem.applyStun(...);
 *   }
 */
function shouldApplyCc(
	evt: { stun?: unknown; slow?: unknown },
	behavior: { isCcImmune: () => boolean } | undefined,
): boolean {
	if (!evt.stun && !evt.slow) return false;
	return !behavior?.isCcImmune();
}

// The 4 bosses wired into the registry today. Expected immunity values are
// hard-coded from the concrete implementations so a regression in any single
// file surfaces here immediately rather than silently through the boss test
// suite.
const BOSSES: Array<{ id: string; expectedImmune: boolean }> = [
	{ id: 'orc_warlord', expectedImmune: false },
	{ id: 'forge_master', expectedImmune: false },
	{ id: 'corrupted_archmage', expectedImmune: true },
	// Dragon deliberately returns false from isCcImmune — the 80% bossCcResist
	// on the unit def shortens durations instead. See dragon.ts:37-45.
	{ id: 'dragon', expectedImmune: false },
];

describe('processCombatField CC guard (characterization)', () => {
	for (const boss of BOSSES) {
		it(`${boss.id} isCcImmune() returns ${boss.expectedImmune}`, () => {
			const behavior = createBossBehavior(boss.id);
			expect(behavior).not.toBeNull();
			expect(behavior?.isCcImmune()).toBe(boss.expectedImmune);
		});
	}

	it('shouldApplyCc returns false when no CC event is present', () => {
		const archmage = createBossBehavior('corrupted_archmage');
		const orc = createBossBehavior('orc_warlord');
		expect(shouldApplyCc({}, archmage ?? undefined)).toBe(false);
		expect(shouldApplyCc({}, orc ?? undefined)).toBe(false);
	});

	it('shouldApplyCc gates slow through isCcImmune for each boss', () => {
		for (const boss of BOSSES) {
			const behavior = createBossBehavior(boss.id);
			const evt = { slow: { factor: 0.5, duration: 1000 } };
			expect(shouldApplyCc(evt, behavior ?? undefined)).toBe(
				!boss.expectedImmune,
			);
		}
	});

	it('shouldApplyCc gates stun through isCcImmune for each boss', () => {
		for (const boss of BOSSES) {
			const behavior = createBossBehavior(boss.id);
			const evt = { stun: { duration: 500 } };
			expect(shouldApplyCc(evt, behavior ?? undefined)).toBe(
				!boss.expectedImmune,
			);
		}
	});

	it('shouldApplyCc treats an unknown/missing behavior as non-immune', () => {
		// The Game.ts guard uses `behavior?.isCcImmune()` — `undefined` short
		// circuits to `undefined`, and `!undefined === true`, so CC applies.
		// Regular (non-boss) units hit this path every frame.
		const evt = { slow: { factor: 0.5, duration: 1000 } };
		expect(shouldApplyCc(evt, undefined)).toBe(true);
	});

	it('onDamageTaken does not flip isCcImmune for any boss (phase-invariant today)', () => {
		// Phase-dependent CC immunity does not exist in this codebase yet
		// (dragon is the closest candidate but intentionally opts out). Pin
		// the current invariant so a future phase-based immunity change is
		// visible in git diff.
		for (const boss of BOSSES) {
			const behavior = createBossBehavior(boss.id);
			expect(behavior).not.toBeNull();
			const before = behavior?.isCcImmune();
			// Simulate a full health swing — onSpawn then walk HP down.
			behavior?.onSpawn({
				boss: {
					instanceId: 'boss',
					defId: boss.id,
					position: { x: 0, y: 0 },
					hp: 1000,
					pathIndex: 0,
				},
				sceneTimeMs: 0,
				spawnUnit: () => {},
				disableTower: () => {},
				// biome-ignore lint/suspicious/noExplicitAny: test stub
			} as any);
			for (const ratio of [0.8, 0.5, 0.33, 0.1]) {
				behavior?.onDamageTaken(
					{
						boss: {
							instanceId: 'boss',
							defId: boss.id,
							position: { x: 0, y: 0 },
							hp: 1000 * ratio,
							pathIndex: 0,
						},
						sceneTimeMs: 0,
						spawnUnit: () => {},
						disableTower: () => {},
						// biome-ignore lint/suspicious/noExplicitAny: test stub
					} as any,
					ratio,
				);
				expect(behavior?.isCcImmune()).toBe(before);
			}
		}
	});
});
