// SOShapeTests.cs — EditMode tests for ScriptableObject schemas (Phase 1 Task 3).
// These tests verify that SO asset instances exist and have valid field values once
// Task 4's JsonToSOImporter has run. Before that, tests gracefully fall back to
// Assert.Inconclusive so the test run does not fail pre-import.

using System;
using GLD.Data;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace GLD.Tests.EditMode
{
    public class SOShapeTests
    {
        // ─── Tower Catalog ────────────────────────────────────────────────────

        [Test]
        public void TowerCatalogSO_HasTowersWithRequiredFields()
        {
            var guids = AssetDatabase.FindAssets("t:TowerCatalogSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No TowerCatalogSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<TowerCatalogSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so, "TowerCatalogSO asset loaded as null.");
            Assert.IsNotNull(so.towers, "TowerCatalogSO.towers array is null.");
            Assert.Greater(so.towers.Length, 0, "TowerCatalogSO.towers is empty.");

            foreach (var t in so.towers)
            {
                Assert.IsNotNull(t, "TowerCatalogSO contains null TowerDefSO entry.");
                Assert.IsFalse(string.IsNullOrEmpty(t.id), $"TowerDefSO has empty id.");
                Assert.IsTrue(Enum.IsDefined(typeof(TowerFamily), t.family),
                    $"TowerDefSO '{t.id}' has invalid family enum value.");
                Assert.IsTrue(Enum.IsDefined(typeof(Element), t.element),
                    $"TowerDefSO '{t.id}' has invalid element enum value.");
                Assert.Greater(t.tier, 0, $"TowerDefSO '{t.id}' tier must be > 0.");
                Assert.Greater(t.stats.damage, 0f, $"TowerDefSO '{t.id}' damage must be > 0.");
            }
        }

        // ─── Unit Catalog ─────────────────────────────────────────────────────

        [Test]
        public void UnitCatalogSO_HasUnitsWithRequiredFields()
        {
            var guids = AssetDatabase.FindAssets("t:UnitCatalogSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No UnitCatalogSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<UnitCatalogSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.units, "UnitCatalogSO.units array is null.");
            Assert.Greater(so.units.Length, 0, "UnitCatalogSO.units is empty.");
            Assert.Greater(so.minMoveSpeed, 0f, "UnitCatalogSO.minMoveSpeed must be > 0.");
            Assert.Greater(so.stunImmunityWindowMs, 0f, "UnitCatalogSO.stunImmunityWindowMs must be > 0.");

            foreach (var u in so.units)
            {
                Assert.IsNotNull(u, "UnitCatalogSO contains null UnitDefSO entry.");
                Assert.IsFalse(string.IsNullOrEmpty(u.id), "UnitDefSO has empty id.");
                Assert.IsTrue(Enum.IsDefined(typeof(Element), u.element),
                    $"UnitDefSO '{u.id}' has invalid element enum value.");
                Assert.Greater(u.stats.hp, 0, $"UnitDefSO '{u.id}' hp must be > 0.");
            }
        }

        // ─── Wave Catalog ─────────────────────────────────────────────────────

        [Test]
        public void WaveCatalogSO_HasWavesWithRequiredFields()
        {
            var guids = AssetDatabase.FindAssets("t:WaveCatalogSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No WaveCatalogSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<WaveCatalogSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.waves, "WaveCatalogSO.waves array is null.");
            Assert.Greater(so.waves.Length, 0, "WaveCatalogSO.waves is empty.");

            foreach (var w in so.waves)
            {
                Assert.IsNotNull(w, "WaveCatalogSO contains null WaveDefSO entry.");
                Assert.Greater(w.slotIndex, 0, "WaveDefSO.slotIndex must be > 0.");
                Assert.IsTrue(Enum.IsDefined(typeof(WaveKind), w.kind),
                    $"WaveDefSO slot {w.slotIndex} has invalid kind enum value.");
                Assert.IsNotNull(w.groups, $"WaveDefSO slot {w.slotIndex} groups is null.");
                Assert.Greater(w.groups.Length, 0, $"WaveDefSO slot {w.slotIndex} has no groups.");
            }
        }

        // ─── Upgrade Card Catalog ─────────────────────────────────────────────

        [Test]
        public void UpgradeCardCatalogSO_HasCardsWithRequiredFields()
        {
            var guids = AssetDatabase.FindAssets("t:UpgradeCardCatalogSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No UpgradeCardCatalogSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<UpgradeCardCatalogSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.cards, "UpgradeCardCatalogSO.cards is null.");
            Assert.Greater(so.cards.Length, 0, "UpgradeCardCatalogSO.cards is empty.");

            foreach (var c in so.cards)
            {
                Assert.IsNotNull(c, "UpgradeCardCatalogSO contains null UpgradeCardSO entry.");
                Assert.IsTrue(Enum.IsDefined(typeof(UpgradeCardType), c.id),
                    $"UpgradeCardSO has invalid id enum value.");
                Assert.IsTrue(Enum.IsDefined(typeof(StackType), c.stackType),
                    $"UpgradeCardSO '{c.id}' has invalid stackType.");
                Assert.IsFalse(string.IsNullOrEmpty(c.name), $"UpgradeCardSO '{c.id}' name is empty.");
            }
        }

        // ─── Gacha Config ─────────────────────────────────────────────────────

        [Test]
        public void GachaConfigSO_HasValidData()
        {
            var guids = AssetDatabase.FindAssets("t:GachaConfigSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No GachaConfigSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<GachaConfigSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.Greater(so.pityThreshold, 0, "GachaConfigSO.pityThreshold must be > 0.");
            Assert.IsNotNull(so.costs, "GachaConfigSO.costs is null.");
            Assert.Greater(so.costs.Length, 0, "GachaConfigSO.costs is empty.");
        }

        // ─── Energy Config ────────────────────────────────────────────────────

        [Test]
        public void EnergyConfigSO_HasValidData()
        {
            var guids = AssetDatabase.FindAssets("t:EnergyConfigSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No EnergyConfigSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<EnergyConfigSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.Greater(so.energyCap, 0, "EnergyConfigSO.energyCap must be > 0.");
            Assert.Greater(so.energyPerKill, 0, "EnergyConfigSO.energyPerKill must be > 0.");
            Assert.IsNotNull(so.ingameGacha, "EnergyConfigSO.ingameGacha is null.");
        }

        // ─── Boss Config ──────────────────────────────────────────────────────

        [Test]
        public void BossConfigSO_HasValidData()
        {
            var guids = AssetDatabase.FindAssets("t:BossConfigSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No BossConfigSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<BossConfigSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.Greater(so.phaseTransitionRatio, 0f, "BossConfigSO.phaseTransitionRatio must be > 0.");
            Assert.Greater(so.phase2SpeedMultiplier, 1f, "BossConfigSO.phase2SpeedMultiplier must be > 1.");
        }

        // ─── Scaling Config ───────────────────────────────────────────────────

        [Test]
        public void ScalingConfigSO_HasTenWaveScalingEntries()
        {
            var guids = AssetDatabase.FindAssets("t:ScalingConfigSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No ScalingConfigSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<ScalingConfigSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.waveScaling);
            Assert.AreEqual(10, so.waveScaling.Length, "ScalingConfigSO.waveScaling must have exactly 10 entries.");
        }

        // ─── Family Upgrade Config ────────────────────────────────────────────

        [Test]
        public void FamilyUpgradeConfigSO_HasValidData()
        {
            var guids = AssetDatabase.FindAssets("t:FamilyUpgradeConfigSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No FamilyUpgradeConfigSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<FamilyUpgradeConfigSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.Greater(so.maxFamilyUpgradeLevel, 0, "FamilyUpgradeConfigSO.maxFamilyUpgradeLevel must be > 0.");
            Assert.IsNotNull(so.upgradeableFamilies, "FamilyUpgradeConfigSO.upgradeableFamilies is null.");
            Assert.Greater(so.upgradeableFamilies.Length, 0, "FamilyUpgradeConfigSO.upgradeableFamilies is empty.");
        }

        // ─── Element Matchup ──────────────────────────────────────────────────

        [Test]
        public void ElementMatchupSO_HasValidData()
        {
            var guids = AssetDatabase.FindAssets("t:ElementMatchupSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No ElementMatchupSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<ElementMatchupSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.rows, "ElementMatchupSO.rows is null.");
            Assert.Greater(so.rows.Length, 0, "ElementMatchupSO.rows is empty.");

            // Fire vs Water should be > 1 (fire loses to water)
            float mult = so.GetMultiplier("fire", "water");
            Assert.Less(mult, 1f, "fire vs water multiplier should be < 1 (fire weak to water).");
        }

        // ─── Map Layout ───────────────────────────────────────────────────────

        [Test]
        public void MapLayoutSO_HasMainLongMap()
        {
            var guids = AssetDatabase.FindAssets("t:MapLayoutSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No MapLayoutSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<MapLayoutSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.maps, "MapLayoutSO.maps is null.");
            Assert.Greater(so.maps.Length, 0, "MapLayoutSO.maps is empty.");

            var mainLong = so.FindById("main_long");
            Assert.IsFalse(string.IsNullOrEmpty(mainLong.id), "MapLayoutSO should contain 'main_long' map.");
            Assert.Greater(mainLong.path.Length, 0, "main_long map path must not be empty.");
        }

        // ─── Summon Pool ──────────────────────────────────────────────────────

        [Test]
        public void SummonPoolSO_HasValidData()
        {
            var guids = AssetDatabase.FindAssets("t:SummonPoolSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No SummonPoolSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<SummonPoolSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.entries, "SummonPoolSO.entries is null.");
            Assert.Greater(so.entries.Length, 0, "SummonPoolSO.entries is empty.");
            Assert.IsNotNull(so.towerIds, "SummonPoolSO.towerIds is null.");
        }

        // ─── Design Tokens ────────────────────────────────────────────────────

        [Test]
        public void DesignTokensSO_HasValidData()
        {
            var guids = AssetDatabase.FindAssets("t:DesignTokensSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No DesignTokensSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<DesignTokensSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsFalse(string.IsNullOrEmpty(so.palette.core.accent),
                "DesignTokensSO.palette.core.accent must not be empty.");
            Assert.IsNotNull(so.typography, "DesignTokensSO.typography is null.");
            Assert.Greater(so.typography.Length, 0, "DesignTokensSO.typography is empty.");
        }

        // ─── Merge Chain ──────────────────────────────────────────────────────

        [Test]
        public void MergeChainSO_HasValidRules()
        {
            var guids = AssetDatabase.FindAssets("t:MergeChainSO");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No MergeChainSO assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var so = AssetDatabase.LoadAssetAtPath<MergeChainSO>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(so);
            Assert.IsNotNull(so.rules, "MergeChainSO.rules is null.");
            Assert.Greater(so.rules.Length, 0, "MergeChainSO.rules is empty.");

            // Bidirectional lookup: arcane_spire + celestial = hybrid_ab
            string result = so.Resolve("arcane_spire", "celestial");
            Assert.AreEqual("hybrid_ab", result, "arcane_spire + celestial should resolve to hybrid_ab.");
            string resultReversed = so.Resolve("celestial", "arcane_spire");
            Assert.AreEqual("hybrid_ab", resultReversed, "celestial + arcane_spire should also resolve to hybrid_ab (bidirectional).");
        }

        // ─── GameDatabase ─────────────────────────────────────────────────────

        [Test]
        public void GameDatabase_HasAllCatalogReferences()
        {
            var guids = AssetDatabase.FindAssets("t:GameDatabase");
            if (guids.Length == 0)
            {
                Assert.Inconclusive("No GameDatabase assets found. Run GLD/Import Shared Data first.");
                return;
            }

            var db = AssetDatabase.LoadAssetAtPath<GameDatabase>(AssetDatabase.GUIDToAssetPath(guids[0]));
            Assert.IsNotNull(db);
            Assert.IsNotNull(db.towers,         "GameDatabase.towers is null.");
            Assert.IsNotNull(db.units,          "GameDatabase.units is null.");
            Assert.IsNotNull(db.waves,          "GameDatabase.waves is null.");
            Assert.IsNotNull(db.upgrades,       "GameDatabase.upgrades is null.");
            Assert.IsNotNull(db.summonPool,     "GameDatabase.summonPool is null.");
            Assert.IsNotNull(db.gacha,          "GameDatabase.gacha is null.");
            Assert.IsNotNull(db.energy,         "GameDatabase.energy is null.");
            Assert.IsNotNull(db.scaling,        "GameDatabase.scaling is null.");
            Assert.IsNotNull(db.familyUpgrade,  "GameDatabase.familyUpgrade is null.");
            Assert.IsNotNull(db.elementMatchup, "GameDatabase.elementMatchup is null.");
            Assert.IsNotNull(db.boss,           "GameDatabase.boss is null.");
            Assert.IsNotNull(db.map,            "GameDatabase.map is null.");
            Assert.IsNotNull(db.designTokens,   "GameDatabase.designTokens is null.");
            Assert.IsNotNull(db.mergeChain,     "GameDatabase.mergeChain is null.");
        }
    }
}
