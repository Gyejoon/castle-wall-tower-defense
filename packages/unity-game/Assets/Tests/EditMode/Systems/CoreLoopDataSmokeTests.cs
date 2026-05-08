using GLD.Data;
using GLD.Data.Editor;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEditor;

namespace GLD.Tests.EditMode.Systems
{
    public sealed class CoreLoopDataSmokeTests
    {
        const string DatabasePath = "Assets/Data/GameDatabase.asset";

        [Test]
        public void ImportedDatabaseRunsCoreLoopThroughFirstWave()
        {
            JsonToSOImporter.ImportAllBatch();
            AssetDatabase.Refresh();

            var database = AssetDatabase.LoadAssetAtPath<GameDatabase>(DatabasePath);
            Assert.That(database, Is.Not.Null);
            Assert.That(database.map, Is.Not.Null);
            Assert.That(database.energy, Is.Not.Null);
            Assert.That(database.units, Is.Not.Null);
            Assert.That(database.towers, Is.Not.Null);
            Assert.That(database.waves, Is.Not.Null);

            var grid = new GridManager(database.map);
            var energy = new EnergySystem(database.energy);
            var units = new UnitSystem(grid, energy, database.units);
            var towers = new TowerSystem(grid, energy, units);
            var waves = new WaveSystem(database.waves, database.units, units);

            Assert.That(towers.Place(database.towers.FindById("archer"), new GridCell(3, 3), spendEnergy: false), Is.True);
            Assert.That(towers.Place(database.towers.FindById("flame_tower"), new GridCell(5, 3), spendEnergy: false), Is.True);
            Assert.That(towers.Place(database.towers.FindById("wind_spire"), new GridCell(2, 6), spendEnergy: false), Is.True);
            Assert.That(waves.Start(1), Is.True);

            for (var i = 0; i < 2400 && waves.Phase == WavePhase.Running; i++)
            {
                const float dt = 1f / 30f;
                energy.Tick(dt);
                waves.Tick(dt);
                units.Tick(dt);
                towers.Tick(dt);
            }

            Assert.That(waves.CurrentWaveSlot, Is.EqualTo(1));
            Assert.That(waves.SpawnedCount, Is.GreaterThan(0));
            Assert.That(units.TotalDamage, Is.GreaterThan(0f));
            Assert.That(energy.Current, Is.InRange(0, energy.Max));
        }

        [Test]
        public void ImportedDatabaseAdvancesToWave50VictoryWithoutEnergyOverflow()
        {
            JsonToSOImporter.ImportAllBatch();
            AssetDatabase.Refresh();

            var database = AssetDatabase.LoadAssetAtPath<GameDatabase>(DatabasePath);
            Assert.That(database, Is.Not.Null);

            var grid = new GridManager(database.map);
            var energy = new EnergySystem(database.energy);
            var units = new UnitSystem(grid, energy, database.units);
            var waves = new WaveSystem(database.waves, database.units, units);
            var completed = 0;
            waves.WaveCompleted += _ => completed++;

            Assert.That(waves.Start(1), Is.True);

            for (var i = 0; i < 20000 && waves.Phase != WavePhase.Victory; i++)
            {
                const float dt = 1f;
                energy.Tick(dt);
                waves.Tick(dt);
                units.Tick(dt);
                Assert.That(energy.Current, Is.InRange(0, energy.Max));
            }

            Assert.That(waves.Phase, Is.EqualTo(WavePhase.Victory));
            Assert.That(waves.CurrentWaveSlot, Is.EqualTo(50));
            Assert.That(completed, Is.EqualTo(50));
            Assert.That(energy.Current, Is.InRange(0, 200));
        }
    }
}
