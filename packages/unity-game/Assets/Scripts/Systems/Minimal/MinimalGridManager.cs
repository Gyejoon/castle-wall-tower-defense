using System;
using System.Collections.Generic;
using GLD.Data;
using UnityEngine;

namespace GLD.Systems.Minimal
{
    public readonly struct MinimalGridCell : IEquatable<MinimalGridCell>
    {
        public readonly int Col;
        public readonly int Row;

        public MinimalGridCell(int col, int row)
        {
            Col = col;
            Row = row;
        }

        public bool Equals(MinimalGridCell other) => Col == other.Col && Row == other.Row;
        public override bool Equals(object obj) => obj is MinimalGridCell other && Equals(other);
        public override int GetHashCode() => (Col * 397) ^ Row;
        public override string ToString() => $"({Col},{Row})";
    }

    public sealed class MinimalGridManager
    {
        const string DefaultMapId = "main_long";

        readonly MapDef _map;
        readonly HashSet<MinimalGridCell> _blocked = new HashSet<MinimalGridCell>();
        readonly HashSet<MinimalGridCell> _buildable = new HashSet<MinimalGridCell>();
        readonly List<Vector2> _path = new List<Vector2>();

        public int Width => _map.width;
        public int Height => _map.height;
        public float CellSize { get; }
        public IReadOnlyList<Vector2> Path => _path;

        public MinimalGridManager(MapLayoutSO layout, string mapId = DefaultMapId, float cellSize = 1f)
            : this(ResolveMap(layout, mapId), cellSize)
        {
        }

        public MinimalGridManager(MapDef map, float cellSize = 1f)
        {
            _map = map;
            CellSize = Mathf.Max(0.01f, cellSize);
            AddPoints(_blocked, map.blockedPlacementPoints);
            AddPoints(_blocked, map.obstacles);
            AddPoints(_buildable, map.buildablePoints);

            if (map.path != null)
            {
                foreach (var point in map.path)
                    _path.Add(GridToWorld(point.x, point.y));
            }
        }

        public Vector2 GridToWorld(int col, int row)
        {
            var x = (col - (Width - 1) * 0.5f) * CellSize;
            var y = ((Height - 1) * 0.5f - row) * CellSize;
            return new Vector2(x, y);
        }

        public Vector3 GridToWorld3(int col, int row, float z = 0f)
        {
            var p = GridToWorld(col, row);
            return new Vector3(p.x, p.y, z);
        }

        public MinimalGridCell WorldToGrid(Vector2 world)
        {
            var col = Mathf.RoundToInt(world.x / CellSize + (Width - 1) * 0.5f);
            var row = Mathf.RoundToInt((Height - 1) * 0.5f - world.y / CellSize);
            return new MinimalGridCell(col, row);
        }

        public bool IsInBounds(MinimalGridCell cell) =>
            cell.Col >= 0 && cell.Col < Width && cell.Row >= 0 && cell.Row < Height;

        public bool IsBlocked(MinimalGridCell cell) =>
            !IsInBounds(cell) || _blocked.Contains(cell);

        public bool IsBuildable(MinimalGridCell cell)
        {
            if (IsBlocked(cell)) return false;
            if (_buildable.Count == 0) return true;
            return _buildable.Contains(cell);
        }

        public bool IsPathCell(MinimalGridCell cell)
        {
            if (_map.path == null) return false;
            foreach (var point in _map.path)
            {
                if (point.x == cell.Col && point.y == cell.Row) return true;
            }
            return false;
        }

        static MapDef ResolveMap(MapLayoutSO layout, string mapId)
        {
            if (layout == null)
                throw new ArgumentNullException(nameof(layout));

            var map = layout.FindById(mapId);
            if (string.IsNullOrEmpty(map.id))
                throw new InvalidOperationException($"MapLayoutSO does not contain map id '{mapId}'.");

            return map;
        }

        static void AddPoints(HashSet<MinimalGridCell> target, GridPoint[] points)
        {
            if (points == null) return;
            foreach (var point in points)
                target.Add(new MinimalGridCell(point.x, point.y));
        }
    }
}
