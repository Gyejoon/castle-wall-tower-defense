using GLD.Core;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class BossWarningOverlayControllerTest
    {
        const string OverlayPath = "Assets/UI/Documents/BossWarningOverlay.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void BossWarningOverlayShowsOnBossWave()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(OverlayPath);
            Assert.That(asset, Is.Not.Null, $"Missing BossWarningOverlay UXML at {OverlayPath}");

            var root = asset.CloneTree();
            var host = new GameObject("BossWarningOverlayControllerTest");
            try
            {
                var controller = host.AddComponent<BossWarningOverlayController>();
                controller.Bind(root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseBossWaveStarted(10);

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(controller.WaveSlot, Is.EqualTo(10));
                Assert.That(root.Q<Label>("boss-warning-title").text, Is.EqualTo("Boss Wave"));
                Assert.That(root.Q<Label>("boss-warning-subtitle").text, Is.EqualTo("Wave 10"));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
