using System.IO;
using GLD.SceneRuntime.Slice2;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Replay
{
    public sealed class ReplayParityTests
    {
        [Test]
        public void UnityReplayMatchesPhase3FixturesWithinTolerance()
        {
            var fixtureDir = Path.GetFullPath(Path.Combine(
                Application.dataPath,
                "../../..",
                "packages/shared/src/testing/replay-fixtures"));

            foreach (var fixturePath in Directory.GetFiles(fixtureDir, "seed-*.json"))
            {
                var fixtureJson = File.ReadAllText(fixturePath);
                var fixture = JsonUtility.FromJson<ReplayFixture>(fixtureJson);
                if (fixture.phase4_dependent)
                    continue;

                var metrics = MinimalReplayRunner.Run(fixture);

                Assert.That(metrics.kills, Is.EqualTo(fixture.expected.kills), fixture.fixtureId);
                AssertWithinFivePercent(metrics.totalDamage, fixture.expected.totalDamage, fixture.fixtureId);
                AssertWithinFivePercent(metrics.energyPeak, fixture.expected.energyPeak, fixture.fixtureId);
                AssertWithinFivePercent(metrics.waveClearMs, fixture.expected.waveClearMs, fixture.fixtureId);
            }
        }

        static void AssertWithinFivePercent(float actual, float expected, string fixtureId)
        {
            var tolerance = expected * 0.05f;
            Assert.That(actual, Is.InRange(expected - tolerance, expected + tolerance), fixtureId);
        }
    }
}
