using GLD.Core;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class UpgradePickOverlayControllerTest
    {
        const string OverlayPath = "Assets/UI/Documents/UpgradePickOverlay.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void UpgradePickOverlayBindsChoicesAndPickRequest()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(OverlayPath);
            Assert.That(asset, Is.Not.Null, $"Missing UpgradePickOverlay UXML at {OverlayPath}");

            var root = asset.CloneTree();
            var host = new GameObject("UpgradePickOverlayControllerTest");
            try
            {
                string picked = null;
                GameEvents.OnRequestUpgradePick += upgradeId => picked = upgradeId;

                var controller = host.AddComponent<UpgradePickOverlayController>();
                controller.Bind(root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseUpgradeChoiceReady(new[]
                {
                    new UpgradeChoice("dmg_up", "Damage Up", "+10% damage", "sword"),
                    new UpgradeChoice("crit_dmg", "Crit Up", "+25% crit", "crit"),
                    new UpgradeChoice("tier_odds_up", "Tier Odds", "+odds", "tier")
                });

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(controller.ChoiceCount, Is.EqualTo(3));
                Assert.That(root.Q<Label>("upgrade-card-0-title").text, Is.EqualTo("Damage Up"));
                Assert.That(root.Q<Label>("upgrade-card-1-description").text, Is.EqualTo("+25% crit"));

                controller.RequestPick(1);

                Assert.That(picked, Is.EqualTo("crit_dmg"));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void UpgradePickOverlayRerollAndAppliedSettle()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(OverlayPath);
            var root = asset.CloneTree();
            var host = new GameObject("UpgradePickOverlayControllerTest");
            try
            {
                var rerolls = 0;
                GameEvents.OnRequestUpgradeReroll += () => rerolls++;

                var controller = host.AddComponent<UpgradePickOverlayController>();
                controller.Bind(root);
                GameEvents.RaiseUpgradeChoiceReady(new[]
                {
                    new UpgradeChoice("dmg_up", "Damage Up", "+10% damage", "sword")
                });

                controller.RequestReroll();
                Assert.That(rerolls, Is.EqualTo(1));

                GameEvents.RaiseUpgradeApplied("dmg_up", 1);
                Assert.That(controller.IsVisible, Is.False);
                Assert.That(controller.ChoiceCount, Is.EqualTo(0));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
