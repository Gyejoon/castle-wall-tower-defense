using System.Collections;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.CoreLoop
{
    public sealed class EndlessRunSmokeTest
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        [UnityTest]
        public IEnumerator RootCoreLoopRunsThroughWave20Victory()
        {
            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);

            controller.gameObject.SetActive(true);
            yield return null;

            var checkpointCount = 0;
            var appliedCount = 0;
            var actCount = 0;
            GameEvents.OnActStarted += _ => actCount++;
            GameEvents.OnCheckpointReady += (_, choices) =>
            {
                checkpointCount++;
                Assert.That(choices, Has.Length.EqualTo(3));
                var choiceIndex = checkpointCount == 2 ? 2 : 0;
                GameEvents.RaiseRequestApplyCheckpointReward(choices[choiceIndex].Id);
            };
            GameEvents.OnCheckpointApplied += _ => appliedCount++;

            Assert.That(controller.StartRun(), Is.True);

            for (var i = 0; i < 20000 && controller.Waves.Phase != WavePhase.Victory; i++)
            {
                const float dt = 1f;
                controller.Energy.Tick(dt);
                controller.Wall.Tick(dt);
                controller.Tactics.Tick(dt);
                controller.Waves.Tick(dt);
                controller.Units.Tick(dt);
                controller.Towers.Tick(dt);

                Assert.That(controller.Energy.Current, Is.InRange(0, controller.Energy.Max));
            }

            Assert.That(controller.Waves.Phase, Is.EqualTo(WavePhase.Victory));
            Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(20));
            Assert.That(actCount, Is.EqualTo(4));
            Assert.That(checkpointCount, Is.EqualTo(4));
            Assert.That(appliedCount, Is.EqualTo(4));
            Assert.That(controller.TowerSlots.HasFamily(GLD.Data.TowerFamily.Archer), Is.True);
            Assert.That(controller.Units.TotalDamage, Is.GreaterThanOrEqualTo(0f));
        }
    }
}
