// SOImportUtil.cs — Editor helper: FindOrCreate<T> pattern for GUID-stable SO assets.
// Batched dirty tracking: call RecordAndDirty per asset, then SaveAll once at end.
// Per design-decisions Q2-2.

using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace GLD.Data.Editor
{
    /// <summary>
    /// Utility class for creating or loading ScriptableObject assets with stable GUIDs.
    /// All dirty assets are tracked and saved together in a single AssetDatabase.SaveAssets call.
    /// </summary>
    public static class SOImportUtil
    {
        static readonly List<UnityEngine.Object> s_dirtyAssets = new List<UnityEngine.Object>();

        /// <summary>
        /// Finds an existing SO asset at <paramref name="assetPath"/> or creates a new one.
        /// GUID is preserved across reimports because we never delete-and-recreate.
        /// </summary>
        public static T FindOrCreate<T>(string assetPath) where T : ScriptableObject
        {
            // Ensure the directory exists.
            string dir = Path.GetDirectoryName(assetPath);
            if (!string.IsNullOrEmpty(dir) && !AssetDatabase.IsValidFolder(dir))
                CreateFolderRecursive(dir);

            var existing = AssetDatabase.LoadAssetAtPath<T>(assetPath);
            if (existing != null)
                return existing;

            var so = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(so, assetPath);
            return so;
        }

        /// <summary>
        /// Marks an asset dirty and queues it for the final batch save.
        /// </summary>
        public static void RecordAndDirty(UnityEngine.Object asset)
        {
            EditorUtility.SetDirty(asset);
            if (!s_dirtyAssets.Contains(asset))
                s_dirtyAssets.Add(asset);
        }

        /// <summary>
        /// Saves all dirty assets tracked since the last call to ClearDirtyList.
        /// </summary>
        public static void SaveAll()
        {
            AssetDatabase.SaveAssets();
            s_dirtyAssets.Clear();
        }

        /// <summary>
        /// Clears the dirty list without saving. Use at import start to reset state.
        /// </summary>
        public static void ClearDirtyList()
        {
            s_dirtyAssets.Clear();
        }

        // ── Internal Helpers ─────────────────────────────────────────────────

        static void CreateFolderRecursive(string folderPath)
        {
            // AssetDatabase.CreateFolder requires the parent to exist first.
            folderPath = folderPath.Replace('\\', '/');
            string[] parts = folderPath.Split('/');
            string current = parts[0]; // "Assets"
            for (int i = 1; i < parts.Length; i++)
            {
                string next = current + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(next))
                    AssetDatabase.CreateFolder(current, parts[i]);
                current = next;
            }
        }
    }
}
