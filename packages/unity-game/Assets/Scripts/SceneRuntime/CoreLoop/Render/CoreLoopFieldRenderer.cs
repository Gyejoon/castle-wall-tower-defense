using System.Collections.Generic;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Grid;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using UnityEngine;
using UnityEngine.Tilemaps;

namespace GLD.SceneRuntime.CoreLoop.Render
{
    public sealed class CoreLoopFieldRenderer : MonoBehaviour
    {
        const float TowerTargetWorldWidth = 1f;
        const float UnitTargetWorldWidth = 0.5f;
        const float BossTargetWorldWidth = 0.72f;
        const float AttackPulseDurationSeconds = 0.16f;
        const float AttackLineDurationSeconds = 0.12f;
        const float ImpactPulseDurationSeconds = 0.24f;
        const float UnitHpBarWidth = 0.54f;
        const float BossHpBarWidth = 0.82f;
        const float HpBarHeight = 0.065f;
        const float WallHpBarWidth = 1.2f;
        const float WallHpBarHeight = 0.09f;

        [SerializeField] Camera gameplayCamera;
        [SerializeField] Transform renderRoot;
        [SerializeField] TowerSpriteCatalogSO towerSprites;
        [SerializeField] UnitSpriteCatalogSO unitSprites;
        [SerializeField] TileSpriteCatalogSO tileSprites;
        [SerializeField] bool useIllustratedBackground = true;
        [SerializeField] bool showMapTileLayers;

        readonly Dictionary<string, GameObject> _unitViews = new Dictionary<string, GameObject>();
        readonly Dictionary<string, HealthBarView> _unitHpBars = new Dictionary<string, HealthBarView>();
        readonly Dictionary<string, GameObject> _towerViews = new Dictionary<string, GameObject>();
        readonly Dictionary<string, float> _towerPulseUntil = new Dictionary<string, float>();
        readonly List<AttackLineFx> _attackLines = new List<AttackLineFx>();
        readonly List<ImpactPulseFx> _impactPulses = new List<ImpactPulseFx>();
        readonly List<GameObject> _placementMarkers = new List<GameObject>();
        readonly Dictionary<int, Sprite> _firstFrameSprites = new Dictionary<int, Sprite>();
        readonly Dictionary<Sprite, Tile> _runtimeTiles = new Dictionary<Sprite, Tile>();

        GameSceneController _controller;
        Sprite _squareSprite;
        Transform _gridRoot;
        Transform _placementRoot;
        Transform _unitRoot;
        Transform _towerRoot;
        Transform _attackFxRoot;
        Transform _healthRoot;
        HealthBarView _wallHpBar;
        Material _attackLineMaterial;
        bool _placementMarkersVisible;
        string _placementTowerId;

        sealed class AttackLineFx
        {
            public GameObject GameObject;
            public LineRenderer Line;
            public float AgeSeconds;
            public Color StartColor;
            public Color EndColor;
        }

        sealed class ImpactPulseFx
        {
            public GameObject GameObject;
            public SpriteRenderer Renderer;
            public float AgeSeconds;
        }

        sealed class HealthBarView
        {
            public GameObject GameObject;
            public SpriteRenderer Back;
            public SpriteRenderer Fill;
            public TextMesh Label;
            public float Width;
            public float Height;
        }

        public int RenderedCellCount { get; private set; }
        public int RenderedUnitCount => _unitViews.Count;
        public int RenderedUnitHealthBarCount => _unitHpBars.Count;
        public bool HasWallHealthBar => _wallHpBar != null && _wallHpBar.GameObject != null;
        public int RenderedTowerCount => _towerViews.Count;
        public int ActiveAttackFxCount => _attackLines.Count + _impactPulses.Count;
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
            SyncWallHpBar();
        }

        void OnDestroy()
        {
            UnbindEvents();
            ClearRuntimeTiles();
            if (_attackLineMaterial != null)
                Destroy(_attackLineMaterial);
        }

        void LateUpdate()
        {
            if (_controller == null || _controller.Units == null)
                return;

            foreach (var unit in _controller.Units.Units)
                CreateOrSyncUnit(unit);
            foreach (var tower in _controller.Towers.Towers)
                SyncTowerViewPose(tower);
            SyncWallHpBar();
            TickAttackLines(Time.unscaledDeltaTime);
            TickImpactPulses(Time.unscaledDeltaTime);
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
            GameEvents.OnWallAutoAttacked += HandleWallAutoAttacked;
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
            GameEvents.OnWallAutoAttacked -= HandleWallAutoAttacked;
        }

        void EnsureRoots()
        {
            ClearRuntimeChildren();

            _gridRoot = CreateRoot("Grid");
            _placementRoot = CreateRoot("PlacementMarkers");
            _unitRoot = CreateRoot("Units");
            _towerRoot = CreateRoot("Towers");
            _attackFxRoot = CreateRoot("AttackFx");
            _healthRoot = CreateRoot("HealthBars");
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
            _unitHpBars.Clear();
            _towerViews.Clear();
            _towerPulseUntil.Clear();
            _attackLines.Clear();
            _impactPulses.Clear();
            _placementMarkers.Clear();
            _wallHpBar = null;
            RenderedCellCount = 0;
        }

        void DrawGrid(GridManager grid)
        {
            var hasIllustratedBackground = TryDrawIllustratedBackground(grid);
            var tilemapGrid = CreateTilemapGrid(grid);
            var terrain = CreateTilemapLayer(tilemapGrid.transform, "TerrainTilemap", -20);
            var overlay = CreateTilemapLayer(tilemapGrid.transform, "BuildableOverlayTilemap", -18);
            var shouldShowTileLayers = !hasIllustratedBackground || showMapTileLayers;
            terrain.renderer.enabled = shouldShowTileLayers;
            overlay.renderer.enabled = shouldShowTileLayers;
            terrain.tilemap.color = hasIllustratedBackground
                ? new Color(1f, 1f, 1f, 0.42f)
                : Color.white;
            overlay.tilemap.color = hasIllustratedBackground
                ? new Color(1f, 1f, 1f, 0.26f)
                : new Color(1f, 1f, 1f, 0.82f);

            for (var row = 0; row < grid.Height; row++)
            {
                for (var col = 0; col < grid.Width; col++)
                {
                    var cell = new GridCell(col, row);
                    var tilePos = ToTilemapCell(cell);
                    var sprite = ResolveTileSprite(grid, cell);
                    var target = hasIllustratedBackground && grid.IsBuildable(cell)
                        ? overlay.tilemap
                        : terrain.tilemap;

                    target.SetTile(tilePos, GetOrCreateTile(sprite));
                    target.SetTileFlags(tilePos, TileFlags.None);
                    target.SetColor(tilePos, sprite == _squareSprite ? ResolveCellColor(grid, cell) : Color.white);
                    RenderedCellCount++;
                }
            }
        }

        GameObject CreateTilemapGrid(GridManager grid)
        {
            var go = new GameObject("TilemapGrid");
            go.transform.SetParent(_gridRoot, false);
            go.transform.localPosition = new Vector3(
                -grid.Width * grid.CellSize * 0.5f,
                grid.Height * grid.CellSize * 0.5f,
                0f);

            var unityGrid = go.AddComponent<UnityEngine.Grid>();
            unityGrid.cellSize = new Vector3(grid.CellSize, grid.CellSize, 1f);
            unityGrid.cellGap = Vector3.zero;
            return go;
        }

        (Tilemap tilemap, TilemapRenderer renderer) CreateTilemapLayer(Transform parent, string layerName, int sortingOrder)
        {
            var go = new GameObject(layerName);
            go.transform.SetParent(parent, false);

            var tilemap = go.AddComponent<Tilemap>();
            tilemap.tileAnchor = new Vector3(0.5f, 0.5f, 0f);

            var renderer = go.AddComponent<TilemapRenderer>();
            renderer.sortingOrder = sortingOrder;
            return (tilemap, renderer);
        }

        static Vector3Int ToTilemapCell(GridCell cell) => new Vector3Int(cell.Col, -cell.Row, 0);

        TileBase GetOrCreateTile(Sprite sprite)
        {
            if (sprite == null)
                sprite = _squareSprite;
            if (_runtimeTiles.TryGetValue(sprite, out var cached))
                return cached;

            var tile = ScriptableObject.CreateInstance<Tile>();
            tile.sprite = sprite;
            tile.color = Color.white;
            tile.flags = TileFlags.None;
            _runtimeTiles[sprite] = tile;
            return tile;
        }

        void ClearRuntimeTiles()
        {
            foreach (var tile in _runtimeTiles.Values)
            {
                if (tile != null)
                    Destroy(tile);
            }
            _runtimeTiles.Clear();
        }

        bool TryDrawIllustratedBackground(GridManager grid)
        {
            if (!useIllustratedBackground)
                return false;
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
            var halfHeight = grid.Height * grid.CellSize * 0.5f;
            var halfWidthFit = grid.Width * grid.CellSize * 0.5f / aspect;
            gameplayCamera.orthographicSize = aspect <= 0.75f
                ? halfWidthFit
                : Mathf.Max(halfHeight, halfWidthFit);
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
            _towerPulseUntil[tower.InstanceId] = Time.unscaledTime + AttackPulseDurationSeconds;
            SyncTowerViewPose(tower);
            CreateAttackLine(tower.Position, tower.LastDamageWorldPosition);
        }

        void HandleWallAutoAttacked(WallAttackEvent attackEvent)
        {
            if (_controller == null || _controller.Grid == null)
                return;

            var from = _controller.Grid.GridToWorld(_controller.Grid.ExitCell);
            var to = new Vector2(attackEvent.TargetX, attackEvent.TargetY);
            CreateAttackLine(
                from,
                to,
                new Color(0.72f, 0.96f, 1f, 1f),
                new Color(1f, 0.86f, 0.32f, 0.9f),
                0.11f,
                0.035f);
            CreateImpactPulse(to);
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
            SyncUnitHpBar(unit);
        }

        void RemoveUnitView(string instanceId)
        {
            if (!_unitViews.TryGetValue(instanceId, out var view)) return;
            _unitViews.Remove(instanceId);
            Destroy(view);
            RemoveUnitHpBar(instanceId);
        }

        void SyncUnitHpBar(UnitInstance unit)
        {
            if (unit == null || _healthRoot == null)
                return;

            if (!unit.IsAlive || unit.Escaped)
            {
                RemoveUnitHpBar(unit.InstanceId);
                return;
            }

            if (!_unitHpBars.TryGetValue(unit.InstanceId, out var bar))
            {
                bar = CreateHealthBar(
                    $"HpBar_{unit.InstanceId}",
                    _healthRoot,
                    unit.Boss.IsBoss ? BossHpBarWidth : UnitHpBarWidth,
                    HpBarHeight,
                    sortingOrder: 70,
                    withLabel: false);
                _unitHpBars[unit.InstanceId] = bar;
            }

            var yOffset = unit.Boss.IsBoss ? 0.58f : 0.42f;
            SyncHealthBar(
                bar,
                new Vector3(unit.Position.x, unit.Position.y + yOffset, -0.55f),
                unit.Hp,
                unit.MaxHp,
                showLabel: false);
        }

        void RemoveUnitHpBar(string instanceId)
        {
            if (!_unitHpBars.TryGetValue(instanceId, out var bar)) return;
            _unitHpBars.Remove(instanceId);
            if (bar.GameObject != null)
                Destroy(bar.GameObject);
        }

        void SyncWallHpBar()
        {
            if (_controller == null || _controller.Grid == null || _controller.Wall == null || _healthRoot == null)
                return;

            if (_wallHpBar == null || _wallHpBar.GameObject == null)
            {
                _wallHpBar = CreateHealthBar(
                    "WallHpBar",
                    _healthRoot,
                    WallHpBarWidth,
                    WallHpBarHeight,
                    sortingOrder: 72,
                    withLabel: true);
            }

            var wall = _controller.Wall;
            var basePos = _controller.Grid.GridToWorld(_controller.Grid.ExitCell);
            SyncHealthBar(
                _wallHpBar,
                new Vector3(basePos.x, basePos.y + 0.78f, -0.56f),
                wall.CurrentHp,
                wall.MaxHp,
                showLabel: true);
        }

        void CreateOrSyncTower(TowerInstance tower)
        {
            if (tower == null) return;
            if (!_towerViews.TryGetValue(tower.InstanceId, out var view))
            {
                view = CreateTowerView(tower);
                _towerViews[tower.InstanceId] = view;
            }

            SyncTowerViewPose(tower);
            RefreshPlacementMarkers();
        }

        void SyncTowerViewPose(TowerInstance tower)
        {
            if (tower == null || !_towerViews.TryGetValue(tower.InstanceId, out var view))
                return;

            view.transform.position = new Vector3(tower.Position.x, tower.Position.y, -0.2f);
            var baseScale = ResolveTowerScale(tower, view.GetComponent<SpriteRenderer>());
            var pulseScale = _towerPulseUntil.TryGetValue(tower.InstanceId, out var until) && Time.unscaledTime < until
                ? 1.18f
                : 1f;
            if (pulseScale <= 1f)
                _towerPulseUntil.Remove(tower.InstanceId);
            view.transform.localScale = baseScale * pulseScale;
            view.SetActive(true);
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

        HealthBarView CreateHealthBar(string name, Transform parent, float width, float height, int sortingOrder, bool withLabel)
        {
            if (_squareSprite == null)
                _squareSprite = CreateSquareSprite();

            var root = new GameObject(name);
            root.transform.SetParent(parent, false);

            var backGo = new GameObject("Back");
            backGo.transform.SetParent(root.transform, false);
            var back = backGo.AddComponent<SpriteRenderer>();
            back.sprite = _squareSprite;
            back.color = new Color(0.08f, 0.06f, 0.03f, 0.92f);
            back.sortingOrder = sortingOrder;

            var fillGo = new GameObject("Fill");
            fillGo.transform.SetParent(root.transform, false);
            var fill = fillGo.AddComponent<SpriteRenderer>();
            fill.sprite = _squareSprite;
            fill.color = new Color(0.46f, 0.75f, 0.28f, 0.96f);
            fill.sortingOrder = sortingOrder + 1;

            TextMesh label = null;
            if (withLabel)
            {
                var labelGo = new GameObject("Label");
                labelGo.transform.SetParent(root.transform, false);
                labelGo.transform.localPosition = new Vector3(0f, height + 0.11f, 0f);
                label = labelGo.AddComponent<TextMesh>();
                label.anchor = TextAnchor.MiddleCenter;
                label.alignment = TextAlignment.Center;
                label.fontSize = 36;
                label.characterSize = 0.028f;
                label.color = new Color(1f, 0.92f, 0.62f, 1f);
                var textRenderer = labelGo.GetComponent<MeshRenderer>();
                if (textRenderer != null)
                    textRenderer.sortingOrder = sortingOrder + 2;
            }

            return new HealthBarView
            {
                GameObject = root,
                Back = back,
                Fill = fill,
                Label = label,
                Width = width,
                Height = height
            };
        }

        void SyncHealthBar(HealthBarView bar, Vector3 position, float current, float max, bool showLabel)
        {
            if (bar == null || bar.GameObject == null || bar.Back == null || bar.Fill == null)
                return;

            var safeMax = Mathf.Max(1f, max);
            var safeCurrent = Mathf.Clamp(current, 0f, safeMax);
            var ratio = Mathf.Clamp01(safeCurrent / safeMax);
            var fillWidth = Mathf.Max(0.001f, bar.Width * ratio);

            bar.GameObject.transform.position = position;
            bar.GameObject.SetActive(true);
            bar.Back.transform.localScale = new Vector3(bar.Width, bar.Height, 1f);
            bar.Fill.transform.localScale = new Vector3(fillWidth, bar.Height * 0.72f, 1f);
            bar.Fill.transform.localPosition = new Vector3((fillWidth - bar.Width) * 0.5f, 0f, -0.01f);
            bar.Fill.color = ResolveHpFillColor(ratio);

            if (bar.Label != null)
            {
                bar.Label.gameObject.SetActive(showLabel);
                if (showLabel)
                    bar.Label.text = $"{Mathf.CeilToInt(safeCurrent)}/{Mathf.CeilToInt(safeMax)}";
            }
        }

        static Color ResolveHpFillColor(float ratio)
        {
            if (ratio <= 0.3f)
                return new Color(0.75f, 0.19f, 0.13f, 0.96f);
            if (ratio <= 0.6f)
                return new Color(0.78f, 0.55f, 0.25f, 0.96f);
            return new Color(0.46f, 0.75f, 0.28f, 0.96f);
        }

        void CreateAttackLine(Vector2 from, Vector2 to)
        {
            CreateAttackLine(
                from,
                to,
                new Color(1f, 0.92f, 0.36f, 0.95f),
                new Color(1f, 0.35f, 0.12f, 0.85f),
                0.075f,
                0.025f);
        }

        void CreateAttackLine(Vector2 from, Vector2 to, Color startColor, Color endColor, float startWidth, float endWidth)
        {
            if (_attackFxRoot == null)
                return;

            var fx = new AttackLineFx
            {
                GameObject = new GameObject("AttackLine"),
                AgeSeconds = 0f
            };
            fx.GameObject.transform.SetParent(_attackFxRoot, false);
            fx.Line = fx.GameObject.AddComponent<LineRenderer>();
            fx.Line.useWorldSpace = true;
            fx.Line.positionCount = 2;
            fx.Line.SetPosition(0, new Vector3(from.x, from.y, -0.35f));
            fx.Line.SetPosition(1, new Vector3(to.x, to.y, -0.35f));
            fx.Line.startWidth = startWidth;
            fx.Line.endWidth = endWidth;
            fx.StartColor = startColor;
            fx.EndColor = endColor;
            fx.Line.startColor = startColor;
            fx.Line.endColor = endColor;
            fx.Line.sortingOrder = 50;
            fx.Line.material = GetAttackLineMaterial();
            _attackLines.Add(fx);
        }

        void CreateImpactPulse(Vector2 position)
        {
            if (_attackFxRoot == null)
                return;

            if (_squareSprite == null)
                _squareSprite = CreateSquareSprite();

            var pulse = new ImpactPulseFx
            {
                GameObject = new GameObject("WallImpactPulse"),
                AgeSeconds = 0f
            };
            pulse.GameObject.transform.SetParent(_attackFxRoot, false);
            pulse.GameObject.transform.position = new Vector3(position.x, position.y, -0.36f);
            pulse.GameObject.transform.localScale = new Vector3(0.18f, 0.18f, 1f);
            pulse.Renderer = pulse.GameObject.AddComponent<SpriteRenderer>();
            pulse.Renderer.sprite = _squareSprite;
            pulse.Renderer.color = new Color(0.72f, 0.96f, 1f, 0.86f);
            pulse.Renderer.sortingOrder = 55;
            _impactPulses.Add(pulse);
        }

        void TickAttackLines(float unscaledDeltaSeconds)
        {
            for (var i = _attackLines.Count - 1; i >= 0; i--)
            {
                var fx = _attackLines[i];
                if (fx == null || fx.GameObject == null || fx.Line == null)
                {
                    _attackLines.RemoveAt(i);
                    continue;
                }

                fx.AgeSeconds += Mathf.Max(0f, unscaledDeltaSeconds);
                var t = Mathf.Clamp01(fx.AgeSeconds / AttackLineDurationSeconds);
                fx.Line.startColor = Fade(fx.StartColor, 1f - t);
                fx.Line.endColor = Fade(fx.EndColor, 1f - t);

                if (fx.AgeSeconds < AttackLineDurationSeconds)
                    continue;

                Destroy(fx.GameObject);
                _attackLines.RemoveAt(i);
            }
        }

        void TickImpactPulses(float unscaledDeltaSeconds)
        {
            for (var i = _impactPulses.Count - 1; i >= 0; i--)
            {
                var pulse = _impactPulses[i];
                if (pulse == null || pulse.GameObject == null || pulse.Renderer == null)
                {
                    _impactPulses.RemoveAt(i);
                    continue;
                }

                pulse.AgeSeconds += Mathf.Max(0f, unscaledDeltaSeconds);
                var t = Mathf.Clamp01(pulse.AgeSeconds / ImpactPulseDurationSeconds);
                var scale = Mathf.Lerp(0.18f, 0.58f, t);
                pulse.GameObject.transform.localScale = new Vector3(scale, scale, 1f);
                pulse.Renderer.color = new Color(0.72f, 0.96f, 1f, 0.86f * (1f - t));

                if (pulse.AgeSeconds < ImpactPulseDurationSeconds)
                    continue;

                Destroy(pulse.GameObject);
                _impactPulses.RemoveAt(i);
            }
        }

        static Color Fade(Color color, float alphaMultiplier)
        {
            color.a *= Mathf.Clamp01(alphaMultiplier);
            return color;
        }

        Material GetAttackLineMaterial()
        {
            if (_attackLineMaterial != null)
                return _attackLineMaterial;

            var shader = Shader.Find("Sprites/Default");
            if (shader == null)
                shader = Shader.Find("Universal Render Pipeline/Unlit");
            _attackLineMaterial = new Material(shader);
            return _attackLineMaterial;
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
