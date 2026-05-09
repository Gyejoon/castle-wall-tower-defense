using GLD.Data;
using GLD.Core;
using GLD.Systems.Act;
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
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

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
        public void GridPlacementHitTestUsesPlacementAnchorPosition()
        {
            var grid = new GridManager(CreateMapLayout());
            var target = new GridCell(2, 6);
            var markerWorld = grid.GridToPlacementWorld(target);

            Assert.That(grid.WorldToGrid(markerWorld), Is.Not.EqualTo(target));
            Assert.That(grid.WorldToPlacementGrid(markerWorld), Is.EqualTo(target));
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
        public void EnergyRegenUsesSoftCapAfterOneHundred()
        {
            var energy = new EnergySystem(initial: 99, max: 200, perSecond: 1f);

            energy.Tick(4f);

            Assert.That(energy.Current, Is.EqualTo(101));
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
        public void WaveSystemForceStartsNextNormalWaveAfterTimer()
        {
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem();
            var unitCatalog = CreateUnitCatalog(CreateUnit("scout", hp: 999, speed: 0.1f));
            var units = new UnitSystem(grid, energy, unitCatalog);
            var waves = CreateWaveCatalog(new[] { 1, 2 }, "scout", count: 1);
            var waveSystem = new WaveSystem(waves, unitCatalog, units);

            Assert.That(waveSystem.Start(1), Is.True);
            waveSystem.Tick(0.1f);

            Assert.That(units.ActiveCount, Is.EqualTo(1));
            Assert.That(waveSystem.CurrentWaveSlot, Is.EqualTo(1));

            waveSystem.Tick(30f);
            waveSystem.Tick(0.1f);

            Assert.That(waveSystem.CurrentWaveSlot, Is.EqualTo(2));
            Assert.That(waveSystem.Phase, Is.EqualTo(WavePhase.Running));
            Assert.That(waveSystem.SpawnedCount, Is.EqualTo(1));
            Assert.That(units.ActiveCount, Is.EqualTo(2));
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

        [Test]
        public void TowerSystemAttacksFromLogicalCellWhenPlacementAnchorIsOffset()
        {
            var grid = new GridManager(CreateOffsetAnchorCombatMap());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy);
            var towerSystem = new TowerSystem(grid, energy, units);
            var towerDef = CreateTower("archer");
            towerDef.stats.range = 1.25f;
            units.Spawn(CreateUnit("scout", hp: 30, speed: 0f));

            var cell = new GridCell(3, 3);
            Assert.That(towerSystem.Place(towerDef, cell), Is.True);
            var tower = towerSystem.Towers[0];
            Assert.That(tower.Position, Is.EqualTo(grid.GridToPlacementWorld(cell)));
            Assert.That(tower.CombatPosition, Is.EqualTo(grid.GridToWorld(cell)));

            towerSystem.Tick(1f);

            Assert.That(units.TotalDamage, Is.GreaterThan(0f));
        }

        [Test]
        public void TowerSystemAppliesPhaserStyleSplashDamage()
        {
            var grid = new GridManager(CreateOffsetAnchorCombatMap());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy);
            var towerSystem = new TowerSystem(grid, energy, units);
            var primary = units.Spawn(CreateUnit("scout-a", hp: 100, speed: 0f));
            var splash = units.Spawn(CreateUnit("scout-b", hp: 100, speed: 0f));
            var towerDef = CreateTower("nova_cannon");
            towerDef.stats.damage = 30;
            towerDef.stats.special = "splash_1.2";

            Assert.That(towerSystem.Place(towerDef, new GridCell(3, 3)), Is.True);
            towerSystem.Tick(1f);

            Assert.That(primary.Hp, Is.EqualTo(70f).Within(0.001f));
            Assert.That(splash.Hp, Is.EqualTo(85f).Within(0.001f));
            Assert.That(units.TotalDamage, Is.EqualTo(45f).Within(0.001f));
        }

        [Test]
        public void TowerSystemAppliesPhaserStyleSlow()
        {
            var grid = new GridManager(CreateOffsetAnchorCombatMap());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy);
            var towerSystem = new TowerSystem(grid, energy, units);
            var unit = units.Spawn(CreateUnit("scout", hp: 100, speed: 1f));
            var towerDef = CreateTower("emp");
            towerDef.stats.damage = 8;
            towerDef.stats.special = "slow_30%";

            Assert.That(towerSystem.Place(towerDef, new GridCell(3, 3)), Is.True);
            towerSystem.Tick(1f);

            Assert.That(unit.Cc.ResolveSpeed(1f), Is.EqualTo(0.7f).Within(0.001f));
        }

        [Test]
        public void TowerSystemAppliesPhaserStyleStun()
        {
            var grid = new GridManager(CreateOffsetAnchorCombatMap());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy);
            var towerSystem = new TowerSystem(grid, energy, units);
            var unit = units.Spawn(CreateUnit("scout", hp: 100, speed: 1f));
            var towerDef = CreateTower("shield");
            towerDef.stats.damage = 5;
            towerDef.stats.special = "stun_300ms";

            Assert.That(towerSystem.Place(towerDef, new GridCell(3, 3)), Is.True);
            towerSystem.Tick(1f);

            Assert.That(unit.Cc.IsStunned, Is.True);
            Assert.That(unit.Cc.ResolveSpeed(1f), Is.EqualTo(0f).Within(0.001f));
        }

        [Test]
        public void WallSystemClampsRepairsAndAutoAttacks()
        {
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy);
            var unit = units.Spawn(CreateUnit("scout", hp: 50, speed: 0f));
            var wall = new WallSystem(energy, units);
            var wallAttackCount = 0;
            var wallAttackDamage = 0f;
            GameEvents.OnWallAutoAttacked += attackEvent =>
            {
                wallAttackCount++;
                wallAttackDamage = attackEvent.Damage;
            };

            wall.Tick(2f);
            Assert.That(unit.Hp, Is.LessThan(unit.MaxHp));
            Assert.That(wallAttackCount, Is.GreaterThanOrEqualTo(1));
            Assert.That(wallAttackDamage, Is.GreaterThan(0f));

            wall.TakeDamage(10);
            Assert.That(wall.CurrentHp, Is.EqualTo(10));
            var beforeRepair = energy.Current;
            Assert.That(wall.Repair(), Is.True);
            Assert.That(wall.CurrentHp, Is.EqualTo(15));
            Assert.That(energy.Current, Is.EqualTo(beforeRepair - wall.RepairCost));
            Assert.That(wall.Repair(), Is.False);
            wall.GrantInstantRepairCharge();
            Assert.That(wall.InstantRepairCharges, Is.EqualTo(1));
            Assert.That(wall.InstantRepair(), Is.True);
            Assert.That(wall.CurrentHp, Is.EqualTo(wall.MaxHp));
            Assert.That(wall.InstantRepairCharges, Is.EqualTo(0));

            var beforeDamageUpgrade = wall.AutoAttackDamage;
            var beforeSpeedUpgrade = wall.AutoAttackIntervalSec;
            var beforeRangeUpgrade = wall.AutoAttackRange;
            energy.Add(200);
            Assert.That(wall.UpgradeDamage(), Is.True);
            Assert.That(wall.AutoAttackDamage, Is.GreaterThan(beforeDamageUpgrade));
            Assert.That(wall.UpgradeSpeed(), Is.True);
            Assert.That(wall.AutoAttackIntervalSec, Is.LessThan(beforeSpeedUpgrade));
            Assert.That(wall.UpgradeRange(), Is.True);
            Assert.That(wall.AutoAttackRange, Is.GreaterThan(beforeRangeUpgrade));

            wall.TakeDamage(999);
            Assert.That(wall.CurrentHp, Is.EqualTo(0));
            Assert.That(wall.IsDestroyed, Is.True);
        }

        [Test]
        public void PlayerTacticsRespectBossCcResistance()
        {
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 100);
            var bossCatalog = CreateUnitCatalog(CreateBoss("boss", hp: 100, speed: 1f, ccResistance: 1f));
            var units = new UnitSystem(grid, energy, bossCatalog);
            var boss = units.Spawn(bossCatalog.FindById("boss"));
            var tactics = new PlayerTacticSystem(units);

            tactics.Upgrade(PlayerTacticKind.Freeze);
            Assert.That(tactics.Cast(new TacticCastRequest(PlayerTacticKind.Freeze, boss.Position.x, boss.Position.y, 2f)), Is.False);
            Assert.That(boss.Cc.IsStunned, Is.False);
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
                    tileSize = 64,
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
                        new GridPoint { x = 5, y = 3 },
                        new GridPoint { x = 2, y = 6 },
                        new GridPoint { x = 6, y = 6 }
                    },
                    placementAnchors = new[]
                    {
                        new PlacementAnchor { x = 2, y = 6, worldX = 96, worldY = 475 }
                    }
                }
            };
            return layout;
        }

        static MapLayoutSO CreateOffsetAnchorCombatMap()
        {
            var layout = ScriptableObject.CreateInstance<MapLayoutSO>();
            layout.maps = new[]
            {
                new MapDef
                {
                    id = "main_long",
                    width = 9,
                    height = 18,
                    tileSize = 64,
                    spawnPoint = new GridPoint { x = 3, y = 4 },
                    exitPoint = new GridPoint { x = 3, y = 5 },
                    path = new[]
                    {
                        new GridPoint { x = 3, y = 4 },
                        new GridPoint { x = 3, y = 5 }
                    },
                    buildablePoints = new[]
                    {
                        new GridPoint { x = 3, y = 3 }
                    },
                    placementAnchors = new[]
                    {
                        new PlacementAnchor { x = 3, y = 3, worldX = (8 + 0.5f) * 64, worldY = (16 + 0.5f) * 64 }
                    }
                }
            };
            return layout;
        }

        static UnitDefSO CreateUnit(string id, int hp, float speed)
        {
            var unit = ScriptableObject.CreateInstance<UnitDefSO>();
            unit.id = id;
            unit.element = Element.Neutral;
            unit.stats = new UnitStats { hp = hp, armor = 0, speed = speed };
            return unit;
        }

        static UnitDefSO CreateBoss(string id, int hp, float speed, float ccResistance)
        {
            var unit = CreateUnit(id, hp, speed);
            unit.bossBehaviorId = "orc_warlord";
            unit.bossCcResist = ccResistance;
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
            return CreateWaveCatalog(new[] { 1 }, unitId, count);
        }

        static WaveCatalogSO CreateWaveCatalog(int[] slots, string unitId, int count)
        {
            var waveDefs = new WaveDefSO[slots.Length];
            for (var i = 0; i < slots.Length; i++)
            {
                var wave = ScriptableObject.CreateInstance<WaveDefSO>();
                wave.slotIndex = slots[i];
                wave.kind = WaveKind.Normal;
                wave.delayAfterClearSec = 3f;
                wave.groups = new[]
                {
                    new WaveGroup { unitId = unitId, count = count, hpMultiplier = 1f }
                };
                waveDefs[i] = wave;
            }

            var catalog = ScriptableObject.CreateInstance<WaveCatalogSO>();
            catalog.waves = waveDefs;
            return catalog;
        }

        static TowerDefSO CreateTower(string id)
        {
            var tower = ScriptableObject.CreateInstance<TowerDefSO>();
            tower.id = id;
            tower.cost = 10;
            tower.element = Element.Neutral;
            tower.family = TowerFamily.Archer;
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
