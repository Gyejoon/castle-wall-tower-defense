// ReplayParityTests.cs — Phase 2 Task 2 Step 5 skeleton.
//
// Goal: cross-runtime parity gate for the seed-001-slice2-poc fixture. The
// shared TS replay-runner (packages/shared/src/testing/replay-runner.ts) and
// the Unity MinimalReplayRunner (introduced in Task 6) must produce identical
// metric tuples for the same fixture. This file is the Unity half of that
// gate; the TS half lives in
// packages/shared/src/testing/__tests__/replay-runner.test.ts.
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
// ── Status: SKELETON (Task 2 Step 5) ─────────────────────────────────────
// At Task 2 commit time, MinimalReplayRunner does NOT yet exist. Task 6 wires
// the Unity runner. The skeleton below uses [Ignore] so the assembly compiles
// cleanly without the runtime type. A local placeholder type
// `MinimalReplayRunnerStub` keeps the test method's body valid C# until the
// real type is introduced; once Task 6 lands, the [Ignore] attribute is
// removed and `MinimalReplayRunnerStub` is replaced with the real
// `GLD.Replay.MinimalReplayRunner` reference.
// ─────────────────────────────────────────────────────────────────────────
//
// Fixture path-resolution strategy (deliberate, simplest option):
//   The fixture JSON ships in two locations:
//     1. packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json
//        (canonical, owned by @gld/shared)
//     2. packages/unity-game/Assets/Tests/EditMode/Replay/Fixtures/<same>.json
//        (Unity-side mirror used at test time)
//   The mirror is necessary because EditMode tests must resolve files at
//   project-relative paths without a network fetch and without depending on
//   the workspace layout above the Unity project root. Task 6 will add a
//   pre-build script that copies the canonical file → mirror; until then,
//   this test asserts mirror existence and Inconclusive's gracefully if the
//   mirror is missing (mirrors the manifest-test pattern already used in
//   ManifestParityTests.cs).

using System.IO;
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

        // ── Local placeholder for MinimalReplayRunner ───────────────────────
        // Removed in Task 6 in favor of the real GLD.Replay.MinimalReplayRunner.
        // Kept here so the assembly compiles before Task 6 lands. The shape
        // mirrors the eventual TS surface (runReplay → { events, metrics }).
        struct MinimalReplayMetrics
        {
            public int kills;
            public int totalDamage;
            public int? waveClearMs;
            public int energyPeak;
        }

        struct MinimalReplayResult
        {
            public MinimalReplayMetrics metrics;
        }

        static class MinimalReplayRunnerStub
        {
            public static MinimalReplayResult Run(string fixtureJson)
            {
                // Placeholder; real impl lands in Task 6.
                return new MinimalReplayResult
                {
                    metrics = new MinimalReplayMetrics
                    {
                        kills = -1,
                        totalDamage = -1,
                        waveClearMs = null,
                        energyPeak = -1,
                    },
                };
            }
        }

        // ── Tests ───────────────────────────────────────────────────────────

        [Test]
        public void Fixture_FileExists_OrInconclusive()
        {
            if (!File.Exists(FixtureAbsolutePath))
            {
                Assert.Inconclusive(
                    $"Fixture mirror not found at '{FixtureAbsolutePath}'. " +
                    "Task 6 wires a copy step from packages/shared/src/testing/replay-fixtures/. " +
                    "Run that copy step (or copy by hand) before re-running this test.");
            }
        }

        [Test]
        [Ignore("MinimalReplayRunner not yet implemented — Task 6")]
        public void Kills_MatchesFixtureExpected()
        {
            // Arrange: load fixture JSON. The Unity runner consumes the same
            // JSON shape as the TS runner; both produce the same metrics.
            if (!File.Exists(FixtureAbsolutePath))
            {
                Assert.Inconclusive(
                    $"Fixture mirror not found at '{FixtureAbsolutePath}'.");
                return;
            }

            string json = File.ReadAllText(FixtureAbsolutePath);
            // expectedKills is read out of the fixture's `expected.kills` field
            // by the real test once MinimalReplayRunner lands. Skeleton wires a
            // hard-coded value mirroring the current fixture (kills=3); this
            // value MUST track packages/shared/src/testing/replay-fixtures/
            // seed-001-slice2-poc.json — see that file's `_comment` block for
            // the §3.5 deviation rationale.
            const int expectedKills = 3;

            // Act
            var result = MinimalReplayRunnerStub.Run(json);

            // Assert
            Assert.AreEqual(
                expectedKills,
                result.metrics.kills,
                "Unity MinimalReplayRunner kills must match the fixture's expected.kills " +
                "(and, by transitivity, the TS replay-runner output). Failure here means " +
                "Unity ↔ TS parity has drifted; rebuild from the shared logic invariants " +
                "in docs/unity-migration/phase-2-design-decisions.md §3."
            );
        }
    }
}
