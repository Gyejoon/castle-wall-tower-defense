using NUnit.Framework;
using GLD.Core;
using UnityEngine;

namespace GLD.Tests
{
    public class GridManagerTests
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
        public void Grid_Initializes_With_Correct_Dimensions()
        {
            var grid = CreateGrid();
            Assert.AreEqual(20, grid.GetLength(0));
            Assert.AreEqual(20, grid.GetLength(1));
        }

        [Test]
        public void All_Tiles_Start_Walkable_And_Unoccupied()
        {
            var grid = CreateGrid();
            for (int x = 0; x < 20; x++)
            {
                for (int y = 0; y < 20; y++)
                {
                    Assert.IsTrue(grid[x, y].Walkable);
                    Assert.IsFalse(grid[x, y].Occupied);
                    Assert.IsTrue(grid[x, y].IsPassable);
                }
            }
        }

        [Test]
        public void Occupied_Tile_Is_Not_Passable()
        {
            var tile = new Tile(5, 5);
            tile.Occupied = true;
            Assert.IsFalse(tile.IsPassable);
        }

        [Test]
        public void Unwalkable_Tile_Is_Not_Passable()
        {
            var tile = new Tile(5, 5, walkable: false);
            Assert.IsFalse(tile.IsPassable);
        }
    }
}
