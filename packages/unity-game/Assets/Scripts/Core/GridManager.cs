using UnityEngine;

namespace GLD.Core
{
    public class GridManager : MonoBehaviour
    {
        public const int Width = 20;
        public const int Height = 20;

        public Vector2Int SpawnPoint = new(0, 10);
        public Vector2Int ExitPoint = new(19, 10);

        private Tile[,] _grid;

        public Tile[,] Grid => _grid;

        private void Awake()
        {
            InitializeGrid();
        }

        public void InitializeGrid()
        {
            _grid = new Tile[Width, Height];
            for (int x = 0; x < Width; x++)
            {
                for (int y = 0; y < Height; y++)
                {
                    _grid[x, y] = new Tile(x, y);
                }
            }
        }

        public Tile GetTile(int x, int y)
        {
            if (x < 0 || x >= Width || y < 0 || y >= Height) return null;
            return _grid[x, y];
        }

        public bool CanPlaceTower(int x, int y)
        {
            var tile = GetTile(x, y);
            if (tile == null || !tile.IsPassable) return false;

            if (x == SpawnPoint.x && y == SpawnPoint.y) return false;
            if (x == ExitPoint.x && y == ExitPoint.y) return false;

            tile.Occupied = true;
            bool pathExists = Pathfinding.FindPath(_grid, SpawnPoint, ExitPoint) != null;
            tile.Occupied = false;

            return pathExists;
        }

        public bool PlaceTower(int x, int y, string towerId)
        {
            if (!CanPlaceTower(x, y)) return false;

            var tile = GetTile(x, y);
            tile.Occupied = true;
            tile.TowerId = towerId;
            return true;
        }

        public void RemoveTower(int x, int y)
        {
            var tile = GetTile(x, y);
            if (tile == null) return;
            tile.Occupied = false;
            tile.TowerId = null;
        }

        public Vector3 GridToWorld(int x, int y)
        {
            float offsetX = -Width / 2f + 0.5f;
            float offsetY = -Height / 2f + 0.5f;
            return new Vector3(x + offsetX, y + offsetY, 0);
        }

        public Vector2Int WorldToGrid(Vector3 worldPos)
        {
            float offsetX = -Width / 2f + 0.5f;
            float offsetY = -Height / 2f + 0.5f;
            int x = Mathf.RoundToInt(worldPos.x - offsetX);
            int y = Mathf.RoundToInt(worldPos.y - offsetY);
            return new Vector2Int(x, y);
        }
    }
}
