using UnityEditor;
using UnityEngine;
using GLD.Core;
using GLD.Visual;

namespace GLD.Editor
{
    public static class SceneSetup
    {
        [MenuItem("GLD/Setup Game Scene")]
        public static void SetupGameScene()
        {
            // --- Ensure asset folders exist ---
            EnsureFolder("Assets/Prefabs");
            EnsureFolder("Assets/ScriptableObjects");
            EnsureFolder("Assets/ScriptableObjects/Towers");

            // -------------------------------------------------------
            // 1. GameObjects
            // -------------------------------------------------------

            // GameManager + GridManager
            var gameManagerGO = new GameObject("GameManager");
            var gridManager = gameManagerGO.AddComponent<GridManager>();
            gridManager.SpawnPoint = new Vector2Int(0, 10);
            gridManager.ExitPoint  = new Vector2Int(19, 10);

            // GridVisual + GridVisualizer
            var gridVisualGO = new GameObject("GridVisual");
            var gridVisualizer = gridVisualGO.AddComponent<GridVisualizer>();
            WireField(gridVisualizer, "_gridManager", gridManager);

            // TowerPlacer
            var towerPlacerGO = new GameObject("TowerPlacer");
            var towerPlacer = towerPlacerGO.AddComponent<TowerPlacer>();
            WireField(towerPlacer, "_gridManager", gridManager);

            // UnitSpawner
            var unitSpawnerGO = new GameObject("UnitSpawner");
            var unitSpawner = unitSpawnerGO.AddComponent<UnitSpawner>();
            WireField(unitSpawner, "_gridManager", gridManager);

            // WebBridge
            var webBridgeGO = new GameObject("WebBridge");
            webBridgeGO.AddComponent<GLD.Bridge.WebBridge>();

            // -------------------------------------------------------
            // 2. Prefabs
            // -------------------------------------------------------

            // Tower prefab
            var towerPrefab = CreateTowerPrefab();

            // Unit prefab
            var unitPrefab = CreateUnitPrefab();

            // Wire prefabs to TowerPlacer and UnitSpawner
            WireField(towerPlacer, "_towerPrefab", towerPrefab);
            WireField(unitSpawner, "_unitPrefab",  unitPrefab);

            // -------------------------------------------------------
            // 3. TowerData ScriptableObjects
            // -------------------------------------------------------

            var laser  = CreateTowerData("Laser",  "laser",  "Laser Turret",      1, 10f,  3f, 1.5f, 50, "#e2b714");
            var plasma = CreateTowerData("Plasma", "plasma", "Plasma Cannon",     1, 25f,  2f, 0.8f, 80, "#2cb67d");
            var emp    = CreateTowerData("EMP",    "emp",    "EMP Discharger",    1,  5f,  4f, 1.0f, 60, "#7f5af0");
            var shield = CreateTowerData("Shield", "shield", "Shield Generator",  1,  0f,  2f, 0.0f, 70, "#00ccff");

            // Wire all 4 TowerData assets to TowerPlacer._availableTowers
            var so = new SerializedObject(towerPlacer);
            var towersArrayProp = so.FindProperty("_availableTowers");
            towersArrayProp.arraySize = 4;
            towersArrayProp.GetArrayElementAtIndex(0).objectReferenceValue = laser;
            towersArrayProp.GetArrayElementAtIndex(1).objectReferenceValue = plasma;
            towersArrayProp.GetArrayElementAtIndex(2).objectReferenceValue = emp;
            towersArrayProp.GetArrayElementAtIndex(3).objectReferenceValue = shield;
            so.ApplyModifiedProperties();

            // -------------------------------------------------------
            // 4. Main Camera
            // -------------------------------------------------------
            ConfigureMainCamera();

            // -------------------------------------------------------
            // 5. Save assets and mark scene dirty
            // -------------------------------------------------------
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                UnityEngine.SceneManagement.SceneManager.GetActiveScene()
            );

            EditorUtility.DisplayDialog(
                "GLD Scene Setup Complete",
                "Game scene has been set up successfully!\n\n" +
                "GameObjects created:\n" +
                "  • GameManager (GridManager)\n" +
                "  • GridVisual  (GridVisualizer)\n" +
                "  • TowerPlacer (TowerPlacer)\n" +
                "  • UnitSpawner (UnitSpawner)\n" +
                "  • WebBridge   (WebBridge)\n\n" +
                "Prefabs created:\n" +
                "  • Assets/Prefabs/Tower.prefab\n" +
                "  • Assets/Prefabs/Unit.prefab\n\n" +
                "TowerData assets created:\n" +
                "  • Laser Turret, Plasma Cannon, EMP Discharger, Shield Generator\n\n" +
                "Camera configured (orthographic size 12, bg #16161a).\n\n" +
                "Remember to save the scene!",
                "OK"
            );
        }

        // -------------------------------------------------------
        // Helpers
        // -------------------------------------------------------

        private static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                string parent = System.IO.Path.GetDirectoryName(path);
                string folder = System.IO.Path.GetFileName(path);
                AssetDatabase.CreateFolder(parent, folder);
            }
        }

        /// <summary>
        /// Uses SerializedObject to assign a value to a private [SerializeField] field.
        /// </summary>
        private static void WireField(Object component, string fieldName, Object value)
        {
            var so = new SerializedObject(component);
            var prop = so.FindProperty(fieldName);
            if (prop == null)
            {
                Debug.LogWarning($"[SceneSetup] Field '{fieldName}' not found on {component.GetType().Name}");
                return;
            }
            prop.objectReferenceValue = value;
            so.ApplyModifiedProperties();
        }

        private static Sprite CreateWhiteSprite()
        {
            var tex = new Texture2D(1, 1);
            tex.SetPixel(0, 0, Color.white);
            tex.Apply();
            tex.filterMode = FilterMode.Point;
            return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
        }

        private static GameObject CreateTowerPrefab()
        {
            const string path = "Assets/Prefabs/Tower.prefab";

            var go = new GameObject("Tower");
            go.transform.localScale = new Vector3(0.8f, 0.8f, 1f);

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateWhiteSprite();
            sr.color  = Color.white;

            go.AddComponent<Tower>();

            var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
            Object.DestroyImmediate(go);
            return prefab;
        }

        private static GameObject CreateUnitPrefab()
        {
            const string path = "Assets/Prefabs/Unit.prefab";

            var go = new GameObject("Unit");
            go.transform.localScale = new Vector3(0.4f, 0.4f, 1f);

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreateWhiteSprite();
            sr.color  = new Color(1f, 0.3f, 0.3f, 1f); // red tint

            go.AddComponent<Unit>();

            var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
            Object.DestroyImmediate(go);
            return prefab;
        }

        private static TowerData CreateTowerData(
            string assetName, string id, string displayName,
            int tier, float damage, float range, float attackSpeed, int cost,
            string hexColor)
        {
            string assetPath = $"Assets/ScriptableObjects/Towers/{assetName}.asset";

            // Overwrite if already exists
            var existing = AssetDatabase.LoadAssetAtPath<TowerData>(assetPath);
            if (existing != null)
            {
                AssetDatabase.DeleteAsset(assetPath);
            }

            var data = ScriptableObject.CreateInstance<TowerData>();
            data.Id          = id;
            data.DisplayName = displayName;
            data.Tier        = tier;
            data.Damage      = damage;
            data.Range       = range;
            data.AttackSpeed = attackSpeed;
            data.Cost        = cost;

            if (ColorUtility.TryParseHtmlString(hexColor, out Color parsed))
                data.TowerColor = parsed;

            AssetDatabase.CreateAsset(data, assetPath);
            return data;
        }

        private static void ConfigureMainCamera()
        {
            var cam = Camera.main;
            if (cam == null)
            {
                // Create one if none exists
                var camGO = new GameObject("Main Camera");
                camGO.tag = "MainCamera";
                cam = camGO.AddComponent<Camera>();
                camGO.AddComponent<AudioListener>();
            }

            cam.orthographic     = true;
            cam.orthographicSize = 12f;
            cam.transform.position = new Vector3(0f, 0f, -10f);

            if (ColorUtility.TryParseHtmlString("#16161a", out Color bgColor))
                cam.backgroundColor = bgColor;
        }
    }
}
