using GLD.Data;
using GLD.SceneRuntime.Slice2;
using GLD.Systems.Minimal;
using NUnit.Framework;
using UnityEditor;

namespace GLD.Tests.EditMode.Slice2
{
    public sealed class MinimalSystemsTest
    {
        [Test]
        public void HeadlessWave1KillsFiveUnits()
        {
            var archer = AssetDatabase.LoadAssetAtPath<TowerDefSO>("Assets/Data/Towers/archer.asset");
            var unit = AssetDatabase.LoadAssetAtPath<UnitDefSO>("Assets/Data/Units/scout_drone.asset");

            var grid = new MinimalGridManager(MinimalReplayRunner.CreatePocMap());
            var energy = new MinimalEnergySystem();
            var units = new MinimalUnitSystem(grid, energy);
            var towers = new MinimalTowerSystem(grid, energy, units);
            var waves = new MinimalWaveSystem(units, unit);

            Assert.That(towers.PlaceArcher(archer, new MinimalGridCell(3, 14)), Is.True);
            waves.StartWave1();

            for (var i = 0; i < 60 * 60 && !waves.IsCompleted; i++)
            {
                const float dt = 1f / 60f;
                energy.Tick(dt);
                waves.Tick(dt);
                units.Tick(dt);
                towers.Tick(dt);
            }

            Assert.That(waves.IsCompleted, Is.True);
            Assert.That(units.KillCount, Is.EqualTo(5));
            Assert.That(energy.Peak, Is.InRange(40f, 200f));
        }
    }
}
