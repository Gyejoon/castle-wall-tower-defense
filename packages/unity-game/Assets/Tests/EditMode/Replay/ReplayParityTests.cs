// ReplayParityTests.cs — Phase 2 Task 6 cross-runtime parity gate.
//
// Goal: kills==3 invariant (L1 lock) — the shared TS replay-runner
// (packages/shared/src/testing/replay-runner.ts) and the Unity
// MinimalReplayRunner (packages/unity-game/Assets/Scripts/Replay/) must
// produce identical kill counts for the seed-001-slice2-poc fixture, plus
// bounded-equality on the other three metrics.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1   Anti-pattern watchlist (no MonoBehaviour state, no UnityEngine.Random,
//          no Coroutine in Minimal systems).
//   - §3   Wave-1 numeric invariants and bounded fixture metrics.
//   - §3.6 RNG NOT consumed at PoC scope (no CC towers); seed 12345 is
//          recorded but does not influence determinism here.
//   - §3.7 Metrics are bounds; Task 7 validates against an actual Phaser run
//          before locking the fixture's `expected` block.
//
// Fixture path-resolution strategy:
//   The fixture JSON ships in two locations:
//     1. packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json
//        (canonical, owned by @gld/shared)
//     2. packages/unity-game/Assets/Tests/EditMode/Replay/Fixtures/<same>.json
//        (Unity-side mirror used at test time)
//   The mirror is necessary because EditMode tests must resolve files at
//   project-relative paths without a network fetch and without depending on
//   the workspace layout above the Unity project root. The mirror is hand-
//   synced; a future `bun run sync:replay-fixtures` script (deferred) will
//   automate this for Phase 3 when more fixtures land.

using System.IO;
using GLD.Replay;
using Newtonsoft.Json;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Replay
{
    [TestFixture]
    public class ReplayParityTests
    {
        // EditMode-relative path. Application.dataPath = <UnityProject>/Assets,
        // so this resolves to .../Assets/Tests/EditMode/Replay/Fixtures/...json.
        const string FixtureRelativePath =
            "Tests/EditMode/Replay/Fixtures/seed-001-slice2-poc.json";

        static string FixtureAbsolutePath =>
            Path.Combine(Application.dataPath, FixtureRelativePath);

        // ── Helpers ─────────────────────────────────────────────────────────

        /// <summary>Load + parse the fixture once per test, or Inconclusive
        /// if the mirror is missing. Centralized so every metric assertion
        /// shares one source of expected ranges.</summary>
        static (MinimalReplayResult result, MinimalReplayFixture fixture) LoadAndRun()
        {
            if (!File.Exists(FixtureAbsolutePath))
            {
                Assert.Inconclusive(
                    $"Fixture mirror not found at '{FixtureAbsolutePath}'. " +
                    "Sync from packages/shared/src/testing/replay-fixtures/ before re-running.");
                return (default, null); // unreachable; Assert.Inconclusive throws.
            }
            string json = File.ReadAllText(FixtureAbsolutePath);
            var fixture = JsonConvert.DeserializeObject<MinimalReplayFixture>(json);
            var result = MinimalReplayRunner.Run(json);
            return (result, fixture);
        }

        // ── Tests ───────────────────────────────────────────────────────────

        [Test]
        public void Fixture_FileExists_OrInconclusive()
        {
            if (!File.Exists(FixtureAbsolutePath))
            {
                Assert.Inconclusive(
                    $"Fixture mirror not found at '{FixtureAbsolutePath}'. " +
                    "Sync from packages/shared/src/testing/replay-fixtures/ before re-running.");
            }
        }

        [Test]
        public void Kills_MatchesFixtureExpected()
        {
            // L1 lock: kills==3 is the canonical TS-runner output; the C#
            // runner must match exactly (point-equality), not within a band.
            var (result, fixture) = LoadAndRun();
            Assert.AreEqual(
                fixture.Expected.Kills,
                result.Metrics.Kills,
                "Unity MinimalReplayRunner kills must match the fixture's expected.kills " +
                "(and, by transitivity, the TS replay-runner output). Failure here means " +
                "Unity ↔ TS parity has drifted; rebuild from the shared logic invariants " +
                "in docs/unity-migration/phase-2-design-decisions.md §3.");
        }

        [Test]
        public void TotalDamage_FallsWithinFixtureBounds()
        {
            var (result, fixture) = LoadAndRun();
            Assert.That(
                result.Metrics.TotalDamage,
                Is.InRange(fixture.Expected.TotalDamage.Min, fixture.Expected.TotalDamage.Max),
                "totalDamage must fall inside the fixture's expected.totalDamage range. " +
                "TS canonical value is 260 (3 kills × 80 + 1 partial × 20).");
        }

        [Test]
        public void WaveClearMs_FallsWithinFixtureBounds()
        {
            var (result, fixture) = LoadAndRun();
            Assert.That(result.Metrics.WaveClearMs, Is.Not.Null,
                "WaveClearMs must be populated when expected.kills is reached. " +
                "Null here means the C# runner never hit the 3rd kill — investigate " +
                "tick ordering or projectile resolution (L4 lock).");
            Assert.That(
                result.Metrics.WaveClearMs.Value,
                Is.InRange(fixture.Expected.WaveClearMs.Min, fixture.Expected.WaveClearMs.Max),
                "waveClearMs must fall inside the fixture's expected.waveClearMs range. " +
                "TS canonical value is 18874ms (timestamp of the 3rd kill).");
        }

        [Test]
        public void EnergyPeak_FallsWithinFixtureBounds()
        {
            var (result, fixture) = LoadAndRun();
            Assert.That(
                result.Metrics.EnergyPeak,
                Is.InRange(fixture.Expected.EnergyPeak.Min, fixture.Expected.EnergyPeak.Max),
                "energyPeak must fall inside the fixture's expected.energyPeak range. " +
                "TS canonical value is 79 (40 initial - 20 archer + 60s passive regen).");
        }

        [Test]
        public void RunIsDeterministic_TwoBackToBackRunsProduceSameMetrics()
        {
            // Determinism: same fixture in → same result out (no shared state
            // across Run() calls). This is the C# twin of the TS runner's
            // "byte-identical events" test in replay-runner.test.ts.
            var (first, _) = LoadAndRun();
            var (second, _) = LoadAndRun();
            Assert.AreEqual(first.Metrics.Kills, second.Metrics.Kills,
                "Determinism violated: kills differ between back-to-back runs.");
            Assert.AreEqual(first.Metrics.TotalDamage, second.Metrics.TotalDamage,
                "Determinism violated: totalDamage differs.");
            Assert.AreEqual(first.Metrics.EnergyPeak, second.Metrics.EnergyPeak,
                "Determinism violated: energyPeak differs.");
            Assert.AreEqual(first.Metrics.WaveClearMs, second.Metrics.WaveClearMs,
                "Determinism violated: waveClearMs differs.");
        }
    }
}
