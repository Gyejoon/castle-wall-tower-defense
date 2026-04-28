import { describe, expect, it } from 'vitest';
import { createBossBehavior } from '../../src/systems/boss-ai/registry';
// 사이드이펙트 import: 모듈 import가 boss registry에 등록한다.
import '../../src/systems/boss-ai/orcWarlord';
import '../../src/systems/boss-ai/forgeMaster';
import '../../src/systems/boss-ai/corruptedArchmage';
import '../../src/systems/boss-ai/dragon';

// CombatMediator의 CC 면역 분기 동치 predicate.
function shouldApplyCc(
	evt: { stun?: unknown; slow?: unknown },
	behavior: { isCcImmune: () => boolean } | undefined,
): boolean {
	if (!evt.stun && !evt.slow) return false;
	return !behavior?.isCcImmune();
}

const BOSSES: Array<{ id: string; expectedImmune: boolean }> = [
	{ id: 'orc_warlord', expectedImmune: false },
	{ id: 'forge_master', expectedImmune: false },
	{ id: 'corrupted_archmage', expectedImmune: true },
	// Dragon은 CC 면역 대신 80% bossCcResist로 duration 단축만 적용.
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
		// 일반 (non-boss) 유닛은 behavior가 undefined여서 매 프레임 이 경로를 탄다.
		const evt = { slow: { factor: 0.5, duration: 1000 } };
		expect(shouldApplyCc(evt, undefined)).toBe(true);
	});

	it('onDamageTaken does not flip isCcImmune for any boss (phase-invariant today)', () => {
		// 페이즈 기반 CC 면역은 현재 없음. 향후 도입 시 이 assertion이 깨져 가시화된다.
		for (const boss of BOSSES) {
			const behavior = createBossBehavior(boss.id);
			expect(behavior).not.toBeNull();
			const before = behavior?.isCcImmune();
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
