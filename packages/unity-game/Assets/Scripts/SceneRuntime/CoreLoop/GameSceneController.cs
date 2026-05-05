using GLD.Core;
using GLD.Data;
using GLD.SceneRuntime.CoreLoop.Input;
using GLD.Systems.Energy;
using GLD.Systems.DamageNumbers;
using GLD.Systems.Grid;
using GLD.Systems.Orchestrator;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using GLD.Systems.Waves;
using GLD.SceneRuntime.CoreLoop.Render;
using GLD.SceneRuntime.CoreLoop.Runtime;
using UnityEngine;

namespace GLD.SceneRuntime.CoreLoop
{
    public sealed class GameSceneController : MonoBehaviour
    {
        [Header("Data")]
        [SerializeField] GameDatabase database;
        [SerializeField] string mapId = "main_long";
        [SerializeField] bool autostart;

        [Header("Runtime")]
        [SerializeField] float speedMultiplier = 1f;
        [SerializeField] CoreLoopFieldRenderer fieldRenderer;
        [SerializeField] CoreLoopHudController hudController;

        public GridManager Grid { get; private set; }
        public EnergySystem Energy { get; private set; }
        public UnitSystem Units { get; private set; }
        public TowerSystem Towers { get; private set; }
        public WaveSystem Waves { get; private set; }
        public GameStateManager State { get; private set; }
        public DamageNumberSystem DamageNumbers { get; private set; }
        public CoreOrchestrator Orchestrator { get; private set; }
        public PlacementCoordinator Placement { get; private set; }

        CombatMediator _combatMediator;
        BossContextBuilder _bossContextBuilder;
        InputController _inputController;

        void Awake()
        {
            if (database == null)
                database = GameDatabase.Active;
            if (database == null)
            {
                Debug.LogError("GameSceneController requires a GameDatabase reference.");
                enabled = false;
                return;
            }

            Grid = new GridManager(database.map, mapId);
            Energy = new EnergySystem(database.energy);
            Units = new UnitSystem(Grid, Energy, database.units, database.boss);
            Towers = new TowerSystem(Grid, Energy, Units);
            Waves = new WaveSystem(database.waves, database.units, Units);
            State = new GameStateManager();
            State.SetSpeedMultiplier(speedMultiplier);
            DamageNumbers = new DamageNumberSystem(transform);
            Orchestrator = new CoreOrchestrator(database, Towers, Waves, energy: Energy);
            Orchestrator.Enable();
            GameEvents.OnRequestSetSpeed += SetSpeedMultiplier;
            _combatMediator = new CombatMediator(Units, Towers, State, DamageNumbers);
            _bossContextBuilder = new BossContextBuilder();

            if (fieldRenderer == null)
                fieldRenderer = GetComponent<CoreLoopFieldRenderer>();
            if (fieldRenderer == null)
                fieldRenderer = gameObject.AddComponent<CoreLoopFieldRenderer>();
            fieldRenderer.Bind(this);

            if (hudController == null)
                hudController = GetComponent<CoreLoopHudController>();
            if (hudController == null)
                hudController = gameObject.AddComponent<CoreLoopHudController>();
            hudController.Bind(this, fieldRenderer);

            Placement = new PlacementCoordinator(this);
            _inputController = new InputController(this, fieldRenderer, Placement);

            if (autostart)
                Waves.Start(1);
        }

        void Update()
        {
            _inputController?.Tick();
            DamageNumbers?.TickUnscaled(Time.unscaledDeltaTime);
        }

        void OnDestroy()
        {
            GameEvents.OnRequestSetSpeed -= SetSpeedMultiplier;
            _inputController?.Dispose();
            _combatMediator?.Dispose();
            Orchestrator?.Dispose();
            DamageNumbers?.Dispose();
            _inputController = null;
            _combatMediator = null;
            Orchestrator = null;
            DamageNumbers = null;
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        void FixedUpdate()
        {
            if (Waves == null || State == null) return;

            var scaledDelta = State.Tick(Time.fixedDeltaTime);
            if (scaledDelta <= 0f) return;
            Energy.Tick(scaledDelta);
            Waves.Tick(scaledDelta);
            Units.Tick(scaledDelta);
            Towers.Tick(scaledDelta);
        }

        public bool StartRun() => Waves != null && Waves.Start(1);

        public void SetSpeedMultiplier(float value)
        {
            speedMultiplier = value;
            State?.SetSpeedMultiplier(value);
        }

        public bool PlaceTower(string towerId, int col, int row, bool spendEnergy = true)
        {
            if (database == null || database.towers == null || Towers == null)
                return false;
            var def = database.towers.FindById(towerId);
            var placed = def != null && Towers.Place(def, new GridCell(col, row), spendEnergy);
            if (!placed)
                GameEvents.RaiseTowerPlacementFailed(towerId, col, row, def == null ? "unknown_tower" : "placement_rejected");
            return placed;
        }

        public TowerDefSO FindTowerDef(string towerId)
        {
            if (database == null || database.towers == null || string.IsNullOrEmpty(towerId))
                return null;
            return database.towers.FindById(towerId);
        }
    }
}
