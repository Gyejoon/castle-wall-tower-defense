using GLD.Data;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Pathfinding;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Systems
{
    public sealed class CoreLoopSystemTests
    {
        [Test]
        public void GridRoundTripsAndBuildableCells()
        {
            var grid = new GridManager(CreateMapLayout());
            var cell = new GridCell(3, 3);

            Assert.That(grid.Width, Is.EqualTo(9));
            Assert.That(grid.Height, Is.EqualTo(18));
            Assert.That(grid.WorldToGrid(grid.GridToWorld(cell)), Is.EqualTo(cell));
            Assert.That(grid.IsBuildable(cell), Is.True);
            Assert.That(grid.IsBuildable(new GridCell(4, 0)), Is.False);
        }

        [Test]
        public void PathfindingFindsGridPath()
        {
            var grid = new GridManager(CreateMapLayout());
            var pathfinding = new PathfindingSystem(grid);

            var path = pathfinding.FindPath(new GridCell(0, 0), new GridCell(2, 2));

            Assert.That(path.Count, Is.EqualTo(5));
            Assert.That(path[0], Is.EqualTo(new GridCell(0, 0)));
            Assert.That(path[path.Count - 1], Is.EqualTo(new GridCell(2, 2)));
        }

        [Test]
        public void EnergyUsesV3EconomyAndCap()
        {
            var energy = new EnergySystem(initial: 40, max: 200, perSecond: 1f);

            energy.Tick(5f);
            Assert.That(energy.Current, Is.EqualTo(45));

            Assert.That(energy.Spend(10), Is.True);
            energy.AddKillReward();
            energy.AddBossKillReward();
            energy.AddFastClearReward();
            energy.Add(1000);

            Assert.That(energy.Current, Is.EqualTo(200));
            Assert.That(energy.Spend(201), Is.False);
        }

        [Test]
        public void UnitSystemMovesUnitsAndPaysKillReward()
        {
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 40);
            var units = new UnitSystem(grid, energy);
            var unit = units.Spawn(CreateUnit("scout", hp: 30, speed: 1));

            units.Tick(0.5f);
            Assert.That(unit.Position, Is.Not.EqualTo(grid.Path[0]));

            var before = energy.Current;
            units.ApplyDamage(unit, 999);

            Assert.That(units.KillCount, Is.EqualTo(1));
            Assert.That(energy.Current, Is.EqualTo(before + 1));
        }

        [Test]
        public void WaveSystemSpawnsAndCompletesWave()
        {
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem();
            var unitCatalog = CreateUnitCatalog(CreateUnit("scout", hp: 1, speed: 0.1f));
            var units = new UnitSystem(grid, energy, unitCatalog);
            var waves = CreateWaveCatalog("scout", count: 2);
            var waveSystem = new WaveSystem(waves, unitCatalog, units);

            Assert.That(waveSystem.Start(1), Is.True);
            waveSystem.Tick(2f);
            foreach (var unit in units.Units)
                units.ApplyDamage(unit, 999);
            waveSystem.Tick(0.1f);

            Assert.That(waveSystem.SpawnedCount, Is.EqualTo(2));
            Assert.That(waveSystem.CurrentWaveSlot, Is.EqualTo(1));
        }

        [Test]
        public void TowerSystemPlacesMovesSellsAndAttacks()
        {
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 100);
            var unit = CreateUnit("scout", hp: 30, speed: 0.1f);
            var units = new UnitSystem(grid, energy);
            units.Spawn(unit);

            var towerSystem = new TowerSystem(grid, energy, units);
            var towerDef = CreateTower("archer");

            Assert.That(towerSystem.Place(towerDef, new GridCell(3, 3)), Is.True);
            towerSystem.Tick(10f);
            Assert.That(units.TotalDamage, Is.GreaterThan(0f));

            var tower = towerSystem.Towers[0];
            Assert.That(towerSystem.Move(tower.InstanceId, new GridCell(5, 3)), Is.True);
            Assert.That(towerSystem.Sell(tower.InstanceId), Is.True);
            Assert.That(towerSystem.Towers.Count, Is.EqualTo(0));
        }

        static MapLayoutSO CreateMapLayout()
        {
            var layout = ScriptableObject.CreateInstance<MapLayoutSO>();
            layout.maps = new[]
            {
                new MapDef
                {
                    id = "main_long",
                    width = 9,
                    height = 18,
                    spawnPoint = new GridPoint { x = 0, y = 0 },
                    exitPoint = new GridPoint { x = 2, y = 2 },
                    path = new[]
                    {
                        new GridPoint { x = 0, y = 0 },
                        new GridPoint { x = 1, y = 0 },
                        new GridPoint { x = 2, y = 0 },
                        new GridPoint { x = 2, y = 1 },
                        new GridPoint { x = 2, y = 2 }
                    },
                    blockedPlacementPoints = new[] { new GridPoint { x = 4, y = 0 } },
                    buildablePoints = new[]
                    {
                        new GridPoint { x = 3, y = 3 },
                        new GridPoint { x = 5, y = 3 }
                    }
                }
            };
            return layout;
        }

        static UnitDefSO CreateUnit(string id, int hp, float speed)
        {
            var unit = ScriptableObject.CreateInstance<UnitDefSO>();
            unit.id = id;
            unit.stats = new UnitStats { hp = hp, armor = 0, speed = speed };
            return unit;
        }

        static UnitCatalogSO CreateUnitCatalog(UnitDefSO unit)
        {
            var catalog = ScriptableObject.CreateInstance<UnitCatalogSO>();
            catalog.minMoveSpeed = 0.15f;
            catalog.stunImmunityWindowMs = 2000;
            catalog.units = new[] { unit };
            return catalog;
        }

        static WaveCatalogSO CreateWaveCatalog(string unitId, int count)
        {
            var wave = ScriptableObject.CreateInstance<WaveDefSO>();
            wave.slotIndex = 1;
            wave.groups = new[]
            {
                new WaveGroup { unitId = unitId, count = count, hpMultiplier = 1f }
            };

            var catalog = ScriptableObject.CreateInstance<WaveCatalogSO>();
            catalog.waves = new[] { wave };
            return catalog;
        }

        static TowerDefSO CreateTower(string id)
        {
            var tower = ScriptableObject.CreateInstance<TowerDefSO>();
            tower.id = id;
            tower.cost = 10;
            tower.stats = new TowerStats
            {
                damage = 20,
                range = 20,
                attackSpeed = 1,
                projectileSpeed = 0,
                special = string.Empty
            };
            return tower;
        }
    }
}
