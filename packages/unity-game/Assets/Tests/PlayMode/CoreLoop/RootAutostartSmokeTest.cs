using System.Collections;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop;
using GLD.SceneRuntime.CoreLoop.Render;
using GLD.SceneRuntime.CoreLoop.UI;
using GLD.Systems.Grid;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Tilemaps;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace GLD.Tests.PlayMode.CoreLoop
{
    public sealed class RootAutostartSmokeTest
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        [UnityTest]
        public IEnumerator RootAutostartStartsCoreLoop()
        {
            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);

            controller.gameObject.SetActive(true);
            var renderer = controller.GetComponent<CoreLoopFieldRenderer>();
            Assert.That(renderer, Is.Not.Null);
            Assert.That(renderer.RenderedCellCount, Is.EqualTo(controller.Grid.Width * controller.Grid.Height));
            Assert.That(controller.GetComponentsInChildren<Tilemap>(true).Length, Is.GreaterThanOrEqualTo(2));
            Assert.That(renderer.HasWallHealthBar, Is.True, "wall HP should render over the wall in world space");
            var wallHpLabel = renderer.transform.Find("HealthBars/WallHpBar/Label")?.GetComponent<TextMesh>();
            Assert.That(wallHpLabel, Is.Not.Null);
            Assert.That(wallHpLabel.text, Does.Contain("20/20"));
            Assert.That(renderer.ActiveAttackFxCount, Is.EqualTo(0));
            GameEvents.RaiseWallAutoAttacked(new WallAttackEvent(0f, 0f, 12f));
            Assert.That(renderer.ActiveAttackFxCount, Is.GreaterThan(0), "wall auto attack should create a visible field FX");
            Assert.That(controller.DamageNumbers.ActiveCount, Is.GreaterThan(0), "wall auto attack should show damage text");

            var hud = controller.GetComponent<CoreLoopHudController>();
            Assert.That(hud, Is.Not.Null);
            var uiHud = controller.GetComponent<GameHudController>();
            Assert.That(uiHud, Is.Not.Null);
            Assert.That(uiHud.IsBound, Is.True, "game HUD should bind on Root load");
            var towerActionSheet = controller.GetComponent<TowerActionSheetController>();
            Assert.That(towerActionSheet, Is.Not.Null);
            Assert.That(towerActionSheet.IsBound, Is.True, "tower action sheet should bind on Root load");
            var summonReveal = controller.GetComponent<SummonRevealController>();
            Assert.That(summonReveal, Is.Not.Null);
            Assert.That(summonReveal.IsBound, Is.True, "summon reveal should bind on Root load");
            var upgradePick = controller.GetComponent<UpgradePickOverlayController>();
            Assert.That(upgradePick, Is.Not.Null);
            Assert.That(upgradePick.IsBound, Is.True, "upgrade pick should bind on Root load");
            var pauseModal = controller.GetComponent<PauseModalController>();
            Assert.That(pauseModal, Is.Not.Null);
            Assert.That(pauseModal.IsBound, Is.True, "pause modal should bind on Root load");
            var bossHpBar = controller.GetComponent<BossHpBarController>();
            Assert.That(bossHpBar, Is.Not.Null);
            Assert.That(bossHpBar.IsBound, Is.True, "boss HP bar should bind on Root load");
            var bossWarning = controller.GetComponent<BossWarningOverlayController>();
            Assert.That(bossWarning, Is.Not.Null);
            Assert.That(bossWarning.IsBound, Is.True, "boss warning should bind on Root load");
            var gameOver = controller.GetComponent<GameOverOverlayController>();
            Assert.That(gameOver, Is.Not.Null);
            Assert.That(gameOver.IsBound, Is.True, "game over overlay should bind on Root load");
            var toast = controller.GetComponent<ToastOverlayController>();
            Assert.That(toast, Is.Not.Null);
            Assert.That(toast.IsBound, Is.True, "toast overlay should bind on Root load");
            var tutorial = controller.GetComponent<TutorialOverlayController>();
            Assert.That(tutorial, Is.Not.Null);
            Assert.That(tutorial.IsBound, Is.True, "tutorial overlay should bind even while hidden");
            Assert.That(tutorial.IsVisible, Is.False);
            var lobbyMeta = controller.GetComponent<LobbyMetaScreenController>();
            Assert.That(lobbyMeta, Is.Not.Null);
            Assert.That(lobbyMeta.IsBound, Is.True, "lobby meta screen should bind on Root load");
            Assert.That(lobbyMeta.IsVisible, Is.False);
            var uiDocument = controller.GetComponent<UIDocument>();
            Assert.That(uiDocument, Is.Not.Null);
            var repairPrompt = uiDocument.rootVisualElement.Q<VisualElement>("hud-wall-repair");
            var repairLabel = uiDocument.rootVisualElement.Q<Label>("hud-wall-repair-label");
            var bottomHud = uiDocument.rootVisualElement.Q<VisualElement>("game-hud-bottom");
            var topRight = uiDocument.rootVisualElement.Q<VisualElement>("game-hud-top-right");
            var actions = uiDocument.rootVisualElement.Q<VisualElement>("game-hud-actions");
            var speedButton = uiDocument.rootVisualElement.Q<Button>("hud-speed");
            var menuButton = uiDocument.rootVisualElement.Q<Button>("hud-menu");
            Assert.That(repairPrompt, Is.Not.Null);
            Assert.That(repairLabel, Is.Not.Null);
            Assert.That(bottomHud, Is.Null);
            Assert.That(uiDocument.rootVisualElement.Q<Label>("hud-status"), Is.Null);
            Assert.That(uiDocument.rootVisualElement.Q<Label>("hud-hp"), Is.Null);
            Assert.That(uiDocument.rootVisualElement.Q<Button>("hud-gacha-t4"), Is.Null);
            Assert.That(topRight, Is.Not.Null);
            Assert.That(actions, Is.Not.Null);
            Assert.That(speedButton, Is.Not.Null);
            Assert.That(menuButton, Is.Not.Null);
            Assert.That(uiDocument.rootVisualElement.Q<Button>("hud-wall-menu"), Is.Null);
            Assert.That(speedButton.parent.name, Is.EqualTo("game-hud-top-right"));
            Assert.That(menuButton.parent.name, Is.EqualTo("game-hud-top-right"));
            Assert.That(speedButton.ClassListContains("game-hud__round-control"), Is.True);
            Assert.That(menuButton.ClassListContains("game-hud__round-control"), Is.True);
            var topEnergyBadge = uiDocument.rootVisualElement.Q<Label>("hud-energy");
            Assert.That(topEnergyBadge, Is.Not.Null);
            Assert.That(uiDocument.rootVisualElement.Q<VisualElement>("hud-energy-panel"), Is.Not.Null);
            Assert.That(uiDocument.rootVisualElement.Q<VisualElement>("hud-wave-panel"), Is.Not.Null);
            var progressLabel = uiDocument.rootVisualElement.Q<Label>("hud-progress-label");
            Assert.That(progressLabel, Is.Not.Null);
            Assert.That(uiDocument.rootVisualElement.Q<VisualElement>("hud-card-preview"), Is.Not.Null);
            Assert.That(actions.childCount, Is.EqualTo(2));
            for (var i = 1; i < actions.childCount; i++)
            {
                Assert.That(actions[i].ClassListContains("game-hud__skill-button"), Is.True);
                Assert.That(actions[i].style.width.value.value, Is.EqualTo(actions[0].style.width.value.value).Within(1.5f), "tactic buttons should keep equal widths");
                Assert.That(actions[i].style.height.value.value, Is.EqualTo(actions[0].style.height.value.value).Within(1.5f), "tactic buttons should keep equal heights");
            }
            Assert.That(actions[0].style.height.value.value, Is.GreaterThan(actions[0].style.width.value.value), "tactic buttons should include a round icon plus label plate");
            Assert.That(uiDocument.rootVisualElement.Q<Label>("hud-gacha-t2-label").text, Is.EqualTo("밀치기"));
            Assert.That(uiDocument.rootVisualElement.Q<Label>("hud-gacha-t3-label").text, Is.EqualTo("정지"));
            Assert.That(Mathf.Abs(menuButton.resolvedStyle.height - speedButton.resolvedStyle.height), Is.LessThan(1.5f), "top-right pause and speed buttons should share height");
            Assert.That(uiDocument.rootVisualElement.Q<Label>("hud-wall-menu-label"), Is.Null);
            Assert.That(repairPrompt.ClassListContains("wall-repair-overlay"), Is.True);
            Assert.That(repairPrompt.parent.IndexOf(repairPrompt), Is.LessThan(repairPrompt.parent.IndexOf(actions)));
            Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.None));
            GameEvents.RaiseWallSelected();
            yield return null;
            Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            using (var pointerDown = PointerDownEvent.GetPooled())
                repairPrompt.SendEvent(pointerDown);
            yield return null;
            Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.None));
            GameEvents.RaiseWallSelected();
            yield return null;
            Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(actions.resolvedStyle.position, Is.EqualTo(Position.Absolute));
            Assert.That(repairLabel.text, Does.Contain("20/20"));
            Assert.That(repairLabel.text, Does.Contain("수리권 0"));
            Assert.That(uiDocument.rootVisualElement.Q<Button>("hud-wall-repair-button").text, Does.Contain("x0"));
            Assert.That(uiDocument.rootVisualElement.Q<Button>("hud-wall-damage-button").text, Does.Contain("E45"));
            Assert.That(uiDocument.rootVisualElement.Q<Button>("hud-wall-speed-button").text, Does.Contain("E50"));
            Assert.That(uiDocument.rootVisualElement.Q<Button>("hud-wall-range-button").text, Does.Contain("E40"));
            controller.Wall.GrantInstantRepairCharge();
            controller.Wall.TakeDamage(5);
            yield return null;
            Assert.That(wallHpLabel.text, Does.Contain("15/20"));
            Assert.That(repairLabel.text, Does.Contain("15/20"));
            Assert.That(repairLabel.text, Does.Contain("수리권 1"));
            uiHud.RequestWallRepair();
            yield return null;
            Assert.That(controller.Wall.CurrentHp, Is.EqualTo(20));
            Assert.That(wallHpLabel.text, Does.Contain("20/20"));
            Assert.That(repairPrompt.style.display.value, Is.EqualTo(DisplayStyle.None));
            controller.Energy.Add(100);
            GameEvents.RaiseSummonOffered("archer");
            yield return null;
            Assert.That(summonReveal.IsVisible, Is.True, "summon reveal should show after summon offer");
            Assert.That(controller.Placement.IsPlacementMode, Is.True, "placement mode should start after summon offer");
            GameEvents.RaiseSummonCancelled("archer");
            yield return null;
            Assert.That(summonReveal.IsVisible, Is.False);
            Assert.That(controller.Placement.IsPlacementMode, Is.False);
            Assert.That(controller.StartRun(), Is.True, "manual StartRun should succeed while waves are idle");
            Assert.That(lobbyMeta.IsVisible, Is.False);
            Assert.That(tutorial.IsVisible, Is.False);
            GameEvents.RaiseRequestSetSpeed(3f);
            Assert.That(controller.State.SpeedMultiplier, Is.EqualTo(3f));
            Assert.That(controller.PlaceTower("archer", 3, 3, spendEnergy: false), Is.True, "test archer placement should succeed");
            Assert.That(controller.PlaceTower("flame_tower", 5, 3, spendEnergy: false), Is.True, "test flame tower placement should succeed");
            Assert.That(renderer.RenderedTowerCount, Is.EqualTo(2));

            hud.BeginPlacement("archer");
            Assert.That(hud.IsPlacementMode, Is.True, "HUD BeginPlacement should enter placement mode");
            Assert.That(hud.TryPlaceAtCell(new GLD.Systems.Grid.GridCell(2, 6)), Is.True, "HUD placement should succeed");
            Assert.That(hud.IsPlacementMode, Is.False);
            Assert.That(renderer.RenderedTowerCount, Is.EqualTo(3));

            var timeout = Time.time + 10f;
            while (Time.time < timeout && controller.Waves.SpawnedCount == 0)
                yield return null;

            Assert.That(renderer.RenderedUnitCount, Is.EqualTo(controller.Units.ActiveCount));
            Assert.That(renderer.RenderedUnitHealthBarCount, Is.EqualTo(controller.Units.ActiveCount), "every active monster should have a world HP bar");
            Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(1));
            Assert.That(controller.Waves.Phase, Is.EqualTo(WavePhase.Running).Or.EqualTo(WavePhase.Interwave).Or.EqualTo(WavePhase.Victory));
            Assert.That(controller.Waves.SpawnedCount, Is.GreaterThan(0));
        }

        [UnityTest]
        public IEnumerator RootSceneReloadDoesNotDuplicateCoreLoopListeners()
        {
            for (var i = 0; i < 10; i++)
            {
                yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
                var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
                Assert.That(controller, Is.Not.Null);
                controller.gameObject.SetActive(true);
                yield return null;

                var waveStartedCount = 0;
                GameEvents.OnWaveStarted += _ => waveStartedCount++;

                GameEvents.RaiseRequestStartRun();

                Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(1));
                Assert.That(waveStartedCount, Is.EqualTo(1));

                GameEvents.ClearRuntimeListeners();
            }
        }

        [UnityTest]
        public IEnumerator HudRoutesPhase4Requests()
        {
            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);
            controller.gameObject.SetActive(true);

            var hud = controller.GetComponent<CoreLoopHudController>();
            Assert.That(hud, Is.Not.Null);

            var from = new GridCell(3, 3);
            var to = new GridCell(5, 3);
            hud.BeginPlacement("archer");
            Assert.That(hud.TryPlaceAtCell(from), Is.True);
            hud.BeginPlacement("archer");
            Assert.That(hud.TryPlaceAtCell(to), Is.True);

            hud.BeginMergeMode();
            Assert.That(hud.TryInteractAtCell(from), Is.True);
            Assert.That(hud.TryInteractAtCell(to), Is.True);
            Assert.That(controller.Towers.GetAt(to).Def.id, Is.EqualTo("wind_spire"));
            Assert.That(hud.IsMergeMode, Is.False);

            controller.Energy.Add(200);
            hud.RequestGacha(2);
            Assert.That(hud.IsPlacementMode, Is.True);
            Assert.That(hud.SelectedTowerId, Is.Not.Empty);
            Assert.That(hud.TryPlaceAtCell(new GridCell(2, 6)), Is.True);

            GameEvents.RaiseRequestUpgradeReroll();
            Assert.That(hud.UpgradeChoiceCount, Is.EqualTo(3));
            var upgradePick = controller.GetComponent<UpgradePickOverlayController>();
            Assert.That(upgradePick, Is.Not.Null);
            Assert.That(upgradePick.IsVisible, Is.True);
            Assert.That(upgradePick.ChoiceCount, Is.EqualTo(3));
            Assert.That(hud.ChooseUpgrade(0), Is.True);
            Assert.That(hud.UpgradeChoiceCount, Is.EqualTo(0));
            Assert.That(upgradePick.IsVisible, Is.False);

            var pauseModal = controller.GetComponent<PauseModalController>();
            Assert.That(pauseModal, Is.Not.Null);
            GameEvents.RaiseRequestPause();
            yield return null;
            Assert.That(pauseModal.IsVisible, Is.True);
            GameEvents.RaiseRequestResume();
            yield return null;
            Assert.That(pauseModal.IsVisible, Is.False);

            GameEvents.RaiseBossHpUpdated("boss-1", "orc_warlord", 500, 1000, 2);
            var bossHpBar = controller.GetComponent<BossHpBarController>();
            Assert.That(bossHpBar, Is.Not.Null);
            Assert.That(bossHpBar.IsVisible, Is.True);
            GameEvents.RaiseBossWaveStarted(10);
            var bossWarning = controller.GetComponent<BossWarningOverlayController>();
            Assert.That(bossWarning, Is.Not.Null);
            Assert.That(bossWarning.IsVisible, Is.True);
            Assert.That(bossWarning.WaveSlot, Is.EqualTo(10));
            GameEvents.RaiseBossPhaseChanged("boss-1", 2);
            Assert.That(hud.LastMessage, Does.Contain("Boss phase 2"));
            GameEvents.RaiseBossDefeated("boss-1", 10);
            Assert.That(bossHpBar.IsVisible, Is.False);
            Assert.That(hud.LastMessage, Does.Contain("Boss defeated"));
            GameEvents.RaiseRequestRejected("insufficient_energy");
            var toast = controller.GetComponent<ToastOverlayController>();
            Assert.That(toast, Is.Not.Null);
            Assert.That(toast.IsVisible, Is.True);
            Assert.That(toast.CurrentMessage, Is.EqualTo("Rejected: insufficient_energy"));
            GameEvents.RaiseGameOver(false);
            var gameOver = controller.GetComponent<GameOverOverlayController>();
            Assert.That(gameOver, Is.Not.Null);
            Assert.That(gameOver.IsVisible, Is.True);
        }
    }
}
