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

                Assert.That(root.Q<Label>("hud-energy").text, Is.EqualTo("77"));
                Assert.That(root.Q<Label>("hud-hp"), Is.Null);
                Assert.That(root.Q<Label>("hud-wave").text, Is.EqualTo("3/20"));
                Assert.That(root.Q<Label>("hud-progress-label").text, Is.EqualTo("공격 3/13"));
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
                var repair = 0;
                var damage = 0;
                var wallSpeed = 0;
                var range = 0;
                var tactic = PlayerTacticKind.ForceMove;
                var reroll = 0;
                var pause = 0;
                var speed = 0f;
                GameEvents.OnRequestRepairWall += () => repair++;
                GameEvents.OnRequestUpgradeWallDamage += () => damage++;
                GameEvents.OnRequestUpgradeWallSpeed += () => wallSpeed++;
                GameEvents.OnRequestUpgradeWallRange += () => range++;
                GameEvents.OnRequestCastTactic += request => tactic = request.Kind;
                GameEvents.OnRequestUpgradeReroll += () => reroll++;
                GameEvents.OnRequestPause += () => pause++;
                GameEvents.OnRequestSetSpeed += value => speed = value;

                var controller = host.AddComponent<GameHudController>();
                controller.Bind(new RunState("hud-test"), root);

                Assert.That(root.Q<Button>("hud-summon"), Is.Null);
                Assert.That(root.Q<Button>("hud-gacha-t2"), Is.Not.Null);
                Assert.That(root.Q<Button>("hud-gacha-t3"), Is.Not.Null);
                Assert.That(root.Q<Label>("hud-gacha-t2-label").text, Is.EqualTo("밀치기"));
                Assert.That(root.Q<Label>("hud-gacha-t3-label").text, Is.EqualTo("정지"));
                Assert.That(root.Q<Button>("hud-speed"), Is.Not.Null);
                Assert.That(root.Q<Button>("hud-menu"), Is.Not.Null);
                Assert.That(root.Q<Button>("hud-wall-menu"), Is.Null);
                Assert.That(root.Q<Button>("hud-gacha-t4"), Is.Null);
                Assert.That(root.Q<Label>("hud-status"), Is.Null);
                Assert.That(root.Q<Label>("hud-hp"), Is.Null);
                var hud = root.Q<VisualElement>("game-hud");
                var bottom = root.Q<VisualElement>("game-hud-bottom");
                var actions = root.Q<VisualElement>("game-hud-actions");
                var topRight = root.Q<VisualElement>("game-hud-top-right");
                var speedButton = root.Q<Button>("hud-speed");
                var menuButton = root.Q<Button>("hud-menu");
                var repairPrompt = root.Q<VisualElement>("hud-wall-repair");
                Assert.That(hud, Is.Not.Null);
                Assert.That(bottom, Is.Null);
                Assert.That(actions, Is.Not.Null);
                Assert.That(actions.childCount, Is.EqualTo(2));
                Assert.That(topRight, Is.Not.Null);
                Assert.That(speedButton.parent, Is.SameAs(topRight));
                Assert.That(menuButton.parent, Is.SameAs(topRight));
                Assert.That(speedButton.ClassListContains("game-hud__round-control"), Is.True);
                Assert.That(menuButton.ClassListContains("game-hud__round-control"), Is.True);
                Assert.That(root.Q<Button>("hud-gacha-t2").ClassListContains("game-hud__skill-button"), Is.True);
                Assert.That(root.Q<Button>("hud-gacha-t3").ClassListContains("game-hud__skill-button"), Is.True);
                Assert.That(root.Q<Label>("hud-wall-menu-label"), Is.Null);
                Assert.That(root.Q<VisualElement>("hud-energy-panel"), Is.Not.Null);
                Assert.That(root.Q<VisualElement>("hud-wave-panel"), Is.Not.Null);
                Assert.That(root.Q<Label>("hud-progress-label"), Is.Not.Null);
                Assert.That(root.Q<VisualElement>("hud-card-preview"), Is.Not.Null);
                Assert.That(repairPrompt, Is.TypeOf<GLD.UI.Primitives.GLDOverlay>());
                Assert.That(repairPrompt.ClassListContains("wall-repair-overlay"), Is.True);
                Assert.That(repairPrompt.Q<VisualElement>("hud-wall-repair-panel"), Is.Not.Null);
                Assert.That(repairPrompt.Q<Button>("hud-wall-repair-button"), Is.Not.Null);
                Assert.That(repairPrompt.Q<Button>("hud-wall-damage-button"), Is.Not.Null);
                Assert.That(repairPrompt.Q<Button>("hud-wall-speed-button"), Is.Not.Null);
                Assert.That(repairPrompt.Q<Button>("hud-wall-range-button"), Is.Not.Null);
                Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.None));
                Assert.That(hud.IndexOf(repairPrompt), Is.LessThan(hud.IndexOf(actions)), "repair overlay must not render above fixed tactic buttons");

                GameEvents.RaiseWallStateChanged(new WallState(12, 20, 25, 5, 12f, 0f, 75f, 0.5f, 5f, 1, 45, 50, 40, 0, 0, 0));
                GameEvents.RaiseWallSelected();
                Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.Flex));
                Assert.That(actions.style.display.value, Is.Not.EqualTo(DisplayStyle.None));
                Assert.That(repairPrompt.Q<Label>("hud-wall-repair-label").text, Does.Contain("수리권 1"));
                Assert.That(repairPrompt.Q<Button>("hud-wall-repair-button").text, Is.EqualTo("즉시 수리 x1"));
                Assert.That(repairPrompt.Q<Button>("hud-wall-damage-button").text, Is.EqualTo("공격력 E45"));
                Assert.That(repairPrompt.Q<Button>("hud-wall-speed-button").text, Is.EqualTo("공격 속도 E50"));
                Assert.That(repairPrompt.Q<Button>("hud-wall-range-button").text, Is.EqualTo("공격 범위 E40"));
                controller.DismissWallMenu();
                Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.None));
                GameEvents.RaiseWallSelected();
                Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.Flex));
                controller.RequestWallRepair();
                controller.RequestWallDamageUpgrade();
                controller.RequestWallSpeedUpgrade();
                controller.RequestWallRangeUpgrade();
                controller.RequestGacha(3);
                controller.RequestGacha(4);
                controller.RequestToggleSpeed();
                controller.RequestMenu();

                Assert.That(repair, Is.EqualTo(1));
                Assert.That(damage, Is.EqualTo(1));
                Assert.That(wallSpeed, Is.EqualTo(1));
                Assert.That(range, Is.EqualTo(1));
                Assert.That(tactic, Is.EqualTo(PlayerTacticKind.Freeze));
                Assert.That(reroll, Is.EqualTo(1));
                Assert.That(speed, Is.EqualTo(3f));
                Assert.That(pause, Is.EqualTo(1));
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
