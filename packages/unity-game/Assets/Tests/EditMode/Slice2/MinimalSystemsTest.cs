// MinimalSystemsTest.cs — Phase 2 Task 3 Step 6.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1   Anti-pattern watchlist (no MonoBehaviour state, no UnityEngine.Random,
//          no Coroutine in Minimal systems).
//   - §3   Wave-1 numeric invariants and bounded fixture metrics.
//   - §4   PoC overrides (slice2_poc 8×18, archer ⚡20, battle_robot, archer (3,14)).
//
// This is a SYSTEM FUNCTIONALITY test, NOT the cross-runtime parity gate.
// The parity gate is Task 6's ReplayParityTests.cs. The plan's "kills == 5"
// target is replaced here with the canonical deterministic value kills=3
// produced by the faithful NearestInRange + projectile TTL implementation
// (see seed-001-slice2-poc.json _comment block for the full §3.5 deviation
// rationale). Per Fix M3 of the f398583 review, the assertion is locked at
// kills=3 (point-equality) so any silent drift to kills=2/4 fails immediately.
//
// Test layout:
//   - Per-system unit tests (Test A): each Minimal system in isolation.
//   - One integration test (Test B): construct everything programmatically,
//     simulate 60s in 16.67ms ticks, place archer at (3,14) at t≈100ms,
//     assert kills == 3 and energyPeak ∈ [78, 81] (tight canonical bands).

using GLD.Data;
using GLD.SceneRuntime.Slice2;
using GLD.Systems.Minimal;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Slice2
{
    [TestFixture]
    public class MinimalSystemsTest
    {
        // ── Programmatic fixture builders ──────────────────────────────────

        /// <summary>Build the slice2_poc map (8×18, L-path, exit at (4,0)).
        /// Delegates to <see cref="Slice2MapBuilder.BuildSlice2PocMap"/> so the
        /// scene runtime, the smoke test, and this EditMode test all share
        /// a single source of truth for the map definition (Phase 2 Task 4).
        /// </summary>
        static MapDef BuildSlice2PocMap() => Slice2MapBuilder.BuildSlice2PocMap();

        static UnitDefSO BuildBattleRobotDef()
        {
            var def = ScriptableObject.CreateInstance<UnitDefSO>();
            def.id = "battle_robot";
            def.name = "오크 전사";
            def.type = "ground";
            def.element = Element.Neutral;
            def.bounty = 12;
            def.stats = new UnitStats { hp = 80, speed = 1.5f, armor = 5 };
            def.flying = false;
            def.specialBehavior = UnitSpecialBehavior.None;
            def.specialParams = new SpecialParam[0];
            def.bossBehaviorId = "";
            def.bossCcResist = 0f;
            return def;
        }

        static TowerDefSO BuildArcherDef()
        {
            var def = ScriptableObject.CreateInstance<TowerDefSO>();
            def.id = "archer";
            def.name = "Archer";
            def.color = "#777";
            def.cost = 20;
            def.element = Element.Neutral;
            def.family = TowerFamily.Archer;
            def.tier = 1;
            def.shape = TowerShape.Circle;
            def.isPremium = false;
            def.stats = new TowerStats
            {
                attackSpeed = 1f,
                damage = 20f,
                projectileSpeed = 8f,
                range = 4f,
                special = "",
            };
            def.sameFamilyMergeTargetId = "";
            return def;
        }

        // ── Test A: per-system unit tests ───────────────────────────────────

        // ── MinimalGridManager ────────────────────────────────────────────

        [Test]
        public void GridManager_ReportsBoundsAndIsBlockedOnPath()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            Assert.AreEqual(8, grid.Cols);
            Assert.AreEqual(18, grid.Rows);

            // Spawn (0,0) is on the path → blocked.
            Assert.IsTrue(grid.IsBlocked(new GridCell(0, 0)));
            // Exit (4,0) is on the path → blocked.
            Assert.IsTrue(grid.IsBlocked(new GridCell(4, 0)));
            // (3,14) is NOT on the path → buildable (per OQ-3).
            Assert.IsFalse(grid.IsBlocked(new GridCell(3, 14)));
            // Out-of-bounds → blocked.
            Assert.IsTrue(grid.IsBlocked(new GridCell(-1, 0)));
            Assert.IsTrue(grid.IsBlocked(new GridCell(0, 18)));
            Assert.IsTrue(grid.IsBlocked(new GridCell(8, 5)));
        }

        [Test]
        public void GridManager_GridToWorld_RoundTripsViaWorldToGrid()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var cell = new GridCell(3, 14);
            Vector2 world = grid.GridToWorld(cell);
            Assert.AreEqual(3.5f, world.x, 1e-6f);
            Assert.AreEqual(14.5f, world.y, 1e-6f);
            var roundTrip = grid.WorldToGrid(world);
            Assert.AreEqual(cell, roundTrip);
        }

        // ── MinimalEnergySystem ───────────────────────────────────────────

        [Test]
        public void EnergySystem_TicksOnePerSecondCappedAt200()
        {
            var es = new MinimalEnergySystem(initial: 40f, regenPerSec: 1f, cap: 200);
            // 60 seconds at 1/s → 100, well under cap.
            for (int i = 0; i < 60; i++) es.Tick(1f, i + 1f);
            Assert.AreEqual(100, es.EnergyInt);

            // Force above cap: 200 seconds more.
            for (int i = 0; i < 200; i++) es.Tick(1f, 100f + i);
            Assert.AreEqual(200, es.EnergyInt, "energy must be capped at 200");
        }

        [Test]
        public void EnergySystem_SpendOrFail_ReturnsFalseWhenUnderfunded()
        {
            var es = new MinimalEnergySystem(initial: 15f, regenPerSec: 0f, cap: 200);
            Assert.IsFalse(es.SpendOrFail(20));
            Assert.AreEqual(15, es.EnergyInt);
            Assert.IsTrue(es.SpendOrFail(10));
            Assert.AreEqual(5, es.EnergyInt);
        }

        [Test]
        public void EnergySystem_FiresOnEnergyChangedOnSpend()
        {
            var es = new MinimalEnergySystem(initial: 40f, regenPerSec: 0f, cap: 200);
            int lastEnergy = -1;
            es.OnEnergyChanged += e => lastEnergy = e;
            Assert.IsTrue(es.SpendOrFail(20));
            Assert.AreEqual(20, lastEnergy);
        }

        // ── MinimalUnitSystem ─────────────────────────────────────────────

        [Test]
        public void UnitSystem_AdvancesUnitAlongPathAtConfiguredSpeed()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var us = new MinimalUnitSystem(grid, new System.Random(0));
            var def = BuildBattleRobotDef();
            try
            {
                var unit = us.Spawn(def);
                // Speed = 1.5 t/s. 1s tick → progress = 1.5 cells.
                us.Tick(1f);
                Assert.AreEqual(1, unit.PathIndex,
                    "after 1s at 1.5 t/s, PathIndex should be 1 (one full cell crossed)");
                Assert.That(unit.CellProgress, Is.EqualTo(0.5f).Within(1e-4f));
                Assert.IsTrue(unit.Alive);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(def);
            }
        }

        [Test]
        public void UnitSystem_ApplyDamage_KillsUnitWhenHpReachesZero()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var us = new MinimalUnitSystem(grid, new System.Random(0));
            var def = BuildBattleRobotDef();
            try
            {
                var unit = us.Spawn(def);
                int killEvents = 0;
                us.OnUnitKilled += unit => killEvents++;
                int dmg1 = us.ApplyDamage(unit, 20, armorPierce: false);
                // 20 - 5 armor = 15.
                Assert.AreEqual(15, dmg1);
                Assert.AreEqual(65, unit.Hp);
                int dmg2 = us.ApplyDamage(unit, 100, armorPierce: true);
                // armorPierce → full 100, kills unit.
                Assert.AreEqual(100, dmg2);
                Assert.IsFalse(unit.Alive);
                Assert.AreEqual(1, killEvents);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(def);
            }
        }

        // ── MinimalTowerSystem ────────────────────────────────────────────

        [Test]
        public void TowerSystem_TryPlace_RejectsOnBlockedCell()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var rng = new System.Random(0);
            var us = new MinimalUnitSystem(grid, rng);
            var es = new MinimalEnergySystem(initial: 40f, regenPerSec: 0f, cap: 200);
            var ts = new MinimalTowerSystem(grid, us, es);
            var archer = BuildArcherDef();
            try
            {
                PlacementRejection? rejection = null;
                ts.OnTowerPlaceRejected += (def, cell, r) => rejection = r;
                var placed = ts.TryPlace(archer, new GridCell(0, 0)); // path cell
                Assert.IsNull(placed);
                Assert.AreEqual(PlacementRejection.Blocked, rejection);
                // Energy unchanged on rejection.
                Assert.AreEqual(40, es.EnergyInt);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(archer);
            }
        }

        [Test]
        public void TowerSystem_TryPlace_RejectsWhenInsufficientFunds()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var us = new MinimalUnitSystem(grid, new System.Random(0));
            var es = new MinimalEnergySystem(initial: 5f, regenPerSec: 0f, cap: 200);
            var ts = new MinimalTowerSystem(grid, us, es);
            var archer = BuildArcherDef();
            try
            {
                PlacementRejection? rejection = null;
                ts.OnTowerPlaceRejected += (def, cell, r) => rejection = r;
                var placed = ts.TryPlace(archer, new GridCell(3, 14));
                Assert.IsNull(placed);
                Assert.AreEqual(PlacementRejection.InsufficientFunds, rejection);
                Assert.AreEqual(5, es.EnergyInt);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(archer);
            }
        }

        [Test]
        public void TowerSystem_FindsNearestInRangeAndDealsDamage()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var us = new MinimalUnitSystem(grid, new System.Random(0));
            var es = new MinimalEnergySystem(initial: 40f, regenPerSec: 0f, cap: 200);
            var ts = new MinimalTowerSystem(grid, us, es);
            var archer = BuildArcherDef();
            var unitDef = BuildBattleRobotDef();
            try
            {
                // Place archer at (3,14). Spawn one unit and step until it
                // reaches a cell within range² = 16 of (3,14): path cell (0,12)
                // is dist² = 9+4 = 13 ≤ 16.
                var placed = ts.TryPlace(archer, new GridCell(3, 14));
                Assert.IsNotNull(placed);
                var unit = us.Spawn(unitDef);

                int damageEvents = 0;
                us.OnUnitDamaged += (target, dmg, pierce) => damageEvents++;

                // Manually advance the unit to (0, 12) by setting PathIndex.
                // Path[12] = (0,12) (col 0, descending from row 0).
                unit.PathIndex = 12;
                unit.CellProgress = 0f;

                // Tick towers — should fire (cooldown=0 → schedule projectile).
                ts.Tick(0.1f, tickEndTimeSec: 0.1f);
                Assert.AreEqual(1, placed.ShotsFired,
                    "archer should fire on tick 1");

                // Resolve damage at far-future timestamp so projectile lands.
                ts.ResolveDamage(tickEndTimeSec: 10f);
                Assert.GreaterOrEqual(damageEvents, 1, "damage event should have fired");
                // armorPierce → 20 dmg, hp 80 → 60.
                Assert.AreEqual(60, unit.Hp);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(archer);
                ScriptableObject.DestroyImmediate(unitDef);
            }
        }

        // ── MinimalWaveSystem ─────────────────────────────────────────────

        [Test]
        public void WaveSystem_SchedulesFiveSpawnsAt300msCadence()
        {
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var us = new MinimalUnitSystem(grid, new System.Random(0));
            var unitDef = BuildBattleRobotDef();
            try
            {
                var ws = new MinimalWaveSystem(us, unitDef,
                    count: 5, spawnIntervalSec: 0.3f, prepEndSec: 0f);
                int spawnEvents = 0;
                ws.OnUnitSpawned += unit => spawnEvents++;
                ws.StartWave1();

                // Step 0..2s in 100ms increments — should yield exactly 5 spawns.
                float t = 0f;
                for (int i = 0; i < 20; i++)
                {
                    t += 0.1f;
                    ws.Tick(0.1f, t);
                }
                Assert.AreEqual(5, spawnEvents);
                Assert.AreEqual(5, ws.SpawnedCount);
                // Wave not completed because units are still alive.
                Assert.IsFalse(ws.Completed);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(unitDef);
            }
        }

        [Test]
        public void Wave_ZeroCount_DoesNotFireCompletedOnTickZero()
        {
            // Regression guard for Fix C2: a degenerate count=0 fixture must NOT
            // immediately fire OnWaveCompleted on tick 0 (which would otherwise
            // happen because `_spawned >= _count && AllUnitsCleared()` is trivially
            // true with no units in the system).
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var us = new MinimalUnitSystem(grid, new System.Random(0));
            var unitDef = BuildBattleRobotDef();
            try
            {
                var ws = new MinimalWaveSystem(us, unitDef,
                    count: 0, spawnIntervalSec: 0.3f, prepEndSec: 0f);
                int completedEvents = 0;
                int startedEvents = 0;
                ws.OnWaveCompleted += () => completedEvents++;
                ws.OnWaveStarted += () => startedEvents++;
                ws.StartWave1();
                ws.Tick(0.1f, 0.1f);
                Assert.AreEqual(0, completedEvents,
                    "OnWaveCompleted must not fire when count=0 (foot-gun for Task 6 / Phase 3 fixtures).");
                Assert.AreEqual(0, startedEvents,
                    "OnWaveStarted must not fire for an empty wave either — _started stays false.");
                Assert.IsFalse(ws.Started);
                Assert.IsFalse(ws.Completed);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(unitDef);
            }
        }

        // ── Test B: integration ────────────────────────────────────────────

        [Test]
        public void Integration_Wave1_ProducesLooseExpectedMetrics()
        {
            // Build everything programmatically — same values as
            // packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json.
            var grid = new MinimalGridManager(BuildSlice2PocMap());
            var rng = new System.Random(12345);
            var us = new MinimalUnitSystem(grid, rng);
            var es = new MinimalEnergySystem(initial: 40f, regenPerSec: 1f, cap: 200);
            var ts = new MinimalTowerSystem(grid, us, es);
            var unitDef = BuildBattleRobotDef();
            var archer = BuildArcherDef();
            try
            {
                var wave = new MinimalWaveSystem(us, unitDef,
                    count: 5, spawnIntervalSec: 0.3f, prepEndSec: 0f);

                int kills = 0;
                us.OnUnitKilled += unit => kills++;

                int energyPeak = es.EnergyInt;

                wave.StartWave1();

                const float tickSec = 1f / 60f; // approximates 16.6667ms.
                const float durationSec = 60f;
                float t = 0f;
                bool placedArcher = false;

                int totalTicks = (int)System.Math.Ceiling(durationSec / tickSec);
                for (int i = 0; i < totalTicks; i++)
                {
                    float tickEnd = System.Math.Min(t + tickSec, durationSec);
                    float dt = tickEnd - t;
                    if (dt <= 0f) break;

                    // Per §1.4 tick order: Energy → Inputs → Wave → Units → Towers → ResolveDamage.
                    es.Tick(dt, tickEnd);
                    if (!placedArcher && tickEnd >= 0.1f)
                    {
                        var placed = ts.TryPlace(archer, new GridCell(3, 14));
                        Assert.IsNotNull(placed,
                            "archer should place successfully at (3,14) given starting energy 40 ≥ cost 20");
                        placedArcher = true;
                    }
                    wave.Tick(dt, tickEnd);
                    us.Tick(dt);
                    ts.Tick(dt, tickEnd);
                    ts.ResolveDamage(tickEnd);

                    if (es.EnergyInt > energyPeak) energyPeak = es.EnergyInt;
                    t = tickEnd;
                }
                ts.FlushPendingDamage();

                Assert.IsTrue(placedArcher);

                // Canonical deterministic value (Fix M3): the TS replay-runner
                // produces kills=3 for the slice2_poc fixture under faithful
                // NearestInRange + projectile TTL (see seed-001-slice2-poc.json
                // expected.kills and design-decisions §3.5/§3.7 deviation note).
                // A loose-band test would silently pass a regression to kills=2
                // or kills=4; lock the canonical value here so any drift fails
                // immediately and forces an investigation.
                Assert.AreEqual(3, kills,
                    "Canonical deterministic kill count for slice2_poc fixture under faithful " +
                    "NearestInRange + projectile TTL. If this changes, either the runner logic " +
                    "drifted (verify against TS replay-runner.ts) or the design-decisions doc " +
                    "needs an erratum. See docs/unity-migration/phase-2-design-decisions.md §3.7 + §4.");

                // Canonical deterministic value: TS runner yields energyPeak=79
                // (40 initial - 20 archer + ~60s passive regen, floored at the
                // peak frame). Tightened from the prior [70, 85] band to [78, 81]
                // — narrow enough to catch real regression, wide enough to absorb
                // 1-tick boundary jitter from the 1/60s tick subdivision.
                Assert.That(energyPeak, Is.InRange(78, 81),
                    "energyPeak canonical value is 79 from the TS replay-runner; tight band " +
                    "[78,81] absorbs 1-tick floor() boundary jitter without hiding regression. " +
                    "See seed-001-slice2-poc.json expected.energyPeak.");

                // Sanity: 5 units were spawned.
                Assert.AreEqual(5, us.Units.Count);
            }
            finally
            {
                ScriptableObject.DestroyImmediate(unitDef);
                ScriptableObject.DestroyImmediate(archer);
            }
        }
    }
}
