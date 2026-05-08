using GLD.Systems.Grid;
using GLD.Systems.Towers;
using UnityEngine;

namespace GLD.SceneRuntime.CoreLoop.Render
{
    public sealed class RangeOverlayController
    {
        readonly GameObject _view;
        readonly SpriteRenderer _renderer;

        public RangeOverlayController(Transform parent)
        {
            _view = new GameObject("RangeOverlay");
            _view.transform.SetParent(parent, false);
            _renderer = _view.AddComponent<SpriteRenderer>();
            _renderer.sprite = CreateCircleSprite();
            _renderer.color = new Color(0.95f, 0.82f, 0.32f, 0.18f);
            _renderer.sortingOrder = 5;
            _view.SetActive(false);
        }

        public void Show(TowerInstance tower)
        {
            if (tower == null)
            {
                Hide();
                return;
            }

            _view.transform.position = new Vector3(tower.Position.x, tower.Position.y, -0.15f);
            var diameter = Mathf.Max(0.1f, tower.Def.stats.range * 2f);
            _view.transform.localScale = new Vector3(diameter, diameter, 1f);
            _view.SetActive(true);
        }

        public void ShowPlacement(GridManager grid, GridCell cell, float range)
        {
            if (grid == null)
            {
                Hide();
                return;
            }

            var pos = grid.GridToWorld(cell);
            _view.transform.position = new Vector3(pos.x, pos.y, -0.15f);
            var diameter = Mathf.Max(0.1f, range * 2f);
            _view.transform.localScale = new Vector3(diameter, diameter, 1f);
            _view.SetActive(true);
        }

        public void Hide()
        {
            _view.SetActive(false);
        }

        public void Destroy()
        {
            Object.Destroy(_view);
        }

        static Sprite CreateCircleSprite()
        {
            const int size = 64;
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            var center = new Vector2((size - 1) * 0.5f, (size - 1) * 0.5f);
            var radius = size * 0.48f;
            for (var y = 0; y < size; y++)
            for (var x = 0; x < size; x++)
            {
                var d = Vector2.Distance(new Vector2(x, y), center);
                tex.SetPixel(x, y, d <= radius ? Color.white : Color.clear);
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }
    }
}
