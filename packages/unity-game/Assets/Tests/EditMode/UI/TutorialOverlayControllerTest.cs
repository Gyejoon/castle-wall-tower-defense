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
        public void TutorialOverlayStaysHiddenDuringRun()
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
                Assert.That(controller.IsVisible, Is.False);
                Assert.That(controller.CurrentTitle, Is.EqualTo("소환"));

                var runState = new RunState("tutorial-running");
                controller.Bind(runState, root);
                runState.SetRunStatus(RunStatus.Running);

                Assert.That(controller.IsVisible, Is.False);
                Assert.That(controller.CurrentTitle, Is.EqualTo("소환"));

                GameEvents.RaiseSummonOffered("archer");
                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseSummonConfirmed("archer");
                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseTowersMerged(5, 3, "wind_spire", 2);
                Assert.That(controller.IsVisible, Is.False);

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
                var runState = new RunState("tutorial-test");
                controller.Bind(runState, root);
                runState.SetRunStatus(RunStatus.Running);

                Assert.That(root.Q<Button>("tutorial-next"), Is.Null);
                Assert.That(root.Q<Button>("tutorial-skip"), Is.Null);
                Assert.That(controller.IsVisible, Is.False);
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
