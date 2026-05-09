using System.Collections;
using System.IO;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop;
using GLD.SceneRuntime.Slice2;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.Integration
{
    public sealed class FullRunFixtureTest
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        [UnityTest]
        public IEnumerator Phase4SupportedFixturesReachWave20WithInRunSystems()
        {
            AssertPhase4FixtureIsUngated("seed-002-gacha-stack");
            AssertPhase4FixtureIsUngated("seed-003-boss-wave-10-hp-bag");
            AssertPhase4FixtureIsUngated("seed-004-merge-chain");

            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);
            controller.gameObject.SetActive(true);
            yield return null;

            var checkpointCount = 0;
            var checkpointAppliedCount = 0;
            var towerSlotUpgradeCount = 0;
            var wallStateCount = 0;
            var tacticStateCount = 0;

            GameEvents.OnCheckpointReady += (_, choices) =>
            {
                checkpointCount++;
                Assert.That(choices, Has.Length.EqualTo(3));
                var choiceIndex = checkpointCount == 2 ? 2 : 0;
                GameEvents.RaiseRequestApplyCheckpointReward(choices[choiceIndex].Id);
            };
            GameEvents.OnCheckpointApplied += _ => checkpointAppliedCount++;
            GameEvents.OnTowerSlotUpgraded += state =>
            {
                if (state.Unlocked)
                    towerSlotUpgradeCount++;
            };
            GameEvents.OnWallStateChanged += _ => wallStateCount++;
            GameEvents.OnTacticStateChanged += state =>
            {
                if (state.Unlocked)
                    tacticStateCount++;
            };

            controller.Tactics.Upgrade(PlayerTacticKind.ForceMove);
            Assert.That(controller.StartRun(), Is.True);

            for (var i = 0; i < 20000 && controller.Waves.Phase != WavePhase.Victory; i++)
            {
                TickCoreLoop(controller, 1f);

                Assert.That(controller.Energy.Current, Is.InRange(0, controller.Energy.Max));
                Assert.That(controller.Wall.CurrentHp, Is.InRange(0, controller.Wall.MaxHp));
            }

            Assert.That(controller.Waves.Phase, Is.EqualTo(WavePhase.Victory));
            Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(20));
            Assert.That(checkpointCount, Is.EqualTo(4));
            Assert.That(checkpointAppliedCount, Is.EqualTo(4));
            Assert.That(towerSlotUpgradeCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(wallStateCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(tacticStateCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(controller.Units.TotalDamage, Is.GreaterThan(0f));
        }

        static void TickCoreLoop(GameSceneController controller, float dt)
        {
            controller.Energy.Tick(dt);
            controller.Wall.Tick(dt);
            controller.Tactics.Tick(dt);
            controller.Waves.Tick(dt);
            controller.Units.Tick(dt);
            controller.Towers.Tick(dt);
        }

        static void AssertPhase4FixtureIsUngated(string fixtureId)
        {
            var path = Path.GetFullPath(Path.Combine(
                Application.dataPath,
                "../../..",
                "packages/shared/src/testing/replay-fixtures",
                fixtureId + ".json"));
            var fixture = JsonUtility.FromJson<ReplayFixture>(File.ReadAllText(path));
            Assert.That(fixture.phase4_dependent, Is.False, fixtureId);
        }
    }
}
