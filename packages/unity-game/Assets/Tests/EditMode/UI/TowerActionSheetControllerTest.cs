using GLD.Core;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class TowerActionSheetControllerTest
    {
        const string SheetPath = "Assets/UI/Documents/TowerActionSheet.uxml";

        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void TowerActionSheetUxmlBindsSelection()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(SheetPath);
            Assert.That(asset, Is.Not.Null, $"Missing TowerActionSheet UXML at {SheetPath}");

            var root = asset.CloneTree();
            var host = new GameObject("TowerActionSheetControllerTest");
            try
            {
                var controller = host.AddComponent<TowerActionSheetController>();
                controller.Bind(root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);

                GameEvents.RaiseTowerSelected("tower-007", 3, 4);

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(controller.SelectedInstanceId, Is.EqualTo("tower-007"));
                Assert.That(root.Q<Label>("tower-action-title").text, Is.EqualTo("tower-007"));
                Assert.That(root.Q<Label>("tower-action-position").text, Is.EqualTo("Cell 3,4"));
                Assert.That(root.Q<Button>("tower-action-merge").enabledSelf, Is.False);
                Assert.That(root.Q<Button>("tower-action-move").enabledSelf, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }

        [Test]
        public void TowerActionSheetSellRaisesInstanceRequestAndHides()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(SheetPath);
            var root = asset.CloneTree();
            var host = new GameObject("TowerActionSheetControllerTest");
            try
            {
                string soldInstanceId = null;
                GameEvents.OnRequestSellTower += instanceId => soldInstanceId = instanceId;

                var controller = host.AddComponent<TowerActionSheetController>();
                controller.Bind(root);

                GameEvents.RaiseTowerSelected("tower-009", 5, 6);
                controller.RequestSell();

                Assert.That(soldInstanceId, Is.EqualTo("tower-009"));
                Assert.That(controller.IsVisible, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
