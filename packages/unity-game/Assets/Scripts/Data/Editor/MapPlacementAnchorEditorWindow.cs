using System;
using System.Collections.Generic;
using GLD.Data;
using UnityEditor;
using UnityEngine;

namespace GLD.Data.Editor
{
    public sealed class MapPlacementAnchorEditorWindow : EditorWindow
    {
        const string DefaultMapLayoutPath = "Assets/Data/MapLayout.asset";
        const float DefaultCellSize = 1f;

        [SerializeField] MapLayoutSO mapLayout;
        [SerializeField] int mapIndex;
        [SerializeField] bool showBuildableCells = true;
        [SerializeField] bool showMissingAnchors = true;
        [SerializeField] bool showAnchorLabels = true;

        Vector2 _scroll;

        [MenuItem("GLD/Map Placement Anchors")]
        public static void Open()
        {
            GetWindow<MapPlacementAnchorEditorWindow>("Placement Anchors").Show();
        }

        void OnEnable()
        {
            SceneView.duringSceneGui += DrawSceneGui;
            LoadDefaultMapLayoutIfNeeded();
        }

        void OnDisable()
        {
            SceneView.duringSceneGui -= DrawSceneGui;
        }

        void OnGUI()
        {
            EditorGUILayout.LabelField("Map Placement Anchors", EditorStyles.boldLabel);

            EditorGUI.BeginChangeCheck();
            mapLayout = (MapLayoutSO)EditorGUILayout.ObjectField("Map Layout", mapLayout, typeof(MapLayoutSO), false);
            if (EditorGUI.EndChangeCheck())
            {
                ClampMapIndex();
                SceneView.RepaintAll();
            }

            if (mapLayout == null)
            {
                EditorGUILayout.HelpBox($"MapLayoutSO not assigned. Default path: {DefaultMapLayoutPath}", MessageType.Warning);
                if (GUILayout.Button("Load Default MapLayout"))
                    LoadDefaultMapLayout();
                return;
            }

            if (mapLayout.maps == null || mapLayout.maps.Length == 0)
            {
                EditorGUILayout.HelpBox("MapLayoutSO has no maps.", MessageType.Warning);
                return;
            }

            ClampMapIndex();
            DrawMapSelector();
            DrawOptions();
            DrawActions();
            DrawAnchorList();
        }

        void DrawMapSelector()
        {
            var names = new string[mapLayout.maps.Length];
            for (var i = 0; i < names.Length; i++)
            {
                var map = mapLayout.maps[i];
                names[i] = string.IsNullOrEmpty(map.id) ? $"Map {i}" : map.id;
            }

            EditorGUI.BeginChangeCheck();
            mapIndex = EditorGUILayout.Popup("Map", mapIndex, names);
            if (EditorGUI.EndChangeCheck())
                SceneView.RepaintAll();

            var selected = mapLayout.maps[mapIndex];
            EditorGUILayout.LabelField("Size", $"{selected.width} x {selected.height}");
            EditorGUILayout.LabelField("Tile Size", Mathf.Max(1, selected.tileSize).ToString());
            EditorGUILayout.LabelField("Anchors", $"{selected.placementAnchors?.Length ?? 0}");
            EditorGUILayout.LabelField("Missing Buildable Anchors", CountMissingBuildableAnchors(selected).ToString());
        }

        void DrawOptions()
        {
            EditorGUI.BeginChangeCheck();
            showBuildableCells = EditorGUILayout.Toggle("Show Buildable Cells", showBuildableCells);
            showMissingAnchors = EditorGUILayout.Toggle("Show Missing Anchors", showMissingAnchors);
            showAnchorLabels = EditorGUILayout.Toggle("Show Anchor Labels", showAnchorLabels);
            if (EditorGUI.EndChangeCheck())
                SceneView.RepaintAll();
        }

        void DrawActions()
        {
            EditorGUILayout.HelpBox(
                "Open the Scene view and drag the blue anchor handles. These values are stored on MapLayout.asset and may be overwritten by GLD/Import Shared Data.",
                MessageType.Info);

            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("Select MapLayout"))
                    Selection.activeObject = mapLayout;

                if (GUILayout.Button("Frame Map"))
                    FrameSelectedMap();
            }

            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("Create Missing Anchors"))
                    CreateMissingAnchors();

                if (GUILayout.Button("Save Assets"))
                    AssetDatabase.SaveAssets();
            }
        }

        void DrawAnchorList()
        {
            var map = mapLayout.maps[mapIndex];
            var anchors = map.placementAnchors;
            if (anchors == null || anchors.Length == 0)
                return;

            _scroll = EditorGUILayout.BeginScrollView(_scroll);
            for (var i = 0; i < anchors.Length; i++)
            {
                var anchor = anchors[i];
                EditorGUILayout.LabelField(
                    $"{i:00}  ({anchor.x}, {anchor.y})",
                    $"worldX {anchor.worldX:0.###}, worldY {anchor.worldY:0.###}");
            }
            EditorGUILayout.EndScrollView();
        }

        void DrawSceneGui(SceneView sceneView)
        {
            if (!TryGetSelectedMap(out var map))
                return;

            DrawMapBounds(map);

            if (showBuildableCells)
                DrawBuildableCells(map);

            if (showMissingAnchors)
                DrawMissingAnchorMarkers(map);

            DrawAnchorHandles(map);
        }

        void DrawMapBounds(MapDef map)
        {
            var center = Vector3.zero;
            var size = new Vector3(map.width * DefaultCellSize, map.height * DefaultCellSize, 0f);
            Handles.color = new Color(1f, 1f, 1f, 0.6f);
            Handles.DrawWireCube(center, size);
        }

        void DrawBuildableCells(MapDef map)
        {
            if (map.buildablePoints == null)
                return;

            Handles.color = new Color(0.2f, 0.8f, 0.3f, 0.25f);
            foreach (var point in map.buildablePoints)
            {
                var center = GridPointToScenePosition(map, point.x, point.y, DefaultCellSize);
                Handles.DrawWireCube(center, Vector3.one * DefaultCellSize * 0.9f);
            }
        }

        void DrawMissingAnchorMarkers(MapDef map)
        {
            if (map.buildablePoints == null)
                return;

            var existing = BuildAnchorLookup(map.placementAnchors);
            Handles.color = new Color(1f, 0.7f, 0.1f, 0.7f);
            foreach (var point in map.buildablePoints)
            {
                if (existing.Contains(MakeKey(point.x, point.y)))
                    continue;

                var center = GridPointToScenePosition(map, point.x, point.y, DefaultCellSize);
                Handles.DrawWireDisc(center, Vector3.forward, 0.16f);
                Handles.DrawLine(center + Vector3.left * 0.1f, center + Vector3.right * 0.1f);
                Handles.DrawLine(center + Vector3.down * 0.1f, center + Vector3.up * 0.1f);
            }
        }

        void DrawAnchorHandles(MapDef map)
        {
            var anchors = map.placementAnchors;
            if (anchors == null)
                return;

            var maps = mapLayout.maps;
            for (var i = 0; i < anchors.Length; i++)
            {
                var anchor = anchors[i];
                var position = AnchorToScenePosition(map, anchor, DefaultCellSize);
                var handleSize = Mathf.Max(0.08f, HandleUtility.GetHandleSize(position) * 0.08f);

                Handles.color = new Color(0.2f, 0.55f, 1f, 0.95f);
                EditorGUI.BeginChangeCheck();
                var fmh_219_21_639136399669108720 = Quaternion.identity; var nextPosition = Handles.FreeMoveHandle(
                    position,
                    handleSize,
                    Vector3.zero,
                    Handles.CircleHandleCap);

                if (EditorGUI.EndChangeCheck())
                {
                    Undo.RecordObject(mapLayout, "Move Placement Anchor");
                    nextPosition.z = 0f;
                    anchors[i] = ScenePositionToAnchor(map, anchor, nextPosition, DefaultCellSize);
                    map.placementAnchors = anchors;
                    maps[mapIndex] = map;
                    EditorUtility.SetDirty(mapLayout);
                    Repaint();
                }

                if (showAnchorLabels)
                    Handles.Label(position + Vector3.up * 0.18f, $"{anchor.x},{anchor.y}");
            }
        }

        void CreateMissingAnchors()
        {
            if (!TryGetSelectedMap(out var map) || map.buildablePoints == null)
                return;

            var existing = BuildAnchorLookup(map.placementAnchors);
            var anchors = new List<PlacementAnchor>(map.placementAnchors ?? Array.Empty<PlacementAnchor>());
            foreach (var point in map.buildablePoints)
            {
                if (existing.Contains(MakeKey(point.x, point.y)))
                    continue;

                anchors.Add(BuildDefaultAnchor(map, point));
                existing.Add(MakeKey(point.x, point.y));
            }

            Undo.RecordObject(mapLayout, "Create Missing Placement Anchors");
            map.placementAnchors = anchors.ToArray();
            mapLayout.maps[mapIndex] = map;
            EditorUtility.SetDirty(mapLayout);
            SceneView.RepaintAll();
            Repaint();
        }

        void FrameSelectedMap()
        {
            if (!TryGetSelectedMap(out var map) || SceneView.lastActiveSceneView == null)
                return;

            var bounds = new Bounds(Vector3.zero, new Vector3(map.width, map.height, 1f));
            SceneView.lastActiveSceneView.Frame(bounds, false);
        }

        bool TryGetSelectedMap(out MapDef map)
        {
            map = default;
            if (mapLayout == null || mapLayout.maps == null || mapLayout.maps.Length == 0)
                return false;

            ClampMapIndex();
            map = mapLayout.maps[mapIndex];
            return !string.IsNullOrEmpty(map.id);
        }

        void LoadDefaultMapLayoutIfNeeded()
        {
            if (mapLayout == null)
                LoadDefaultMapLayout();
        }

        void LoadDefaultMapLayout()
        {
            mapLayout = AssetDatabase.LoadAssetAtPath<MapLayoutSO>(DefaultMapLayoutPath);
            ClampMapIndex();
            SceneView.RepaintAll();
        }

        void ClampMapIndex()
        {
            var length = mapLayout?.maps?.Length ?? 0;
            mapIndex = length <= 0 ? 0 : Mathf.Clamp(mapIndex, 0, length - 1);
        }

        static int CountMissingBuildableAnchors(MapDef map)
        {
            if (map.buildablePoints == null || map.buildablePoints.Length == 0)
                return 0;

            var existing = BuildAnchorLookup(map.placementAnchors);
            var count = 0;
            foreach (var point in map.buildablePoints)
            {
                if (!existing.Contains(MakeKey(point.x, point.y)))
                    count++;
            }
            return count;
        }

        static HashSet<long> BuildAnchorLookup(PlacementAnchor[] anchors)
        {
            var result = new HashSet<long>();
            if (anchors == null)
                return result;

            foreach (var anchor in anchors)
                result.Add(MakeKey(anchor.x, anchor.y));

            return result;
        }

        static long MakeKey(int x, int y)
        {
            return ((long)x << 32) ^ (uint)y;
        }

        public static Vector3 GridPointToScenePosition(MapDef map, float x, float y, float cellSize = DefaultCellSize)
        {
            var safeCellSize = Mathf.Max(0.01f, cellSize);
            var worldX = (x - (map.width - 1) * 0.5f) * safeCellSize;
            var worldY = ((map.height - 1) * 0.5f - y) * safeCellSize;
            return new Vector3(worldX, worldY, 0f);
        }

        public static Vector3 AnchorToScenePosition(MapDef map, PlacementAnchor anchor, float cellSize = DefaultCellSize)
        {
            var tileSize = Mathf.Max(1, map.tileSize);
            var col = anchor.worldX / tileSize - 0.5f;
            var row = anchor.worldY / tileSize - 0.5f;
            return GridPointToScenePosition(map, col, row, cellSize);
        }

        public static PlacementAnchor ScenePositionToAnchor(
            MapDef map,
            PlacementAnchor anchor,
            Vector3 scenePosition,
            float cellSize = DefaultCellSize)
        {
            var safeCellSize = Mathf.Max(0.01f, cellSize);
            var tileSize = Mathf.Max(1, map.tileSize);
            var col = scenePosition.x / safeCellSize + (map.width - 1) * 0.5f;
            var row = (map.height - 1) * 0.5f - scenePosition.y / safeCellSize;

            anchor.worldX = (col + 0.5f) * tileSize;
            anchor.worldY = (row + 0.5f) * tileSize;
            return anchor;
        }

        public static PlacementAnchor BuildDefaultAnchor(MapDef map, GridPoint point)
        {
            var tileSize = Mathf.Max(1, map.tileSize);
            return new PlacementAnchor
            {
                x = point.x,
                y = point.y,
                worldX = (point.x + 0.5f) * tileSize,
                worldY = (point.y + 0.5f) * tileSize,
            };
        }
    }
}
