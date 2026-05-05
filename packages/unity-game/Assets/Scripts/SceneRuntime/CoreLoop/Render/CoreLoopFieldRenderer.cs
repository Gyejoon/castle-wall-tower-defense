using System.Collections.Generic;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Grid;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using UnityEngine;

namespace GLD.SceneRuntime.CoreLoop.Render
{
    public sealed class CoreLoopFieldRenderer : MonoBehaviour
    {
        const float CellScale = 0.94f;
        const float TowerTargetWorldWidth = 1f;
        const float UnitTargetWorldWidth = 0.5f;
        const float BossTargetWorldWidth = 0.72f;

        [SerializeField] Camera gameplayCamera;
        [SerializeField] Transform renderRoot;
        [SerializeField] TowerSpriteCatalogSO towerSprites;
        [SerializeField] UnitSpriteCatalogSO unitSprites;
        [SerializeField] TileSpriteCatalogSO tileSprites;

        readonly Dictionary<string, GameObject> _unitViews = new Dictionary<string, GameObject>();
        readonly Dictionary<string, GameObject> _towerViews = new Dictionary<string, GameObject>();
        readonly List<GameObject> _placementMarkers = new List<GameObject>();
        readonly Dictionary<int, Sprite> _firstFrameSprites = new Dictionary<int, Sprite>();

        GameSceneController _controller;
        Sprite _squareSprite;
        Transform _gridRoot;
        Transform _placementRoot;
        Transform _unitRoot;
        Transform _towerRoot;
        bool _placementMarkersVisible;
        string _placementTowerId;

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
            if (towerSprites == null)
                towerSprites = Resources.Load<TowerSpriteCatalogSO>("Visuals/TowerSpriteCatalog");
            if (unitSprites == null)
                unitSprites = Resources.Load<UnitSpriteCatalogSO>("Visuals/UnitSpriteCatalog");
            if (tileSprites == null)
                tileSprites = Resources.Load<TileSpriteCatalogSO>("Visuals/TileSpriteCatalog");
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
            GameEvents.OnSummonOffered += HandleSummonOffered;
            GameEvents.OnSummonCancelled += HandleSummonEnded;
            GameEvents.OnSummonConfirmed += HandleSummonEnded;
        }

        void UnbindEvents()
        {
            if (_controller == null) return;
            if (_controller.Units != null)
            {
                _controller.Units.UnitSpawned -= HandleUnitSpawned;
                _controller.Units.UnitKilled -= HandleUnitChanged;
                _controller.Units.UnitEscaped -= HandleUnitChanged;
            }

            if (_controller.Towers != null)
            {
                _controller.Towers.TowerPlaced -= HandleTowerPlaced;
                _controller.Towers.TowerMoved -= HandleTowerMoved;
                _controller.Towers.TowerSold -= HandleTowerSold;
                _controller.Towers.TowerAttacked -= HandleTowerAttacked;
            }

            GameEvents.OnSummonOffered -= HandleSummonOffered;
            GameEvents.OnSummonCancelled -= HandleSummonEnded;
            GameEvents.OnSummonConfirmed -= HandleSummonEnded;
        }

        void EnsureRoots()
        {
            ClearRuntimeChildren();

            _gridRoot = CreateRoot("Grid");
            _placementRoot = CreateRoot("PlacementMarkers");
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
            _placementMarkers.Clear();
            RenderedCellCount = 0;
        }

        void DrawGrid(GridManager grid)
        {
            if (TryDrawIllustratedBackground(grid))
            {
                RenderedCellCount = grid.Width * grid.Height;
                return;
            }

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
                    sr.sprite = ResolveTileSprite(grid, cell);
                    sr.color = sr.sprite == _squareSprite ? ResolveCellColor(grid, cell) : Color.white;
                    sr.sortingOrder = -20;
                    RenderedCellCount++;
                }
            }
        }

        bool TryDrawIllustratedBackground(GridManager grid)
        {
            if (grid.MapId != "main_long")
                return false;
            if (tileSprites == null || tileSprites.mainLongBackground == null)
                return false;

            var background = new GameObject("MainLongIllustratedBackground");
            background.transform.SetParent(_gridRoot, false);
            background.transform.position = Vector3.zero;

            var sr = background.AddComponent<SpriteRenderer>();
            sr.sprite = tileSprites.mainLongBackground;
            sr.color = Color.white;
            sr.sortingOrder = -40;

            var bounds = sr.sprite.bounds.size;
            var targetWidth = grid.Width * grid.CellSize;
            var targetHeight = grid.Height * grid.CellSize;
            background.transform.localScale = new Vector3(
                targetWidth / Mathf.Max(0.01f, bounds.x),
                targetHeight / Mathf.Max(0.01f, bounds.y),
                1f);
            return true;
        }

        Sprite ResolveTileSprite(GridManager grid, GridCell cell)
        {
            if (tileSprites == null)
                return _squareSprite;
            if (cell.Equals(grid.SpawnCell) && tileSprites.spawn != null)
                return tileSprites.spawn;
            if (cell.Equals(grid.ExitCell) && tileSprites.exit != null)
                return tileSprites.exit;
            if (grid.IsBlocked(cell) && tileSprites.blocked != null)
                return tileSprites.blocked;
            if (grid.IsPathCell(cell) && tileSprites.path != null)
                return tileSprites.path;
            if (grid.IsBuildable(cell) && tileSprites.buildable != null)
                return tileSprites.buildable;
            return tileSprites.ground != null ? tileSprites.ground : _squareSprite;
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
        void HandleTowerPlaced(TowerInstance tower)
        {
            CreateOrSyncTower(tower);
            RefreshPlacementMarkers();
        }

        void HandleTowerMoved(TowerInstance tower, GridCell _, GridCell __)
        {
            CreateOrSyncTower(tower);
            RefreshPlacementMarkers();
        }

        void HandleTowerSold(TowerInstance tower)
        {
            if (!_towerViews.TryGetValue(tower.InstanceId, out var view)) return;
            _towerViews.Remove(tower.InstanceId);
            Destroy(view);
            RefreshPlacementMarkers();
        }

        void HandleSummonOffered(string towerId) => ShowPlacementMarkers(towerId);
        void HandleSummonEnded(string _) => HidePlacementMarkers();

        void HandleTowerAttacked(TowerInstance tower, float _)
        {
            if (!_towerViews.TryGetValue(tower.InstanceId, out var view)) return;
            view.transform.localScale = ResolveTowerScale(tower, view.GetComponent<SpriteRenderer>()) * 1.08f;
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
                view = CreateUnitView(unit);
                _unitViews[unit.InstanceId] = view;
            }

            view.transform.position = new Vector3(unit.Position.x, unit.Position.y, -0.1f);
            view.transform.localScale = ResolveUnitScale(unit, view.GetComponent<SpriteRenderer>());
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
                view = CreateTowerView(tower);
                _towerViews[tower.InstanceId] = view;
            }

            view.transform.position = new Vector3(tower.Position.x, tower.Position.y, -0.2f);
            view.transform.localScale = ResolveTowerScale(tower, view.GetComponent<SpriteRenderer>());
            view.SetActive(true);
            RefreshPlacementMarkers();
        }

        GameObject CreateTowerView(TowerInstance tower)
        {
            var go = new GameObject(tower.InstanceId);
            go.transform.SetParent(_towerRoot, false);

            var sr = go.AddComponent<SpriteRenderer>();
            var sprite = towerSprites != null ? towerSprites.FindStatic(tower.Def.id) : null;
            sr.sprite = sprite != null ? sprite : _squareSprite;
            sr.color = sprite != null ? Color.white : ResolveTowerColor(tower);
            sr.sortingOrder = 20;

            return go;
        }

        GameObject CreateUnitView(UnitInstance unit)
        {
            var go = new GameObject(unit.InstanceId);
            go.transform.SetParent(_unitRoot, false);

            var sr = go.AddComponent<SpriteRenderer>();
            var sheet = unitSprites != null ? unitSprites.FindWalk(unit.Def.id) : null;
            var sprite = CreateFirstFrameSprite(sheet);
            sr.sprite = sprite != null ? sprite : _squareSprite;
            sr.color = sprite != null ? Color.white : new Color(0.82f, 0.24f, 0.18f, 1f);
            sr.sortingOrder = unit.Boss.IsBoss ? 14 : 10;

            return go;
        }

        public void ShowPlacementMarkers()
        {
            ShowPlacementMarkers(_placementTowerId);
        }

        public void ShowPlacementMarkers(string towerId)
        {
            _placementTowerId = towerId;
            _placementMarkersVisible = true;
            RefreshPlacementMarkers();
        }

        public void HidePlacementMarkers()
        {
            _placementMarkersVisible = false;
            _placementTowerId = null;
            for (var i = 0; i < _placementMarkers.Count; i++)
                _placementMarkers[i].SetActive(false);
        }

        void RefreshPlacementMarkers()
        {
            if (!_placementMarkersVisible || _controller == null || _controller.Grid == null || _placementRoot == null)
                return;

            var index = 0;
            foreach (var cell in _controller.Grid.GetBuildableCells())
            {
                if (!_controller.Grid.IsBuildable(cell) || _controller.Towers.GetAt(cell) != null)
                    continue;

                var marker = EnsurePlacementMarker(index++);
                var pos = _controller.Grid.GridToPlacementWorld(cell);
                marker.transform.position = new Vector3(pos.x, pos.y, -0.12f);
                var sr = marker.GetComponent<SpriteRenderer>();
                SyncPlacementMarkerSprite(sr);
                marker.transform.localScale = ResolvePlacementMarkerScale(sr);
                marker.SetActive(true);
            }

            for (var i = index; i < _placementMarkers.Count; i++)
                _placementMarkers[i].SetActive(false);
        }

        GameObject EnsurePlacementMarker(int index)
        {
            while (_placementMarkers.Count <= index)
            {
                var marker = new GameObject($"PlacementMarker_{_placementMarkers.Count}");
                marker.transform.SetParent(_placementRoot, false);
                var sr = marker.AddComponent<SpriteRenderer>();
                SyncPlacementMarkerSprite(sr);
                sr.sortingOrder = 8;
                _placementMarkers.Add(marker);
            }

            return _placementMarkers[index];
        }

        void SyncPlacementMarkerSprite(SpriteRenderer renderer)
        {
            if (renderer == null) return;
            var sprite = !string.IsNullOrEmpty(_placementTowerId) && towerSprites != null
                ? towerSprites.FindStatic(_placementTowerId)
                : null;
            renderer.sprite = sprite != null ? sprite : _squareSprite;
            renderer.color = sprite != null
                ? new Color(0.1f, 1f, 0.35f, 0.78f)
                : new Color(0.18f, 1f, 0.45f, 0.62f);
        }

        Vector3 ResolvePlacementMarkerScale(SpriteRenderer renderer)
        {
            if (renderer == null || renderer.sprite == null || renderer.sprite == _squareSprite)
                return new Vector3(0.86f, 0.86f, 1f);

            var width = Mathf.Max(0.01f, renderer.sprite.bounds.size.x);
            var scale = TowerTargetWorldWidth / width;
            return new Vector3(scale, scale, 1f);
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

        Vector3 ResolveTowerScale(TowerInstance tower, SpriteRenderer renderer)
        {
            if (renderer == null || renderer.sprite == null || renderer.sprite == _squareSprite)
                return new Vector3(0.72f, 0.72f, 1f);

            var width = Mathf.Max(0.01f, renderer.sprite.bounds.size.x);
            var scale = TowerTargetWorldWidth / width;
            return new Vector3(scale, scale, 1f);
        }

        Vector3 ResolveUnitScale(UnitInstance unit, SpriteRenderer renderer)
        {
            if (renderer == null || renderer.sprite == null || renderer.sprite == _squareSprite)
                return new Vector3(unit.Boss.IsBoss ? 0.72f : 0.5f, unit.Boss.IsBoss ? 0.72f : 0.5f, 1f);

            var width = Mathf.Max(0.01f, renderer.sprite.bounds.size.x);
            var targetWidth = unit.Boss.IsBoss ? BossTargetWorldWidth : UnitTargetWorldWidth;
            var scale = targetWidth / width;
            return new Vector3(scale, scale, 1f);
        }

        Sprite CreateFirstFrameSprite(Sprite sheet)
        {
            if (sheet == null || sheet.texture == null)
                return null;

            var key = sheet.GetInstanceID();
            if (_firstFrameSprites.TryGetValue(key, out var cached))
                return cached;

            var rect = sheet.textureRect;
            var frameSize = Mathf.Min(rect.height, rect.width);
            var frameRect = new Rect(rect.x, rect.y, frameSize, rect.height);
            var sprite = Sprite.Create(sheet.texture, frameRect, new Vector2(0.5f, 0.5f), sheet.pixelsPerUnit);
            _firstFrameSprites[key] = sprite;
            return sprite;
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
