// MinimalReplayRunner.cs — Phase 2 Task 6 cross-runtime parity gate.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.4 Per-tick phase order: Energy → applyInputs → Wave → Units → Towers
//          → ResolveDamage → flushPendingDamage. Must match TS exactly (L4 lock).
//   - §1.5 Anti-pattern watchlist:
//          * No MonoBehaviour. The runner is pure C# headless code.
//          * No UnityEngine.Time / Random. Tick uses fixed dt; RNG is
//            System.Random(seed) — though §3.6 confirms PoC consumes none.
//          * No Coroutine. Synchronous `for` loop over totalTicks.
//   - §3.5 Wave-1 numeric invariants. Fixture's `expected` block is the
//          authoritative source for the parity gate.
//   - §3.6 RNG NOT consumed at PoC scope (no CC towers in slice2_poc); seed
//          recorded for future Phase 3 use.
//
// Mirrors packages/shared/src/testing/replay-runner.ts end-to-end. The TS
// runner is the C# twin's source of truth: any per-tick semantic that differs
// here from the TS file is a parity violation. Re-read replay-runner.ts when
// editing this file.
//
// Plan reference: docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md
//   Task 6: "MinimalReplayRunner + URL param router". Five steps; this file is
//   Step 1 (the runner) + Step 4 (the parity test wires up to it).
//
// Scope deviation from the plan's "Assets/Scripts/SceneRuntime/Slice2/..." path:
//   The runner lives under Assets/Scripts/Replay/ with namespace GLD.Replay.
//   Rationale: this code is HEADLESS — no MonoBehaviour, no scene context. It
//   must NOT depend on SceneRuntime's view layer. The stub in Task 2 already
//   declared `namespace GLD.Replay`; this file matches that intent. The new
//   GLD.Replay.asmdef references GLD.Data + GLD.Systems + GLD.SceneRuntime
//   (the last just for Slice2MapBuilder + Slice2DefBuilder, both pure data).
//
// Event-stream emission (deliberate skip):
//   The TS runner emits a sorted output-event stream alongside metrics. The C#
//   runner SKIPS event emission at PoC scope — Task 6 brief says the parity
//   contract is metrics-only; event-stream parity is Phase 3 work. Subscribing
//   to the existing MinimalUnitSystem / MinimalEnergySystem events covers
//   every metric we need.

using System;
using System.IO;
using GLD.Data;
using GLD.SceneRuntime.Slice2;
using GLD.Systems.Minimal;
using Newtonsoft.Json;

namespace GLD.Replay
{
    /// <summary>
    /// Pure-C# headless replay runner. Constructs the minimal-system graph
    /// from a fixture JSON, drives the canonical tick loop, and returns a
    /// metric tuple. Two back-to-back Run() calls with the same fixture must
    /// return identical metrics (allocation-per-Run; no shared state).
    /// </summary>
    public static class MinimalReplayRunner
    {
        /// <summary>
        /// Parse the fixture JSON and run the simulation end-to-end.
        /// </summary>
        /// <param name="fixtureJson">Raw fixture JSON. Schema mirrors
        /// <see cref="MinimalReplayFixture"/>.</param>
        /// <returns>Metrics summary. See <see cref="MinimalReplayResult"/>.</returns>
        /// <exception cref="ArgumentException">Fixture is null/empty/invalid.</exception>
        /// <exception cref="InvalidOperationException">Fixture references unsupported PoC features (e.g.
        /// <c>regenGatedDuringPrep=true</c>) or its <c>map.path</c> drifts from the canonical
        /// <see cref="Slice2MapBuilder.BuildSlice2PocMap"/> output.</exception>
        public static MinimalReplayResult Run(string fixtureJson)
        {
            if (string.IsNullOrWhiteSpace(fixtureJson))
                throw new ArgumentException(
                    "fixtureJson is null/empty.", nameof(fixtureJson));

            MinimalReplayFixture fixture;
            try
            {
                fixture = JsonConvert.DeserializeObject<MinimalReplayFixture>(fixtureJson);
            }
            catch (JsonException ex)
            {
                throw new ArgumentException(
                    "fixtureJson is not a valid replay fixture JSON.", nameof(fixtureJson), ex);
            }
            if (fixture == null)
                throw new ArgumentException(
                    "fixtureJson deserialized to null.", nameof(fixtureJson));
            return RunFixture(fixture);
        }

        /// <summary>
        /// Run a pre-parsed fixture object. Useful for callers that already
        /// hold a deserialized fixture (e.g. tests round-tripping through
        /// <see cref="MinimalReplayFixture"/>) and want to skip parsing.
        /// </summary>
        public static MinimalReplayResult RunFixture(MinimalReplayFixture fixture)
        {
            ValidateFixture(fixture);

            // ── Map: build programmatically from the locked canonical source.
            // Verify cell-by-cell that fixture.map.path matches; throw on drift
            // so a malformed fixture can never silently produce different
            // metrics under the C# runner vs. the scene controller.
            var map = Slice2MapBuilder.BuildSlice2PocMap();
            VerifyFixtureMapMatchesBuilder(fixture, map);
            var grid = new MinimalGridManager(map);

            // ── Energy. Fixture-level regenGatedDuringPrep=false is asserted in
            // ValidateFixture; we still pass false explicitly so a future fixture
            // change is loud (PoC-scope MinimalEnergySystem doesn't model gating
            // independently from the simple flag, which is fine for PoC).
            var energy = new MinimalEnergySystem(
                initial: fixture.Energy.Initial,
                regenPerSec: fixture.Energy.RegenPerSec,
                cap: fixture.Energy.Cap,
                regenGatedDuringPrep: false,
                prepEndSec: 0f);

            // ── RNG. PoC consumes none (§3.6) but the seed is plumbed through
            // for Phase 3+ when CC towers introduce stochastic procs.
            var rng = new System.Random(fixture.Seed);

            var units = new MinimalUnitSystem(grid, rng);
            var towers = new MinimalTowerSystem(grid, units, energy);

            // Allocate the unit & tower defs in-process (headless — no asset
            // load). Slice2DefBuilder centralizes the values so this runner
            // and MinimalSystemsTest never drift.
            //
            // Tower defs are allocated lazily in ApplyInputs (one per place_tower
            // event id, cached so a placed TowerInstance.Def reference never
            // becomes stale). The cache lives for the duration of Run() and is
            // released in the outer finally below.
            var unitDef = ResolveUnitDef(fixture.Wave.UnitId);
            var towerDefCache = new System.Collections.Generic.Dictionary<string, TowerDefSO>(2);
            try
            {
                // ── Wave. prepEndSec sourced from the fixture (PoC: 0). L5 lock:
                // wave system owns its prep gate; no external timer.
                var wave = new MinimalWaveSystem(
                    units, unitDef,
                    count: fixture.Wave.Count,
                    spawnIntervalSec: fixture.Wave.SpawnIntervalMs / 1000f,
                    prepEndSec: fixture.Wave.PrepMs / 1000f);

                // Mutable accumulator — needs to be a class so the lambda
                // closures below can mutate it (struct lambdas would only see
                // a copy). Projected back into a MinimalReplayMetrics struct
                // at end-of-Run.
                var acc = new Accumulator
                {
                    Kills = 0,
                    TotalDamage = 0,
                    EnergyPeak = (int)Math.Floor(energy.Energy),
                    WaveClearMs = null,
                };

                // ── Hook metrics off the existing system events. Subscribed
                // before placement so the t=0 placement input below cannot fire
                // before subscriptions are wired (defensive — placement is
                // currently scheduled at t=100ms, but the order shouldn't matter).
                int expectedKills = fixture.Expected.Kills;
                units.OnUnitDamaged += (target, dmg, pierce) => acc.TotalDamage += dmg;
                units.OnUnitKilled += unit =>
                {
                    acc.Kills++;
                    if (acc.WaveClearMs == null && acc.Kills >= expectedKills)
                    {
                        // The current MinimalUnitSystem doesn't expose the
                        // owning projectile's ImpactTimeSec, so we approximate
                        // with the orchestrator's tick clock at the moment of
                        // the kill (set inside the per-tick loop below). For
                        // the slice2_poc fixture the resolved kill timestamp
                        // (~18.87s) lands inside the fixture's [18000,20000]
                        // range; tick-quantized rounding is well within bound.
                        acc.WaveClearMs = (int)Math.Round(
                            _killTickEndSec * 1000f, MidpointRounding.AwayFromZero);
                    }
                };

                // Drive the simulation. Tick-loop control flow mirrors TS
                // runReplay() exactly:
                //   - Walk integer tick indices [0, totalTicks).
                //   - Tick window = [tickIdx * tickMs, (tickIdx+1) * tickMs),
                //     clamped to [0, durationMs].
                //   - Skip ticks whose dt collapses to <= 0.
                //   - StartWave1() once before any Tick() so the wave's prep
                //     gate is armed; spawns gated by wave.prepEndSec stay dormant
                //     until tickEnd crosses prepEndSec (PoC: 0 → first tick).
                wave.StartWave1();

                int inputCursor = 0;
                int totalTicks = (int)Math.Ceiling(fixture.DurationMs / fixture.TickMs);
                for (int tickIdx = 0; tickIdx < totalTicks; tickIdx++)
                {
                    float tMsRaw = tickIdx * fixture.TickMs;
                    float nextRaw = (tickIdx + 1) * fixture.TickMs;
                    float tMs = Math.Min(tMsRaw, fixture.DurationMs);
                    float endMs = Math.Min(nextRaw, fixture.DurationMs);
                    float dtMs = endMs - tMs;
                    if (dtMs <= 0f) break;
                    float endSec = endMs / 1000f;
                    float dtSec = dtMs / 1000f;

                    // Used inside OnUnitKilled to stamp WaveClearMs.
                    _killTickEndSec = endSec;

                    // Per-tick phase order MUST stay aligned with §1.4.
                    // Energy → applyInputs → Wave → Units → Towers →
                    // ResolveDamage → (flush after loop).
                    energy.Tick(dtSec, endSec);
                    PeekEnergyPeak(energy, acc);

                    inputCursor = ApplyInputs(fixture, inputCursor, endMs, towers, towerDefCache);
                    PeekEnergyPeak(energy, acc);

                    wave.Tick(dtSec, endSec);
                    units.Tick(dtSec);
                    towers.Tick(dtSec, endSec);
                    towers.ResolveDamage(endSec);
                }

                towers.FlushPendingDamage();

                return new MinimalReplayResult
                {
                    Metrics = new MinimalReplayMetrics
                    {
                        Kills = acc.Kills,
                        TotalDamage = acc.TotalDamage,
                        EnergyPeak = acc.EnergyPeak,
                        WaveClearMs = acc.WaveClearMs,
                    },
                };
            }
            finally
            {
                // Built ScriptableObjects must be released — they are tracked
                // by Unity even when constructed via CreateInstance in
                // headless tests. DestroyImmediate is the EditMode-safe call.
                if (unitDef != null)
                    UnityEngine.ScriptableObject.DestroyImmediate(unitDef);
                foreach (var kvp in towerDefCache)
                {
                    if (kvp.Value != null)
                        UnityEngine.ScriptableObject.DestroyImmediate(kvp.Value);
                }
            }
        }

        // Closure backing field for OnUnitKilled. Set inside the per-tick loop
        // immediately before each phase runs; the OnUnitKilled handler reads
        // it the moment a kill fires. This avoids capturing a per-tick local
        // in a lambda allocation hot path.
        // ReSharper disable once InconsistentNaming
        static float _killTickEndSec;

        // ── Helpers ────────────────────────────────────────────────────────

        /// <summary>
        /// Heap-allocated mutable accumulator — referenced from event-handler
        /// closures, then projected into the result struct at end-of-Run.
        /// Class (not struct) because lambdas can only capture references.
        /// </summary>
        sealed class Accumulator
        {
            public int Kills;
            public int TotalDamage;
            public int EnergyPeak;
            public int? WaveClearMs;
        }

        /// <summary>
        /// TS recordPeak(): track Math.Floor(energy) high-water mark.
        /// </summary>
        static void PeekEnergyPeak(MinimalEnergySystem energy, Accumulator acc)
        {
            int e = (int)Math.Floor(energy.Energy);
            if (e > acc.EnergyPeak) acc.EnergyPeak = e;
        }

        /// <summary>
        /// Drain scheduled input events whose <c>tMs &lt; tickEndMs</c>. Mirrors
        /// TS applyInputs(); strict less-than (not &lt;=) matches the TS
        /// boundary semantics. Returns the new input cursor.
        ///
        /// Tower defs are cached in <paramref name="towerDefCache"/> so a
        /// successfully placed <c>TowerInstance.Def</c> reference stays live
        /// for the simulation; the cache is released by the outer Run() finally.
        /// </summary>
        static int ApplyInputs(MinimalReplayFixture fixture, int cursor, float tickEndMs,
            MinimalTowerSystem towers,
            System.Collections.Generic.Dictionary<string, TowerDefSO> towerDefCache)
        {
            if (fixture.Events == null) return cursor;
            while (cursor < fixture.Events.Length &&
                   fixture.Events[cursor].TMs < tickEndMs)
            {
                var ev = fixture.Events[cursor++];
                if (string.Equals(ev.Kind, "place_tower", StringComparison.Ordinal))
                {
                    if (!towerDefCache.TryGetValue(ev.TowerId, out var def))
                    {
                        def = ResolveTowerDef(ev.TowerId);
                        towerDefCache[ev.TowerId] = def;
                    }
                    var cell = new GridCell(ev.Cell[0], ev.Cell[1]);
                    // MinimalTowerSystem.TryPlace handles cost/blocked/
                    // occupancy/bounds checks atomically. On rejection it
                    // emits OnTowerPlaceRejected (silent here — Phase 2
                    // metrics don't require event emission).
                    towers.TryPlace(def, cell);
                }
                // Other input kinds are Phase 3+; ignore at PoC scope rather
                // than throwing so older fixtures still parse.
            }
            return cursor;
        }

        /// <summary>
        /// Resolve a unit def by id. Phase 2 PoC supports only "battle_robot";
        /// extending the catalog requires touching <see cref="Slice2DefBuilder"/>.
        /// </summary>
        static UnitDefSO ResolveUnitDef(string unitId)
        {
            if (string.Equals(unitId, "battle_robot", StringComparison.Ordinal))
                return Slice2DefBuilder.BuildBattleRobotDef();
            throw new InvalidOperationException(
                $"Replay runner does not know unit id '{unitId}'. " +
                "Add it to Slice2DefBuilder or extend the resolver.");
        }

        /// <summary>
        /// Resolve a tower def by id. Phase 2 PoC supports only "archer".
        /// </summary>
        static TowerDefSO ResolveTowerDef(string towerId)
        {
            if (string.Equals(towerId, "archer", StringComparison.Ordinal))
                return Slice2DefBuilder.BuildArcherDef();
            throw new InvalidOperationException(
                $"Replay runner does not know tower id '{towerId}'. " +
                "Add it to Slice2DefBuilder or extend the resolver.");
        }

        // ── Validation ─────────────────────────────────────────────────────

        static void ValidateFixture(MinimalReplayFixture fixture)
        {
            if (fixture == null) throw new ArgumentNullException(nameof(fixture));
            if (fixture.Map == null) throw new InvalidOperationException("Fixture missing `map` block.");
            if (fixture.Energy == null) throw new InvalidOperationException("Fixture missing `energy` block.");
            if (fixture.Wave == null) throw new InvalidOperationException("Fixture missing `wave` block.");
            if (fixture.Expected == null) throw new InvalidOperationException("Fixture missing `expected` block.");
            if (fixture.Map.Path == null || fixture.Map.Path.Length == 0)
                throw new InvalidOperationException("Fixture map.path is empty.");
            if (fixture.TickMs <= 0f)
                throw new InvalidOperationException("Fixture tickMs must be > 0.");
            if (fixture.DurationMs <= 0f)
                throw new InvalidOperationException("Fixture durationMs must be > 0.");

            // PoC scope: regenGatedDuringPrep is not implemented here. If a
            // future fixture sets it true, fail loudly so the runner is
            // extended deliberately rather than silently producing wrong
            // metrics. (Plan task brief: "assert it's false in the runner
            // and bail loudly if a future fixture sets it true".)
            if (fixture.Energy.RegenGatedDuringPrep)
            {
                throw new InvalidOperationException(
                    "Fixture sets energy.regenGatedDuringPrep=true; the Phase 2 PoC " +
                    "runner does not implement gating. Either disable the flag in the " +
                    "fixture or extend MinimalEnergySystem + this runner before consuming " +
                    "it. See packages/shared/src/testing/replay-runner.ts:tickEnergy() for " +
                    "the gating semantics that need mirroring.");
            }
        }

        /// <summary>
        /// Compare the fixture's <c>map.path</c> cell-by-cell against the
        /// canonical <see cref="Slice2MapBuilder.BuildSlice2PocMap"/> output.
        /// Drift here is a fixture authoring bug — fail loudly so it can never
        /// silently corrupt parity metrics.
        /// </summary>
        static void VerifyFixtureMapMatchesBuilder(MinimalReplayFixture fixture, MapDef builderMap)
        {
            var fp = fixture.Map.Path;
            var bp = builderMap.path;
            if (fp.Length != bp.Length)
            {
                throw new InvalidOperationException(
                    $"Fixture map.path length ({fp.Length}) differs from Slice2MapBuilder " +
                    $"output ({bp.Length}). Either the fixture or the builder is stale; " +
                    "synchronize them. See packages/shared/src/testing/replay-fixtures/" +
                    "seed-001-slice2-poc.json and Slice2MapBuilder.BuildSlice2PocMap().");
            }
            for (int i = 0; i < fp.Length; i++)
            {
                int fx = fp[i][0], fy = fp[i][1];
                int bx = bp[i].x, by = bp[i].y;
                if (fx != bx || fy != by)
                {
                    throw new InvalidOperationException(
                        $"Fixture map.path[{i}]=({fx},{fy}) does not match Slice2MapBuilder " +
                        $"output ({bx},{by}). Synchronize the two sources before re-running.");
                }
            }
        }

        // ── Convenience ────────────────────────────────────────────────────

        /// <summary>
        /// Convenience: load fixture from a UTF-8 file path and run.
        /// Used by the parity test (which knows the on-disk mirror path) so
        /// callers never have to worry about JSON encoding.
        /// </summary>
        public static MinimalReplayResult RunFromFile(string fixturePath)
        {
            if (string.IsNullOrEmpty(fixturePath))
                throw new ArgumentException("fixturePath is null/empty.", nameof(fixturePath));
            if (!File.Exists(fixturePath))
                throw new FileNotFoundException(
                    $"Replay fixture not found: {fixturePath}", fixturePath);
            return Run(File.ReadAllText(fixturePath));
        }
    }
}
