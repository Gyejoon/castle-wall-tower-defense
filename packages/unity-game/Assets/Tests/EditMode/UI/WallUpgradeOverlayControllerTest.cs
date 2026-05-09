using GLD.Core;
using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.UI;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class WallUpgradeOverlayControllerTest
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void WallSelectionShowsUpgradeOverlayAndRaisesRequests()
        {
            var root = new VisualElement();
            var host = new GameObject("WallUpgradeOverlayControllerTest");
            try
            {
                var repair = 0;
                var damage = 0;
                var speed = 0;
                var range = 0;
                GameEvents.OnRequestRepairWall += () => repair++;
                GameEvents.OnRequestUpgradeWallDamage += () => damage++;
                GameEvents.OnRequestUpgradeWallSpeed += () => speed++;
                GameEvents.OnRequestUpgradeWallRange += () => range++;

                var runState = new RunState("wall-overlay-test");
                var controller = host.AddComponent<WallUpgradeOverlayController>();
                controller.Bind(runState, root);

                Assert.That(controller.IsBound, Is.True);
                Assert.That(controller.IsVisible, Is.False);
                Assert.That(runState.IsOverlayPaused, Is.False);

                GameEvents.RaiseWallStateChanged(new WallState(
                    currentHp: 12,
                    maxHp: 20,
                    repairCost: 25,
                    repairAmount: 5,
                    repairCooldownSec: 12f,
                    repairCooldownRemainingSec: 0f,
                    autoAttackDamage: 75f,
                    autoAttackIntervalSec: 0.5f,
                    autoAttackRange: 5f,
                    instantRepairCharges: 1,
                    damageUpgradeCost: 45,
                    speedUpgradeCost: 50,
                    rangeUpgradeCost: 40,
                    damageUpgradeLevel: 0,
                    speedUpgradeLevel: 0,
                    rangeUpgradeLevel: 0));
                GameEvents.RaiseWallSelected();

                Assert.That(controller.IsVisible, Is.True);
                Assert.That(runState.IsPaused, Is.False);
                Assert.That(runState.IsOverlayPaused, Is.True);
                Assert.That(root.Q<VisualElement>("wall-upgrade-overlay").pickingMode, Is.EqualTo(PickingMode.Position));
                Assert.That(root.Q<Label>("wall-upgrade-summary").text, Does.Contain("HP 12/20"));
                Assert.That(root.Q<Button>("wall-upgrade-repair").text, Does.Contain("1"));
                Assert.That(root.Q<Button>("wall-upgrade-damage").text, Does.Contain("45"));

                controller.RequestRepair();
                controller.RequestDamageUpgrade();
                controller.RequestSpeedUpgrade();
                controller.RequestRangeUpgrade();

                Assert.That(repair, Is.EqualTo(1));
                Assert.That(damage, Is.EqualTo(1));
                Assert.That(speed, Is.EqualTo(1));
                Assert.That(range, Is.EqualTo(1));

                GameEvents.RaiseTowerSelected("tower-1", 1, 1);
                Assert.That(controller.IsVisible, Is.False);
                Assert.That(runState.IsOverlayPaused, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(host);
            }
        }
    }
}
