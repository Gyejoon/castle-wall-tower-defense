using GLD.Core;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class SummonRevealControllerTest
    {
        const string RevealPath = "Assets/UI/Documents/SummonRevealOverlay.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void SummonRevealUxmlBindsOfferAndSettles()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(RevealPath);
            Assert.That(asset, Is.Not.Null, $"Missing SummonReveal UXML at {RevealPath}");

            var root = asset.CloneTree();
            var host = new GameObject("SummonRevealControllerTest");
            try
            {
                var controller = host.AddComponent<SummonRevealController>();
                controller.Bind(null, root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseSummonOffered("archer");

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(controller.OfferedTowerId, Is.EqualTo("archer"));
                Assert.That(root.Q<Label>("summon-reveal-title").text, Is.EqualTo("archer"));
                Assert.That(root.Q<Label>("summon-reveal-subtitle").text, Is.EqualTo("초록 칸을 눌러 배치"));

                GameEvents.RaiseSummonConfirmed("archer");

                Assert.That(controller.IsVisible, Is.False);
                Assert.That(controller.OfferedTowerId, Is.Null);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void SummonRevealCancelRaisesRequest()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(RevealPath);
            var root = asset.CloneTree();
            var host = new GameObject("SummonRevealControllerTest");
            try
            {
                var cancelCount = 0;
                GameEvents.OnRequestCancelSummon += () => cancelCount++;

                var controller = host.AddComponent<SummonRevealController>();
                controller.Bind(null, root);

                Assert.That(root.Q<Button>("summon-reveal-cancel"), Is.Not.Null);
                GameEvents.RaiseSummonOffered("flame_tower");
                controller.RequestCancel();

                Assert.That(cancelCount, Is.EqualTo(1));
                Assert.That(controller.OfferedTowerId, Is.EqualTo("flame_tower"));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
