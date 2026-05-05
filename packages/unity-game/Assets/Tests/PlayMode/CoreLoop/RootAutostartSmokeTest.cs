using System.Collections;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop;
using GLD.SceneRuntime.CoreLoop.Render;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.CoreLoop
{
    public sealed class RootAutostartSmokeTest
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        [UnityTest]
        public IEnumerator RootAutostartStartsCoreLoop()
        {
            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);

            controller.gameObject.SetActive(true);
            var renderer = controller.GetComponent<CoreLoopFieldRenderer>();
            Assert.That(renderer, Is.Not.Null);
            Assert.That(renderer.RenderedCellCount, Is.EqualTo(controller.Grid.Width * controller.Grid.Height));

            var hud = controller.GetComponent<CoreLoopHudController>();
            Assert.That(hud, Is.Not.Null);
            Assert.That(controller.StartRun(), Is.True);
            GameEvents.RaiseRequestSetSpeed(3f);
            Assert.That(controller.State.SpeedMultiplier, Is.EqualTo(3f));
            Assert.That(controller.PlaceTower("archer", 3, 3, spendEnergy: false), Is.True);
            Assert.That(controller.PlaceTower("flame_tower", 5, 3, spendEnergy: false), Is.True);
            Assert.That(renderer.RenderedTowerCount, Is.EqualTo(2));

            hud.BeginPlacement("archer");
            Assert.That(hud.IsPlacementMode, Is.True);
            Assert.That(hud.TryPlaceAtCell(new GLD.Systems.Grid.GridCell(2, 6)), Is.True);
            Assert.That(hud.IsPlacementMode, Is.False);
            Assert.That(renderer.RenderedTowerCount, Is.EqualTo(3));

            var timeout = Time.time + 10f;
            while (Time.time < timeout && controller.Waves.SpawnedCount == 0)
                yield return null;

            Assert.That(renderer.RenderedUnitCount, Is.GreaterThan(0));
            Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(1));
            Assert.That(controller.Waves.Phase, Is.EqualTo(WavePhase.Running).Or.EqualTo(WavePhase.Interwave).Or.EqualTo(WavePhase.Victory));
            Assert.That(controller.Waves.SpawnedCount, Is.GreaterThan(0));
        }

        [UnityTest]
        public IEnumerator RootSceneReloadDoesNotDuplicateCoreLoopListeners()
        {
            for (var i = 0; i < 10; i++)
            {
                yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
                var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
                Assert.That(controller, Is.Not.Null);
                controller.gameObject.SetActive(true);
                yield return null;

                var waveStartedCount = 0;
                GameEvents.OnWaveStarted += _ => waveStartedCount++;

                GameEvents.RaiseRequestStartRun();

                Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(1));
                Assert.That(waveStartedCount, Is.EqualTo(1));

                GameEvents.ClearRuntimeListeners();
            }
        }
    }
}
