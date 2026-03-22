using UnityEngine;

namespace GLD.Visual
{
    public class GridVisualizer : MonoBehaviour
    {
        [SerializeField] private Core.GridManager _gridManager;

        private readonly Color _bgColor = new Color32(0x16, 0x16, 0x1a, 0xFF);
        private readonly Color _gridLineColor = new Color32(0x2e, 0x2e, 0x3a, 0xFF);
        private readonly Color _spawnColor = new Color32(0x2c, 0xb6, 0x7d, 0xFF);
        private readonly Color _exitColor = new Color32(0xe5, 0x31, 0x70, 0xFF);

        private void Start()
        {
            Camera.main.backgroundColor = _bgColor;
            DrawGrid();
        }

        private void DrawGrid()
        {
            for (int x = 0; x < Core.GridManager.Width; x++)
            {
                for (int y = 0; y < Core.GridManager.Height; y++)
                {
                    Vector3 pos = _gridManager.GridToWorld(x, y);
                    CreateTileVisual(pos, x, y);
                }
            }
        }

        private void CreateTileVisual(Vector3 pos, int x, int y)
        {
            var go = new GameObject($"Tile_{x}_{y}");
            go.transform.parent = transform;
            go.transform.position = pos;

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = CreatePixelSprite();
            sr.color = _gridLineColor;
            sr.sortingOrder = -10;

            go.transform.localScale = new Vector3(0.95f, 0.95f, 1f);

            if (x == _gridManager.SpawnPoint.x && y == _gridManager.SpawnPoint.y)
                sr.color = _spawnColor;
            else if (x == _gridManager.ExitPoint.x && y == _gridManager.ExitPoint.y)
                sr.color = _exitColor;
        }

        private static Sprite _cachedPixelSprite;
        private static Sprite CreatePixelSprite()
        {
            if (_cachedPixelSprite != null) return _cachedPixelSprite;

            var tex = new Texture2D(1, 1);
            tex.SetPixel(0, 0, Color.white);
            tex.Apply();
            tex.filterMode = FilterMode.Point;

            _cachedPixelSprite = Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
            return _cachedPixelSprite;
        }
    }
}
