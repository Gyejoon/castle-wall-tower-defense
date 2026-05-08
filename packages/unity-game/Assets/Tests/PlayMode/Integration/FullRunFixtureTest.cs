using System.Collections;
using System.IO;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop;
using GLD.SceneRuntime.Slice2;
using GLD.Systems.Grid;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.Integration
{
    public sealed class FullRunFixtureTest
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        [UnityTest]
        public IEnumerator Phase4SupportedFixturesReachWave50WithInRunSystems()
        {
            AssertPhase4FixtureIsUngated("seed-002-gacha-stack");
            AssertPhase4FixtureIsUngated("seed-003-boss-wave-10-hp-bag");
            AssertPhase4FixtureIsUngated("seed-004-merge-chain");

            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);
            controller.gameObject.SetActive(true);
            yield return null;

            var mergedCount = 0;
            var summonConfirmedCount = 0;
            var upgradeOfferCount = 0;
            var upgradePickCount = 0;
            var bossPhaseCount = 0;
            var bossDefeatCount = 0;
            UpgradeChoice[] pendingChoices = null;

            GameEvents.OnTowersMerged += (_, _, _, _) => mergedCount++;
            GameEvents.OnSummonConfirmed += _ => summonConfirmedCount++;
            GameEvents.OnUpgradeChoiceReady += choices =>
            {
                pendingChoices = choices;
                upgradeOfferCount++;
            };
            GameEvents.OnUpgradeApplied += (_, _) => upgradePickCount++;
            GameEvents.OnBossPhaseChanged += (_, _) => bossPhaseCount++;
            GameEvents.OnBossDefeated += (_, _) => bossDefeatCount++;

            ScriptPhase4Opening(controller);
            Assert.That(controller.StartRun(), Is.True);

            for (var i = 0; i < 20000 && controller.Waves.Phase != WavePhase.Victory; i++)
            {
                TickCoreLoop(controller, 1f);
                if (pendingChoices != null && pendingChoices.Length > 0)
                {
                    GameEvents.RaiseRequestUpgradePick(pendingChoices[0].Id);
                    pendingChoices = null;
                }

                Assert.That(controller.Energy.Current, Is.InRange(0, controller.Energy.Max));
            }

            Assert.That(controller.Waves.Phase, Is.EqualTo(WavePhase.Victory));
            Assert.That(controller.Waves.CurrentWaveSlot, Is.EqualTo(50));
            Assert.That(mergedCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(summonConfirmedCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(upgradeOfferCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(upgradePickCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(bossPhaseCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(bossDefeatCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(controller.Units.TotalDamage, Is.GreaterThan(0f));
        }

        static void ScriptPhase4Opening(GameSceneController controller)
        {
            Assert.That(controller.PlaceTower("archer", 3, 3, spendEnergy: false), Is.True);
            Assert.That(controller.PlaceTower("archer", 5, 3, spendEnergy: false), Is.True);
            GameEvents.RaiseRequestMerge(new TowerMergeRequest(3, 3, 5, 3));
            Assert.That(controller.Towers.GetAt(new GridCell(5, 3)).Def.id, Is.EqualTo("wind_spire"));

            controller.Energy.Add(200);
            GameEvents.RaiseRequestGacha(new GachaRequest(2));
            Assert.That(controller.Orchestrator.PendingSummonTowerId, Is.Not.Null.And.Not.Empty);
            GameEvents.RaiseRequestPlaceTower(new TowerPlacementRequest(string.Empty, 2, 6));

            Assert.That(controller.PlaceTower("ultimate", 6, 6, spendEnergy: false), Is.True);
            Assert.That(controller.PlaceTower("ultimate", 2, 11, spendEnergy: false), Is.True);
            Assert.That(controller.PlaceTower("ultimate", 6, 11, spendEnergy: false), Is.True);

            GameEvents.RaiseRequestUpgradeReroll();
            GameEvents.RaiseRequestUpgradePick("dmg_up");
        }

        static void TickCoreLoop(GameSceneController controller, float dt)
        {
            controller.Energy.Tick(dt);
            controller.Waves.Tick(dt);
            controller.Units.Tick(dt);
            controller.Towers.Tick(dt);
        }

        static void AssertPhase4FixtureIsUngated(string fixtureId)
        {
            var path = Path.GetFullPath(Path.Combine(
                Application.dataPath,
                "../../..",
                "packages/shared/src/testing/replay-fixtures",
                fixtureId + ".json"));
            var fixture = JsonUtility.FromJson<ReplayFixture>(File.ReadAllText(path));
            Assert.That(fixture.phase4_dependent, Is.False, fixtureId);
        }
    }
}
