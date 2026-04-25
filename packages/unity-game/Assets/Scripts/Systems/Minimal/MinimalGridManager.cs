// MinimalGridManager.cs — Phase 2 Slice2 grid wrapper.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.4 Construction order: Grid built first, no dependencies.
//   - §4 OQ-1/OQ-2: 8×18 slice2_poc map, NOT main_long.
//
// Wraps a MapDef value (loaded from MapLayoutSO at scene load time, OR
// constructed programmatically by MinimalReplayRunner / EditMode tests).
// World units are 1 tile = 1 unit (PPU 64 → 1 world unit per cell).

using System.Collections.Generic;
using GLD.Data;
using UnityEngine;

namespace GLD.Systems.Minimal
{
    /// <summary>
    /// Read-only grid query surface for the minimal systems.
    /// Constructed once with a MapDef and never mutated thereafter.
    /// </summary>
    public sealed class MinimalGridManager
    {
        readonly MapDef _map;
        readonly HashSet<GridCell> _blocked;
        readonly GridCell[] _path;

        public int Cols => _map.width;
        public int Rows => _map.height;
        public IReadOnlyList<GridCell> Path => _path;

        public MinimalGridManager(MapDef map)
        {
            _map = map;
            _blocked = new HashSet<GridCell>();
            if (map.blockedPlacementPoints != null)
            {
                foreach (var p in map.blockedPlacementPoints)
                    _blocked.Add(new GridCell(p.x, p.y));
            }
            // Path cells are also blocked for placement (towers can't sit on the lane).
            int n = map.path?.Length ?? 0;
            _path = new GridCell[n];
            for (int i = 0; i < n; i++)
            {
                var p = map.path[i];
                _path[i] = new GridCell(p.x, p.y);
                _blocked.Add(_path[i]);
            }
        }

        /// <summary>
        /// World position (Unity-space, y-up) → integer grid cell. Snaps to
        /// nearest cell using floor; callers may also pre-round if needed.
        /// </summary>
        public GridCell WorldToGrid(Vector2 world)
        {
            int col = Mathf.FloorToInt(world.x);
            // Phaser's grid origin is top-left; Unity y-up flips that. We
            // store row directly (no inversion) because the slice2_poc
            // fixture uses Phaser-coord rows. Inversion is the orchestrator's
            // responsibility (Task 4 view layer).
            int row = Mathf.FloorToInt(world.y);
            return new GridCell(col, row);
        }

        /// <summary>Cell center → world position (cell + 0.5 offset).</summary>
        public Vector2 GridToWorld(GridCell cell)
        {
            return new Vector2(cell.Col + 0.5f, cell.Row + 0.5f);
        }

        /// <summary>True if the cell is on the path, in obstacles, or
        /// outside the grid bounds — i.e. cannot host a tower.</summary>
        public bool IsBlocked(GridCell cell)
        {
            if (cell.Col < 0 || cell.Col >= _map.width) return true;
            if (cell.Row < 0 || cell.Row >= _map.height) return true;
            return _blocked.Contains(cell);
        }

        /// <summary>True if the cell is inside the [0,cols)×[0,rows) bounds.</summary>
        public bool InBounds(GridCell cell) =>
            cell.Col >= 0 && cell.Col < _map.width &&
            cell.Row >= 0 && cell.Row < _map.height;
    }
}
