using System.Collections.Generic;
using UnityEngine;

namespace GLD.Core
{
    public static class Pathfinding
    {
        private class Node
        {
            public int X, Y;
            public float G, H;
            public float F => G + H;
            public Node Parent;

            public Node(int x, int y) { X = x; Y = y; }
        }

        private static readonly Vector2Int[] Directions = {
            new(0, 1), new(0, -1), new(1, 0), new(-1, 0)
        };

        public static List<Vector2Int> FindPath(Tile[,] grid, Vector2Int start, Vector2Int end)
        {
            int width = grid.GetLength(0);
            int height = grid.GetLength(1);

            var openSet = new List<Node>();
            var closedSet = new HashSet<(int, int)>();

            var startNode = new Node(start.x, start.y) { G = 0, H = Heuristic(start, end) };
            openSet.Add(startNode);

            while (openSet.Count > 0)
            {
                int bestIndex = 0;
                for (int i = 1; i < openSet.Count; i++)
                {
                    if (openSet[i].F < openSet[bestIndex].F)
                        bestIndex = i;
                }

                var current = openSet[bestIndex];
                openSet.RemoveAt(bestIndex);

                if (current.X == end.x && current.Y == end.y)
                    return ReconstructPath(current);

                closedSet.Add((current.X, current.Y));

                foreach (var dir in Directions)
                {
                    int nx = current.X + dir.x;
                    int ny = current.Y + dir.y;

                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (closedSet.Contains((nx, ny))) continue;
                    if (!grid[nx, ny].IsPassable && !(nx == end.x && ny == end.y)) continue;

                    float tentativeG = current.G + 1;

                    var existing = openSet.Find(n => n.X == nx && n.Y == ny);
                    if (existing != null)
                    {
                        if (tentativeG < existing.G)
                        {
                            existing.G = tentativeG;
                            existing.Parent = current;
                        }
                    }
                    else
                    {
                        var neighbor = new Node(nx, ny)
                        {
                            G = tentativeG,
                            H = Heuristic(new Vector2Int(nx, ny), end),
                            Parent = current
                        };
                        openSet.Add(neighbor);
                    }
                }
            }

            return null;
        }

        private static float Heuristic(Vector2Int a, Vector2Int b)
        {
            return Mathf.Abs(a.x - b.x) + Mathf.Abs(a.y - b.y);
        }

        private static List<Vector2Int> ReconstructPath(Node node)
        {
            var path = new List<Vector2Int>();
            while (node != null)
            {
                path.Add(new Vector2Int(node.X, node.Y));
                node = node.Parent;
            }
            path.Reverse();
            return path;
        }
    }
}
