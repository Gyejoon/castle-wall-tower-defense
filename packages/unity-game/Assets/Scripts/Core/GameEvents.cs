using System;

namespace GLD.Core
{
    public readonly struct TowerPlacementRequest
    {
        public readonly string TowerId;
        public readonly int Col;
        public readonly int Row;
        public readonly bool SpendEnergy;

        public TowerPlacementRequest(string towerId, int col, int row, bool spendEnergy = true)
        {
            TowerId = towerId;
            Col = col;
            Row = row;
            SpendEnergy = spendEnergy;
        }
    }

    public readonly struct TowerMoveRequest
    {
        public readonly string InstanceId;
        public readonly int Col;
        public readonly int Row;

        public TowerMoveRequest(string instanceId, int col, int row)
        {
            InstanceId = instanceId;
            Col = col;
            Row = row;
        }
    }

    public readonly struct TowerMergeRequest
    {
        public readonly int FromCol;
        public readonly int FromRow;
        public readonly int ToCol;
        public readonly int ToRow;

        public TowerMergeRequest(int fromCol, int fromRow, int toCol, int toRow)
        {
            FromCol = fromCol;
            FromRow = fromRow;
            ToCol = toCol;
            ToRow = toRow;
        }
    }

    public readonly struct GachaRequest
    {
        public readonly int TargetTier;

        public GachaRequest(int targetTier)
        {
            TargetTier = targetTier;
        }
    }

    public readonly struct UpgradeChoice
    {
        public readonly string Id;
        public readonly string Name;
        public readonly string Description;
        public readonly string Icon;

        public UpgradeChoice(string id, string name, string description, string icon)
        {
            Id = id;
            Name = name;
            Description = description;
            Icon = icon;
        }
    }

    public enum CheckpointRewardType
    {
        TowerUpgrade,
        WallUpgrade,
        SkillUpgrade,
        GlobalCard
    }

    public enum PlayerTacticKind
    {
        ForceMove,
        Freeze
    }

    public readonly struct ActDef
    {
        public readonly int ActIndex;
        public readonly int StartWave;
        public readonly int EndWave;

        public ActDef(int actIndex, int startWave, int endWave)
        {
            ActIndex = actIndex;
            StartWave = startWave;
            EndWave = endWave;
        }
    }

    public readonly struct CheckpointReward
    {
        public readonly string Id;
        public readonly CheckpointRewardType Type;
        public readonly string Title;
        public readonly string Description;
        public readonly string Target;

        public CheckpointReward(string id, CheckpointRewardType type, string title, string description, string target = null)
        {
            Id = id;
            Type = type;
            Title = title;
            Description = description;
            Target = target;
        }
    }

    public readonly struct TowerSlotState
    {
        public readonly int SlotIndex;
        public readonly string Family;
        public readonly int Tier;
        public readonly bool Unlocked;
        public readonly int Col;
        public readonly int Row;

        public TowerSlotState(int slotIndex, string family, int tier, bool unlocked, int col, int row)
        {
            SlotIndex = slotIndex;
            Family = family;
            Tier = tier;
            Unlocked = unlocked;
            Col = col;
            Row = row;
        }
    }

    public readonly struct WallState
    {
        public readonly int CurrentHp;
        public readonly int MaxHp;
        public readonly int RepairCost;
        public readonly int RepairAmount;
        public readonly int InstantRepairCharges;
        public readonly int DamageUpgradeCost;
        public readonly int SpeedUpgradeCost;
        public readonly int RangeUpgradeCost;
        public readonly int DamageUpgradeLevel;
        public readonly int SpeedUpgradeLevel;
        public readonly int RangeUpgradeLevel;
        public readonly float RepairCooldownSec;
        public readonly float RepairCooldownRemainingSec;
        public readonly float AutoAttackDamage;
        public readonly float AutoAttackIntervalSec;
        public readonly float AutoAttackRange;

        public WallState(
            int currentHp,
            int maxHp,
            int repairCost,
            int repairAmount,
            float repairCooldownSec,
            float repairCooldownRemainingSec,
            float autoAttackDamage,
            float autoAttackIntervalSec)
            : this(
                currentHp,
                maxHp,
                repairCost,
                repairAmount,
                repairCooldownSec,
                repairCooldownRemainingSec,
                autoAttackDamage,
                autoAttackIntervalSec,
                autoAttackRange: 5f,
                instantRepairCharges: 0,
                damageUpgradeCost: 45,
                speedUpgradeCost: 50,
                rangeUpgradeCost: 40,
                damageUpgradeLevel: 0,
                speedUpgradeLevel: 0,
                rangeUpgradeLevel: 0)
        {
        }

        public WallState(
            int currentHp,
            int maxHp,
            int repairCost,
            int repairAmount,
            float repairCooldownSec,
            float repairCooldownRemainingSec,
            float autoAttackDamage,
            float autoAttackIntervalSec,
            float autoAttackRange,
            int instantRepairCharges,
            int damageUpgradeCost,
            int speedUpgradeCost,
            int rangeUpgradeCost,
            int damageUpgradeLevel,
            int speedUpgradeLevel,
            int rangeUpgradeLevel)
        {
            CurrentHp = currentHp;
            MaxHp = maxHp;
            RepairCost = repairCost;
            RepairAmount = repairAmount;
            InstantRepairCharges = instantRepairCharges;
            DamageUpgradeCost = damageUpgradeCost;
            SpeedUpgradeCost = speedUpgradeCost;
            RangeUpgradeCost = rangeUpgradeCost;
            DamageUpgradeLevel = damageUpgradeLevel;
            SpeedUpgradeLevel = speedUpgradeLevel;
            RangeUpgradeLevel = rangeUpgradeLevel;
            RepairCooldownSec = repairCooldownSec;
            RepairCooldownRemainingSec = repairCooldownRemainingSec;
            AutoAttackDamage = autoAttackDamage;
            AutoAttackIntervalSec = autoAttackIntervalSec;
            AutoAttackRange = autoAttackRange;
        }
    }

    public readonly struct WallAttackEvent
    {
        public readonly float TargetX;
        public readonly float TargetY;
        public readonly float Damage;

        public WallAttackEvent(float targetX, float targetY, float damage)
        {
            TargetX = targetX;
            TargetY = targetY;
            Damage = damage;
        }
    }

    public readonly struct WallProjectileImpactEvent
    {
        public readonly float TargetX;
        public readonly float TargetY;
        public readonly float Damage;

        public WallProjectileImpactEvent(float targetX, float targetY, float damage)
        {
            TargetX = targetX;
            TargetY = targetY;
            Damage = damage;
        }
    }

    public readonly struct PlayerTacticState
    {
        public readonly PlayerTacticKind Kind;
        public readonly bool Unlocked;
        public readonly int Level;
        public readonly float CooldownSec;
        public readonly float CooldownRemainingSec;

        public PlayerTacticState(PlayerTacticKind kind, bool unlocked, int level, float cooldownSec, float cooldownRemainingSec)
        {
            Kind = kind;
            Unlocked = unlocked;
            Level = level;
            CooldownSec = cooldownSec;
            CooldownRemainingSec = cooldownRemainingSec;
        }
    }

    public readonly struct TacticCastRequest
    {
        public readonly PlayerTacticKind Kind;
        public readonly float X;
        public readonly float Y;
        public readonly float Radius;

        public TacticCastRequest(PlayerTacticKind kind, float x, float y, float radius)
        {
            Kind = kind;
            X = x;
            Y = y;
            Radius = radius;
        }
    }

    public static class GameEvents
    {
        public static event Action OnBootComplete;
        public static event Action OnRequestStartRun;
        public static event Action OnRequestPause;
        public static event Action OnRequestResume;
        public static event Action OnRequestQuitToLobby;
        public static event Action OnRequestSummon;
        public static event Action OnRequestCancelSummon;
        public static event Action<TowerPlacementRequest> OnRequestPlaceTower;
        public static event Action<string> OnRequestSellTower;
        public static event Action<TowerMoveRequest> OnRequestMoveTower;
        public static event Action<string> OnRequestSelectTower;
        public static event Action<float> OnRequestSetSpeed;
        public static event Action<TowerMergeRequest> OnRequestMerge;
        public static event Action<GachaRequest> OnRequestGacha;
        public static event Action<string> OnRequestUpgradePick;
        public static event Action OnRequestUpgradeReroll;
        public static event Action<string> OnRequestApplyCheckpointReward;
        public static event Action OnRequestRepairWall;
        public static event Action OnRequestUpgradeWallDamage;
        public static event Action OnRequestUpgradeWallSpeed;
        public static event Action OnRequestUpgradeWallRange;
        public static event Action<TacticCastRequest> OnRequestCastTactic;
        public static event Action OnWallSelected;
        public static event Action<int, int> OnEnergyChanged;
        public static event Action<string> OnSummonOffered;
        public static event Action<string> OnSummonCancelled;
        public static event Action<string> OnSummonConfirmed;
        public static event Action<string> OnRequestRejected;
        public static event Action<string, int, int> OnTowerPlaced;
        public static event Action<string, int, int, string> OnTowerPlacementFailed;
        public static event Action<int, int, string, int> OnTowersMerged;
        public static event Action<int, int, int, int, string> OnMergeFailed;
        public static event Action<string> OnTowerSold;
        public static event Action<string, int, int, int, int> OnTowerMoved;
        public static event Action<string, int, int> OnTowerSelected;
        public static event Action OnTowerDeselected;
        public static event Action<string, float> OnTowerAttacked;
        public static event Action<string> OnUnitSpawned;
        public static event Action<string> OnUnitKilled;
        public static event Action<string> OnUnitEscaped;
        public static event Action<string, float> OnUnitDamaged;
        public static event Action<int> OnWaveStarted;
        public static event Action<int> OnWaveCompleted;
        public static event Action<int, float> OnWavePrepStarted;
        public static event Action<int, float> OnWavePrepTick;
        public static event Action<float> OnTimerTick;
        public static event Action<int> OnBossWaveStarted;
        public static event Action<string, int> OnBossPhaseChanged;
        public static event Action<string, string, int, int, int> OnBossHpUpdated;
        public static event Action<string, int> OnBossDefeated;
        public static event Action<UpgradeChoice[]> OnUpgradeChoiceReady;
        public static event Action<string, int> OnUpgradeApplied;
        public static event Action<ActDef> OnActStarted;
        public static event Action<int, CheckpointReward[]> OnCheckpointReady;
        public static event Action<CheckpointReward> OnCheckpointApplied;
        public static event Action<WallState> OnWallStateChanged;
        public static event Action<WallAttackEvent> OnWallAutoAttacked;
        public static event Action<WallProjectileImpactEvent> OnWallProjectileImpacted;
        public static event Action<PlayerTacticState> OnTacticStateChanged;
        public static event Action<TowerSlotState> OnTowerSlotUpgraded;
        public static event Action<int> OnPlayerHpChanged;
        public static event Action<float> OnSpeedChanged;
        public static event Action<bool> OnPauseChanged;
        public static event Action<string> OnLog;
        public static event Action<bool> OnGameOver;

        internal static void RaiseBootComplete() => OnBootComplete?.Invoke();

        public static void RaiseRequestStartRun() => OnRequestStartRun?.Invoke();
        public static void RaiseRequestPause() => OnRequestPause?.Invoke();
        public static void RaiseRequestResume() => OnRequestResume?.Invoke();
        public static void RaiseRequestQuitToLobby() => OnRequestQuitToLobby?.Invoke();
        public static void RaiseRequestSummon() => OnRequestSummon?.Invoke();
        public static void RaiseRequestCancelSummon() => OnRequestCancelSummon?.Invoke();
        public static void RaiseRequestPlaceTower(TowerPlacementRequest request) => OnRequestPlaceTower?.Invoke(request);
        public static void RaiseRequestSellTower(string instanceId) => OnRequestSellTower?.Invoke(instanceId);
        public static void RaiseRequestMoveTower(TowerMoveRequest request) => OnRequestMoveTower?.Invoke(request);
        public static void RaiseRequestSelectTower(string instanceId) => OnRequestSelectTower?.Invoke(instanceId);
        public static void RaiseRequestSetSpeed(float speedMultiplier) => OnRequestSetSpeed?.Invoke(speedMultiplier);
        public static void RaiseRequestMerge(TowerMergeRequest request) => OnRequestMerge?.Invoke(request);
        public static void RaiseRequestGacha(GachaRequest request) => OnRequestGacha?.Invoke(request);
        public static void RaiseRequestUpgradePick(string upgradeId) => OnRequestUpgradePick?.Invoke(upgradeId);
        public static void RaiseRequestUpgradeReroll() => OnRequestUpgradeReroll?.Invoke();
        public static void RaiseRequestApplyCheckpointReward(string rewardId) => OnRequestApplyCheckpointReward?.Invoke(rewardId);
        public static void RaiseRequestRepairWall() => OnRequestRepairWall?.Invoke();
        public static void RaiseRequestUpgradeWallDamage() => OnRequestUpgradeWallDamage?.Invoke();
        public static void RaiseRequestUpgradeWallSpeed() => OnRequestUpgradeWallSpeed?.Invoke();
        public static void RaiseRequestUpgradeWallRange() => OnRequestUpgradeWallRange?.Invoke();
        public static void RaiseRequestCastTactic(TacticCastRequest request) => OnRequestCastTactic?.Invoke(request);
        public static void RaiseWallSelected() => OnWallSelected?.Invoke();
        public static void RaiseEnergyChanged(int current, int max) => OnEnergyChanged?.Invoke(current, max);
        public static void RaiseSummonOffered(string towerId) => OnSummonOffered?.Invoke(towerId);
        public static void RaiseSummonCancelled(string towerId) => OnSummonCancelled?.Invoke(towerId);
        public static void RaiseSummonConfirmed(string towerId) => OnSummonConfirmed?.Invoke(towerId);
        public static void RaiseRequestRejected(string reason) => OnRequestRejected?.Invoke(reason);
        public static void RaiseTowerPlaced(string towerId, int col, int row) => OnTowerPlaced?.Invoke(towerId, col, row);
        public static void RaiseTowerPlacementFailed(string towerId, int col, int row, string reason) =>
            OnTowerPlacementFailed?.Invoke(towerId, col, row, reason);
        public static void RaiseTowersMerged(int col, int row, string towerId, int toTier) =>
            OnTowersMerged?.Invoke(col, row, towerId, toTier);
        public static void RaiseMergeFailed(int fromCol, int fromRow, int toCol, int toRow, string reason) =>
            OnMergeFailed?.Invoke(fromCol, fromRow, toCol, toRow, reason);
        public static void RaiseTowerSold(string towerId) => OnTowerSold?.Invoke(towerId);
        public static void RaiseTowerMoved(string towerId, int fromCol, int fromRow, int toCol, int toRow) =>
            OnTowerMoved?.Invoke(towerId, fromCol, fromRow, toCol, toRow);
        public static void RaiseTowerSelected(string instanceId, int col, int row) => OnTowerSelected?.Invoke(instanceId, col, row);
        public static void RaiseTowerDeselected() => OnTowerDeselected?.Invoke();
        public static void RaiseTowerAttacked(string towerId, float appliedDamage) => OnTowerAttacked?.Invoke(towerId, appliedDamage);
        public static void RaiseUnitSpawned(string unitId) => OnUnitSpawned?.Invoke(unitId);
        public static void RaiseUnitKilled(string unitId) => OnUnitKilled?.Invoke(unitId);
        public static void RaiseUnitEscaped(string unitId) => OnUnitEscaped?.Invoke(unitId);
        public static void RaiseUnitDamaged(string unitId, float appliedDamage) => OnUnitDamaged?.Invoke(unitId, appliedDamage);
        public static void RaiseWaveStarted(int waveSlot) => OnWaveStarted?.Invoke(waveSlot);
        public static void RaiseWaveCompleted(int waveSlot) => OnWaveCompleted?.Invoke(waveSlot);
        public static void RaiseWavePrepStarted(int waveSlot, float durationSeconds) => OnWavePrepStarted?.Invoke(waveSlot, durationSeconds);
        public static void RaiseWavePrepTick(int waveSlot, float remainingSeconds) => OnWavePrepTick?.Invoke(waveSlot, remainingSeconds);
        public static void RaiseTimerTick(float elapsedSeconds) => OnTimerTick?.Invoke(elapsedSeconds);
        public static void RaiseBossWaveStarted(int waveSlot) => OnBossWaveStarted?.Invoke(waveSlot);
        public static void RaiseBossPhaseChanged(string unitId, int phase) => OnBossPhaseChanged?.Invoke(unitId, phase);
        public static void RaiseBossHpUpdated(string unitId, string defId, int hp, int maxHp, int phase) =>
            OnBossHpUpdated?.Invoke(unitId, defId, hp, maxHp, phase);
        public static void RaiseBossDefeated(string unitId, int waveSlot) => OnBossDefeated?.Invoke(unitId, waveSlot);
        public static void RaiseUpgradeChoiceReady(UpgradeChoice[] choices) => OnUpgradeChoiceReady?.Invoke(choices);
        public static void RaiseUpgradeApplied(string upgradeId, int totalStacks) => OnUpgradeApplied?.Invoke(upgradeId, totalStacks);
        public static void RaiseActStarted(ActDef act) => OnActStarted?.Invoke(act);
        public static void RaiseCheckpointReady(int waveSlot, CheckpointReward[] choices) => OnCheckpointReady?.Invoke(waveSlot, choices);
        public static void RaiseCheckpointApplied(CheckpointReward reward) => OnCheckpointApplied?.Invoke(reward);
        public static void RaiseWallStateChanged(WallState state) => OnWallStateChanged?.Invoke(state);
        public static void RaiseWallAutoAttacked(WallAttackEvent attackEvent) => OnWallAutoAttacked?.Invoke(attackEvent);
        public static void RaiseWallProjectileImpacted(WallProjectileImpactEvent impactEvent) =>
            OnWallProjectileImpacted?.Invoke(impactEvent);
        public static void RaiseTacticStateChanged(PlayerTacticState state) => OnTacticStateChanged?.Invoke(state);
        public static void RaiseTowerSlotUpgraded(TowerSlotState state) => OnTowerSlotUpgraded?.Invoke(state);
        public static void RaisePlayerHpChanged(int playerHp) => OnPlayerHpChanged?.Invoke(playerHp);
        public static void RaiseSpeedChanged(float speedMultiplier) => OnSpeedChanged?.Invoke(speedMultiplier);
        public static void RaisePauseChanged(bool paused) => OnPauseChanged?.Invoke(paused);
        public static void RaiseLog(string message) => OnLog?.Invoke(message);
        public static void RaiseGameOver(bool victory) => OnGameOver?.Invoke(victory);

        public static void ClearRuntimeListeners()
        {
            OnBootComplete = null;
            OnRequestStartRun = null;
            OnRequestPause = null;
            OnRequestResume = null;
            OnRequestQuitToLobby = null;
            OnRequestSummon = null;
            OnRequestCancelSummon = null;
            OnRequestPlaceTower = null;
            OnRequestSellTower = null;
            OnRequestMoveTower = null;
            OnRequestSelectTower = null;
            OnRequestSetSpeed = null;
            OnRequestMerge = null;
            OnRequestGacha = null;
            OnRequestUpgradePick = null;
            OnRequestUpgradeReroll = null;
            OnRequestApplyCheckpointReward = null;
            OnRequestRepairWall = null;
            OnRequestUpgradeWallDamage = null;
            OnRequestUpgradeWallSpeed = null;
            OnRequestUpgradeWallRange = null;
            OnRequestCastTactic = null;
            OnWallSelected = null;
            OnEnergyChanged = null;
            OnSummonOffered = null;
            OnSummonCancelled = null;
            OnSummonConfirmed = null;
            OnRequestRejected = null;
            OnTowerPlaced = null;
            OnTowerPlacementFailed = null;
            OnTowersMerged = null;
            OnMergeFailed = null;
            OnTowerSold = null;
            OnTowerMoved = null;
            OnTowerSelected = null;
            OnTowerDeselected = null;
            OnTowerAttacked = null;
            OnUnitSpawned = null;
            OnUnitKilled = null;
            OnUnitEscaped = null;
            OnUnitDamaged = null;
            OnWaveStarted = null;
            OnWaveCompleted = null;
            OnWavePrepStarted = null;
            OnWavePrepTick = null;
            OnTimerTick = null;
            OnBossWaveStarted = null;
            OnBossPhaseChanged = null;
            OnBossHpUpdated = null;
            OnBossDefeated = null;
            OnUpgradeChoiceReady = null;
            OnUpgradeApplied = null;
            OnActStarted = null;
            OnCheckpointReady = null;
            OnCheckpointApplied = null;
            OnWallStateChanged = null;
            OnWallAutoAttacked = null;
            OnWallProjectileImpacted = null;
            OnTacticStateChanged = null;
            OnTowerSlotUpgraded = null;
            OnPlayerHpChanged = null;
            OnSpeedChanged = null;
            OnPauseChanged = null;
            OnLog = null;
            OnGameOver = null;
        }
    }
}
