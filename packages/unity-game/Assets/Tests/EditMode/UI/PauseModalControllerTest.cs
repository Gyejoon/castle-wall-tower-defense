using GLD.Core;
using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class PauseModalControllerTest
    {
        const string ModalPath = "Assets/UI/Documents/PauseModal.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void PauseModalBindsRunStateVisibility()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(ModalPath);
            Assert.That(asset, Is.Not.Null, $"Missing PauseModal UXML at {ModalPath}");

            var root = asset.CloneTree();
            var host = new GameObject("PauseModalControllerTest");
            try
            {
                var runState = new RunState("pause-test");
                var controller = host.AddComponent<PauseModalController>();
                controller.Bind(runState, root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                runState.SetPaused(true);
                Assert.That(controller.IsVisible, Is.True);

                runState.SetPaused(false);
                Assert.That(controller.IsVisible, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void PauseModalButtonsRaiseRequests()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(ModalPath);
            var root = asset.CloneTree();
            var host = new GameObject("PauseModalControllerTest");
            try
            {
                var resume = 0;
                var quit = 0;
                GameEvents.OnRequestResume += () => resume++;
                GameEvents.OnRequestQuitToLobby += () => quit++;

                var controller = host.AddComponent<PauseModalController>();
                controller.Bind(new RunState("pause-test"), root);

                Assert.That(root.Q<Button>("pause-resume"), Is.Not.Null);
                Assert.That(root.Q<Button>("pause-quit"), Is.Not.Null);

                controller.RequestResume();
                controller.RequestQuit();

                Assert.That(resume, Is.EqualTo(1));
                Assert.That(quit, Is.EqualTo(1));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
