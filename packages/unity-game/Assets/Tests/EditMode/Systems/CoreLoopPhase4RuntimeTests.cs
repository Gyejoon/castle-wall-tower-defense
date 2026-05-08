using GLD.Core;
using GLD.Core.Random;
using GLD.Data;
using GLD.Systems.Energy;
using GLD.Systems.Gacha;
using GLD.Systems.Grid;
using GLD.Systems.Merge;
using GLD.Systems.Orchestrator;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using GLD.Systems.Upgrade;
using GLD.Systems.Waves;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Systems
{
    public sealed class CoreLoopPhase4RuntimeTests
    {
        [TearDown]
        public void TearDown()
        {
            GameEvents.ClearRuntimeListeners();
        }

        [Test]
        public void MergeSystemResolvesSameFamilyHybridAndUltimatePaths()
        {
            var database = CreateDatabase();
            database.towers.FindById("archer").sameFamilyMergeTargetId = "";

            Assert.That(MergeSystem.Resolve(
                database.towers.FindById("archer"),
                database.towers.FindById("archer"),
                database.towers,
                database.mergeChain).Output.id, Is.EqualTo("wind_spire"));

            Assert.That(MergeSystem.Resolve(
                database.towers.FindById("arcane_spire"),
                database.towers.FindById("celestial"),
                database.towers,
                database.mergeChain).Output.id, Is.EqualTo("hybrid_ab"));

            Assert.That(MergeSystem.Resolve(
                database.towers.FindById("hybrid_ab"),
                database.towers.FindById("hybrid_cd"),
                database.towers,
                database.mergeChain).Output.id, Is.EqualTo("ultimate"));

            Assert.That(MergeSystem.Resolve(
                database.towers.FindById("archer"),
                database.towers.FindById("fortress"),
                database.towers,
                database.mergeChain).Success, Is.False);
        }

        [Test]
        public void GachaDistributionMatchesConfiguredSuccessRate()
        {
            var database = CreateDatabase();
            var rng = new DeterministicRng(42);
            var success = 0;
            const int rolls = 100000;

            for (var i = 0; i < rolls; i++)
            {
                var tower = GachaSystem.Draw(database.towers, database.energy, 2, rng);
                if (tower.tier == 2)
                    success++;
            }

            var observed = success / (float)rolls;
            Assert.That(observed, Is.InRange(0.595f, 0.605f));
        }

        [Test]
        public void UpgradeCardSystemOffersDistinctCardsAndCapsStacks()
        {
            var database = CreateDatabase();
            var upgrades = new UpgradeCardSystem(database.upgrades);
            var offered = upgrades.Offer(3, new DeterministicRng(12345));

            Assert.That(offered.Count, Is.EqualTo(3));
            Assert.That(offered[0].id, Is.Not.EqualTo(offered[1].id));
            Assert.That(offered[1].id, Is.Not.EqualTo(offered[2].id));

            for (var i = 0; i < 20; i++)
                upgrades.Apply(UpgradeCardType.TierOddsUp);

            Assert.That(upgrades.GetStacks(UpgradeCardType.TierOddsUp), Is.EqualTo(UpgradeCardSystem.MaxStacks));
            Assert.That(upgrades.TierOddsBonus, Is.EqualTo(0.5f).Within(0.0001f));
        }

        [Test]
        public void CoreOrchestratorHandlesMergeGachaUpgradeAndGachaCancelCache()
        {
            var database = CreateDatabase();
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 200);
            var units = new UnitSystem(grid, energy, database.units, database.boss);
            var towers = new TowerSystem(grid, energy, units);
            var waves = new WaveSystem(database.waves, database.units, units);
            var mergedTowerId = string.Empty;
            var appliedStacks = 0;

            using (var orchestrator = new CoreOrchestrator(database, towers, waves, energy: energy))
            {
                orchestrator.Enable();
                towers.Place(database.towers.FindById("archer"), new GridCell(3, 3), false);
                towers.Place(database.towers.FindById("archer"), new GridCell(5, 3), false);
                GameEvents.OnTowersMerged += (_, _, towerId, _) => mergedTowerId = towerId;

                GameEvents.RaiseRequestMerge(new TowerMergeRequest(3, 3, 5, 3));
                Assert.That(mergedTowerId, Is.EqualTo("wind_spire"));
                Assert.That(towers.GetAt(new GridCell(5, 3)).Def.id, Is.EqualTo("wind_spire"));

                GameEvents.RaiseRequestGacha(new GachaRequest(2));
                var firstDraw = orchestrator.PendingSummonTowerId;
                GameEvents.RaiseRequestCancelSummon();
                GameEvents.RaiseRequestGacha(new GachaRequest(2));
                Assert.That(orchestrator.PendingSummonTowerId, Is.EqualTo(firstDraw));

                GameEvents.OnUpgradeApplied += (_, stacks) => appliedStacks = stacks;
                GameEvents.RaiseRequestUpgradePick("dmg_up");
                Assert.That(appliedStacks, Is.EqualTo(1));
                Assert.That(towers.RuntimeDamageMultiplier, Is.EqualTo(1.2f).Within(0.0001f));
            }
        }

        [Test]
        public void BossBehaviorsMatchPhaserTriggers()
        {
            var database = CreateDatabase();
            var grid = new GridManager(CreateMapLayout());
            var energy = new EnergySystem(initial: 200);
            var units = new UnitSystem(grid, energy, database.units, database.boss);
            var towers = new TowerSystem(grid, energy, units);
            towers.Place(database.towers.FindById("archer"), new GridCell(3, 3), false);

            var orc = units.SpawnById("orc_warlord");
            units.ApplyDamage(orc, 1100);
            Assert.That(orc.Boss.Phase, Is.EqualTo(2));
            Assert.That(units.Units.Count, Is.EqualTo(5));

            var before = towers.Towers[0].DisabledUntilSeconds;
            var forge = units.SpawnById("forge_master");
            units.Tick(10.1f);
            Assert.That(towers.Towers[0].DisabledUntilSeconds, Is.GreaterThan(before));

            var corrupted = units.SpawnById("corrupted_archmage");
            Assert.That(units.Units[units.Units.Count - 1].IsClone, Is.True);
            Assert.That(corrupted.BossBehavior.IsCcImmune(), Is.True);

            var dragon = units.SpawnById("dragon");
            var countBeforeDragon = units.Units.Count;
            units.ApplyDamage(dragon, 25000);
            Assert.That(units.Units.Count, Is.EqualTo(countBeforeDragon + 3));
            units.Tick(0.6f);
            units.ApplyDamage(dragon, 25000);
            Assert.That(units.Units.Count, Is.EqualTo(countBeforeDragon + 9));
        }

        static GameDatabase CreateDatabase()
        {
            var database = ScriptableObject.CreateInstance<GameDatabase>();
            database.towers = CreateTowerCatalog();
            database.units = CreateUnitCatalog();
            database.waves = CreateWaveCatalog();
            database.energy = CreateEnergyConfig();
            database.boss = CreateBossConfig();
            database.mergeChain = CreateMergeChain();
            database.upgrades = CreateUpgradeCatalog();
            database.summonPool = ScriptableObject.CreateInstance<SummonPoolSO>();
            database.summonPool.entries = new[] { new SummonPoolEntry { towerId = "archer", weight = 1 } };
            return database;
        }

        static TowerCatalogSO CreateTowerCatalog()
        {
            var catalog = ScriptableObject.CreateInstance<TowerCatalogSO>();
            catalog.towers = new[]
            {
                Tower("archer", TowerFamily.Archer, 1, "wind_spire"),
                Tower("wind_spire", TowerFamily.Archer, 2, "flame_tower"),
                Tower("flame_tower", TowerFamily.Archer, 3, "arcane_spire"),
                Tower("arcane_spire", TowerFamily.Archer, 4, null),
                Tower("nova_cannon", TowerFamily.Siege, 1, "fortress"),
                Tower("fortress", TowerFamily.Siege, 2, "earth_golem"),
                Tower("earth_golem", TowerFamily.Siege, 3, "celestial"),
                Tower("celestial", TowerFamily.Siege, 4, null),
                Tower("emp", TowerFamily.Frost, 1, "stasis_field"),
                Tower("stasis_field", TowerFamily.Frost, 2, "disruptor"),
                Tower("disruptor", TowerFamily.Frost, 3, "world_tree"),
                Tower("world_tree", TowerFamily.Frost, 4, null),
                Tower("shield", TowerFamily.Stun, 1, "twin_archer"),
                Tower("twin_archer", TowerFamily.Stun, 2, "holy_shrine"),
                Tower("holy_shrine", TowerFamily.Stun, 3, "divine_throne"),
                Tower("divine_throne", TowerFamily.Stun, 4, null),
                Tower("hybrid_ab", TowerFamily.Hybrid, 5, null),
                Tower("hybrid_cd", TowerFamily.Hybrid, 5, null),
                Tower("ultimate", TowerFamily.Ultimate, 6, null)
            };
            return catalog;
        }

        static TowerDefSO Tower(string id, TowerFamily family, int tier, string sameFamilyTarget)
        {
            var tower = ScriptableObject.CreateInstance<TowerDefSO>();
            tower.id = id;
            tower.family = family;
            tower.tier = tier;
            tower.cost = 10;
            tower.sameFamilyMergeTargetId = sameFamilyTarget;
            tower.stats = new TowerStats { damage = 20, range = 20, attackSpeed = 1 };
            return tower;
        }

        static UnitCatalogSO CreateUnitCatalog()
        {
            var catalog = ScriptableObject.CreateInstance<UnitCatalogSO>();
            catalog.minMoveSpeed = 0.15f;
            catalog.stunImmunityWindowMs = 2000;
            catalog.units = new[]
            {
                Unit("scout", 10, 1),
                Unit("battle_robot", 80, 1),
                Unit("flame_imp", 80, 1),
                Unit("orc_warlord", 2000, 0.8f, "orc_warlord", 0.5f),
                Unit("forge_master", 5000, 0.7f, "forge_master", 0.7f),
                Unit("corrupted_archmage", 25000, 0.8f, "corrupted_archmage", 0.7f),
                Unit("dragon", 60000, 0.6f, "dragon", 0.8f)
            };
            return catalog;
        }

        static UnitDefSO Unit(string id, int hp, float speed, string bossBehaviorId = null, float bossCcResist = 0f)
        {
            var unit = ScriptableObject.CreateInstance<UnitDefSO>();
            unit.id = id;
            unit.stats = new UnitStats { hp = hp, speed = speed, armor = 0 };
            unit.bossBehaviorId = bossBehaviorId;
            unit.bossCcResist = bossCcResist;
            return unit;
        }

        static WaveCatalogSO CreateWaveCatalog()
        {
            var wave = ScriptableObject.CreateInstance<WaveDefSO>();
            wave.slotIndex = 1;
            wave.groups = new[] { new WaveGroup { unitId = "scout", count = 1, hpMultiplier = 1f } };
            var catalog = ScriptableObject.CreateInstance<WaveCatalogSO>();
            catalog.waves = new[] { wave };
            return catalog;
        }

        static EnergyConfigSO CreateEnergyConfig()
        {
            var config = ScriptableObject.CreateInstance<EnergyConfigSO>();
            config.energyMax = 200;
            config.initialEnergy = 40;
            config.energyPerSecond = 1f;
            config.energyPerKill = 1;
            config.energyPerBossKill = 20;
            config.ingameGacha = new[]
            {
                new IngameGachaTierEntry { tier = 2, cost = 40, successRate = 0.6f },
                new IngameGachaTierEntry { tier = 3, cost = 80, successRate = 0.2f },
                new IngameGachaTierEntry { tier = 4, cost = 160, successRate = 0.05f }
            };
            return config;
        }

        static BossConfigSO CreateBossConfig()
        {
            var config = ScriptableObject.CreateInstance<BossConfigSO>();
            config.phaseTransitionRatio = 0.5f;
            config.phase3TransitionRatio = 0.25f;
            config.invulnerabilityMs = 500;
            config.phase2SpeedMultiplier = 1.15f;
            config.phase3SpeedMultiplier = 1.35f;
            return config;
        }

        static MergeChainSO CreateMergeChain()
        {
            var chain = ScriptableObject.CreateInstance<MergeChainSO>();
            chain.rules = new[]
            {
                new MergeRule { inputA = "archer_1_same", inputB = "", output = "wind_spire" },
                new MergeRule { inputA = "arcane_spire", inputB = "celestial", output = "hybrid_ab" },
                new MergeRule { inputA = "world_tree", inputB = "divine_throne", output = "hybrid_cd" },
                new MergeRule { inputA = "hybrid_ab", inputB = "hybrid_cd", output = "ultimate" }
            };
            return chain;
        }

        static UpgradeCardCatalogSO CreateUpgradeCatalog()
        {
            var catalog = ScriptableObject.CreateInstance<UpgradeCardCatalogSO>();
            catalog.cards = new[]
            {
                Card(UpgradeCardType.DmgUp, StackType.Multiply, 1.2f),
                Card(UpgradeCardType.CritDmg, StackType.Add, 0.25f),
                Card(UpgradeCardType.EnergyHarvest, StackType.Add, 1f),
                Card(UpgradeCardType.EnergyRegen, StackType.Add, 2f, 5000, 2),
                Card(UpgradeCardType.EffectAmp, StackType.Multiply, 1.25f),
                Card(UpgradeCardType.TierOddsUp, StackType.Add, 0.05f)
            };
            return catalog;
        }

        static UpgradeCardSO Card(UpgradeCardType id, StackType stackType, float value, int interval = 0, int amount = 0)
        {
            var card = ScriptableObject.CreateInstance<UpgradeCardSO>();
            card.id = id;
            card.name = id.ToString();
            card.description = id.ToString();
            card.icon = "*";
            card.stackType = stackType;
            card.value = value;
            card.interval = interval;
            card.amount = amount;
            return card;
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
                    buildablePoints = new[]
                    {
                        new GridPoint { x = 3, y = 3 },
                        new GridPoint { x = 5, y = 3 }
                    }
                }
            };
            return layout;
        }
    }
}
