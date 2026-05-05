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
    public sealed class LobbyMetaScreenControllerTest
    {
        const string ScreenPath = "Assets/UI/Documents/LobbyMetaScreen.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void LobbyMetaScreenShowsOnlyBeforeRunAndSwitchesTabs()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(ScreenPath);
            Assert.That(asset, Is.Not.Null, $"Missing LobbyMetaScreen UXML at {ScreenPath}");

            var root = asset.CloneTree();
            var host = new GameObject("LobbyMetaScreenControllerTest");
            try
            {
                var runState = new RunState("lobby-test");
                var controller = host.AddComponent<LobbyMetaScreenController>();
                controller.Bind(runState, root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.True);
                Assert.That(controller.IsMetaVisible, Is.False);

                controller.ShowMeta();
                Assert.That(controller.IsMetaVisible, Is.True);

                controller.ShowHome();
                Assert.That(controller.IsMetaVisible, Is.False);

                runState.SetWave(1, WavePhase.Running);
                runState.SetRunStatus(RunStatus.Running);
                Assert.That(controller.IsVisible, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void LobbyMetaScreenStartRaisesRequest()
        {
            var root = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(ScreenPath).CloneTree();
            var host = new GameObject("LobbyMetaScreenControllerTest");
            try
            {
                var start = 0;
                GameEvents.OnRequestStartRun += () => start++;

                var controller = host.AddComponent<LobbyMetaScreenController>();
                controller.Bind(new RunState("lobby-test"), root);

                Assert.That(root.Q<Button>("lobby-start"), Is.Not.Null);
                Assert.That(root.Q<Button>("lobby-meta-start"), Is.Not.Null);

                controller.RequestStartRun();

                Assert.That(start, Is.EqualTo(1));
                Assert.That(controller.IsVisible, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
