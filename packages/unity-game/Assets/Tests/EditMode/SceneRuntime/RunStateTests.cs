using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.Runtime;
using GLD.Systems.Waves;
using NUnit.Framework;

namespace GLD.Tests.EditMode.SceneRuntime
{
    public sealed class RunStateTests
    {
        [Test]
        public void SettersFireOnceAndIgnoreNoops()
        {
            var state = new RunState("test-run");
            var changed = 0;
            state.OnChanged += _ => changed++;

            state.SetEnergy(40, 200);
            state.SetEnergy(40, 200);
            state.SetWave(1, WavePhase.Running);
            state.SetWave(1, WavePhase.Running);

            Assert.That(changed, Is.EqualTo(2));
            Assert.That(state.Energy, Is.EqualTo(40));
            Assert.That(state.EnergyMax, Is.EqualTo(200));
            Assert.That(state.Wave, Is.EqualTo(1));
            Assert.That(state.WavePhase, Is.EqualTo(WavePhase.Running));
        }

        [Test]
        public void BossSnapshotUpdatesAndClears()
        {
            var state = new RunState("boss-run");
            var changed = 0;
            state.OnChanged += _ => changed++;

            state.SetBossHp("boss-1", "orc_warlord", 500, 1000, 2);
            state.SetBossHp("boss-1", "orc_warlord", 500, 1000, 2);
            state.ClearBoss();
            state.ClearBoss();

            Assert.That(changed, Is.EqualTo(2));
            Assert.That(state.BossHp, Is.EqualTo(0));
            Assert.That(state.BossMaxHp, Is.EqualTo(0));
            Assert.That(state.BossPhase, Is.EqualTo(0));
            Assert.That(state.BossUnitId, Is.Null);
        }

        [Test]
        public void GameStateManagerPublishesThroughRunState()
        {
            var runState = new RunState("runtime");
            var manager = new GameStateManager(runState);
            var changed = 0;
            runState.OnChanged += _ => changed++;

            manager.SetSpeedMultiplier(3f);
            manager.Tick(0.02f);
            manager.SetOverlayPaused(true);
            var blockedDelta = manager.Tick(0.02f);
            manager.SetOverlayPaused(false);
            manager.ApplyExitDamage(3);

            Assert.That(changed, Is.EqualTo(5));
            Assert.That(runState.SpeedMultiplier, Is.EqualTo(3f).Within(0.0001f));
            Assert.That(runState.ElapsedSeconds, Is.EqualTo(0.06f).Within(0.0001f));
            Assert.That(blockedDelta, Is.EqualTo(0f));
            Assert.That(runState.Lives, Is.EqualTo(17));
        }
    }
}
