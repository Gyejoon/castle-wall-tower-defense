using System;
using System.Collections;
using System.Collections.Generic;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop;
using GLD.Systems.Units;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.Integration
{
    public sealed class BossEncounterTest
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        [UnityTest]
        public IEnumerator BossEncountersRunFullPhaseCycleAndDeathEvent()
        {
            yield return SceneManager.LoadSceneAsync("Root", LoadSceneMode.Single);
            var controller = UnityEngine.Object.FindFirstObjectByType<GameSceneController>(FindObjectsInactive.Include);
            Assert.That(controller, Is.Not.Null);
            controller.gameObject.SetActive(true);
            yield return null;

            Assert.That(controller.PlaceTower("archer", 3, 3, spendEnergy: false), Is.True);

            ExerciseBoss(controller, "orc_warlord", afterPhase2: unit =>
            {
                Assert.That(controller.Units.Units.Count, Is.GreaterThanOrEqualTo(5));
            });

            var disabledBefore = controller.Towers.Towers[0].DisabledUntilSeconds;
            ExerciseBoss(controller, "forge_master", beforeDamage: unit =>
            {
                controller.Units.Tick(10.1f);
                Assert.That(controller.Towers.Towers[0].DisabledUntilSeconds, Is.GreaterThan(disabledBefore));
            });

            var countBeforeCorrupted = controller.Units.Units.Count;
            ExerciseBoss(controller, "corrupted_archmage", beforeDamage: unit =>
            {
                Assert.That(unit.BossBehavior.IsCcImmune(), Is.True);
                Assert.That(controller.Units.Units.Count, Is.EqualTo(countBeforeCorrupted + 2));
                Assert.That(controller.Units.Units[controller.Units.Units.Count - 1].IsClone, Is.True);
            });

            var countBeforeDragon = controller.Units.Units.Count;
            ExerciseBoss(controller, "dragon", afterPhase2: unit =>
            {
                Assert.That(controller.Units.Units.Count, Is.EqualTo(countBeforeDragon + 4));
            }, afterPhase3: unit =>
            {
                Assert.That(controller.Units.Units.Count, Is.EqualTo(countBeforeDragon + 10));
            });
        }

        static void ExerciseBoss(
            GameSceneController controller,
            string bossId,
            Action<UnitInstance> beforeDamage = null,
            Action<UnitInstance> afterPhase2 = null,
            Action<UnitInstance> afterPhase3 = null)
        {
            var phases = new List<int>();
            var defeated = false;
            Action<string, int> phaseHandler = (unitId, phase) => phases.Add(phase);
            Action<string, int> defeatedHandler = (unitId, waveSlot) => defeated = true;
            GameEvents.OnBossPhaseChanged += phaseHandler;
            GameEvents.OnBossDefeated += defeatedHandler;

            try
            {
                var boss = controller.Units.SpawnById(bossId);
                Assert.That(boss, Is.Not.Null, bossId);
                Assert.That(boss.Boss.IsBoss, Is.True, bossId);

                beforeDamage?.Invoke(boss);

                controller.Units.ApplyDamage(boss, boss.MaxHp * 0.51f);
                Assert.That(boss.Boss.Phase, Is.EqualTo(2), bossId);
                Assert.That(boss.Boss.IsInvulnerable, Is.True, bossId);
                afterPhase2?.Invoke(boss);

                controller.Units.Tick(0.6f);
                controller.Units.ApplyDamage(boss, boss.MaxHp * 0.25f);
                Assert.That(boss.Boss.Phase, Is.EqualTo(3), bossId);
                Assert.That(boss.Boss.IsInvulnerable, Is.True, bossId);
                afterPhase3?.Invoke(boss);

                controller.Units.Tick(0.6f);
                controller.Units.ApplyDamage(boss, boss.MaxHp);
                Assert.That(boss.IsAlive, Is.False, bossId);
                Assert.That(defeated, Is.True, bossId);
                Assert.That(phases, Is.EquivalentTo(new[] { 2, 3 }), bossId);
            }
            finally
            {
                GameEvents.OnBossPhaseChanged -= phaseHandler;
                GameEvents.OnBossDefeated -= defeatedHandler;
            }
        }
    }
}
