using System;
using System.Collections.Generic;
using GLD.Systems.Grid;

namespace GLD.Systems.Pathfinding
{
    public sealed class PathfindingSystem
    {
        static readonly GridCell[] Neighbors =
        {
            new GridCell(0, -1),
            new GridCell(0, 1),
            new GridCell(1, 0),
            new GridCell(-1, 0)
        };

        readonly GridManager _grid;
        readonly Dictionary<string, List<GridCell>> _cache = new Dictionary<string, List<GridCell>>();

        public PathfindingSystem(GridManager grid)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
        }

        public IReadOnlyList<GridCell> FindPath(GridCell start, GridCell goal)
        {
            var key = $"{start.Col},{start.Row}->{goal.Col},{goal.Row}";
            if (_cache.TryGetValue(key, out var cached))
                return cached;

            var result = ComputePath(start, goal);
            _cache[key] = result;
            return result;
        }

        List<GridCell> ComputePath(GridCell start, GridCell goal)
        {
            if (_grid.IsBlocked(start) || _grid.IsBlocked(goal))
                return new List<GridCell>();

            var open = new List<GridCell> { start };
            var cameFrom = new Dictionary<GridCell, GridCell>();
            var gScore = new Dictionary<GridCell, int> { [start] = 0 };
            var closed = new HashSet<GridCell>();

            while (open.Count > 0)
            {
                var currentIndex = BestOpenIndex(open, gScore, goal);
                var current = open[currentIndex];
                open.RemoveAt(currentIndex);

                if (current.Equals(goal))
                    return Reconstruct(cameFrom, current);

                closed.Add(current);

                foreach (var delta in Neighbors)
                {
                    var next = new GridCell(current.Col + delta.Col, current.Row + delta.Row);
                    if (_grid.IsBlocked(next) || closed.Contains(next)) continue;

                    var tentative = gScore[current] + 1;
                    if (!gScore.TryGetValue(next, out var existing) || tentative < existing)
                    {
                        cameFrom[next] = current;
                        gScore[next] = tentative;
                        if (!open.Contains(next))
                            open.Add(next);
                    }
                }
            }

            return new List<GridCell>();
        }

        static int BestOpenIndex(List<GridCell> open, Dictionary<GridCell, int> gScore, GridCell goal)
        {
            var bestIndex = 0;
            var bestScore = int.MaxValue;
            for (var i = 0; i < open.Count; i++)
            {
                var cell = open[i];
                var f = gScore[cell] + Math.Abs(cell.Col - goal.Col) + Math.Abs(cell.Row - goal.Row);
                if (f >= bestScore) continue;
                bestScore = f;
                bestIndex = i;
            }
            return bestIndex;
        }

        static List<GridCell> Reconstruct(Dictionary<GridCell, GridCell> cameFrom, GridCell current)
        {
            var path = new List<GridCell> { current };
            while (cameFrom.TryGetValue(current, out var prev))
            {
                current = prev;
                path.Add(current);
            }
            path.Reverse();
            return path;
        }
    }
}
