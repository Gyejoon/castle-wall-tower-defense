using GLD.Core;
using GLD.Data;
using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class GameHudControllerTest
    {
        const string HudPath = "Assets/UI/Documents/GameHud.uxml";
        const string HudLayoutPath = "Assets/Resources/UI/HudLayoutConfig.asset";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void GameHudLayoutConfigIsEditableAsset()
        {
            var layout = AssetDatabase.LoadAssetAtPath<HudLayoutConfigSO>(HudLayoutPath);

            Assert.That(layout, Is.Not.Null, $"Missing editable HUD layout config at {HudLayoutPath}");
            Assert.That(layout.enableDragEditing, Is.True);
            Assert.That(layout.energyPanelWidth, Is.GreaterThan(0f));
            Assert.That(layout.wavePanelWidth, Is.GreaterThan(0f));
            Assert.That(layout.topRightButtonSize, Is.GreaterThan(0f));
        }

        [Test]
        public void GameHudUxmlBindsTopLabelsOnly()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(HudPath);
            Assert.That(asset, Is.Not.Null, $"Missing GameHud UXML at {HudPath}");

            var root = asset.CloneTree();
            var host = new GameObject("GameHudControllerTest");
            try
            {
                var controller = host.AddComponent<GameHudController>();
                var runState = new RunState("hud-test");
                controller.Bind(runState, root);

                runState.SetEnergy(77, 200);
                runState.SetWave(3, GLD.Systems.Waves.WavePhase.Running);

                Assert.That(root.Q<Label>("hud-energy").text, Is.EqualTo("77"));
                Assert.That(root.Q<Label>("hud-wave").text, Is.EqualTo("3/20"));
                Assert.That(root.Q<Label>(className: "game-hud__stat-title--energy"), Is.Not.Null);
                Assert.That(root.Q<VisualElement>(className: "game-hud__stat-medal"), Is.Null);
                Assert.That(root.Q<Label>(className: "game-hud__stat-icon"), Is.Null);
                Assert.That(root.Q<Label>("hud-hp"), Is.Null);
                Assert.That(root.Q<Label>("hud-progress-label"), Is.Null);
                Assert.That(root.Q<VisualElement>("hud-card-preview"), Is.Null);
                Assert.That(root.Q<VisualElement>("hud-wall-repair"), Is.Null);
                Assert.That(root.Q<VisualElement>("game-hud-actions"), Is.Null);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void GameHudTopButtonsRaiseRequests()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(HudPath);
            var root = asset.CloneTree();
            var host = new GameObject("GameHudControllerTest");
            try
            {
                var pause = 0;
                GameEvents.OnRequestPause += () => pause++;

                var controller = host.AddComponent<GameHudController>();
                controller.Bind(new RunState("hud-test"), root);

                Assert.That(root.Q<VisualElement>("hud-energy-panel"), Is.Not.Null);
                Assert.That(root.Q<VisualElement>("hud-wave-panel"), Is.Not.Null);
                Assert.That(root.Q<Button>("hud-speed"), Is.Null);
                Assert.That(root.Q<Button>("hud-menu"), Is.Not.Null);
                Assert.That(root.Q<Button>("hud-menu").text, Is.EqualTo("☰"));
                Assert.That(root.Q<Button>("hud-gacha-t2"), Is.Null);
                Assert.That(root.Q<Button>("hud-gacha-t3"), Is.Null);
                Assert.That(root.Q<Button>("hud-wall-menu"), Is.Null);

                controller.RequestMenu();

                Assert.That(pause, Is.EqualTo(1));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
