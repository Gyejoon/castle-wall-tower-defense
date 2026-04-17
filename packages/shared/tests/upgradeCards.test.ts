import { describe, expect, it } from 'vitest';
import { pickRandomUpgrades, UPGRADE_CARDS } from '../src/data/upgradeCards';

describe('upgradeCards', () => {
	it('UPGRADE_CARDS는 정확히 6장', () => {
		expect(UPGRADE_CARDS).toHaveLength(6);
	});

	it('모든 카드에 필수 필드가 존재', () => {
		for (const card of UPGRADE_CARDS) {
			expect(card.id).toBeTruthy();
			expect(card.name).toBeTruthy();
			expect(card.description).toBeTruthy();
			expect(card.icon).toBeTruthy();
			expect(['multiply', 'add']).toContain(card.stackType);
			expect(typeof card.baseValue).toBe('number');
		}
	});

	it('pickRandomUpgrades는 요청한 수만큼 반환', () => {
		const picks = pickRandomUpgrades(3, () => 0);
		expect(picks).toHaveLength(3);
	});

	it('deterministic rng로 예상 결과 검증 — rng=0 → 첫 카드', () => {
		const picks = pickRandomUpgrades(2, () => 0);
		expect(picks[0].id).toBe('dmg_up');
		expect(picks[1].id).toBe('dmg_up');
	});

	it('deterministic rng — rng=0.99 → 마지막 카드', () => {
		const picks = pickRandomUpgrades(1, () => 0.99);
		expect(picks[0].id).toBe('summon_discount');
	});

	it('기본 rng(Math.random)로 호출해도 유효한 카드 반환', () => {
		const picks = pickRandomUpgrades(5);
		expect(picks).toHaveLength(5);
		for (const card of picks) {
			expect(UPGRADE_CARDS).toContainEqual(card);
		}
	});

	it('같은 카드가 중복 선택될 수 있다 (with replacement)', () => {
		const picks = pickRandomUpgrades(6, () => 0);
		const unique = new Set(picks.map((c) => c.id));
		expect(unique.size).toBe(1);
	});
});
