using System.Collections;
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
    }
}
