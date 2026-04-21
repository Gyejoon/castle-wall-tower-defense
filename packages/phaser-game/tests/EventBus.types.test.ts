import { describe, expect, it } from 'vitest';
import type { GameEventMap } from '../src/EventBus';

type Expect<T extends true> = T;
type HasKey<K extends PropertyKey> = K extends keyof GameEventMap
	? true
	: false;

// Existing PVE surface — keep as a regression guard.
type _HasGameOverResultEvent = Expect<HasKey<'game-over'>>;

// Task 4.0 [F7]: pre-registered events for Phase 4/5/8/10. These are
// compile-time assertions — if any key is missing from GameEventMap the
// build breaks before tests even run.
type _HasRequestGachaSummon = Expect<HasKey<'request-gacha-summon'>>;
type _HasGachaInsufficientEnergy = Expect<HasKey<'gacha-insufficient-energy'>>;
type _HasRequestUpgradeReroll = Expect<HasKey<'request-upgrade-reroll'>>;
type _HasRequestContinueRun = Expect<HasKey<'request-continue-run'>>;
type _HasEnterMergeMode = Expect<HasKey<'enter-merge-mode'>>;
type _HasUpgradeChoiceReady = Expect<HasKey<'upgrade-choice-ready'>>;
type _HasSummonReady = Expect<HasKey<'summon-ready'>>;

// Payload-shape assertions — these force the compiler to validate the
// new fields introduced in Task 4.0 (phase on wave-completed, tier on
// tower-summoned, source on summon-ready, etc.).
const _gachaReq: GameEventMap['request-gacha-summon'] = { targetTier: 2 };
const _gachaFail: GameEventMap['gacha-insufficient-energy'] = {
	targetTier: 3,
	cost: 80,
	have: 12,
};
const _continueRun: GameEventMap['request-continue-run'] = {
	livesRestored: 5,
};
const _enterMerge: GameEventMap['enter-merge-mode'] = { sourceId: 'tower_1' };
const _summonReady: GameEventMap['summon-ready'] = {
	towerId: 'archer',
	source: 'gacha',
};
const _waveCompleted: GameEventMap['wave-completed'] = {
	wave: 3,
	totalWaves: 99,
	slotIndex: 3,
	delaySec: 2,
	cleared: true,
	phase: 'boss',
};

// `request-upgrade-reroll` is an `undefined` payload event — the emit
// callsite supplies no second argument, but the map entry still has to
// exist. Touch it via typeof to prevent the import from getting stripped.
type _RerollPayload = GameEventMap['request-upgrade-reroll'];

describe('EventBus type contract', () => {
	it('keeps the PVE event surface available', () => {
		void (0 as _HasGameOverResultEvent | 0);
		expect(true).toBe(true);
	});

	it('pre-registers Phase 4/5/8/10 event payloads', () => {
		void _gachaReq;
		void _gachaFail;
		void _continueRun;
		void _enterMerge;
		void _summonReady;
		void _waveCompleted;
		void (0 as _HasRequestGachaSummon | 0);
		void (0 as _HasGachaInsufficientEnergy | 0);
		void (0 as _HasRequestUpgradeReroll | 0);
		void (0 as _HasRequestContinueRun | 0);
		void (0 as _HasEnterMergeMode | 0);
		void (0 as _HasUpgradeChoiceReady | 0);
		void (0 as _HasSummonReady | 0);
		void (undefined as _RerollPayload);
		expect(true).toBe(true);
	});
});
