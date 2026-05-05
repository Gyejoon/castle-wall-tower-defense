using GLD.Core;
using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class TutorialOverlayControllerTest
    {
        const string OverlayPath = "Assets/UI/Documents/TutorialOverlay.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void TutorialOverlayAdvancesThroughCoreEvents()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(OverlayPath);
            Assert.That(asset, Is.Not.Null, $"Missing TutorialOverlay UXML at {OverlayPath}");

            var root = asset.CloneTree();
            var host = new GameObject("TutorialOverlayControllerTest");
            try
            {
                var controller = host.AddComponent<TutorialOverlayController>();
                controller.Bind(new RunState("tutorial-test"), root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.True);
                Assert.That(controller.CurrentTitle, Is.EqualTo("Summon"));

                GameEvents.RaiseSummonOffered("archer");
                Assert.That(controller.CurrentTitle, Is.EqualTo("Place"));

                GameEvents.RaiseSummonConfirmed("archer");
                Assert.That(controller.CurrentTitle, Is.EqualTo("Merge"));

                GameEvents.RaiseTowersMerged(5, 3, "wind_spire", 2);
                Assert.That(controller.CurrentTitle, Is.EqualTo("Upgrade"));

                GameEvents.RaiseUpgradeApplied("dmg_up", 1);
                Assert.That(controller.IsVisible, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void TutorialOverlayCanBeDismissed()
        {
            var root = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(OverlayPath).CloneTree();
            var host = new GameObject("TutorialOverlayControllerTest");
            try
            {
                var controller = host.AddComponent<TutorialOverlayController>();
                controller.Bind(new RunState("tutorial-test"), root);

                Assert.That(root.Q<Button>("tutorial-next"), Is.Not.Null);
                Assert.That(root.Q<Button>("tutorial-skip"), Is.Not.Null);
                controller.Dismiss();

                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseSummonOffered("archer");
                Assert.That(controller.IsVisible, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
