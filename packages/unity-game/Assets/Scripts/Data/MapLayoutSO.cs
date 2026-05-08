// MapLayoutSO.cs — Full map registry ScriptableObject.
// Mirrors the maps.json object (MAP_REGISTRY): a dictionary of map id -> map definition.
// The JSON is a Record<string, MapDef> so we flatten it into a MapEntry[] array.
// Field order: alphabetic per design-decisions Q2-2.

using System;
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>Integer grid coordinate used for path, buildable points, obstacles, etc.</summary>
    [Serializable]
    public struct GridPoint
    {
        public int x;
        public int y;
    }

    /// <summary>Float grid coordinate used by illustrated paths and placement anchors.</summary>
    [Serializable]
    public struct FloatGridPoint
    {
        public float x;
        public float y;
    }

    /// <summary>One spawn-to-exit lane expressed in float grid coordinates.</summary>
    [Serializable]
    public struct MapPath
    {
        public FloatGridPoint[] points;
    }

    /// <summary>Visual placement anchor copied from shared main_long art coordinates.</summary>
    [Serializable]
    public struct PlacementAnchor
    {
        public int x;
        public int y;
        public float worldX;
        public float worldY;
    }

    /// <summary>Float-coordinate decoration placed on the map (tree, bush, rock).</summary>
    [Serializable]
    public struct MapDecoration
    {
        public DecorationKind kind;
        public int   variant;
        public float x;
        public float y;
    }

    /// <summary>
    /// Full layout definition for one map, mirroring the value type in MAP_REGISTRY.
    /// </summary>
    [Serializable]
    public struct MapDef
    {
        [Header("Placement")]
        public GridPoint[] blockedPlacementPoints;
        public GridPoint[] buildablePoints;

        [Header("Visual")]
        public GridPoint[]     castleWallTiles;
        public MapDecoration[] decorations;

        [Header("Difficulty")]
        public float difficultyHpMult;

        [Header("Path")]
        public GridPoint exitPoint;
        public MapPath[] lanes;
        public GridPoint[] obstacles;
        public GridPoint[] path;
        public FloatGridPoint[] waypoints;
        public PlacementAnchor[] placementAnchors;
        public GridPoint   spawnPoint;

        [Header("Map Metadata")]
        public int    height;
        public string id;
        public string name;
        public int    recommendedPower;
        public float  rewardMultiplier;
        public int    tileSize;
        public string tilemapKey;
        public string tilesetKey;
        public int    width;
    }

    /// <summary>
    /// Singleton SO holding all map definitions (MAP_REGISTRY).
    /// Provides O(1) lookup by map id string.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/MapLayout", fileName = "MapLayout")]
    public sealed class MapLayoutSO : ScriptableObject
    {
        public MapDef[] maps;

        Dictionary<string, MapDef> _byId;

        void OnEnable()
        {
            if (maps == null) return;
            _byId = new Dictionary<string, MapDef>(maps.Length);
            foreach (var m in maps)
            {
                if (!string.IsNullOrEmpty(m.id))
                    _byId[m.id] = m;
            }
        }

        /// <summary>Returns the MapDef for the given map id. Returns default if not found.</summary>
        public MapDef FindById(string id)
        {
            if (_byId == null) OnEnable();
            _byId.TryGetValue(id, out var result);
            return result;
        }
    }
}
