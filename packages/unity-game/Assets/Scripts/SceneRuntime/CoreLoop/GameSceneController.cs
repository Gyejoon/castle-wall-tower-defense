using GLD.Core;
using GLD.Data;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using GLD.Systems.Waves;
using GLD.SceneRuntime.CoreLoop.Render;
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
            Units = new UnitSystem(Grid, Energy, database.units);
            Towers = new TowerSystem(Grid, Energy, Units);
            Waves = new WaveSystem(database.waves, database.units, Units);

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

            if (autostart)
                Waves.Start(1);
        }

        void OnDestroy()
        {
            GameEvents.ClearRuntimeListeners();
        }

        void FixedUpdate()
        {
            if (Waves == null) return;

            var scaledDelta = Time.fixedDeltaTime * Mathf.Max(0f, speedMultiplier);
            Energy.Tick(scaledDelta);
            Waves.Tick(scaledDelta);
            Units.Tick(scaledDelta);
            Towers.Tick(scaledDelta);
        }

        public bool StartRun() => Waves != null && Waves.Start(1);

        public bool PlaceTower(string towerId, int col, int row, bool spendEnergy = true)
        {
            if (database == null || database.towers == null || Towers == null)
                return false;
            var def = database.towers.FindById(towerId);
            return def != null && Towers.Place(def, new GridCell(col, row), spendEnergy);
        }

        public TowerDefSO FindTowerDef(string towerId)
        {
            if (database == null || database.towers == null || string.IsNullOrEmpty(towerId))
                return null;
            return database.towers.FindById(towerId);
        }
    }
}
