/**
 * replay-runner.ts — Phase 2 Task 2.
 *
 * Headless TS twin of Unity's MinimalReplayRunner. Both consume the same
 * fixture JSON and must produce identical metric tuples for the cross-runtime
 * parity gate (see Task 6).
 *
 * Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
 *   - §1   POCO/View split, construction order, anti-pattern watchlist.
 *   - §1.4 Per-tick phase order (Energy → Inputs → Wave → Units → Towers → Damage).
 *   - §3   Wave-1 numeric invariants and bounded fixture metrics.
 *   - §3.6 RNG NOT consumed at PoC scope (no CC towers); seed recorded only.
 *   - §4   PoC overrides (slice2_poc map, 8×18 grid, archer ⚡20, battle_robot).
 *   - §5   Cross-cutting summary the spec-compliance reviewer enforces.
 *
 * Scope (skeleton — matures in Phase 3):
 *   - 1 archer tower (no CC, no splash, no merges).
 *   - N battle_robot units along a single L-shaped path.
 *   - Single-target NearestInRange targeting (squared grid distance).
 *   - Armor-piercing projectiles with cell-distance flight TTL.
 *   - Energy regen (passive, ungated in PoC) + per-place spend.
 *
 * Design notes:
 *   - The runner imports CONSTANTS from @gld/shared but does NOT import
 *     anything from packages/phaser-game (those modules are Phaser-coupled;
 *     refactoring is out of Phase 2 scope per implementer guidance).
 *   - All time is integer-valued ms after rounding within tick. Sub-ms drift
 *     accumulates in fractional carry on the energy/movement progress fields.
 *   - Ticks are fixed dt (default 16.6667ms) — never read wall-clock or
 *     UnityEngine.Time. Same contract Unity's runner will follow.
 *   - System update order per §1.4: Energy → Inputs → Wave → Units → Towers → Damage.
 *   - `runReplay` is the only public symbol; per-tick phase helpers stay
 *     module-private so the C# twin (Task 6) can mirror the same shape
 *     without importer coupling.
 */

import { ALL_TOWERS, UNITS } from '../index';

// ── Types ───────────────────────────────────────────────────────────────────

export type GridCell = readonly [number, number];

export interface ReplayFixture {
	fixtureId: string;
	description: string;
	seed: number;
	durationMs: number;
	tickMs: number;
	map: {
		cols: number;
		rows: number;
		spawn: GridCell;
		exit: GridCell;
		path: GridCell[];
		blocked: GridCell[];
	};
	energy: {
		initial: number;
		regenPerSec: number;
		cap: number;
		regenGatedDuringPrep: boolean;
	};
	wave: {
		prepMs: number;
		spawnIntervalMs: number;
		unitId: string;
		count: number;
	};
	events: ReplayInputEvent[];
	expected: {
		kills: number;
		totalDamage: { min: number; max: number };
		waveClearMs: { min: number; max: number };
		energyPeak: { min: number; max: number };
	};
}

export type ReplayInputEvent = {
	tMs: number;
	kind: 'place_tower';
	towerId: string;
	cell: GridCell;
};

export type ReplayOutputEvent =
	| { tMs: number; kind: 'tower_placed'; towerId: string; cell: GridCell }
	| {
			tMs: number;
			kind: 'place_rejected';
			towerId: string;
			cell: GridCell;
			reason: 'insufficient_funds';
	  }
	| {
			tMs: number;
			kind: 'unit_spawned';
			unitId: string;
			instanceId: number;
	  }
	| {
			tMs: number;
			kind: 'projectile_launched';
			towerInstanceId: number;
			targetInstanceId: number;
			damage: number;
			impactTMs: number;
	  }
	| {
			tMs: number;
			kind: 'projectile_dropped';
			towerInstanceId: number;
			targetInstanceId: number;
			scheduledImpactTMs: number;
	  }
	| {
			tMs: number;
			kind: 'damage_applied';
			targetInstanceId: number;
			damage: number;
			armorPierce: boolean;
			remainingHp: number;
	  }
	| {
			tMs: number;
			kind: 'unit_killed';
			instanceId: number;
	  }
	| {
			tMs: number;
			kind: 'unit_reached_exit';
			instanceId: number;
	  };

export interface ReplayMetrics {
	kills: number;
	totalDamage: number;
	energyPeak: number;
	waveClearMs: number | null;
}

export interface ReplayResult {
	events: ReplayOutputEvent[];
	metrics: ReplayMetrics;
}

// ── Internal simulation state ───────────────────────────────────────────────

interface UnitState {
	instanceId: number;
	defId: string;
	hp: number;
	maxHp: number;
	armor: number;
	speedTilesPerSec: number;
	pathIndex: number; // integer index of last reached path cell
	cellProgress: number; // fractional 0..1 progress to next cell
	alive: boolean;
}

interface TowerState {
	instanceId: number;
	defId: string;
	cell: GridCell;
	damage: number;
	rangeCells: number;
	rangeSqr: number;
	attackIntervalMs: number;
	cooldownMs: number; // ms until next shot allowed
	projectileSpeedTilesPerSec: number;
	hasSpecial: boolean;
}

interface PendingDamage {
	impactTMs: number;
	towerInstanceId: number;
	targetInstanceId: number;
	damage: number;
	armorPierce: boolean;
}

/**
 * Mutable container threaded through the per-tick phase helpers.
 *
 * `runReplay` is the only public function on the module; helpers below
 * mutate this state object in place. The runner's external contract
 * (pure: same fixture in → same result out) is preserved because every
 * field is constructed fresh from `fixture` inside `initState`.
 */
interface RunnerState {
	fixture: ReplayFixture;
	path: GridCell[];
	events: ReplayOutputEvent[];
	metrics: ReplayMetrics;
	units: UnitState[];
	towers: TowerState[];
	pendingDamage: PendingDamage[];
	energy: number;
	energyCap: number;
	energyRegenPerMs: number;
	nextUnitId: number;
	nextTowerId: number;
	unitsSpawned: number;
	nextSpawnDueMs: number;
	inputCursor: number;
}

// ── Pure helpers ────────────────────────────────────────────────────────────

function findTowerDef(towerId: string) {
	const def = ALL_TOWERS.find((t) => t.id === towerId);
	if (!def) throw new Error(`Unknown tower id: ${towerId}`);
	return def;
}

function findUnitDef(unitId: string) {
	const def = UNITS.find((u) => u.id === unitId);
	if (!def) throw new Error(`Unknown unit id: ${unitId}`);
	return def;
}

/**
 * Continuous interpolation of a unit's position along its path. Returns
 * fractional cell coords (cx, cy) used for range distance comparisons.
 *
 * pathIndex is the integer cell already reached; cellProgress is 0..1 toward
 * path[pathIndex+1]. When the unit is on the last cell, the position is exactly
 * that cell (no further interpolation).
 */
function interpolate(
	unit: UnitState,
	path: GridCell[],
): { x: number; y: number } {
	const i = unit.pathIndex;
	const a = path[i];
	if (i >= path.length - 1) return { x: a[0], y: a[1] };
	const b = path[i + 1];
	const t = unit.cellProgress;
	return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
}

function squaredDist(ax: number, ay: number, bx: number, by: number): number {
	const dx = ax - bx;
	const dy = ay - by;
	return dx * dx + dy * dy;
}

// ── Phase helpers (module-private; mirror §1.4 update order) ────────────────

function initState(fixture: ReplayFixture): RunnerState {
	const path = fixture.map.path.map((c) => [c[0], c[1]] as GridCell);
	if (path.length === 0) throw new Error('Fixture path is empty');
	const state: RunnerState = {
		fixture,
		path,
		events: [],
		metrics: {
			kills: 0,
			totalDamage: 0,
			energyPeak: 0,
			waveClearMs: null,
		},
		units: [],
		towers: [],
		pendingDamage: [],
		energy: fixture.energy.initial,
		energyCap: fixture.energy.cap,
		energyRegenPerMs: fixture.energy.regenPerSec / 1000,
		nextUnitId: 1,
		nextTowerId: 1,
		unitsSpawned: 0,
		nextSpawnDueMs: fixture.wave.prepMs,
		inputCursor: 0,
	};
	recordPeak(state);
	return state;
}

function recordPeak(state: RunnerState): void {
	const e = Math.floor(state.energy);
	if (e > state.metrics.energyPeak) state.metrics.energyPeak = e;
}

/** Phase 1: passive energy regen (gating flag honored). */
function tickEnergy(state: RunnerState, tMs: number, dtMs: number): void {
	const regenActive =
		!state.fixture.energy.regenGatedDuringPrep ||
		tMs >= state.fixture.wave.prepMs;
	if (!regenActive) return;
	state.energy = Math.min(
		state.energy + state.energyRegenPerMs * dtMs,
		state.energyCap,
	);
	recordPeak(state);
}

/** Phase 2: drain scheduled input events whose tMs falls in this tick. */
function applyInputs(state: RunnerState, tickEndMs: number): void {
	while (
		state.inputCursor < state.fixture.events.length &&
		state.fixture.events[state.inputCursor].tMs < tickEndMs
	) {
		const ev = state.fixture.events[state.inputCursor++];
		if (ev.kind === 'place_tower') {
			const def = findTowerDef(ev.towerId);
			if (state.energy < def.cost) {
				// Placement rejected — emit explicit event so misconfigured
				// fixtures fail loudly instead of producing kills=0 silently.
				state.events.push({
					tMs: Math.round(ev.tMs),
					kind: 'place_rejected',
					towerId: def.id,
					cell: [ev.cell[0], ev.cell[1]] as GridCell,
					reason: 'insufficient_funds',
				});
				continue;
			}
			state.energy -= def.cost;
			recordPeak(state);
			const tower: TowerState = {
				instanceId: state.nextTowerId++,
				defId: def.id,
				cell: [ev.cell[0], ev.cell[1]] as GridCell,
				damage: def.stats.damage,
				rangeCells: def.stats.range,
				rangeSqr: def.stats.range * def.stats.range,
				attackIntervalMs: 1000 / def.stats.attackSpeed,
				cooldownMs: 0,
				projectileSpeedTilesPerSec: def.stats.projectileSpeed ?? 0,
				hasSpecial: !!def.stats.special,
			};
			state.towers.push(tower);
			state.events.push({
				tMs: Math.round(ev.tMs),
				kind: 'tower_placed',
				towerId: def.id,
				cell: tower.cell,
			});
		}
	}
}

/** Phase 3: spawn wave units when due (single group, fixed cadence). */
function tickWave(state: RunnerState, tickEndMs: number): void {
	while (
		state.unitsSpawned < state.fixture.wave.count &&
		state.nextSpawnDueMs < tickEndMs &&
		state.nextSpawnDueMs <= state.fixture.durationMs
	) {
		const def = findUnitDef(state.fixture.wave.unitId);
		const unit: UnitState = {
			instanceId: state.nextUnitId++,
			defId: def.id,
			hp: def.stats.hp,
			maxHp: def.stats.hp,
			armor: def.stats.armor,
			speedTilesPerSec: def.stats.speed,
			pathIndex: 0,
			cellProgress: 0,
			alive: true,
		};
		state.units.push(unit);
		state.events.push({
			tMs: Math.round(state.nextSpawnDueMs),
			kind: 'unit_spawned',
			unitId: def.id,
			instanceId: unit.instanceId,
		});
		state.unitsSpawned++;
		state.nextSpawnDueMs += state.fixture.wave.spawnIntervalMs;
	}
}

/** Phase 4: advance live units along the path; emit reachedExit when done. */
function tickUnits(state: RunnerState, tMs: number, dtMs: number): void {
	for (const unit of state.units) {
		if (!unit.alive) continue;
		if (unit.pathIndex >= state.path.length - 1) continue;
		const cellsPerMs = unit.speedTilesPerSec / 1000;
		let remaining = cellsPerMs * dtMs;
		while (
			remaining > 0 &&
			unit.alive &&
			unit.pathIndex < state.path.length - 1
		) {
			const need = 1 - unit.cellProgress;
			if (remaining >= need) {
				remaining -= need;
				unit.pathIndex++;
				unit.cellProgress = 0;
				if (unit.pathIndex >= state.path.length - 1) {
					unit.alive = false;
					state.events.push({
						tMs: Math.round(tMs + dtMs),
						kind: 'unit_reached_exit',
						instanceId: unit.instanceId,
					});
					break;
				}
			} else {
				unit.cellProgress += remaining;
				remaining = 0;
			}
		}
	}
}

/** Phase 5: tower cooldown + targeting + projectile launch. */
function tickTowers(state: RunnerState, tickEndMs: number, dtMs: number): void {
	for (const tower of state.towers) {
		tower.cooldownMs -= dtMs;
		if (tower.cooldownMs > 0) continue;
		// Find nearest live unit in range (squared grid distance).
		let bestDistSqr = Number.POSITIVE_INFINITY;
		let bestUnit: UnitState | null = null;
		for (const u of state.units) {
			if (!u.alive) continue;
			if (u.pathIndex >= state.path.length - 1) continue;
			const pos = interpolate(u, state.path);
			const dSqr = squaredDist(tower.cell[0], tower.cell[1], pos.x, pos.y);
			if (dSqr <= tower.rangeSqr && dSqr < bestDistSqr) {
				bestDistSqr = dSqr;
				bestUnit = u;
			}
		}
		if (!bestUnit) continue;
		// Schedule projectile impact with cell-distance flight TTL.
		const dist = Math.sqrt(bestDistSqr);
		let ttlMs: number;
		if (tower.projectileSpeedTilesPerSec > 0) {
			ttlMs = Math.round((dist / tower.projectileSpeedTilesPerSec) * 1000);
			ttlMs = Math.max(40, Math.min(ttlMs, 500));
		} else {
			ttlMs = 120;
		}
		const damage = Math.round(tower.damage);
		const armorPierce = !tower.hasSpecial;
		const impactTMs = tickEndMs + ttlMs;
		state.pendingDamage.push({
			impactTMs,
			towerInstanceId: tower.instanceId,
			targetInstanceId: bestUnit.instanceId,
			damage,
			armorPierce,
		});
		state.events.push({
			tMs: Math.round(tickEndMs),
			kind: 'projectile_launched',
			towerInstanceId: tower.instanceId,
			targetInstanceId: bestUnit.instanceId,
			damage,
			impactTMs: Math.round(impactTMs),
		});
		tower.cooldownMs += tower.attackIntervalMs;
		// Guard against negative drift accumulating beyond one interval
		// (defensive — at PoC scope dt is small, but keeps determinism).
		if (tower.cooldownMs < 0) tower.cooldownMs = 0;
	}
}

/** Phase 6: resolve pending projectile impacts whose TTL elapsed this tick. */
function resolveDamage(state: RunnerState, tickEndMs: number): void {
	for (let i = state.pendingDamage.length - 1; i >= 0; i--) {
		const p = state.pendingDamage[i];
		if (p.impactTMs > tickEndMs) continue;
		state.pendingDamage.splice(i, 1);
		const target = state.units.find((u) => u.instanceId === p.targetInstanceId);
		if (!target?.alive) continue;
		const reduced = p.armorPierce
			? p.damage
			: Math.max(0, p.damage - target.armor);
		const applied = Math.floor(reduced);
		target.hp -= applied;
		state.metrics.totalDamage += applied;
		state.events.push({
			tMs: Math.round(p.impactTMs),
			kind: 'damage_applied',
			targetInstanceId: target.instanceId,
			damage: applied,
			armorPierce: p.armorPierce,
			remainingHp: Math.max(0, target.hp),
		});
		if (target.hp <= 0) {
			target.alive = false;
			state.metrics.kills++;
			state.events.push({
				tMs: Math.round(p.impactTMs),
				kind: 'unit_killed',
				instanceId: target.instanceId,
			});
			// waveClearMs = timestamp of the `expected.kills`-th kill.
			// Decoupled from `wave.count` so the metric is meaningful even
			// when the fixture's expected kill total < wave.count (PoC
			// scope; see fixture _comment for the §3.5 deviation note).
			if (
				state.metrics.kills >= state.fixture.expected.kills &&
				state.metrics.waveClearMs === null
			) {
				state.metrics.waveClearMs = Math.round(p.impactTMs);
			}
		}
	}
}

/**
 * Post-loop: any projectile still in flight at t = durationMs is dropped
 * (the simulation ended before its TTL elapsed). Damage is NOT applied —
 * the projectile is treated as in flight when sim ends. Emit an explicit
 * event per dropped projectile so totalDamage undercounts surface in the
 * stream rather than as a silent gap.
 */
function flushPendingDamage(state: RunnerState): void {
	if (state.pendingDamage.length === 0) return;
	const tMs = state.fixture.durationMs;
	for (const p of state.pendingDamage) {
		state.events.push({
			tMs,
			kind: 'projectile_dropped',
			towerInstanceId: p.towerInstanceId,
			targetInstanceId: p.targetInstanceId,
			scheduledImpactTMs: Math.round(p.impactTMs),
		});
	}
	state.pendingDamage.length = 0;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the replay end-to-end and return the deterministic event stream
 * + summary metrics. Pure function: same fixture in → same result out.
 *
 * Per-tick phase order mirrors §1.4 of the design-decisions doc; see the
 * helper functions above for each phase's contract.
 */
export function runReplay(fixture: ReplayFixture): ReplayResult {
	const state = initState(fixture);
	const tickMs = fixture.tickMs;
	const totalTicks = Math.ceil(fixture.durationMs / tickMs);

	for (let tickIdx = 0; tickIdx < totalTicks; tickIdx++) {
		const tMsRaw = tickIdx * tickMs;
		const nextRaw = (tickIdx + 1) * tickMs;
		const tMs = Math.min(tMsRaw, fixture.durationMs);
		const dtMs = Math.min(nextRaw, fixture.durationMs) - tMs;
		if (dtMs <= 0) break;
		const tickEndMs = tMs + dtMs;

		tickEnergy(state, tMs, dtMs);
		applyInputs(state, tickEndMs);
		tickWave(state, tickEndMs);
		tickUnits(state, tMs, dtMs);
		tickTowers(state, tickEndMs, dtMs);
		resolveDamage(state, tickEndMs);
	}

	flushPendingDamage(state);

	// Sort events for deterministic comparison: primary = tMs ascending,
	// secondary = stable insertion order (preserved by Array.prototype.sort
	// when comparator returns 0).
	state.events.sort((a, b) => a.tMs - b.tMs);

	// Final pass: ensure energyPeak is integer.
	state.metrics.energyPeak = Math.floor(state.metrics.energyPeak);

	return { events: state.events, metrics: state.metrics };
}
