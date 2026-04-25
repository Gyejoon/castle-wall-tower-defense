using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Data.Editor
{
    /// <summary>
    /// Phase 0 sentinel helper — creates the PanelSettings asset Phase0Root needs.
    /// Replaces the manual `Create > UI Toolkit > Panel Settings Asset` step that
    /// some Unity 6 menu layouts hide. Runs only when invoked; idempotent.
    /// Removed when Phase 2 PoC vertical slice lands a real PanelSettings layer.
    /// </summary>
    public static class Phase0PanelSettingsCreator
    {
        const string AssetPath = "Assets/UI/Runtime/PhaseZeroPanelSettings.asset";

        [MenuItem("GLD/Create Phase0 PanelSettings")]
        public static void Create()
        {
            var existing = AssetDatabase.LoadAssetAtPath<PanelSettings>(AssetPath);
            if (existing != null)
            {
                Selection.activeObject = existing;
                EditorGUIUtility.PingObject(existing);
                Debug.Log($"[GLD] {AssetPath} already exists. Selected in Project window.");
                return;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(AssetPath));

            var settings = ScriptableObject.CreateInstance<PanelSettings>();
            settings.scaleMode = PanelScaleMode.ScaleWithScreenSize;
            settings.referenceResolution = new Vector2Int(512, 1152);
            settings.match = 0f;
            settings.screenMatchMode = PanelScreenMatchMode.MatchWidthOrHeight;

            AssetDatabase.CreateAsset(settings, AssetPath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Selection.activeObject = settings;
            EditorGUIUtility.PingObject(settings);

            Debug.Log(
                $"[GLD] Created {AssetPath} (ScaleMode=ScaleWithScreenSize, " +
                $"ReferenceResolution=512x1152, Match=0)."
            );
        }
    }
}
