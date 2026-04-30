/**
 * unity-export-parity.test.ts
 *
 * Phase 1 Task 2 — TDD round-trip tests.
 *
 * Each catalog is:
 *   1. stableStringify'd
 *   2. JSON.parse'd back
 *   3. deepEqual'd against the ORIGINAL TS constant (not a re-normalized copy)
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
import { MIN_MOVE_SPEED, STUN_IMMUNITY_WINDOW_MS, UNITS } from '../units';
import { WAVE_SCALING } from '../waves';

// ── assembled catalog objects (must match exporter's buildCatalogs() shape) ──

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

// units catalog: matches the wrapper shape emitted by export-shared-to-json.ts
const UNITS_CATALOG = {
	units: UNITS,
	minMoveSpeed: MIN_MOVE_SPEED,
	stunImmunityWindowMs: STUN_IMMUNITY_WINDOW_MS,
};

const SUMMON_POOLS = createSummonPool();
const WAVES = generateWaves(50);
const MAPS = MAP_REGISTRY;
const DESIGN_TOKENS = tokens;

// ── tests ────────────────────────────────────────────────────────────────────

describe('stableStringify round-trip parity', () => {
	it('TOWER_DEFS round-trips losslessly', () => {
		const json = stableStringify(TOWER_DEFS);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(TOWER_DEFS);
	});

	it('MERGE_CHAIN round-trips losslessly', () => {
		const json = stableStringify(MERGE_CHAIN);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(MERGE_CHAIN);
	});

	it('UNITS catalog (wrapper shape) round-trips losslessly', () => {
		// exporter emits { units, minMoveSpeed, stunImmunityWindowMs } — not bare UNITS
		const json = stableStringify(UNITS_CATALOG);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(UNITS_CATALOG);
	});

	it('WAVES (50 entries) round-trips losslessly', () => {
		expect(WAVES).toHaveLength(50);
		const json = stableStringify(WAVES);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(WAVES);
	});

	it('UPGRADE_CARDS round-trips losslessly', () => {
		const json = stableStringify(UPGRADE_CARDS);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(UPGRADE_CARDS);
	});

	it('SUMMON_POOLS round-trips losslessly', () => {
		const json = stableStringify(SUMMON_POOLS);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(SUMMON_POOLS);
	});

	it('GACHA_CONFIG round-trips losslessly', () => {
		const json = stableStringify(GACHA_CONFIG);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(GACHA_CONFIG);
	});

	it('ENERGY_CONFIG round-trips losslessly', () => {
		const json = stableStringify(ENERGY_CONFIG);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(ENERGY_CONFIG);
	});

	it('SCALING_CONFIG round-trips losslessly', () => {
		const json = stableStringify(SCALING_CONFIG);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(SCALING_CONFIG);
	});

	it('FAMILY_UPGRADE round-trips losslessly', () => {
		const json = stableStringify(FAMILY_UPGRADE);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(FAMILY_UPGRADE);
	});

	it('ELEMENT_MATCHUP round-trips losslessly', () => {
		const json = stableStringify(ELEMENT_MATCHUP);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(ELEMENT_MATCHUP);
	});

	it('BOSS_CONFIG round-trips losslessly', () => {
		const json = stableStringify(BOSS_CONFIG);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(BOSS_CONFIG);
	});

	it('MAPS round-trips losslessly', () => {
		const json = stableStringify(MAPS);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(MAPS);
	});

	it('DESIGN_TOKENS round-trips losslessly', () => {
		const json = stableStringify(DESIGN_TOKENS);
		const parsed = JSON.parse(json);
		expect(parsed).toEqual(DESIGN_TOKENS);
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
