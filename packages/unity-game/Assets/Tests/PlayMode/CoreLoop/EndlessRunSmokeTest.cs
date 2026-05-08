using System.Collections;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop;
using GLD.Systems.Grid;
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
        public IEnumerator RootCoreLoopRunsThroughWave50Victory()
        {
            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);

            controller.gameObject.SetActive(true);
            yield return null;

            PlaceScriptedBuildOrder(controller);
            Assert.That(controller.Towers.Towers.Count, Is.EqualTo(5));
            Assert.That(controller.StartRun(), Is.True);

            for (var i = 0; i < 20000 && controller.Waves.Phase != WavePhase.Victory; i++)
            {
                const float dt = 1f;
                controller.Energy.Tick(dt);
                controller.Waves.Tick(dt);
                controller.Units.Tick(dt);
                controller.Towers.Tick(dt);

                Assert.That(controller.Energy.Current, Is.InRange(0, controller.Energy.Max));
            }

            Assert.That(controller.Waves.Phase, Is.EqualTo(WavePhase.Victory));
            Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(50));
            Assert.That(controller.Units.TotalDamage, Is.GreaterThanOrEqualTo(0f));
        }

        static void PlaceScriptedBuildOrder(GameSceneController controller)
        {
            var placements = new[]
            {
                new GridCell(3, 3),
                new GridCell(5, 3),
                new GridCell(2, 6),
                new GridCell(6, 6),
                new GridCell(2, 11)
            };

            foreach (var cell in placements)
                controller.PlaceTower("archer", cell.Col, cell.Row, spendEnergy: false);
        }
    }
}
