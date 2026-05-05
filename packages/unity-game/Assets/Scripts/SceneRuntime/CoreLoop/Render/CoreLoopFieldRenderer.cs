using System.Collections.Generic;
using GLD.Systems.Grid;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using UnityEngine;

namespace GLD.SceneRuntime.CoreLoop.Render
{
    public sealed class CoreLoopFieldRenderer : MonoBehaviour
    {
        const float CellScale = 0.94f;

        [SerializeField] Camera gameplayCamera;
        [SerializeField] Transform renderRoot;

        readonly Dictionary<string, GameObject> _unitViews = new Dictionary<string, GameObject>();
        readonly Dictionary<string, GameObject> _towerViews = new Dictionary<string, GameObject>();

        GameSceneController _controller;
        Sprite _squareSprite;
        Transform _gridRoot;
        Transform _unitRoot;
        Transform _towerRoot;

        public int RenderedCellCount { get; private set; }
        public int RenderedUnitCount => _unitViews.Count;
        public int RenderedTowerCount => _towerViews.Count;
        public Camera GameplayCamera => gameplayCamera;

        public void Bind(GameSceneController controller)
        {
            if (_controller == controller && _gridRoot != null)
                return;

            UnbindEvents();
            _controller = controller;
            if (_controller == null || _controller.Grid == null)
                return;

            if (_squareSprite == null)
                _squareSprite = CreateSquareSprite();
            if (renderRoot == null)
                renderRoot = transform;

            ConfigureCamera(_controller.Grid);
            EnsureRoots();
            DrawGrid(_controller.Grid);
            BindEvents();

            foreach (var tower in _controller.Towers.Towers)
                CreateOrSyncTower(tower);
            foreach (var unit in _controller.Units.Units)
                CreateOrSyncUnit(unit);
        }

        void OnDestroy()
        {
            UnbindEvents();
        }

        void LateUpdate()
        {
            if (_controller == null || _controller.Units == null)
                return;

            foreach (var unit in _controller.Units.Units)
                CreateOrSyncUnit(unit);
        }

        void BindEvents()
        {
            if (_controller == null) return;
            _controller.Units.UnitSpawned += HandleUnitSpawned;
            _controller.Units.UnitKilled += HandleUnitChanged;
            _controller.Units.UnitEscaped += HandleUnitChanged;
            _controller.Towers.TowerPlaced += HandleTowerPlaced;
            _controller.Towers.TowerMoved += HandleTowerMoved;
            _controller.Towers.TowerSold += HandleTowerSold;
            _controller.Towers.TowerAttacked += HandleTowerAttacked;
        }

        void UnbindEvents()
        {
            if (_controller == null) return;
            _controller.Units.UnitSpawned -= HandleUnitSpawned;
            _controller.Units.UnitKilled -= HandleUnitChanged;
            _controller.Units.UnitEscaped -= HandleUnitChanged;
            _controller.Towers.TowerPlaced -= HandleTowerPlaced;
            _controller.Towers.TowerMoved -= HandleTowerMoved;
            _controller.Towers.TowerSold -= HandleTowerSold;
            _controller.Towers.TowerAttacked -= HandleTowerAttacked;
        }

        void EnsureRoots()
        {
            ClearRuntimeChildren();

            _gridRoot = CreateRoot("Grid");
            _unitRoot = CreateRoot("Units");
            _towerRoot = CreateRoot("Towers");
        }

        Transform CreateRoot(string rootName)
        {
            var go = new GameObject(rootName);
            go.transform.SetParent(renderRoot, false);
            return go.transform;
        }

        void ClearRuntimeChildren()
        {
            for (var i = renderRoot.childCount - 1; i >= 0; i--)
                Destroy(renderRoot.GetChild(i).gameObject);

            _unitViews.Clear();
            _towerViews.Clear();
            RenderedCellCount = 0;
        }

        void DrawGrid(GridManager grid)
        {
            for (var row = 0; row < grid.Height; row++)
            {
                for (var col = 0; col < grid.Width; col++)
                {
                    var cell = new GridCell(col, row);
                    var tile = new GameObject($"Cell_{col}_{row}");
                    tile.transform.SetParent(_gridRoot, false);
                    tile.transform.position = grid.GridToWorld3(cell, 0f);
                    tile.transform.localScale = new Vector3(CellScale, CellScale, 1f);

                    var sr = tile.AddComponent<SpriteRenderer>();
                    sr.sprite = _squareSprite;
                    sr.color = ResolveCellColor(grid, cell);
                    sr.sortingOrder = -20;
                    RenderedCellCount++;
                }
            }
        }

        Color ResolveCellColor(GridManager grid, GridCell cell)
        {
            if (grid.IsPathCell(cell))
                return new Color(0.46f, 0.39f, 0.28f, 1f);
            if (grid.IsBuildable(cell))
                return new Color(0.17f, 0.34f, 0.23f, 1f);
            if (grid.IsBlocked(cell))
                return new Color(0.08f, 0.09f, 0.08f, 1f);
            return new Color(0.12f, 0.18f, 0.14f, 1f);
        }

        void ConfigureCamera(GridManager grid)
        {
            if (gameplayCamera == null)
                gameplayCamera = Camera.main;
            if (gameplayCamera == null)
            {
                var cameraGo = new GameObject("CoreLoopCamera");
                gameplayCamera = cameraGo.AddComponent<Camera>();
            }

            gameplayCamera.orthographic = true;
            gameplayCamera.transform.position = new Vector3(0f, 0f, -10f);
            gameplayCamera.transform.rotation = Quaternion.identity;
            gameplayCamera.backgroundColor = new Color(0.06f, 0.07f, 0.06f, 1f);
            gameplayCamera.clearFlags = CameraClearFlags.SolidColor;

            var aspect = Mathf.Max(0.01f, (float)Screen.width / Mathf.Max(1, Screen.height));
            var halfHeight = grid.Height * grid.CellSize * 0.5f + 0.55f;
            var halfWidthFit = grid.Width * grid.CellSize * 0.5f / aspect + 0.55f;
            gameplayCamera.orthographicSize = Mathf.Max(halfHeight, halfWidthFit);
        }

        void HandleUnitSpawned(UnitInstance unit) => CreateOrSyncUnit(unit);
        void HandleUnitChanged(UnitInstance unit) => CreateOrSyncUnit(unit);
        void HandleTowerPlaced(TowerInstance tower) => CreateOrSyncTower(tower);
        void HandleTowerMoved(TowerInstance tower, GridCell _, GridCell __) => CreateOrSyncTower(tower);

        void HandleTowerSold(TowerInstance tower)
        {
            if (!_towerViews.TryGetValue(tower.InstanceId, out var view)) return;
            _towerViews.Remove(tower.InstanceId);
            Destroy(view);
        }

        void HandleTowerAttacked(TowerInstance tower, float _)
        {
            if (!_towerViews.TryGetValue(tower.InstanceId, out var view)) return;
            view.transform.localScale = new Vector3(0.86f, 0.86f, 1f);
        }

        void CreateOrSyncUnit(UnitInstance unit)
        {
            if (unit == null) return;
            if (!unit.IsAlive || unit.Escaped)
            {
                RemoveUnitView(unit.InstanceId);
                return;
            }

            if (!_unitViews.TryGetValue(unit.InstanceId, out var view))
            {
                view = CreateSquareView(unit.InstanceId, _unitRoot, new Color(0.82f, 0.24f, 0.18f, 1f), 0.5f, 10);
                _unitViews[unit.InstanceId] = view;
            }

            view.transform.position = new Vector3(unit.Position.x, unit.Position.y, -0.1f);
            view.SetActive(true);
        }

        void RemoveUnitView(string instanceId)
        {
            if (!_unitViews.TryGetValue(instanceId, out var view)) return;
            _unitViews.Remove(instanceId);
            Destroy(view);
        }

        void CreateOrSyncTower(TowerInstance tower)
        {
            if (tower == null) return;
            if (!_towerViews.TryGetValue(tower.InstanceId, out var view))
            {
                view = CreateSquareView(tower.InstanceId, _towerRoot, ResolveTowerColor(tower), 0.72f, 20);
                _towerViews[tower.InstanceId] = view;
            }

            view.transform.position = new Vector3(tower.Position.x, tower.Position.y, -0.2f);
            view.transform.localScale = new Vector3(0.72f, 0.72f, 1f);
            view.SetActive(true);
        }

        GameObject CreateSquareView(string instanceId, Transform parent, Color color, float scale, int sortingOrder)
        {
            var go = new GameObject(instanceId);
            go.transform.SetParent(parent, false);
            go.transform.localScale = new Vector3(scale, scale, 1f);

            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = _squareSprite;
            sr.color = color;
            sr.sortingOrder = sortingOrder;
            return go;
        }

        Color ResolveTowerColor(TowerInstance tower)
        {
            var family = tower.Def != null ? tower.Def.family.ToString() : string.Empty;
            switch (family)
            {
                case "Frost":
                    return new Color(0.38f, 0.72f, 0.9f, 1f);
                case "Siege":
                    return new Color(0.83f, 0.46f, 0.26f, 1f);
                case "Stun":
                    return new Color(0.68f, 0.55f, 0.9f, 1f);
                default:
                    return new Color(0.82f, 0.66f, 0.27f, 1f);
            }
        }

        static Sprite CreateSquareSprite()
        {
            var tex = new Texture2D(1, 1, TextureFormat.RGBA32, false);
            tex.SetPixel(0, 0, Color.white);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
        }
    }
}
