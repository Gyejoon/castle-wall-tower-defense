using System.Reflection;
using GLD.Core;
using GLD.Data;
using GLD.SceneRuntime.CoreLoop.Runtime;
using GLD.Systems.DamageNumbers;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Orchestrator;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Systems
{
    public sealed class CoreLoopPhase3RuntimeTests
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        [Test]
        public void GameEventsExposePhase3CoreSurface()
        {
            var eventNames = new[]
            {
                "OnRequestStartRun",
                "OnRequestSummon",
                "OnRequestPlaceTower",
                "OnRequestSetSpeed",
                "OnSummonOffered",
                "OnTowerPlacementFailed",
                "OnTowerAttacked",
                "OnUnitDamaged",
                "OnWavePrepStarted",
                "OnBossWaveStarted",
                "OnPlayerHpChanged",
                "OnGameOver"
            };

            foreach (var eventName in eventNames)
            {
                var evt = typeof(GameEvents).GetEvent(eventName, BindingFlags.Public | BindingFlags.Static);
                Assert.That(evt, Is.Not.Null, eventName);
            }
        }

        [Test]
        public void CoreOrchestratorCachesCancelledPoolDraw()
        {
            var database = CreateDatabase();
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy, database.units);
            var towers = new TowerSystem(grid, energy, units);
            var waves = new WaveSystem(database.waves, database.units, units);

            using (var orchestrator = new CoreOrchestrator(database, towers, waves))
            {
                orchestrator.Enable();

                GameEvents.RaiseRequestSummon();
                Assert.That(orchestrator.PendingSummonTowerId, Is.EqualTo("archer"));

                GameEvents.RaiseRequestCancelSummon();
                Assert.That(orchestrator.PendingSummonTowerId, Is.Null);

                GameEvents.RaiseRequestSummon();
                Assert.That(orchestrator.PendingSummonTowerId, Is.EqualTo("archer"));

                GameEvents.RaiseRequestPlaceTower(new TowerPlacementRequest(null, 3, 3));
                Assert.That(towers.Towers.Count, Is.EqualTo(1));
                Assert.That(orchestrator.PendingSummonTowerId, Is.Null);
            }
        }

        [Test]
        public void CoreOrchestratorLifecycleDoesNotLeakEventSubscriptions()
        {
            var database = CreateDatabase();
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy, database.units);
            var towers = new TowerSystem(grid, energy, units);
            var waves = new WaveSystem(database.waves, database.units, units);
            var offeredCount = 0;

            GameEvents.OnSummonOffered += _ => offeredCount++;

            for (var i = 0; i < 10; i++)
            {
                using (var orchestrator = new CoreOrchestrator(database, towers, waves))
                {
                    orchestrator.Enable();
                    orchestrator.Enable();
                    GameEvents.RaiseRequestSummon();
                    GameEvents.RaiseRequestCancelSummon();
                }

                GameEvents.RaiseRequestSummon();
            }

            Assert.That(offeredCount, Is.EqualTo(10));
        }

        [Test]
        public void GameStateManagerScalesDeltaAndAppliesExitDamage()
        {
            var state = new GameStateManager();
            var lastHp = 0;
            var gameOver = false;
            GameEvents.OnPlayerHpChanged += hp => lastHp = hp;
            GameEvents.OnGameOver += victory => gameOver = !victory;

            state.SetSpeedMultiplier(3f);
            Assert.That(state.Tick(0.02f), Is.EqualTo(0.06f).Within(0.0001f));

            for (var i = 0; i < 20; i++)
                state.ApplyExitDamage();

            Assert.That(lastHp, Is.EqualTo(0));
            Assert.That(gameOver, Is.True);
        }

        [Test]
        public void CoreLoopEventSequenceIsDeterministicAtOneAndThreeTimesSpeed()
        {
            var oneX = RunSimpleCoreLoop(speedMultiplier: 1f, ticks: 250);
            var threeX = RunSimpleCoreLoop(speedMultiplier: 3f, ticks: 84);

            Assert.That(threeX, Is.EqualTo(oneX));
        }

        [Test]
        public void DamageNumberSystemReusesPool()
        {
            var root = new GameObject("DamageNumberTestRoot");
            try
            {
                using (var damageNumbers = new DamageNumberSystem(root.transform, 2))
                {
                    damageNumbers.Show(Vector2.zero, 10);
                    damageNumbers.Show(Vector2.one, 20);
                    damageNumbers.Show(Vector2.up, 30);
                    Assert.That(damageNumbers.ActiveCount, Is.EqualTo(2));
                    Object.DestroyImmediate(root.transform.GetChild(0).gameObject);
                    Object.DestroyImmediate(root.transform.GetChild(0).gameObject);
                    damageNumbers.Show(Vector2.right, 40);
                    Assert.That(damageNumbers.ActiveCount, Is.EqualTo(1));
                    damageNumbers.TickUnscaled(0.4f);
                    Assert.That(root.transform.childCount, Is.EqualTo(1));
                }
            }
            finally
            {
                Object.DestroyImmediate(root);
            }
        }

        static GameDatabase CreateDatabase()
        {
            var tower = ScriptableObject.CreateInstance<TowerDefSO>();
            tower.id = "archer";
            tower.cost = 10;
            tower.stats = new TowerStats { damage = 20, range = 20, attackSpeed = 1 };

            var towers = ScriptableObject.CreateInstance<TowerCatalogSO>();
            towers.towers = new[] { tower };

            var unit = ScriptableObject.CreateInstance<UnitDefSO>();
            unit.id = "scout";
            unit.stats = new UnitStats { hp = 10, speed = 1 };

            var units = ScriptableObject.CreateInstance<UnitCatalogSO>();
            units.units = new[] { unit };

            var wave = ScriptableObject.CreateInstance<WaveDefSO>();
            wave.slotIndex = 1;
            wave.groups = new[] { new WaveGroup { unitId = "scout", count = 1, hpMultiplier = 1f } };

            var waves = ScriptableObject.CreateInstance<WaveCatalogSO>();
            waves.waves = new[] { wave };

            var summonPool = ScriptableObject.CreateInstance<SummonPoolSO>();
            summonPool.entries = new[] { new SummonPoolEntry { towerId = "archer", weight = 1 } };
            summonPool.towerIds = new[] { "archer" };

            var database = ScriptableObject.CreateInstance<GameDatabase>();
            database.towers = towers;
            database.units = units;
            database.waves = waves;
            database.summonPool = summonPool;
            return database;
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
                    buildablePoints = new[] { new GridPoint { x = 3, y = 3 } }
                }
            };
            return layout;
        }

        static string[] RunSimpleCoreLoop(float speedMultiplier, int ticks)
        {
            GameEvents.ClearRuntimeListeners();
            var database = CreateDatabase();
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 100);
            var units = new UnitSystem(grid, energy, database.units);
            var waves = new WaveSystem(database.waves, database.units, units);
            var state = new GameStateManager();
            var events = new System.Collections.Generic.List<string>();

            GameEvents.OnWaveStarted += wave => events.Add($"wave:{wave}:start");
            GameEvents.OnUnitSpawned += unitId => events.Add($"spawn:{unitId}");
            GameEvents.OnUnitEscaped += unitId => events.Add($"escape:{unitId}");
            GameEvents.OnWaveCompleted += wave => events.Add($"wave:{wave}:complete");

            state.SetSpeedMultiplier(speedMultiplier);
            Assert.That(waves.Start(1), Is.True);

            for (var i = 0; i < ticks; i++)
            {
                var scaledDelta = state.Tick(0.02f);
                energy.Tick(scaledDelta);
                waves.Tick(scaledDelta);
                units.Tick(scaledDelta);
            }

            return events.ToArray();
        }
    }
}
