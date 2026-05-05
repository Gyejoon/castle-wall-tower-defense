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
using UnityEngine.TestTools;

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

            var hud = controller.GetComponent<CoreLoopHudController>();
            Assert.That(hud, Is.Not.Null);
            var uiHud = controller.GetComponent<GameHudController>();
            Assert.That(uiHud, Is.Not.Null);
            Assert.That(uiHud.IsBound, Is.True);
            var towerActionSheet = controller.GetComponent<TowerActionSheetController>();
            Assert.That(towerActionSheet, Is.Not.Null);
            Assert.That(towerActionSheet.IsBound, Is.True);
            var summonReveal = controller.GetComponent<SummonRevealController>();
            Assert.That(summonReveal, Is.Not.Null);
            Assert.That(summonReveal.IsBound, Is.True);
            var upgradePick = controller.GetComponent<UpgradePickOverlayController>();
            Assert.That(upgradePick, Is.Not.Null);
            Assert.That(upgradePick.IsBound, Is.True);
            var pauseModal = controller.GetComponent<PauseModalController>();
            Assert.That(pauseModal, Is.Not.Null);
            Assert.That(pauseModal.IsBound, Is.True);
            var bossHpBar = controller.GetComponent<BossHpBarController>();
            Assert.That(bossHpBar, Is.Not.Null);
            Assert.That(bossHpBar.IsBound, Is.True);
            var bossWarning = controller.GetComponent<BossWarningOverlayController>();
            Assert.That(bossWarning, Is.Not.Null);
            Assert.That(bossWarning.IsBound, Is.True);
            var gameOver = controller.GetComponent<GameOverOverlayController>();
            Assert.That(gameOver, Is.Not.Null);
            Assert.That(gameOver.IsBound, Is.True);
            var toast = controller.GetComponent<ToastOverlayController>();
            Assert.That(toast, Is.Not.Null);
            Assert.That(toast.IsBound, Is.True);
            GameEvents.RaiseSummonOffered("archer");
            yield return null;
            Assert.That(summonReveal.IsVisible, Is.True);
            GameEvents.RaiseSummonCancelled("archer");
            yield return null;
            Assert.That(summonReveal.IsVisible, Is.False);
            Assert.That(controller.StartRun(), Is.True);
            GameEvents.RaiseRequestSetSpeed(3f);
            Assert.That(controller.State.SpeedMultiplier, Is.EqualTo(3f));
            Assert.That(controller.PlaceTower("archer", 3, 3, spendEnergy: false), Is.True);
            Assert.That(controller.PlaceTower("flame_tower", 5, 3, spendEnergy: false), Is.True);
            Assert.That(renderer.RenderedTowerCount, Is.EqualTo(2));

            hud.BeginPlacement("archer");
            Assert.That(hud.IsPlacementMode, Is.True);
            Assert.That(hud.TryPlaceAtCell(new GLD.Systems.Grid.GridCell(2, 6)), Is.True);
            Assert.That(hud.IsPlacementMode, Is.False);
            Assert.That(renderer.RenderedTowerCount, Is.EqualTo(3));

            var timeout = Time.time + 10f;
            while (Time.time < timeout && controller.Waves.SpawnedCount == 0)
                yield return null;

            Assert.That(renderer.RenderedUnitCount, Is.EqualTo(controller.Units.ActiveCount));
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
