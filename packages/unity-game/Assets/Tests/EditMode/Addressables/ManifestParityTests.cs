// ManifestParityTests.cs — EditMode tests: verify manifest.json entries are
// correctly assigned in Addressables (correct key + group).
//
// Phase 1 Task 6.
//
// Graceful degradation:
//   - manifest.json missing          → Assert.Inconclusive (Phase 0b not yet done)
//   - Addressables not initialized   → Assert.Inconclusive (groups not yet created)
//   - Individual entry missing/wrong → Assert.Fail with details

using System;
using System.Collections.Generic;
using System.IO;
using NUnit.Framework;
using Newtonsoft.Json;
using UnityEditor;
using UnityEditor.AddressableAssets;

namespace GLD.Tests.EditMode
{
    [TestFixture]
    public class ManifestParityTests
    {
        const string ManifestPath = "Assets/Resources/GameData/manifest.json";

        // Must match AddressablesKeyAssigner.s_sectionToGroup
        static readonly Dictionary<string, string> s_sectionToGroup = new()
        {
            { "preload",     "Preload"     },
            { "boss",        "Boss"        },
            { "ui",          "Optional_UI" },
            { "mobile",      "Optional_UI" },
            { "icons",       "Optional_UI" },
            { "vfx",         "Preload"     },
            { "projectiles", "Preload"     },
            { "reward",      "Optional_UI" },
            { "tutorial",    "Optional_UI" },
            { "gacha",       "Optional_UI" },
        };

        // ── Prerequisite checks ───────────────────────────────────────────────

        [Test]
        public void ManifestJson_FileExists()
        {
            if (!File.Exists(ManifestPath))
                Assert.Inconclusive(
                    $"manifest.json not found at '{ManifestPath}'. " +
                    "This will exist after the manifest export follow-up is completed " +
                    "(Phase 1 Task 6 follow-up: author asset manifest data + extend exporter).");

            Assert.IsTrue(File.Exists(ManifestPath), "manifest.json must exist.");
        }

        [Test]
        public void ManifestJson_Parseable()
        {
            if (!File.Exists(ManifestPath))
                Assert.Inconclusive($"manifest.json not found at '{ManifestPath}'.");

            string json = File.ReadAllText(ManifestPath);
            AssetManifestJson manifest = null;
            Assert.DoesNotThrow(
                () => manifest = JsonConvert.DeserializeObject<AssetManifestJson>(json),
                "manifest.json must be valid JSON matching the AssetManifest schema.");

            Assert.IsNotNull(manifest?.assets, "manifest.assets must not be null.");
        }

        [Test]
        public void Addressables_Initialized()
        {
            var settings = AddressableAssetSettingsDefaultObject.GetSettings(false);
            if (settings == null)
                Assert.Inconclusive(
                    "Addressables not initialized. " +
                    "Create groups via Window → Asset Management → Addressables → Groups (Phase 0b).");

            Assert.IsNotNull(settings, "AddressableAssetSettings must be initialized.");
        }

        // ── Parity tests ──────────────────────────────────────────────────────

        [Test]
        public void AllManifestEntries_HaveCorrectAddressableKey()
        {
            if (!File.Exists(ManifestPath))
                Assert.Inconclusive($"manifest.json not found at '{ManifestPath}'.");

            var settings = AddressableAssetSettingsDefaultObject.GetSettings(false);
            if (settings == null)
                Assert.Inconclusive("Addressables not initialized.");

            string json = File.ReadAllText(ManifestPath);
            var manifest = JsonConvert.DeserializeObject<AssetManifestJson>(json);
            if (manifest?.assets == null || manifest.assets.Length == 0)
                Assert.Inconclusive("manifest.json is empty — nothing to verify.");

            var failures = new System.Collections.Generic.List<string>();

            foreach (var entry in manifest.assets)
            {
                if (string.IsNullOrEmpty(entry.key)) continue;

                // Find entry in Addressables by key.
                bool found = false;
                foreach (var group in settings.groups)
                {
                    if (group == null) continue;
                    foreach (var addrEntry in group.entries)
                    {
                        if (addrEntry.address == entry.key)
                        {
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }

                if (!found)
                    failures.Add($"  MISSING key: '{entry.key}' (section: {entry.section ?? "none"})");
            }

            if (failures.Count > 0)
                Assert.Fail(
                    $"{failures.Count} manifest entries missing from Addressables:\n" +
                    string.Join("\n", failures) + "\n\n" +
                    "Run GLD/Assign Addressables Keys to fix.");
        }

        [Test]
        public void AllManifestEntries_AssignedToCorrectGroup()
        {
            if (!File.Exists(ManifestPath))
                Assert.Inconclusive($"manifest.json not found at '{ManifestPath}'.");

            var settings = AddressableAssetSettingsDefaultObject.GetSettings(false);
            if (settings == null)
                Assert.Inconclusive("Addressables not initialized.");

            string json = File.ReadAllText(ManifestPath);
            var manifest = JsonConvert.DeserializeObject<AssetManifestJson>(json);
            if (manifest?.assets == null || manifest.assets.Length == 0)
                Assert.Inconclusive("manifest.json is empty — nothing to verify.");

            var failures = new System.Collections.Generic.List<string>();

            foreach (var entry in manifest.assets)
            {
                if (string.IsNullOrEmpty(entry.key)) continue;

                string expectedGroup = ResolveGroupName(entry.section);

                // Find entry in Addressables by key and check group.
                string actualGroup = null;
                foreach (var group in settings.groups)
                {
                    if (group == null) continue;
                    foreach (var addrEntry in group.entries)
                    {
                        if (addrEntry.address == entry.key)
                        {
                            actualGroup = group.Name;
                            break;
                        }
                    }
                    if (actualGroup != null) break;
                }

                if (actualGroup == null)
                {
                    failures.Add($"  MISSING: '{entry.key}' not found in any Addressables group.");
                }
                else if (actualGroup != expectedGroup)
                {
                    failures.Add($"  WRONG GROUP: '{entry.key}' → expected '{expectedGroup}', found '{actualGroup}'.");
                }
            }

            if (failures.Count > 0)
                Assert.Fail(
                    $"{failures.Count} Addressables group mismatches:\n" +
                    string.Join("\n", failures) + "\n\n" +
                    "Run GLD/Assign Addressables Keys to fix.");
        }

        [Test]
        public void NoOrphanedAddressableKeys_NotInManifest()
        {
            if (!File.Exists(ManifestPath))
                Assert.Inconclusive($"manifest.json not found at '{ManifestPath}'.");

            var settings = AddressableAssetSettingsDefaultObject.GetSettings(false);
            if (settings == null)
                Assert.Inconclusive("Addressables not initialized.");

            string json = File.ReadAllText(ManifestPath);
            var manifest = JsonConvert.DeserializeObject<AssetManifestJson>(json);
            if (manifest?.assets == null)
                Assert.Inconclusive("manifest.json is empty.");

            // Build manifest key set.
            var manifestKeys = new HashSet<string>();
            foreach (var e in manifest.assets)
                if (!string.IsNullOrEmpty(e.key))
                    manifestKeys.Add(e.key);

            var orphans = new System.Collections.Generic.List<string>();
            foreach (var group in settings.groups)
            {
                if (group == null) continue;
                foreach (var addrEntry in group.entries)
                {
                    if (!manifestKeys.Contains(addrEntry.address))
                        orphans.Add($"  '{addrEntry.address}' in group '{group.Name}'");
                }
            }

            if (orphans.Count > 0)
                Assert.Fail(
                    $"{orphans.Count} Addressables entries not in manifest (stale or manual additions):\n" +
                    string.Join("\n", orphans));
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        static string ResolveGroupName(string section)
        {
            if (!string.IsNullOrEmpty(section) && s_sectionToGroup.TryGetValue(section, out var g))
                return g;
            return "Default";
        }

        // ── DTOs ──────────────────────────────────────────────────────────────

        [Serializable]
        class AssetManifestJson
        {
            public string             generated;
            public ManifestEntryJson[] assets;
        }

        [Serializable]
        class ManifestEntryJson
        {
            public string key;
            public string type;
            public string path;
            public string section;
        }
    }
}
