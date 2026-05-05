using GLD.Core;
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

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void GameHudUxmlBindsRunStateLabels()
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
                runState.SetLives(18);
                runState.SetWave(3, GLD.Systems.Waves.WavePhase.Running);

                Assert.That(root.Q<Label>("hud-energy").text, Is.EqualTo("E 77/200"));
                Assert.That(root.Q<Label>("hud-hp").text, Is.EqualTo("HP 18"));
                Assert.That(root.Q<Label>("hud-wave").text, Is.EqualTo("W 3"));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void GameHudButtonsRaiseRequests()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(HudPath);
            var root = asset.CloneTree();
            var host = new GameObject("GameHudControllerTest");
            try
            {
                var summon = 0;
                var gachaTier = 0;
                var pause = 0;
                GameEvents.OnRequestSummon += () => summon++;
                GameEvents.OnRequestGacha += request => gachaTier = request.TargetTier;
                GameEvents.OnRequestPause += () => pause++;

                var controller = host.AddComponent<GameHudController>();
                controller.Bind(new RunState("hud-test"), root);

                Assert.That(root.Q<Button>("hud-summon"), Is.Not.Null);
                Assert.That(root.Q<Button>("hud-gacha-t3"), Is.Not.Null);
                Assert.That(root.Q<Button>("hud-menu"), Is.Not.Null);

                controller.RequestSummon();
                controller.RequestGacha(3);
                controller.RequestMenu();

                Assert.That(summon, Is.EqualTo(1));
                Assert.That(gachaTier, Is.EqualTo(3));
                Assert.That(pause, Is.EqualTo(1));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
