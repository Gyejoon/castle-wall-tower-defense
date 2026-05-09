using GLD.Core;
using GLD.Data;
using GLD.SceneRuntime;
using GLD.SceneRuntime.CoreLoop.Input;
using GLD.Systems.Energy;
using GLD.Systems.Act;
using GLD.Systems.DamageNumbers;
using GLD.Systems.Grid;
using GLD.Systems.Orchestrator;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using GLD.Systems.Waves;
using GLD.SceneRuntime.CoreLoop.Render;
using GLD.SceneRuntime.CoreLoop.Runtime;
using GLD.SceneRuntime.CoreLoop.UI;
using UnityEngine;
using UnityEngine.UIElements;

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
        [SerializeField] bool autoStartAfterDelay = true;
        [SerializeField] float autoStartDelaySeconds = 5f;
        [SerializeField] CoreLoopFieldRenderer fieldRenderer;
        [SerializeField] CoreLoopHudController hudController;
        [SerializeField] GameHudController gameHudController;
        [SerializeField] TowerActionSheetController towerActionSheetController;
        [SerializeField] SummonRevealController summonRevealController;
        [SerializeField] UpgradePickOverlayController upgradePickOverlayController;
        [SerializeField] PauseModalController pauseModalController;
        [SerializeField] BossHpBarController bossHpBarController;
        [SerializeField] BossWarningOverlayController bossWarningOverlayController;
        [SerializeField] GameOverOverlayController gameOverOverlayController;
        [SerializeField] ToastOverlayController toastOverlayController;
        [SerializeField] TutorialOverlayController tutorialOverlayController;
        [SerializeField] LobbyMetaScreenController lobbyMetaScreenController;
        [SerializeField] UIDocument gameHudDocument;

        public GridManager Grid { get; private set; }
        public EnergySystem Energy { get; private set; }
        public UnitSystem Units { get; private set; }
        public TowerSystem Towers { get; private set; }
        public WaveSystem Waves { get; private set; }
        public WallSystem Wall { get; private set; }
        public TowerSlotSystem TowerSlots { get; private set; }
        public PlayerTacticSystem Tactics { get; private set; }
        public GameStateManager State { get; private set; }
        public RunState RunState { get; private set; }
        public DamageNumberSystem DamageNumbers { get; private set; }
        public CoreOrchestrator Orchestrator { get; private set; }
        public PlacementCoordinator Placement { get; private set; }

        CombatMediator _combatMediator;
        BossContextBuilder _bossContextBuilder;
        InputController _inputController;
        float _autoStartRemainingSeconds;

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
            Towers = new TowerSystem(Grid, Energy, Units, database.elementMatchup);
            Waves = new WaveSystem(database.waves, database.units, Units);
            Wall = new WallSystem(Energy, Units);
            TowerSlots = new TowerSlotSystem(database, Towers, Grid);
            Tactics = new PlayerTacticSystem(Units);
            RunState = new RunState();
            State = new GameStateManager(RunState);
            RunState.SetEnergy(Energy.Current, Energy.Max);
            RunState.SetWave(Waves.CurrentWaveSlot, Waves.Phase);
            _autoStartRemainingSeconds = autoStartAfterDelay ? Mathf.Max(0f, autoStartDelaySeconds) : 0f;
            RunState.SetCountdown(_autoStartRemainingSeconds);
            State.SetSpeedMultiplier(speedMultiplier);
            DamageNumbers = new DamageNumberSystem(transform);
            Orchestrator = new CoreOrchestrator(database, Towers, Waves, energy: Energy, towerSlots: TowerSlots, wall: Wall, tactics: Tactics);
            Orchestrator.Enable();
            BindRunStateEvents();
            GameEvents.OnRequestSetSpeed += SetSpeedMultiplier;
            GameEvents.OnRequestPause += HandleRequestPause;
            GameEvents.OnRequestResume += HandleRequestResume;
            _combatMediator = new CombatMediator(Units, Towers, State, DamageNumbers, Wall);
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

            WireGameHud();

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
            UnbindRunStateEvents();
            GameEvents.OnRequestSetSpeed -= SetSpeedMultiplier;
            GameEvents.OnRequestPause -= HandleRequestPause;
            GameEvents.OnRequestResume -= HandleRequestResume;
            _inputController?.Dispose();
            Placement?.Dispose();
            _combatMediator?.Dispose();
            Orchestrator?.Dispose();
            DamageNumbers?.Dispose();
            _inputController = null;
            Placement = null;
            _combatMediator = null;
            Orchestrator = null;
            DamageNumbers = null;
            RunState = null;
            GameEvents.ClearRuntimeListeners();
            Time.timeScale = 1f;
        }

        void FixedUpdate()
        {
            if (Waves == null || State == null) return;

            TickAutoStartCountdown(Time.fixedDeltaTime);
            if (Waves.Phase == WavePhase.Idle)
                return;

            var scaledDelta = State.Tick(Time.fixedDeltaTime);
            if (scaledDelta <= 0f) return;
            Energy.Tick(scaledDelta);
            Wall?.Tick(scaledDelta);
            Tactics?.Tick(scaledDelta);
            Waves.Tick(scaledDelta);
            Units.Tick(scaledDelta);
            Towers.Tick(scaledDelta);
        }

        public bool StartRun()
        {
            if (Waves == null)
                return false;
            _autoStartRemainingSeconds = 0f;
            RunState?.SetCountdown(0f);
            return Waves.Start(1);
        }

        void TickAutoStartCountdown(float deltaSeconds)
        {
            if (!autoStartAfterDelay || Waves == null || Waves.Phase != WavePhase.Idle || RunState == null)
                return;
            if (RunState.RunStatus != RunStatus.Building || deltaSeconds <= 0f)
                return;

            _autoStartRemainingSeconds = Mathf.Max(0f, _autoStartRemainingSeconds - deltaSeconds);
            RunState.SetCountdown(_autoStartRemainingSeconds);
            if (_autoStartRemainingSeconds <= 0f)
                StartRun();
        }

        void WireGameHud()
        {
            if (gameHudDocument == null)
                gameHudDocument = GetComponent<UIDocument>();
            if (gameHudDocument == null)
                gameHudDocument = gameObject.AddComponent<UIDocument>();

            if (gameHudController == null)
                gameHudController = GetComponent<GameHudController>();
            if (gameHudController == null)
                gameHudController = gameObject.AddComponent<GameHudController>();

            gameHudController.Bind(RunState, gameHudDocument);

            if (towerActionSheetController == null)
                towerActionSheetController = GetComponent<TowerActionSheetController>();
            if (towerActionSheetController == null)
                towerActionSheetController = gameObject.AddComponent<TowerActionSheetController>();

            towerActionSheetController.Bind(gameHudDocument);

            if (summonRevealController == null)
                summonRevealController = GetComponent<SummonRevealController>();
            if (summonRevealController == null)
                summonRevealController = gameObject.AddComponent<SummonRevealController>();

            summonRevealController.Bind(this, gameHudDocument);

            if (upgradePickOverlayController == null)
                upgradePickOverlayController = GetComponent<UpgradePickOverlayController>();
            if (upgradePickOverlayController == null)
                upgradePickOverlayController = gameObject.AddComponent<UpgradePickOverlayController>();

            upgradePickOverlayController.Bind(gameHudDocument);

            if (pauseModalController == null)
                pauseModalController = GetComponent<PauseModalController>();
            if (pauseModalController == null)
                pauseModalController = gameObject.AddComponent<PauseModalController>();

            pauseModalController.Bind(RunState, gameHudDocument);

            if (bossHpBarController == null)
                bossHpBarController = GetComponent<BossHpBarController>();
            if (bossHpBarController == null)
                bossHpBarController = gameObject.AddComponent<BossHpBarController>();

            bossHpBarController.Bind(RunState, gameHudDocument);

            if (bossWarningOverlayController == null)
                bossWarningOverlayController = GetComponent<BossWarningOverlayController>();
            if (bossWarningOverlayController == null)
                bossWarningOverlayController = gameObject.AddComponent<BossWarningOverlayController>();

            bossWarningOverlayController.Bind(gameHudDocument);

            if (gameOverOverlayController == null)
                gameOverOverlayController = GetComponent<GameOverOverlayController>();
            if (gameOverOverlayController == null)
                gameOverOverlayController = gameObject.AddComponent<GameOverOverlayController>();

            gameOverOverlayController.Bind(RunState, gameHudDocument);

            if (toastOverlayController == null)
                toastOverlayController = GetComponent<ToastOverlayController>();
            if (toastOverlayController == null)
                toastOverlayController = gameObject.AddComponent<ToastOverlayController>();

            toastOverlayController.Bind(gameHudDocument);

            if (tutorialOverlayController == null)
                tutorialOverlayController = GetComponent<TutorialOverlayController>();
            if (tutorialOverlayController == null)
                tutorialOverlayController = gameObject.AddComponent<TutorialOverlayController>();

            tutorialOverlayController.Bind(RunState, gameHudDocument);

            if (lobbyMetaScreenController == null)
                lobbyMetaScreenController = GetComponent<LobbyMetaScreenController>();
            if (lobbyMetaScreenController == null)
                lobbyMetaScreenController = gameObject.AddComponent<LobbyMetaScreenController>();

            lobbyMetaScreenController.Bind(RunState, gameHudDocument);
            Wall?.EmitState();
        }

        public void SetSpeedMultiplier(float value)
        {
            speedMultiplier = value;
            State?.SetSpeedMultiplier(value);
        }

        void BindRunStateEvents()
        {
            GameEvents.OnEnergyChanged += HandleEnergyChanged;
            GameEvents.OnWaveStarted += HandleWaveStarted;
            GameEvents.OnWavePrepStarted += HandleWavePrepStarted;
            GameEvents.OnWavePrepTick += HandleWavePrepTick;
            GameEvents.OnCheckpointReady += HandleCheckpointReady;
            GameEvents.OnBossHpUpdated += HandleBossHpUpdated;
            GameEvents.OnBossDefeated += HandleBossDefeated;
            GameEvents.OnPlayerHpChanged += HandlePlayerHpChanged;
            GameEvents.OnSpeedChanged += HandleSpeedChanged;
            GameEvents.OnPauseChanged += HandlePauseChanged;
            GameEvents.OnGameOver += HandleGameOver;
        }

        void UnbindRunStateEvents()
        {
            GameEvents.OnEnergyChanged -= HandleEnergyChanged;
            GameEvents.OnWaveStarted -= HandleWaveStarted;
            GameEvents.OnWavePrepStarted -= HandleWavePrepStarted;
            GameEvents.OnWavePrepTick -= HandleWavePrepTick;
            GameEvents.OnCheckpointReady -= HandleCheckpointReady;
            GameEvents.OnBossHpUpdated -= HandleBossHpUpdated;
            GameEvents.OnBossDefeated -= HandleBossDefeated;
            GameEvents.OnPlayerHpChanged -= HandlePlayerHpChanged;
            GameEvents.OnSpeedChanged -= HandleSpeedChanged;
            GameEvents.OnPauseChanged -= HandlePauseChanged;
            GameEvents.OnGameOver -= HandleGameOver;
        }

        void HandleEnergyChanged(int current, int max) => RunState?.SetEnergy(current, max);

        void HandleWaveStarted(int waveSlot)
        {
            RunState?.SetRunStatus(RunStatus.Running);
            RunState?.SetWave(waveSlot, WavePhase.Running);
            RunState?.SetCountdown(0f);
        }

        void HandleWavePrepStarted(int nextWaveSlot, float durationSeconds)
        {
            RunState?.SetWave(Mathf.Max(0, nextWaveSlot - 1), WavePhase.Interwave);
            RunState?.SetCountdown(durationSeconds);
        }

        void HandleWavePrepTick(int nextWaveSlot, float remainingSeconds) => RunState?.SetCountdown(remainingSeconds);

        void HandleCheckpointReady(int waveSlot, CheckpointReward[] _) =>
            RunState?.SetWave(waveSlot, WavePhase.Checkpoint);

        void HandleBossHpUpdated(string unitId, string defId, int hp, int maxHp, int phase) =>
            RunState?.SetBossHp(unitId, defId, hp, maxHp, phase);

        void HandleBossDefeated(string unitId, int waveSlot) => RunState?.ClearBoss();

        void HandlePlayerHpChanged(int playerHp) => RunState?.SetLives(playerHp);

        void HandleSpeedChanged(float multiplier) => RunState?.SetSpeedMultiplier(multiplier);

        void HandlePauseChanged(bool paused) => RunState?.SetPaused(paused);

        void HandleGameOver(bool victory)
        {
            State?.SetGameOverStatus(victory);
            if (victory && RunState != null)
                RunState.SetWave(Waves != null ? Waves.CurrentWaveSlot : RunState.Wave, WavePhase.Victory);
        }

        void HandleRequestPause() => State?.SetPaused(true);

        void HandleRequestResume() => State?.SetPaused(false);

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
