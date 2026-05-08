using GLD.Core;
using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.UI;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class GameOverOverlayControllerTest
    {
        const string OverlayPath = "Assets/UI/Documents/GameOverOverlay.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void GameOverOverlayBindsRunStateVisibilityAndStats()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(OverlayPath);
            Assert.That(asset, Is.Not.Null, $"Missing GameOverOverlay UXML at {OverlayPath}");

            var root = asset.CloneTree();
            var host = new GameObject("GameOverOverlayControllerTest");
            try
            {
                var runState = new RunState("game-over-test");
                runState.SetWave(12, WavePhase.Running);
                runState.SetLives(3);
                runState.SetElapsedSeconds(125f);

                var controller = host.AddComponent<GameOverOverlayController>();
                controller.Bind(runState, root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                runState.SetRunStatus(RunStatus.Defeat);

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(root.Q<Label>("game-over-title").text, Is.EqualTo("Defeat"));
                Assert.That(root.Q<Label>("game-over-subtitle").text, Is.EqualTo("Base destroyed"));
                Assert.That(root.Q<Label>("game-over-stats").text, Is.EqualTo("Wave 12  HP 3  Time 02:05"));

                runState.SetRunStatus(RunStatus.Building);
                Assert.That(controller.IsVisible, Is.False);

                runState.SetRunStatus(RunStatus.Victory);
                Assert.That(controller.IsVisible, Is.True);
                Assert.That(root.Q<Label>("game-over-title").text, Is.EqualTo("Victory"));
                Assert.That(root.Q<Label>("game-over-subtitle").text, Is.EqualTo("All waves cleared"));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void GameOverOverlayQuitRaisesRequest()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(OverlayPath);
            var root = asset.CloneTree();
            var host = new GameObject("GameOverOverlayControllerTest");
            try
            {
                var quit = 0;
                GameEvents.OnRequestQuitToLobby += () => quit++;

                var controller = host.AddComponent<GameOverOverlayController>();
                controller.Bind(new RunState("game-over-test"), root);

                Assert.That(root.Q<Button>("game-over-quit"), Is.Not.Null);

                controller.RequestQuit();

                Assert.That(quit, Is.EqualTo(1));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
