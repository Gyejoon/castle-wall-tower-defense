using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class BossHpBarControllerTest
    {
        const string BarPath = "Assets/UI/Documents/BossHpBar.uxml";

        [Test]
        public void BossHpBarBindsRunStateAndClears()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(BarPath);
            Assert.That(asset, Is.Not.Null, $"Missing BossHpBar UXML at {BarPath}");

            var root = asset.CloneTree();
            var host = new GameObject("BossHpBarControllerTest");
            try
            {
                var runState = new RunState("boss-test");
                var controller = host.AddComponent<BossHpBarController>();
                controller.Bind(runState, root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                runState.SetBossHp("boss-1", "orc_warlord", 500, 1000, 2);

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(root.Q<Label>("boss-hp-name").text, Is.EqualTo("orc_warlord P2"));
                Assert.That(root.Q<Label>("boss-hp-value").text, Is.EqualTo("500/1000"));

                runState.ClearBoss();

                Assert.That(controller.IsVisible, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
