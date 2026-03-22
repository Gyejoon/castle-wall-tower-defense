using NUnit.Framework;
using System.Collections.Generic;
using GLD.Core;
using UnityEngine;

namespace GLD.Tests
{
    public class PathfindingTests
    {
        private Tile[,] CreateGrid(int width = 20, int height = 20)
        {
            var grid = new Tile[width, height];
            for (int x = 0; x < width; x++)
                for (int y = 0; y < height; y++)
                    grid[x, y] = new Tile(x, y);
            return grid;
        }

        [Test]
        public void FindPath_Returns_Path_On_Open_Grid()
        {
            var grid = CreateGrid();
            var start = new Vector2Int(0, 10);
            var end = new Vector2Int(19, 10);

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNotNull(path);
            Assert.AreEqual(start, path[0]);
            Assert.AreEqual(end, path[path.Count - 1]);
        }

        [Test]
        public void FindPath_Shortest_Path_On_Open_Grid_Is_Straight_Line()
        {
            var grid = CreateGrid();
            var start = new Vector2Int(0, 10);
            var end = new Vector2Int(19, 10);

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.AreEqual(20, path.Count);
        }

        [Test]
        public void FindPath_Routes_Around_Obstacles()
        {
            var grid = CreateGrid(5, 5);
            var start = new Vector2Int(0, 2);
            var end = new Vector2Int(4, 2);

            grid[2, 0].Occupied = true;
            grid[2, 1].Occupied = true;
            grid[2, 2].Occupied = true;
            grid[2, 3].Occupied = true;

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNotNull(path);
            Assert.AreEqual(start, path[0]);
            Assert.AreEqual(end, path[path.Count - 1]);
            Assert.Greater(path.Count, 5);
        }

        [Test]
        public void FindPath_Returns_Null_When_Fully_Blocked()
        {
            var grid = CreateGrid(5, 5);
            var start = new Vector2Int(0, 2);
            var end = new Vector2Int(4, 2);

            for (int y = 0; y < 5; y++)
                grid[2, y].Occupied = true;

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNull(path);
        }

        [Test]
        public void FindPath_Adjacent_Tiles_Returns_Two_Point_Path()
        {
            var grid = CreateGrid(5, 5);
            var start = new Vector2Int(1, 1);
            var end = new Vector2Int(2, 1);

            var path = Pathfinding.FindPath(grid, start, end);

            Assert.IsNotNull(path);
            Assert.AreEqual(2, path.Count);
        }
    }
}
