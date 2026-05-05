using System;
using System.Collections.Generic;
using GLD.Data;
using UnityEngine;

namespace GLD.Systems.Grid
{
    public sealed class GridManager
    {
        const string DefaultMapId = "main_long";

        readonly MapDef _map;
        readonly HashSet<GridCell> _blockedPlacement = new HashSet<GridCell>();
        readonly HashSet<GridCell> _pathBlocked = new HashSet<GridCell>();
        readonly HashSet<GridCell> _buildable = new HashSet<GridCell>();
        readonly HashSet<GridCell> _pathCells = new HashSet<GridCell>();
        readonly Dictionary<GridCell, Vector2> _placementAnchors = new Dictionary<GridCell, Vector2>();
        readonly List<Vector2> _path = new List<Vector2>();
        readonly List<IReadOnlyList<Vector2>> _paths = new List<IReadOnlyList<Vector2>>();

        public int Width => _map.width;
        public int Height => _map.height;
        public string MapId => _map.id;
        public float CellSize { get; }
        public GridCell SpawnCell => new GridCell(_map.spawnPoint.x, _map.spawnPoint.y);
        public GridCell ExitCell => new GridCell(_map.exitPoint.x, _map.exitPoint.y);
        public IReadOnlyList<Vector2> Path => _path;
        public IReadOnlyList<IReadOnlyList<Vector2>> Paths => _paths;

        public GridManager(MapLayoutSO layout, string mapId = DefaultMapId, float cellSize = 1f)
            : this(ResolveMap(layout, mapId), cellSize)
        {
        }

        public GridManager(MapDef map, float cellSize = 1f)
        {
            if (string.IsNullOrEmpty(map.id))
                throw new ArgumentException("MapDef must have an id.", nameof(map));

            _map = map;
            CellSize = Mathf.Max(0.01f, cellSize);

            AddPoints(_blockedPlacement, map.blockedPlacementPoints);
            AddPoints(_pathBlocked, map.obstacles);
            AddPoints(_buildable, map.buildablePoints);
            AddPlacementAnchors(map.placementAnchors);

            foreach (var lane in ResolveLanes(map))
            {
                var path = new List<Vector2>();
                foreach (var point in lane)
                {
                    path.Add(GridToWorld(point.x, point.y));
                    _pathCells.Add(new GridCell(Mathf.RoundToInt(point.x), Mathf.RoundToInt(point.y)));
                }

                if (path.Count <= 0) continue;
                _paths.Add(path);
                if (_path.Count == 0)
                    _path.AddRange(path);
            }
        }

        public Vector2 GridToWorld(float col, float row)
        {
            var x = (col - (Width - 1) * 0.5f) * CellSize;
            var y = ((Height - 1) * 0.5f - row) * CellSize;
            return new Vector2(x, y);
        }

        public Vector2 GridToWorld(GridCell cell) => GridToWorld(cell.Col, cell.Row);

        public Vector3 GridToWorld3(GridCell cell, float z = 0f)
        {
            var p = GridToWorld(cell);
            return new Vector3(p.x, p.y, z);
        }

        public Vector2 GridToPlacementWorld(GridCell cell)
        {
            return _placementAnchors.TryGetValue(cell, out var anchor) ? anchor : GridToWorld(cell);
        }

        public GridCell WorldToGrid(Vector2 world)
        {
            var col = Mathf.RoundToInt(world.x / CellSize + (Width - 1) * 0.5f);
            var row = Mathf.RoundToInt((Height - 1) * 0.5f - world.y / CellSize);
            return new GridCell(col, row);
        }

        public bool IsInBounds(GridCell cell) =>
            cell.Col >= 0 && cell.Col < Width && cell.Row >= 0 && cell.Row < Height;

        public bool IsBlocked(GridCell cell) => !IsInBounds(cell) || _pathBlocked.Contains(cell);

        public bool IsBuildable(GridCell cell)
        {
            if (IsBlocked(cell) || _blockedPlacement.Contains(cell)) return false;
            if (cell.Equals(SpawnCell) || cell.Equals(ExitCell)) return false;
            if (_buildable.Count > 0) return _buildable.Contains(cell);
            return !IsPathCell(cell);
        }

        public bool IsPathCell(GridCell cell) => _pathCells.Contains(cell);

        public IReadOnlyCollection<GridCell> GetBuildableCells() => _buildable;
        public IReadOnlyCollection<GridCell> GetBlockedCells() => _pathBlocked;

        static MapDef ResolveMap(MapLayoutSO layout, string mapId)
        {
            if (layout == null)
                throw new ArgumentNullException(nameof(layout));

            var map = layout.FindById(mapId);
            if (string.IsNullOrEmpty(map.id))
                throw new InvalidOperationException($"MapLayoutSO does not contain map id '{mapId}'.");
            return map;
        }

        static void AddPoints(HashSet<GridCell> target, GridPoint[] points)
        {
            if (points == null) return;
            foreach (var point in points)
                target.Add(new GridCell(point.x, point.y));
        }

        void AddPlacementAnchors(PlacementAnchor[] anchors)
        {
            if (anchors == null) return;
            foreach (var anchor in anchors)
            {
                var cell = new GridCell(anchor.x, anchor.y);
                var col = anchor.worldX / Mathf.Max(1, _map.tileSize) - 0.5f;
                var row = anchor.worldY / Mathf.Max(1, _map.tileSize) - 0.5f;
                _placementAnchors[cell] = GridToWorld(col, row);
            }
        }

        static IEnumerable<FloatGridPoint[]> ResolveLanes(MapDef map)
        {
            if (map.lanes != null && map.lanes.Length > 0)
            {
                foreach (var lane in map.lanes)
                {
                    if (lane.points != null && lane.points.Length > 0)
                        yield return lane.points;
                }
                yield break;
            }

            if (map.waypoints != null && map.waypoints.Length > 0)
            {
                yield return map.waypoints;
                yield break;
            }

            if (map.path == null) yield break;
            var fallback = new FloatGridPoint[map.path.Length];
            for (var i = 0; i < map.path.Length; i++)
                fallback[i] = new FloatGridPoint { x = map.path[i].x, y = map.path[i].y };
            yield return fallback;
        }
    }
}
