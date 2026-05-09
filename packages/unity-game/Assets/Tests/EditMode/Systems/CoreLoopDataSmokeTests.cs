using GLD.Data;
using GLD.Data.Editor;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Act;
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
        public void ImportedDatabaseMatchesGddV1CoreSpec()
        {
            JsonToSOImporter.ImportAllBatch();
            AssetDatabase.Refresh();

            var database = AssetDatabase.LoadAssetAtPath<GameDatabase>(DatabasePath);
            Assert.That(database, Is.Not.Null);

            var map = database.map.FindById("main_long");
            Assert.That(map.id, Is.EqualTo("main_long"));
            Assert.That(map.width, Is.EqualTo(9));
            Assert.That(map.height, Is.EqualTo(18));
            Assert.That(map.buildablePoints.Length, Is.EqualTo(4));

            Assert.That(database.towers.towers.Length, Is.EqualTo(19));
            Assert.That(database.towers.FindById("archer").cost, Is.EqualTo(20));
            Assert.That(database.towers.FindById("ultimate").tier, Is.EqualTo(6));

            Assert.That(database.energy.initialEnergy, Is.EqualTo(40));
            Assert.That(database.energy.energyMax, Is.EqualTo(200));
            Assert.That(database.energy.energyPerSecond, Is.EqualTo(1f));
            Assert.That(database.energy.energyPerKill, Is.EqualTo(1));
            Assert.That(database.energy.energyPerWaveClear, Is.EqualTo(0));
            Assert.That(database.energy.energyPerBossKill, Is.EqualTo(20));
            Assert.That(database.energy.energyPerBossFastClear, Is.EqualTo(20));

            Assert.That(database.waves.waves.Length, Is.EqualTo(20));
            var bossSlots = new[] { 5, 10, 15, 20 };
            foreach (var slot in bossSlots)
                Assert.That(database.waves.FindBySlot(slot).kind, Is.EqualTo(WaveKind.Boss), $"wave {slot}");

            var grid = new GridManager(database.map);
            var energy = new EnergySystem(database.energy);
            var units = new UnitSystem(grid, energy, database.units, database.boss);
            var towers = new TowerSystem(grid, energy, units);
            var slots = new TowerSlotSystem(database, towers, grid);
            Assert.That(slots.States.Count, Is.EqualTo(4));
            Assert.That(slots.ApplyFamilyReward(TowerFamily.Archer), Is.True);
            Assert.That(slots.HasFamily(TowerFamily.Archer), Is.True);
        }

        [Test]
        public void ImportedDatabaseAdvancesToWave20VictoryWithoutEnergyOverflow()
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
            var checkpoints = 0;
            waves.WaveCompleted += _ => completed++;

            Assert.That(waves.Start(1), Is.True);

            for (var i = 0; i < 20000 && waves.Phase != WavePhase.Victory; i++)
            {
                const float dt = 1f;
                energy.Tick(dt);
                waves.Tick(dt);
                units.Tick(dt);
                if (waves.Phase == WavePhase.Checkpoint)
                {
                    checkpoints++;
                    waves.ContinueFromCheckpoint();
                }
                Assert.That(energy.Current, Is.InRange(0, energy.Max));
            }

            Assert.That(waves.Phase, Is.EqualTo(WavePhase.Victory));
            Assert.That(waves.CurrentWaveSlot, Is.EqualTo(20));
            Assert.That(completed, Is.EqualTo(20));
            Assert.That(checkpoints, Is.EqualTo(4));
            Assert.That(energy.Current, Is.InRange(0, 200));
        }
    }
}
