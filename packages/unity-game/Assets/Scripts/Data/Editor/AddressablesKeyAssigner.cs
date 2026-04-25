// AddressablesKeyAssigner.cs — Editor tool: reads manifest.json and assigns
// canonical Addressables keys + groups to matching assets in the project.
//
// Phase 1 Task 6 (automatable portion).
//
// NOT automated in this task:
//   - Creating the 5 AddressableAssetGroup .asset files via
//     Window → Asset Management → Addressables → Groups UI (Phase 0b).
//
// NOTE: manifest.json is NOT currently emitted by export-shared-to-json.ts.
// The manifest.ts source (packages/shared/src/assets/manifest.ts) contains
// only TypeScript type definitions — there is no ASSET_MANIFEST data constant.
// Task 6 is therefore partially BLOCKED until a data manifest is authored and
// the exporter is extended.  This assigner will fail-loud at runtime when
// manifest.json is absent, guiding the implementer to the follow-up.
//
// Groups expected (pre-created manually via Phase 0b):
//   Preload     — core sprites loaded at game start
//   Optional_UI — UI atlases loaded on-demand
//   Boss        — boss-specific assets
//   BGM         — background music clips
//   Default     — everything else / fallback
//
// Usage: GLD/Assign Addressables Keys

using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEngine;

namespace GLD.Data.Editor
{
    public static class AddressablesKeyAssigner
    {
        const string ManifestPath = "Assets/Resources/GameData/manifest.json";

        // Section → Addressables group name mapping (per design-decisions Q3-1).
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

        [MenuItem("GLD/Assign Addressables Keys")]
        public static void AssignKeysMenu()
        {
            try
            {
                AssignKeys();
                EditorUtility.DisplayDialog("GLD Addressables",
                    "Addressables key assignment complete. Check Console for summary.", "OK");
            }
            catch (Exception e)
            {
                EditorUtility.DisplayDialog("GLD Addressables FAILED", e.Message, "OK");
                throw;
            }
        }

        /// <summary>
        /// Assigns Addressables keys to all assets listed in manifest.json.
        /// Safe to call from batch/CI after groups exist.
        /// </summary>
        public static void AssignKeys()
        {
            // ── 1. Ensure Addressables is initialized ─────────────────────────
            var settings = AddressableAssetSettingsDefaultObject.GetSettings(false);
            if (settings == null)
                throw new InvalidOperationException(
                    "[GLD Addressables] Addressables not initialized. " +
                    "Create groups first via Window → Asset Management → Addressables → Groups.");

            // ── 2. Load manifest.json ─────────────────────────────────────────
            if (!File.Exists(ManifestPath))
                throw new FileNotFoundException(
                    "[GLD Addressables] manifest.json not found. " +
                    "Run `bun run build:unity-json` with manifest export enabled, OR " +
                    "author packages/shared/src/assets/manifest.ts data + extend " +
                    "scripts/export-shared-to-json.ts to emit manifest.json. " +
                    $"Expected path: {ManifestPath}");

            string json = File.ReadAllText(ManifestPath);
            AssetManifestJson manifest;
            try
            {
                manifest = JsonConvert.DeserializeObject<AssetManifestJson>(json);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    $"[GLD Addressables] Failed to parse {ManifestPath}: {ex.Message}", ex);
            }

            if (manifest?.assets == null || manifest.assets.Length == 0)
            {
                Debug.LogWarning("[GLD Addressables] manifest.json contains no assets. Nothing to assign.");
                return;
            }

            // ── 3. Process each manifest entry ────────────────────────────────
            int assigned = 0;
            int skipped  = 0;

            foreach (var entry in manifest.assets)
            {
                if (string.IsNullOrEmpty(entry.key) || string.IsNullOrEmpty(entry.path))
                {
                    Debug.LogWarning($"[GLD Addressables] Skipping malformed entry: key='{entry.key}' path='{entry.path}'");
                    skipped++;
                    continue;
                }

                // Derive Unity asset path from manifest path.
                // Manifest paths are relative to project root (e.g. "Assets/Art/Sprites/ui/hud-atlas.png").
                // Normalise to start with "Assets/".
                string assetPath = NormalizeAssetPath(entry.path);

                if (!File.Exists(assetPath) && !System.IO.Directory.Exists(assetPath))
                {
                    throw new FileNotFoundException(
                        $"[GLD Addressables] Manifest entry '{entry.key}' references missing asset: '{assetPath}'. " +
                        "Ensure the asset is imported before running Assign Addressables Keys.");
                }

                string assetGuid = AssetDatabase.AssetPathToGUID(assetPath);
                if (string.IsNullOrEmpty(assetGuid))
                    throw new InvalidOperationException(
                        $"[GLD Addressables] Could not get GUID for '{assetPath}'. " +
                        "The asset must be imported into the project.");

                // Determine group.
                string groupName = ResolveGroupName(entry.section);
                var group = settings.FindGroup(groupName);
                if (group == null)
                {
                    // Auto-create the group rather than hard-fail — user can rename/configure it later.
                    Debug.LogWarning(
                        $"[GLD Addressables] Group '{groupName}' not found. " +
                        "Creating it automatically. Prefer to pre-create groups manually " +
                        "via Window → Asset Management → Addressables → Groups for correct settings.");
                    group = settings.CreateGroup(groupName, setAsDefaultGroup: false,
                        readOnly: false, postEvent: false, schemasToCopy: null);
                }

                // Assign entry.
                var addrEntry = settings.CreateOrMoveEntry(assetGuid, group, readOnly: false, postEvent: false);
                addrEntry.address = entry.key;

                // Apply section label for filtering.
                if (!string.IsNullOrEmpty(entry.section))
                    addrEntry.SetLabel(entry.section, enable: true, force: true, postEvent: false);

                assigned++;
                Debug.Log($"[GLD Addressables] Assigned '{entry.key}' → group '{groupName}' ({assetPath})");
            }

            AssetDatabase.SaveAssets();
            Debug.Log($"[GLD Addressables] Done — {assigned} entries assigned, {skipped} skipped.");
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        static string NormalizeAssetPath(string rawPath)
        {
            // Handle paths that might be relative to the package root or start with "Assets/".
            if (rawPath.StartsWith("Assets/", StringComparison.OrdinalIgnoreCase))
                return rawPath;

            // Strip leading slash or "./" prefix.
            rawPath = rawPath.TrimStart('/').TrimStart('.');
            rawPath = rawPath.TrimStart('/');

            if (!rawPath.StartsWith("Assets/", StringComparison.OrdinalIgnoreCase))
                rawPath = "Assets/" + rawPath;

            return rawPath;
        }

        static string ResolveGroupName(string section)
        {
            if (!string.IsNullOrEmpty(section) && s_sectionToGroup.TryGetValue(section, out var g))
                return g;
            return "Default";
        }

        // ── JSON DTOs ─────────────────────────────────────────────────────────

        // Mirrors AssetManifest / AssetManifestEntry from manifest.ts.
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
            public int?   frameWidth;
            public int?   frameHeight;
            public int?   frameCount;
            public string polish;
        }
    }
}
