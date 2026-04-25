// Slice2SceneController.cs — Phase 2 Task 4 scene driver.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.1 Plain C# events, wired here at construction time.
//   - §1.3 POCO + View split — TowerView/UnitView are observers ONLY.
//   - §1.4 Construction order: Grid → Energy → Units → Towers → Waves.
//          Tick order: Energy → (input placeholder) → Wave → Units → Towers
//          → ResolveDamage → FlushPendingDamage. View update in LateUpdate
//          AFTER simulation steps (read-only from POCO state).
//   - §1.5 Anti-patterns:
//          * No FindObjectOfType — all wiring is explicit.
//          * Time.deltaTime is read ONCE here and threaded into systems.
//          * No Coroutine / WaitForSeconds — wave system's native prep gate
//            (`prepEndSec`/`_nextSpawnDueSec`) handles prep timing.
//   - §4 OQ-2/OQ-3/OQ-4/OQ-5: slice2_poc map (programmatic), archer at
//     (3,14), cost ⚡20, unit `battle_robot`.
//
// Plan reference: docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md
//   - Task 4 Step 5: scene controller wires systems, subscribes HUD/placement.
//     Prep timing is owned by MinimalWaveSystem itself (prepEndSec=prepDurationSec);
//     StartWave1() is called once in Awake after subscriptions are wired, and
//     the wave system's internal _nextSpawnDueSec gate paces spawns past prep.
//
// GameDatabase note: GameBootstrap is Phase 3 work (per task-brief). For
// Phase 2 the scene controller takes a [SerializeField] GameDatabase
// reference set in the inspector and calls EnsureActive() on it (idempotent;
// no-op once GameBootstrap takes over in Phase 3).

using System.Collections.Generic;
using GLD.Data;
using GLD.Systems.Minimal;
using UnityEngine;

namespace GLD.SceneRuntime.Slice2
{
    /// <summary>
    /// Drives the Slice2_PoC scene end-to-end:
    ///   * Constructs Minimal systems in correct order.
    ///   * Spawns/destroys views in response to POCO events.
    ///   * Threads Time.deltaTime into systems exactly once per frame.
    ///   * Calls WaveSystem.StartWave1() once at Awake; the wave system's
    ///     own prepEndSec gate paces the first spawn 3 seconds in.
    /// Public access for tests via the read-only system properties.
    /// </summary>
    // Explicit default order (0) paired with PlacementController's -100 makes
    // the §1.4 tick-order contract visible at the class declaration: input
    // buffering runs first, this controller drains in the applyInputs phase.
    [DefaultExecutionOrder(0)]
    public sealed class Slice2SceneController : MonoBehaviour
    {
        // ── Inspector wiring ──────────────────────────────────────────────

        [Header("Data")]
        [Tooltip("GameDatabase asset providing TowerCatalog / UnitCatalog / EnergyConfig. " +
                 "Set in the scene inspector; controller calls EnsureActive() at Awake (idempotent).")]
        [SerializeField] GameDatabase database;

        [Tooltip("Tower id from TowerCatalog used for the slice2_poc archer (OQ-3).")]
        [SerializeField] string towerId = "archer";

        [Tooltip("Unit id from UnitCatalog spawned by wave 1 (OQ-5: battle_robot).")]
        [SerializeField] string unitId = "battle_robot";

        [Header("PoC fixture")]
        [Tooltip("Prep duration: wave system's prepEndSec / first-spawn gate. Plan Step 5 = 3.0s.")]
        [SerializeField] float prepDurationSec = 3f;

        [Tooltip("Number of units to spawn in wave 1. PoC fixture = 5.")]
        [SerializeField] int waveCount = 5;

        [Tooltip("Spawn cadence within the wave. PoC fixture = 0.3s (300ms).")]
        [SerializeField] float spawnIntervalSec = 0.3f;

        [Tooltip("RNG seed threaded into MinimalUnitSystem (Phase 3 CC procs only).")]
        [SerializeField] int rngSeed = 12345;

        [Header("Energy economy (PoC fixture)")]
        [SerializeField] float energyInitial = 40f;
        [SerializeField] float energyRegenPerSec = 1f;
        [SerializeField] int energyCap = 200;

        [Header("Prefabs (Slice2)")]
        [Tooltip("Prefab with TowerView MB attached. Instantiated on OnTowerPlaced.")]
        [SerializeField] GameObject towerPrefab;

        [Tooltip("Prefab with UnitView MB attached. Instantiated on OnUnitSpawned.")]
        [SerializeField] GameObject unitPrefab;

        [Header("Slice2 input wiring (Task 5)")]
        [Tooltip("PlacementController in the scene. Drained at the applyInputs " +
                 "tick phase (between Energy.Tick and Wave.Tick). Optional: if " +
                 "null, the scene runs without click-to-place (smoke test path).")]
        [SerializeField] PlacementController placement;

        // ── System references (read-only, exposed for tests) ──────────────

        public MinimalGridManager Grid { get; private set; }
        public MinimalEnergySystem Energy { get; private set; }
        public MinimalUnitSystem Units { get; private set; }
        public MinimalTowerSystem Towers { get; private set; }
        public MinimalWaveSystem Wave { get; private set; }

        // ── Internal state ────────────────────────────────────────────────

        bool _initialized;

        // Tick clock threaded into systems. Mirrors `tickEndTimeSec` argument
        // in TS replay-runner. Time.deltaTime is read here and ONLY here.
        float _tickClockSec;

        // POCO → View dictionaries owned by the controller.
        readonly Dictionary<int, TowerView> _towerViews = new Dictionary<int, TowerView>(8);
        readonly Dictionary<int, UnitView> _unitViews = new Dictionary<int, UnitView>(16);

        // ── Lifecycle ─────────────────────────────────────────────────────

        void Awake()
        {
            // Phase 2 GameDatabase activation: calls EnsureActive (idempotent)
            // so this scene runs standalone in PoC mode without GameBootstrap;
            // Phase 3 GameBootstrap calls Activate first and EnsureActive
            // becomes a no-op.
            if (database != null) database.EnsureActive();

            BuildSystems();
            SubscribeViewEvents();

            // Prep timing is owned by MinimalWaveSystem (prepEndSec=prepDurationSec
            // threaded into the constructor below). Calling StartWave1() here is
            // safe because Tick won't spawn anything until tickEndTimeSec crosses
            // _nextSpawnDueSec=prepEndSec. Doing this in Awake (vs. deferring via
            // an external timer) avoids the burst-spawn-after-prep race where
            // _nextSpawnDueSec=0 lets the first Tick spawn the entire wave in
            // one frame.
            Wave.StartWave1();

            _initialized = true;
        }

        void Update()
        {
            if (!_initialized) return;

            // Read Time.deltaTime ONCE per frame (§1.5 #3).
            float dt = Time.deltaTime;
            if (dt <= 0f) return;
            float tickEnd = _tickClockSec + dt;

            // Per §1.4 tick order:
            //   Energy → applyInputs → Wave → Units → Towers → ResolveDamage → FlushPendingDamage
            Energy.Tick(dt, tickEnd);

            // applyInputs() — Task 5 drains the PlacementController's pointer
            // buffer here so input ordering matches §1.4 (Energy → applyInputs
            // → Wave → Units → Towers → ResolveDamage). The smoke test calls
            // Towers.TryPlace directly so this null-check keeps it green.
            if (placement != null) placement.ApplyPendingInputs(tickEnd);

            // Wave's internal prepEndSec gate keeps the spawn loop dormant
            // until tickEnd crosses prepDurationSec, then paces spawns at
            // spawnIntervalSec. No external prep timer needed.
            Wave.Tick(dt, tickEnd);
            Units.Tick(dt);
            Towers.Tick(dt, tickEnd);
            Towers.ResolveDamage(tickEnd);

            _tickClockSec = tickEnd;
        }

        void OnDestroy()
        {
            // Drop any pending impacts so GC sees a clean state next scene
            // load. Mirrors the runner's flushPendingDamage() epilogue.
            Towers?.FlushPendingDamage();
        }

        void LateUpdate()
        {
            if (!_initialized) return;
            // View update AFTER simulation per §1.4. POCO-only reads.
            foreach (var kvp in _unitViews) kvp.Value.Tick();
            foreach (var kvp in _towerViews) kvp.Value.Tick();
        }

        // ── Construction ──────────────────────────────────────────────────

        void BuildSystems()
        {
            // §1.4 Construction order: Grid → Energy → Units → Towers → Waves.
            var map = Slice2MapBuilder.BuildSlice2PocMap();
            Grid = new MinimalGridManager(map);

            Energy = new MinimalEnergySystem(
                initial: energyInitial,
                regenPerSec: energyRegenPerSec,
                cap: energyCap);

            Units = new MinimalUnitSystem(Grid, new System.Random(rngSeed));
            Towers = new MinimalTowerSystem(Grid, Units, Energy);

            UnitDefSO unitDef = ResolveUnitDef();
            Wave = new MinimalWaveSystem(
                Units, unitDef,
                count: waveCount,
                spawnIntervalSec: spawnIntervalSec,
                prepEndSec: prepDurationSec);
            // prepEndSec=prepDurationSec lets the wave system's own
            // _nextSpawnDueSec gate pace spawns past prep. StartWave1() is
            // called once at Awake; Tick stays dormant until tickEnd >= prepEndSec.
        }

        void SubscribeViewEvents()
        {
            Towers.OnTowerPlaced += HandleTowerPlaced;
            Units.OnUnitSpawned += HandleUnitSpawned;
            Units.OnUnitKilled += HandleUnitDespawned;
            Units.OnUnitReachedExit += HandleUnitDespawned;

            // Mirror TS replay-runner.ts epilogue: drain in-flight projectiles
            // (impact time > wave-end clock) so OnProjectileDropped fires for
            // residue and parity holds with the runner's flushPendingDamage()
            // at simulation-window end.
            Wave.OnWaveCompleted += HandleWaveCompleted;
        }

        void HandleWaveCompleted()
        {
            Towers?.FlushPendingDamage();
        }

        // ── View lifecycle handlers ───────────────────────────────────────

        void HandleTowerPlaced(TowerInstance tower)
        {
            if (towerPrefab == null) return; // headless / not configured
            var go = Instantiate(towerPrefab, transform);
            go.name = $"Tower_{tower.InstanceId}_{tower.Def.id}";
            var view = go.GetComponent<TowerView>();
            if (view != null)
            {
                view.Bind(tower, Grid);
                _towerViews[tower.InstanceId] = view;
            }
        }

        void HandleUnitSpawned(UnitInstance unit)
        {
            if (unitPrefab == null) return;
            var go = Instantiate(unitPrefab, transform);
            go.name = $"Unit_{unit.InstanceId}_{unit.Def.id}";
            var view = go.GetComponent<UnitView>();
            if (view != null)
            {
                view.Bind(unit, Units, Grid);
                _unitViews[unit.InstanceId] = view;
            }
        }

        void HandleUnitDespawned(UnitInstance unit)
        {
            if (_unitViews.TryGetValue(unit.InstanceId, out var view))
            {
                _unitViews.Remove(unit.InstanceId);
                if (view != null) Destroy(view.gameObject);
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────

        UnitDefSO ResolveUnitDef()
        {
            // Catalog lookup via GameDatabase. If the inspector has not been
            // wired (e.g. EditMode tests), fall back to whatever the test
            // injects. Smoke tests use a real database asset.
            if (database != null && database.units != null)
            {
                var def = database.units.FindById(unitId);
                if (def != null) return def;
            }
            Debug.LogWarning(
                $"[Slice2SceneController] UnitDef '{unitId}' not found in database. " +
                "Wave system will throw on construction. Wire GameDatabase in inspector.");
            return null;
        }

        /// <summary>Test seam: get the resolved tower def from the database.
        /// Smoke tests call this and feed the result back into
        /// <see cref="MinimalTowerSystem.TryPlace"/> directly.</summary>
        public TowerDefSO GetTowerDef()
        {
            if (database != null && database.towers != null)
                return database.towers.FindById(towerId);
            return null;
        }
    }
}
