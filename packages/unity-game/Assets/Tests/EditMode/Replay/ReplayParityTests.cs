using System.IO;
using GLD.SceneRuntime.Slice2;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Replay
{
    public sealed class ReplayParityTests
    {
        [Test]
        public void UnityReplayMatchesSeed001FixtureWithinFivePercent()
        {
            var fixturePath = Path.GetFullPath(Path.Combine(
                Application.dataPath,
                "../../..",
                "packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json"));
            var fixtureJson = File.ReadAllText(fixturePath);
            var fixture = JsonUtility.FromJson<ReplayFixture>(fixtureJson);
            var metrics = MinimalReplayRunner.Run(fixture);

            Assert.That(metrics.kills, Is.EqualTo(fixture.expected.kills));
            AssertWithinFivePercent(metrics.totalDamage, fixture.expected.totalDamage);
            AssertWithinFivePercent(metrics.energyPeak, fixture.expected.energyPeak);
            AssertWithinFivePercent(metrics.waveClearMs, fixture.expected.waveClearMs);
        }

        static void AssertWithinFivePercent(float actual, float expected)
        {
            var tolerance = expected * 0.05f;
            Assert.That(actual, Is.InRange(expected - tolerance, expected + tolerance));
        }
    }
}
