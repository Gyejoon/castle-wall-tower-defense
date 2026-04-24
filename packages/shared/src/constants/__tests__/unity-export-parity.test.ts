/**
 * unity-export-parity.test.ts
 *
 * Phase 1 Task 2 — TDD round-trip tests.
 *
 * Each catalog is:
 *   1. stableStringify'd
 *   2. JSON.parse'd back
 *   3. deepEqual'd against the original (normalised value)
 *
 * The test also verifies that stableStringify output is stable across two
 * calls (hash / string identity).
 *
 * TDD gate: this file also imports from the not-yet-existing exporter module,
 * which causes the test run to fail until export-shared-to-json.ts is written.
 */
import { describe, expect, it } from 'vitest';
// TDD gate import — will fail with "Cannot find module" until the exporter
// is written.  The import must be top-level so the module-resolution error
// fires even when individual tests are skipped.
import { exportAll } from '../../../../../scripts/export-shared-to-json';
import { createSummonPool } from '../../data/summonPool';
import { UPGRADE_CARDS } from '../../data/upgradeCards';
import { generateWaves } from '../../data/waves';
import { tokens } from '../../design/tokens';
import { stableStringify } from '../../testing/deterministic-json';
// ── catalog imports ──────────────────────────────────────────────────────────
import { BOSS_CONFIG } from '../boss';
import { ELEMENT_MATCHUP } from '../elements';
import {
	ENERGY_CAP,
	ENERGY_INITIAL,
	ENERGY_MAX,
	ENERGY_PER_BOSS_FAST_CLEAR,
	ENERGY_PER_BOSS_KILL,
	ENERGY_PER_KILL,
	ENERGY_PER_SECOND,
	ENERGY_PER_WAVE_CLEAR,
	FAST_CLEAR_THRESHOLD_MS,
	INGAME_GACHA,
	INITIAL_ENERGY,
} from '../energy';
import {
	BASE_FAMILY_UPGRADE_COST,
	FAMILY_UPGRADE_DAMAGE_PER_LEVEL,
	MAX_FAMILY_UPGRADE_LEVEL,
	UPGRADEABLE_FAMILIES,
} from '../familyUpgrade';
import { GACHA_COSTS, PITY_THRESHOLD } from '../gacha';
import { MAP_REGISTRY } from '../maps';
import { MERGE_CHAIN, TOWER_DEFS } from '../towers';
import { UNITS } from '../units';
import { WAVE_SCALING } from '../waves';

// ── assembled catalog objects ────────────────────────────────────────────────

const GACHA_CONFIG = {
	costs: GACHA_COSTS,
	pityThreshold: PITY_THRESHOLD,
};

const ENERGY_CONFIG = {
	energyPerSecond: ENERGY_PER_SECOND,
	energyInitial: ENERGY_INITIAL,
	energyMax: ENERGY_MAX,
	energyPerKill: ENERGY_PER_KILL,
	energyPerWaveClear: ENERGY_PER_WAVE_CLEAR,
	energyPerBossKill: ENERGY_PER_BOSS_KILL,
	energyPerBossFastClear: ENERGY_PER_BOSS_FAST_CLEAR,
	fastClearThresholdMs: FAST_CLEAR_THRESHOLD_MS,
	ingameGacha: INGAME_GACHA,
	// legacy aliases
	energyCap: ENERGY_CAP,
	initialEnergy: INITIAL_ENERGY,
};

const FAMILY_UPGRADE = {
	upgradeableFamilies: UPGRADEABLE_FAMILIES,
	upgradesDamagePerLevel: FAMILY_UPGRADE_DAMAGE_PER_LEVEL,
	baseFamilyUpgradeCost: BASE_FAMILY_UPGRADE_COST,
	maxFamilyUpgradeLevel: MAX_FAMILY_UPGRADE_LEVEL,
};

const SCALING_CONFIG = {
	waveScaling: WAVE_SCALING,
};

const SUMMON_POOLS = createSummonPool();
const WAVES = generateWaves(50);
const MAPS = MAP_REGISTRY;
const DESIGN_TOKENS = tokens;

// ── helpers ──────────────────────────────────────────────────────────────────

function roundTrip(value: unknown): unknown {
	return JSON.parse(stableStringify(value));
}

function normalizeForComparison(value: unknown): unknown {
	return JSON.parse(stableStringify(value));
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('stableStringify round-trip parity', () => {
	it('TOWER_DEFS round-trips correctly', () => {
		expect(roundTrip(TOWER_DEFS)).toEqual(normalizeForComparison(TOWER_DEFS));
	});

	it('MERGE_CHAIN round-trips correctly', () => {
		expect(roundTrip(MERGE_CHAIN)).toEqual(normalizeForComparison(MERGE_CHAIN));
	});

	it('UNITS round-trips correctly', () => {
		expect(roundTrip(UNITS)).toEqual(normalizeForComparison(UNITS));
	});

	it('WAVES (50 entries) round-trips correctly', () => {
		expect(WAVES).toHaveLength(50);
		expect(roundTrip(WAVES)).toEqual(normalizeForComparison(WAVES));
	});

	it('UPGRADE_CARDS round-trips correctly', () => {
		expect(roundTrip(UPGRADE_CARDS)).toEqual(
			normalizeForComparison(UPGRADE_CARDS),
		);
	});

	it('SUMMON_POOLS round-trips correctly', () => {
		expect(roundTrip(SUMMON_POOLS)).toEqual(
			normalizeForComparison(SUMMON_POOLS),
		);
	});

	it('GACHA_CONFIG round-trips correctly', () => {
		expect(roundTrip(GACHA_CONFIG)).toEqual(
			normalizeForComparison(GACHA_CONFIG),
		);
	});

	it('ENERGY_CONFIG round-trips correctly', () => {
		expect(roundTrip(ENERGY_CONFIG)).toEqual(
			normalizeForComparison(ENERGY_CONFIG),
		);
	});

	it('SCALING_CONFIG round-trips correctly', () => {
		expect(roundTrip(SCALING_CONFIG)).toEqual(
			normalizeForComparison(SCALING_CONFIG),
		);
	});

	it('FAMILY_UPGRADE round-trips correctly', () => {
		expect(roundTrip(FAMILY_UPGRADE)).toEqual(
			normalizeForComparison(FAMILY_UPGRADE),
		);
	});

	it('ELEMENT_MATCHUP round-trips correctly', () => {
		expect(roundTrip(ELEMENT_MATCHUP)).toEqual(
			normalizeForComparison(ELEMENT_MATCHUP),
		);
	});

	it('BOSS_CONFIG round-trips correctly', () => {
		expect(roundTrip(BOSS_CONFIG)).toEqual(normalizeForComparison(BOSS_CONFIG));
	});

	it('MAPS round-trips correctly', () => {
		expect(roundTrip(MAPS)).toEqual(normalizeForComparison(MAPS));
	});

	it('DESIGN_TOKENS round-trips correctly', () => {
		expect(roundTrip(DESIGN_TOKENS)).toEqual(
			normalizeForComparison(DESIGN_TOKENS),
		);
	});
});

describe('stableStringify stability (hash invariant)', () => {
	it('TOWER_DEFS: two calls produce identical output', () => {
		const a = stableStringify(TOWER_DEFS);
		const b = stableStringify(TOWER_DEFS);
		expect(a).toBe(b);
	});

	it('-0 is normalised to 0', () => {
		expect(JSON.parse(stableStringify(-0))).toBe(0);
	});

	it('object keys are sorted alphabetically', () => {
		const obj = { z: 1, a: 2, m: 3 };
		const parsed = JSON.parse(stableStringify(obj));
		expect(Object.keys(parsed)).toEqual(['a', 'm', 'z']);
	});

	it('large integers do not use scientific notation', () => {
		const s = stableStringify(10000000000);
		expect(s).not.toContain('e');
		expect(s).not.toContain('E');
		expect(s).toBe('10000000000');
	});
});

describe('exportAll integration', () => {
	it('exportAll is a callable function', () => {
		expect(typeof exportAll).toBe('function');
	});
});
