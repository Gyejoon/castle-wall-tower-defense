using System.Collections;
using GLD.SceneRuntime.Slice2;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.Slice2
{
    public sealed class PlacementInputTest
    {
        [UnityTest]
        public IEnumerator ScreenPositionMapsToGridPlacement()
        {
            yield return SceneManager.LoadSceneAsync("Slice2_PoC", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<Slice2SceneController>();
            Assert.That(controller, Is.Not.Null);

            controller.Placement.BeginPlacement();
            var world = controller.Grid.GridToWorld3(3, 14);
            var screen = Camera.main.WorldToScreenPoint(world);

            Assert.That(controller.Placement.TryPlaceAtScreenPosition(screen), Is.True);
            Assert.That(controller.Towers.HasTower(new GLD.Systems.Minimal.MinimalGridCell(3, 14)), Is.True);
        }
    }
}
