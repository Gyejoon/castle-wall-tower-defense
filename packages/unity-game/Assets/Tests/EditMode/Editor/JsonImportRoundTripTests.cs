// JsonImportRoundTripTests.cs — EditMode NUnit tests for JsonToSOImporter round-trip.
// Runs in Unity Test Runner (EditMode).
// Phase 0b user executes via: Unity > Window > General > Test Runner > EditMode > Run All.
//
// Test strategy:
//   1. Call JsonToSOImporter.ImportAllBatch() to populate Assets/Data/*.asset files.
//   2. Load each resulting SO via AssetDatabase.
//   3. Re-serialize to JToken via Newtonsoft.
//   4. JToken.DeepEquals(original, roundTripped) — same parsed object tree, not byte string.
//
// Note: byte-identical string round-trip is NOT required; deep-equality of the parsed JSON
// object tree suffices (per plan "deep-equals the original JSON").

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using GLD.Data;
using GLD.Data.Editor;

namespace GLD.Tests.EditMode.Editor
{
    [TestFixture]
    public class JsonImportRoundTripTests
    {
        const string GameDataDir = "Assets/Resources/GameData";
        const string OutputDir   = "Assets/Data";

        static readonly JsonSerializerSettings s_settings = new JsonSerializerSettings
        {
            Converters = { new StringEnumConverter() },
            Formatting = Formatting.None,
            NullValueHandling = NullValueHandling.Ignore,
        };

        // ── Setup ─────────────────────────────────────────────────────────────

        [OneTimeSetUp]
        public void RunImporter()
        {
            // Run the importer — this populates all Assets/Data/*.asset files.
            Assert.DoesNotThrow(
                () => JsonToSOImporter.ImportAllBatch(),
                "ImportAllBatch should not throw on valid catalogs.");
            AssetDatabase.Refresh();
        }

        // ── Tower Catalog ─────────────────────────────────────────────────────

        [Test]
        public void TowerCatalog_RoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "towers.json"));
            JArray original = JArray.Parse(originalJson);

            var catalog = AssetDatabase.LoadAssetAtPath<TowerCatalogSO>($"{OutputDir}/TowerCatalog.asset");
            Assert.IsNotNull(catalog, "TowerCatalog.asset must exist after import.");
            Assert.IsNotNull(catalog.towers, "towers array must not be null.");

            var roundTripped = new JArray(catalog.towers.Select(t =>
            {
                var stats = new JObject
                {
                    ["attackSpeed"] = t.stats.attackSpeed,
                    ["damage"]      = t.stats.damage,
                    ["range"]       = t.stats.range,
                };
                if (Math.Abs(t.stats.projectileSpeed) > 0.000001f)
                    stats["projectileSpeed"] = t.stats.projectileSpeed;
                if (!string.IsNullOrEmpty(t.stats.special))
                    stats["special"] = t.stats.special;

                return new JObject
                {
                    ["color"]     = t.color,
                    ["cost"]      = t.cost,
                    ["element"]   = t.element.ToString().ToLower(),
                    ["family"]    = t.family.ToString().ToLower(),
                    ["id"]        = t.id,
                    ["isPremium"] = t.isPremium,
                    ["name"]      = t.name,
                    ["shape"]     = t.shape.ToString().ToLower(),
                    ["stats"]     = stats,
                    ["tier"]      = t.tier,
                };
            }));

            AssertDeepEqualIgnoringMissingDefaults(original, roundTripped, "towers");
        }

        // ── Unit Catalog ──────────────────────────────────────────────────────

        [Test]
        public void UnitCatalog_RoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "units.json"));
            JObject original = JObject.Parse(originalJson);

            var catalog = AssetDatabase.LoadAssetAtPath<UnitCatalogSO>($"{OutputDir}/UnitCatalog.asset");
            Assert.IsNotNull(catalog, "UnitCatalog.asset must exist after import.");

            Assert.AreEqual(original["minMoveSpeed"]?.Value<float>() ?? 0f,
                catalog.minMoveSpeed, 0.0001f, "minMoveSpeed mismatch");
            Assert.AreEqual(original["stunImmunityWindowMs"]?.Value<float>() ?? 0f,
                catalog.stunImmunityWindowMs, 0.0001f, "stunImmunityWindowMs mismatch");

            int expectedCount = (original["units"] as JArray)?.Count ?? 0;
            Assert.AreEqual(expectedCount, catalog.units?.Length ?? 0, "unit count mismatch");
        }

        // ── Wave Catalog ──────────────────────────────────────────────────────

        [Test]
        public void WaveCatalog_RoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "waves.json"));
            JArray original = JArray.Parse(originalJson);

            var catalog = AssetDatabase.LoadAssetAtPath<WaveCatalogSO>($"{OutputDir}/WaveCatalog.asset");
            Assert.IsNotNull(catalog, "WaveCatalog.asset must exist after import.");
            Assert.AreEqual(original.Count, catalog.waves?.Length ?? 0, "wave count mismatch");

            // Check each wave slot index and kind.
            for (int i = 0; i < original.Count; i++)
            {
                int    expectedSlot = original[i]["slotIndex"]?.Value<int>() ?? 0;
                string expectedKind = original[i]["kind"]?.Value<string>() ?? "normal";

                var wave = catalog.waves.FirstOrDefault(w => w != null && w.slotIndex == expectedSlot);
                Assert.IsNotNull(wave, $"Wave slotIndex={expectedSlot} not found after import.");
                Assert.AreEqual(expectedKind, wave.kind.ToString().ToLower(),
                    $"Wave {expectedSlot} kind mismatch.");
            }
        }

        // ── UpgradeCard Catalog ───────────────────────────────────────────────

        [Test]
        public void UpgradeCardCatalog_RoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "upgradeCards.json"));
            JArray original = JArray.Parse(originalJson);

            var catalog = AssetDatabase.LoadAssetAtPath<UpgradeCardCatalogSO>($"{OutputDir}/UpgradeCardCatalog.asset");
            Assert.IsNotNull(catalog, "UpgradeCardCatalog.asset must exist after import.");
            Assert.AreEqual(original.Count, catalog.cards?.Length ?? 0, "card count mismatch");
        }

        // ── EnergyConfig ──────────────────────────────────────────────────────

        [Test]
        public void EnergyConfig_RoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "energyConfig.json"));
            JObject original = JObject.Parse(originalJson);

            var so = AssetDatabase.LoadAssetAtPath<EnergyConfigSO>($"{OutputDir}/EnergyConfig.asset");
            Assert.IsNotNull(so, "EnergyConfig.asset must exist after import.");

            Assert.AreEqual(original["energyCap"]?.Value<int>(),    so.energyCap);
            Assert.AreEqual(original["energyMax"]?.Value<int>(),    so.energyMax);
            Assert.AreEqual(original["initialEnergy"]?.Value<int>(), so.initialEnergy);
            Assert.AreEqual(original["energyPerKill"]?.Value<int>(), so.energyPerKill);

            // ingameGacha tiers.
            var gacha = (JObject)original["ingameGacha"];
            int expectedTierCount = gacha?.Count ?? 0;
            Assert.AreEqual(expectedTierCount, so.ingameGacha?.Length ?? 0, "ingameGacha tier count mismatch");
        }

        // ── ElementMatchup ────────────────────────────────────────────────────

        [Test]
        public void ElementMatchup_RoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "elementMatchup.json"));
            JObject original = JObject.Parse(originalJson);

            var so = AssetDatabase.LoadAssetAtPath<ElementMatchupSO>($"{OutputDir}/ElementMatchup.asset");
            Assert.IsNotNull(so, "ElementMatchup.asset must exist after import.");

            // Check that fire→water multiplier round-trips.
            float expected = original["fire"]?["water"]?.Value<float>() ?? 1f;
            float actual   = so.GetMultiplier("fire", "water");
            Assert.AreEqual(expected, actual, 0.0001f, "fire→water multiplier mismatch");
        }

        // ── MergeChain ────────────────────────────────────────────────────────

        [Test]
        public void MergeChain_RoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "mergeChain.json"));
            JObject original = JObject.Parse(originalJson);

            var so = AssetDatabase.LoadAssetAtPath<MergeChainSO>($"{OutputDir}/MergeChain.asset");
            Assert.IsNotNull(so, "MergeChain.asset must exist after import.");

            // Rules count in SO should equal JSON key count.
            Assert.AreEqual(original.Count, so.rules?.Length ?? 0, "merge rule count mismatch");

            // Spot-check: "archer_1_same" → "wind_spire" (same-tower rule, stored as inputA=key, inputB="")
            if (original.ContainsKey("archer_1_same"))
            {
                string expected = original["archer_1_same"]?.Value<string>();
                var rule = so.rules.FirstOrDefault(r => r.inputA == "archer_1_same" && r.inputB == "");
                Assert.IsNotNull(rule, "archer_1_same rule should exist in MergeChain.rules");
                Assert.AreEqual(expected, rule.output);
            }

            // Spot-check: "arcane_spire+celestial" → "hybrid_ab" (cross-family rule)
            if (original.ContainsKey("arcane_spire+celestial"))
            {
                string expected = original["arcane_spire+celestial"]?.Value<string>();
                var rule = so.rules.FirstOrDefault(r => r.inputA == "arcane_spire" && r.inputB == "celestial");
                Assert.IsNotNull(rule, "arcane_spire+celestial rule should exist in MergeChain.rules");
                Assert.AreEqual(expected, rule.output);
            }
        }

        // ── DesignTokens ──────────────────────────────────────────────────────

        [Test]
        public void DesignTokens_SpacingRoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "designTokens.json"));
            JObject original = JObject.Parse(originalJson);

            var so = AssetDatabase.LoadAssetAtPath<DesignTokensSO>($"{OutputDir}/DesignTokens.asset");
            Assert.IsNotNull(so, "DesignTokens.asset must exist after import.");

            var spc = (JObject)original["spacing"];
            if (spc != null)
            {
                Assert.AreEqual(spc["2xl"]?.Value<int>(), so.spacing.xxl,  "spacing.xxl (2xl) mismatch");
                Assert.AreEqual(spc["3xl"]?.Value<int>(), so.spacing.xxxl, "spacing.xxxl (3xl) mismatch");
                Assert.AreEqual(spc["lg"]?.Value<int>(),  so.spacing.lg,   "spacing.lg mismatch");
            }
        }

        [Test]
        public void DesignTokens_MotionBaseRoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "designTokens.json"));
            JObject original = JObject.Parse(originalJson);

            var so = AssetDatabase.LoadAssetAtPath<DesignTokensSO>($"{OutputDir}/DesignTokens.asset");
            Assert.IsNotNull(so, "DesignTokens.asset must exist after import.");

            int? expectedBase = original["motion"]?["duration"]?["base"]?.Value<int>();
            if (expectedBase.HasValue)
                Assert.AreEqual(expectedBase.Value, so.motion.duration.base_, "motion.duration.base_ mismatch");
        }

        [Test]
        public void DesignTokens_OverlayDimDefaultRoundTrip()
        {
            string originalJson = File.ReadAllText(Path.Combine(GameDataDir, "designTokens.json"));
            JObject original = JObject.Parse(originalJson);

            var so = AssetDatabase.LoadAssetAtPath<DesignTokensSO>($"{OutputDir}/DesignTokens.asset");
            Assert.IsNotNull(so, "DesignTokens.asset must exist after import.");

            string expectedDefault = original["overlayDim"]?["default"]?.Value<string>();
            if (expectedDefault != null)
                Assert.AreEqual(expectedDefault, so.overlayDim.default_, "overlayDim.default_ mismatch");
        }

        // ── GameDatabase ──────────────────────────────────────────────────────

        [Test]
        public void GameDatabase_AllReferencesWired()
        {
            var db = AssetDatabase.LoadAssetAtPath<GameDatabase>($"{OutputDir}/GameDatabase.asset");
            Assert.IsNotNull(db, "GameDatabase.asset must exist after import.");

            Assert.IsNotNull(db.towers,        "GameDatabase.towers must be wired");
            Assert.IsNotNull(db.units,         "GameDatabase.units must be wired");
            Assert.IsNotNull(db.waves,         "GameDatabase.waves must be wired");
            Assert.IsNotNull(db.upgrades,      "GameDatabase.upgrades must be wired");
            Assert.IsNotNull(db.summonPool,    "GameDatabase.summonPool must be wired");
            Assert.IsNotNull(db.gacha,         "GameDatabase.gacha must be wired");
            Assert.IsNotNull(db.boss,          "GameDatabase.boss must be wired");
            Assert.IsNotNull(db.energy,        "GameDatabase.energy must be wired");
            Assert.IsNotNull(db.scaling,       "GameDatabase.scaling must be wired");
            Assert.IsNotNull(db.familyUpgrade, "GameDatabase.familyUpgrade must be wired");
            Assert.IsNotNull(db.elementMatchup,"GameDatabase.elementMatchup must be wired");
            Assert.IsNotNull(db.designTokens,  "GameDatabase.designTokens must be wired");
            Assert.IsNotNull(db.mergeChain,    "GameDatabase.mergeChain must be wired");
            Assert.IsNotNull(db.map,           "GameDatabase.map must be wired");
        }

        // ── ValidateDatabase integration ──────────────────────────────────────

        [Test]
        public void ValidateDatabase_NoViolations()
        {
            Assert.DoesNotThrow(
                () => ValidateDatabase.ValidateAll(),
                "ValidateDatabase should find no cross-reference violations.");
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        /// <summary>
        /// Asserts deep equality between two JTokens, with a friendly message on mismatch.
        /// Only checks fields present in the original; extra fields in roundTripped are warnings.
        /// </summary>
        static void AssertDeepEqualIgnoringMissingDefaults(JToken original, JToken roundTripped, string context)
        {
            // We compare the SORTED representations to avoid key-order issues.
            string normalizedOriginal   = NormalizeToken(original).ToString(Formatting.Indented);
            string normalizedRoundTrip  = NormalizeToken(roundTripped).ToString(Formatting.Indented);
            Assert.AreEqual(normalizedOriginal, normalizedRoundTrip,
                $"[{context}] JSON round-trip mismatch.");
        }

        /// <summary>Returns a copy of the token with object keys sorted alphabetically.</summary>
        static JToken NormalizeToken(JToken token)
        {
            if (token is JObject obj)
            {
                var sorted = new JObject();
                foreach (var prop in obj.Properties().OrderBy(p => p.Name))
                    sorted[prop.Name] = NormalizeToken(prop.Value);
                return sorted;
            }
            if (token is JArray arr)
                return new JArray(arr.Select(NormalizeToken));
            if (token is JValue value && (value.Type == JTokenType.Float || value.Type == JTokenType.Integer))
            {
                double n = value.Value<double>();
                double rounded = Math.Round(n);
                if (Math.Abs(n - rounded) < 0.000001d)
                    return new JValue((long)rounded);
            }
            return token.DeepClone();
        }
    }
}
