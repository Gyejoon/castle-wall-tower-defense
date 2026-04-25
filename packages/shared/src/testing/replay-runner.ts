/**
 * replay-runner.ts — Phase 2 Task 2.
 *
 * Headless TS twin of Unity's MinimalReplayRunner. Both consume the same
 * fixture JSON and must produce identical metric tuples for the cross-runtime
 * parity gate (see Task 6).
 *
 * Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
 *   - §1   POCO/View split, construction order, anti-pattern watchlist.
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
 *   - System update order per §1.4: Energy → Wave → Units → Towers.
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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the replay end-to-end and return the deterministic event stream
 * + summary metrics. Pure function: same fixture in → same result out.
 */
export function runReplay(fixture: ReplayFixture): ReplayResult {
	const events: ReplayOutputEvent[] = [];
	const metrics: ReplayMetrics = {
		kills: 0,
		totalDamage: 0,
		energyPeak: 0,
		waveClearMs: null,
	};

	const path = fixture.map.path.map((c) => [c[0], c[1]] as GridCell);
	if (path.length === 0) throw new Error('Fixture path is empty');

	// ── Energy state (pure arithmetic; mirrors EnergySystem semantics) ──────
	let energy = fixture.energy.initial;
	const energyCap = fixture.energy.cap;
	const energyRegenPerMs = fixture.energy.regenPerSec / 1000;
	const recordPeak = () => {
		const e = Math.floor(energy);
		if (e > metrics.energyPeak) metrics.energyPeak = e;
	};
	recordPeak();

	// ── Wave / unit / tower / projectile collections ────────────────────────
	const units: UnitState[] = [];
	const towers: TowerState[] = [];
	const pendingDamage: PendingDamage[] = [];
	let nextUnitId = 1;
	let nextTowerId = 1;
	let unitsSpawned = 0;
	let nextSpawnDueMs = fixture.wave.prepMs; // first spawn time
	let inputCursor = 0; // next unprocessed input event

	// ── Tick loop ──────────────────────────────────────────────────────────
	const tickMs = fixture.tickMs;
	const totalTicks = Math.ceil(fixture.durationMs / tickMs);

	for (let tickIdx = 0; tickIdx < totalTicks; tickIdx++) {
		const tMsRaw = tickIdx * tickMs;
		const nextRaw = (tickIdx + 1) * tickMs;
		const tMs = Math.min(tMsRaw, fixture.durationMs);
		const dtMs = Math.min(nextRaw, fixture.durationMs) - tMs;
		if (dtMs <= 0) break;

		// 1. Energy regen (always passive at PoC scope; gating flag honored).
		const regenActive =
			!fixture.energy.regenGatedDuringPrep || tMs >= fixture.wave.prepMs;
		if (regenActive) {
			energy = Math.min(energy + energyRegenPerMs * dtMs, energyCap);
			recordPeak();
		}

		// 2. Process scheduled input events whose tMs falls in this tick.
		const tickEndMs = tMs + dtMs;
		while (
			inputCursor < fixture.events.length &&
			fixture.events[inputCursor].tMs < tickEndMs
		) {
			const ev = fixture.events[inputCursor++];
			if (ev.kind === 'place_tower') {
				const def = findTowerDef(ev.towerId);
				if (energy < def.cost) {
					// Quietly drop unaffordable placements; future fixtures may
					// assert insufficient-energy semantics explicitly.
					continue;
				}
				energy -= def.cost;
				recordPeak();
				const tower: TowerState = {
					instanceId: nextTowerId++,
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
				towers.push(tower);
				events.push({
					tMs: Math.round(ev.tMs),
					kind: 'tower_placed',
					towerId: def.id,
					cell: tower.cell,
				});
			}
		}

		// 3. Wave: spawn units when due (single group, fixed cadence).
		while (
			unitsSpawned < fixture.wave.count &&
			nextSpawnDueMs < tickEndMs &&
			nextSpawnDueMs <= fixture.durationMs
		) {
			const def = findUnitDef(fixture.wave.unitId);
			const unit: UnitState = {
				instanceId: nextUnitId++,
				defId: def.id,
				hp: def.stats.hp,
				maxHp: def.stats.hp,
				armor: def.stats.armor,
				speedTilesPerSec: def.stats.speed,
				pathIndex: 0,
				cellProgress: 0,
				alive: true,
			};
			units.push(unit);
			events.push({
				tMs: Math.round(nextSpawnDueMs),
				kind: 'unit_spawned',
				unitId: def.id,
				instanceId: unit.instanceId,
			});
			unitsSpawned++;
			nextSpawnDueMs += fixture.wave.spawnIntervalMs;
		}

		// 4. Units: advance along path; emit reachedExit when done.
		for (const unit of units) {
			if (!unit.alive) continue;
			if (unit.pathIndex >= path.length - 1) continue;
			const cellsPerMs = unit.speedTilesPerSec / 1000;
			let remaining = cellsPerMs * dtMs;
			while (remaining > 0 && unit.alive && unit.pathIndex < path.length - 1) {
				const need = 1 - unit.cellProgress;
				if (remaining >= need) {
					remaining -= need;
					unit.pathIndex++;
					unit.cellProgress = 0;
					if (unit.pathIndex >= path.length - 1) {
						unit.alive = false;
						events.push({
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

		// 5. Towers: cooldown + targeting + projectile launch.
		for (const tower of towers) {
			tower.cooldownMs -= dtMs;
			if (tower.cooldownMs > 0) continue;
			// Find nearest live unit in range (squared grid distance).
			let bestDistSqr = Number.POSITIVE_INFINITY;
			let bestUnit: UnitState | null = null;
			for (const u of units) {
				if (!u.alive) continue;
				if (u.pathIndex >= path.length - 1) continue;
				const pos = interpolate(u, path);
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
			pendingDamage.push({
				impactTMs,
				towerInstanceId: tower.instanceId,
				targetInstanceId: bestUnit.instanceId,
				damage,
				armorPierce,
			});
			events.push({
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

		// 6. Resolve any pending projectile impacts due this tick.
		for (let i = pendingDamage.length - 1; i >= 0; i--) {
			const p = pendingDamage[i];
			if (p.impactTMs > tickEndMs) continue;
			pendingDamage.splice(i, 1);
			const target = units.find((u) => u.instanceId === p.targetInstanceId);
			if (!target?.alive) continue;
			const reduced = p.armorPierce
				? p.damage
				: Math.max(0, p.damage - target.armor);
			const applied = Math.floor(reduced);
			target.hp -= applied;
			metrics.totalDamage += applied;
			events.push({
				tMs: Math.round(p.impactTMs),
				kind: 'damage_applied',
				targetInstanceId: target.instanceId,
				damage: applied,
				armorPierce: p.armorPierce,
				remainingHp: Math.max(0, target.hp),
			});
			if (target.hp <= 0) {
				target.alive = false;
				metrics.kills++;
				events.push({
					tMs: Math.round(p.impactTMs),
					kind: 'unit_killed',
					instanceId: target.instanceId,
				});
				// waveClearMs = timestamp of the `expected.kills`-th kill.
				// Decoupled from `wave.count` so the metric is meaningful even
				// when the fixture's expected kill total < wave.count (PoC
				// scope; see fixture _comment for the §3.5 deviation note).
				if (
					metrics.kills >= fixture.expected.kills &&
					metrics.waveClearMs === null
				) {
					metrics.waveClearMs = Math.round(p.impactTMs);
				}
			}
		}
	}

	// Sort events for deterministic comparison: primary = tMs ascending,
	// secondary = stable insertion order (preserved by Array.prototype.sort
	// when comparator returns 0).
	events.sort((a, b) => a.tMs - b.tMs);

	// Final pass: ensure energyPeak is integer.
	metrics.energyPeak = Math.floor(metrics.energyPeak);

	return { events, metrics };
}
