using System.Collections.Generic;
using GLD.Data;
using GLD.Systems.Minimal;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.Slice2
{
    public sealed class Slice2SceneController : MonoBehaviour
    {
        [Header("Data")]
        [SerializeField] MapLayoutSO mapLayout;
        [SerializeField] TowerDefSO archerDef;
        [SerializeField] UnitDefSO waveUnitDef;
        [SerializeField] bool usePocMapOverride = true;

        [Header("Scene")]
        [SerializeField] Camera gameplayCamera;
        [SerializeField] UIDocument hudDocument;
        [SerializeField] TowerInstanceView towerPrefab;
        [SerializeField] UnitInstanceView unitPrefab;
        [SerializeField] Transform gameplayRoot;
        [SerializeField] float prepSeconds = 0.5f;

        readonly Dictionary<string, UnitInstanceView> _unitViews = new Dictionary<string, UnitInstanceView>();
        Sprite _squareSprite;
        float _prepRemaining;
        bool _waveStarted;

        public MinimalGridManager Grid { get; private set; }
        public MinimalEnergySystem Energy { get; private set; }
        public MinimalUnitSystem Units { get; private set; }
        public MinimalTowerSystem Towers { get; private set; }
        public MinimalWaveSystem Waves { get; private set; }
        public bool WaveCompleted => Waves != null && Waves.IsCompleted;
        public TowerDefSO ArcherDef => archerDef;

        public event System.Action<int> BaseHpChanged;

        void Awake()
        {
            MinimalGameEvents.Clear();
            _squareSprite = CreateSquareSprite();

            if (gameplayCamera == null)
                gameplayCamera = Camera.main;
            if (gameplayRoot == null)
                gameplayRoot = transform;

            Grid = usePocMapOverride
                ? new MinimalGridManager(MinimalReplayRunner.CreatePocMap())
                : new MinimalGridManager(mapLayout);
            Energy = new MinimalEnergySystem();
            Units = new MinimalUnitSystem(Grid, Energy);
            Towers = new MinimalTowerSystem(Grid, Energy, Units);
            Waves = new MinimalWaveSystem(Units, waveUnitDef);

            Units.UnitSpawned += HandleUnitSpawned;
            Units.BaseHpChanged += hp =>
            {
                BaseHpChanged?.Invoke(hp);
                Hud?.SetBaseHp(hp);
            };
            Towers.TowerPlaced += HandleTowerPlaced;

            DrawGrid();
            WireHud();
            WirePlacement();
            _prepRemaining = Mathf.Max(0f, prepSeconds);
        }

        void OnDestroy()
        {
            MinimalGameEvents.Clear();
        }

        void Update()
        {
            var dt = Time.deltaTime;
            if (!_waveStarted)
            {
                _prepRemaining -= dt;
                if (_prepRemaining <= 0f)
                {
                    _waveStarted = true;
                    Waves.StartWave1();
                }
            }

            Energy.Tick(dt);
            Waves.Tick(dt);
            Units.Tick(dt);
            Towers.Tick(dt);
            SyncUnitViews();
        }

        public Slice2HudController Hud { get; private set; }
        public PlacementController Placement { get; private set; }

        public bool PlaceArcherAt(int col, int row, bool spendEnergy = true)
        {
            return Towers.PlaceArcher(archerDef, new MinimalGridCell(col, row), spendEnergy);
        }

        public void StartWaveNow()
        {
            if (_waveStarted) return;
            _waveStarted = true;
            Waves.StartWave1();
        }

        void WireHud()
        {
            if (hudDocument == null)
                hudDocument = FindFirstObjectByType<UIDocument>();
            if (hudDocument == null) return;

            Hud = hudDocument.GetComponent<Slice2HudController>();
            if (Hud == null)
                Hud = hudDocument.gameObject.AddComponent<Slice2HudController>();
            Hud.Bind(this, hudDocument);
            Hud.SetEnergy(Energy.Current, Energy.Max);
            Hud.SetBaseHp(Units.BaseHp);
        }

        void WirePlacement()
        {
            Placement = GetComponent<PlacementController>();
            if (Placement == null)
                Placement = gameObject.AddComponent<PlacementController>();
            Placement.Bind(this, gameplayCamera);
        }

        void HandleTowerPlaced(MinimalTowerState tower)
        {
            var view = towerPrefab != null
                ? Instantiate(towerPrefab, gameplayRoot)
                : CreateTowerView();
            view.Bind(tower, _squareSprite);
        }

        void HandleUnitSpawned(MinimalUnitState unit)
        {
            var view = unitPrefab != null
                ? Instantiate(unitPrefab, gameplayRoot)
                : CreateUnitView();
            view.Bind(unit, _squareSprite);
            _unitViews[unit.InstanceId] = view;
        }

        void SyncUnitViews()
        {
            foreach (var unit in Units.Units)
            {
                if (_unitViews.TryGetValue(unit.InstanceId, out var view))
                    view.Sync(unit);
            }
        }

        TowerInstanceView CreateTowerView()
        {
            var go = new GameObject("TowerInstance");
            go.transform.SetParent(gameplayRoot, false);
            go.AddComponent<SpriteRenderer>();
            return go.AddComponent<TowerInstanceView>();
        }

        UnitInstanceView CreateUnitView()
        {
            var go = new GameObject("UnitInstance");
            go.transform.SetParent(gameplayRoot, false);
            go.AddComponent<SpriteRenderer>();
            return go.AddComponent<UnitInstanceView>();
        }

        void DrawGrid()
        {
            var gridRoot = new GameObject("Grid");
            gridRoot.transform.SetParent(gameplayRoot, false);
            for (var row = 0; row < Grid.Height; row++)
            {
                for (var col = 0; col < Grid.Width; col++)
                {
                    var cell = new MinimalGridCell(col, row);
                    var go = new GameObject($"Cell_{col}_{row}");
                    go.transform.SetParent(gridRoot.transform, false);
                    go.transform.position = Grid.GridToWorld3(col, row, 0f);
                    go.transform.localScale = new Vector3(0.94f, 0.94f, 1f);
                    var sr = go.AddComponent<SpriteRenderer>();
                    sr.sprite = _squareSprite;
                    if (Grid.IsPathCell(cell))
                        sr.color = new Color(0.36f, 0.31f, 0.23f, 1f);
                    else if (Grid.IsBuildable(cell))
                        sr.color = new Color(0.19f, 0.35f, 0.24f, 1f);
                    else
                        sr.color = new Color(0.11f, 0.12f, 0.11f, 1f);
                    sr.sortingOrder = -10;
                }
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
