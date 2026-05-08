using GLD.Core;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class ToastOverlayControllerTest
    {
        const string ToastPath = "Assets/UI/Documents/ToastOverlay.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void ToastOverlayShowsRequestAndPlacementFeedback()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(ToastPath);
            Assert.That(asset, Is.Not.Null, $"Missing ToastOverlay UXML at {ToastPath}");

            var root = asset.CloneTree();
            var host = new GameObject("ToastOverlayControllerTest");
            try
            {
                var controller = host.AddComponent<ToastOverlayController>();
                controller.Bind(root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseRequestRejected("insufficient_energy");

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(controller.CurrentMessage, Is.EqualTo("Rejected: insufficient_energy"));
                Assert.That(root.Q<Label>("toast-message").text, Is.EqualTo("Rejected: insufficient_energy"));

                GameEvents.RaiseTowerPlacementFailed("archer", 3, 3, "occupied");

                Assert.That(controller.CurrentMessage, Is.EqualTo("Cannot place archer: occupied"));
                Assert.That(root.Q<Label>("toast-message").text, Is.EqualTo("Cannot place archer: occupied"));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void ToastOverlayShowsMergeAndUpgradeFeedback()
        {
            var root = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(ToastPath).CloneTree();
            var host = new GameObject("ToastOverlayControllerTest");
            try
            {
                var controller = host.AddComponent<ToastOverlayController>();
                controller.Bind(root);

                GameEvents.RaiseMergeFailed(3, 3, 5, 3, "invalid-pair");
                Assert.That(controller.CurrentMessage, Is.EqualTo("Merge failed: invalid-pair"));

                GameEvents.RaiseTowersMerged(5, 3, "wind_spire", 2);
                Assert.That(controller.CurrentMessage, Is.EqualTo("Merged T2 wind_spire"));

                GameEvents.RaiseUpgradeApplied("dmg_up", 2);
                Assert.That(controller.CurrentMessage, Is.EqualTo("dmg_up stack 2"));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
