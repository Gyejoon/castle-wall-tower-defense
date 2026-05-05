using System;
using GLD.Core;
using GLD.Core.Random;
using GLD.Data;
using GLD.Systems.Energy;
using GLD.Systems.Gacha;
using GLD.Systems.Grid;
using GLD.Systems.Merge;
using GLD.Systems.Towers;
using GLD.Systems.Upgrade;
using GLD.Systems.Waves;

namespace GLD.Systems.Orchestrator
{
    public sealed class CoreOrchestrator : IDisposable
    {
        enum PendingSummonSource
        {
            Summon,
            Gacha
        }

        sealed class PendingSummon
        {
            public string TowerId;
            public PendingSummonSource Source;
            public int EnergyRefund;
            public int TargetTier;
        }

        readonly GameDatabase _database;
        readonly TowerSystem _towers;
        readonly WaveSystem _waves;
        readonly EnergySystem _energy;
        readonly DeterministicRng _rng;
        readonly UpgradeCardSystem _upgrades;
        PendingSummon _pendingSummon;
        string _cancelledPoolDraw;
        PendingSummon _cancelledGachaDraw;
        UpgradeChoice[] _pendingUpgradeChoices;
        bool _subscribed;

        public CoreOrchestrator(GameDatabase database, TowerSystem towers, WaveSystem waves, uint seed = 12345u, EnergySystem energy = null)
        {
            _database = database ?? throw new ArgumentNullException(nameof(database));
            _towers = towers ?? throw new ArgumentNullException(nameof(towers));
            _waves = waves ?? throw new ArgumentNullException(nameof(waves));
            _energy = energy;
            _rng = new DeterministicRng(seed);
            if (_database.upgrades != null)
                _upgrades = new UpgradeCardSystem(_database.upgrades);
        }

        public string PendingSummonTowerId => _pendingSummon?.TowerId;

        public void Enable()
        {
            if (_subscribed)
                return;

            GameEvents.OnRequestStartRun += HandleStartRun;
            GameEvents.OnRequestSummon += HandleSummon;
            GameEvents.OnRequestCancelSummon += HandleCancelSummon;
            GameEvents.OnRequestPlaceTower += HandlePlaceTower;
            GameEvents.OnRequestSellTower += HandleSellTower;
            GameEvents.OnRequestMoveTower += HandleMoveTower;
            GameEvents.OnRequestMerge += HandleMerge;
            GameEvents.OnRequestGacha += HandleGacha;
            GameEvents.OnRequestUpgradePick += HandleUpgradePick;
            GameEvents.OnRequestUpgradeReroll += HandleUpgradeReroll;
            GameEvents.OnWaveCompleted += HandleWaveCompleted;
            _subscribed = true;
        }

        public void Dispose()
        {
            if (!_subscribed)
                return;

            GameEvents.OnRequestStartRun -= HandleStartRun;
            GameEvents.OnRequestSummon -= HandleSummon;
            GameEvents.OnRequestCancelSummon -= HandleCancelSummon;
            GameEvents.OnRequestPlaceTower -= HandlePlaceTower;
            GameEvents.OnRequestSellTower -= HandleSellTower;
            GameEvents.OnRequestMoveTower -= HandleMoveTower;
            GameEvents.OnRequestMerge -= HandleMerge;
            GameEvents.OnRequestGacha -= HandleGacha;
            GameEvents.OnRequestUpgradePick -= HandleUpgradePick;
            GameEvents.OnRequestUpgradeReroll -= HandleUpgradeReroll;
            GameEvents.OnWaveCompleted -= HandleWaveCompleted;
            _subscribed = false;
        }

        void HandleStartRun()
        {
            if (_waves.Phase != WavePhase.Idle)
                return;
            _waves.Start(1);
        }

        void HandleSummon()
        {
            if (_pendingSummon != null)
            {
                GameEvents.RaiseSummonOffered(_pendingSummon.TowerId);
                return;
            }

            var towerId = !string.IsNullOrEmpty(_cancelledPoolDraw)
                ? _cancelledPoolDraw
                : DrawFromSummonPool();
            _cancelledPoolDraw = null;

            if (string.IsNullOrEmpty(towerId))
            {
                Reject("summon_pool_empty");
                return;
            }

            _pendingSummon = new PendingSummon { TowerId = towerId, Source = PendingSummonSource.Summon };
            GameEvents.RaiseSummonOffered(towerId);
        }

        void HandleCancelSummon()
        {
            if (_pendingSummon == null)
                return;

            if (_pendingSummon.EnergyRefund > 0)
                _energy?.Add(_pendingSummon.EnergyRefund);

            if (_pendingSummon.Source == PendingSummonSource.Gacha)
                _cancelledGachaDraw = _pendingSummon;
            else
                _cancelledPoolDraw = _pendingSummon.TowerId;

            GameEvents.RaiseSummonCancelled(_pendingSummon.TowerId);
            _pendingSummon = null;
        }

        void HandlePlaceTower(TowerPlacementRequest request)
        {
            var towerId = !string.IsNullOrEmpty(request.TowerId) ? request.TowerId : _pendingSummon?.TowerId;
            var def = _database.towers != null ? _database.towers.FindById(towerId) : null;
            if (def == null)
            {
                FailPlacement(towerId, request.Col, request.Row, "unknown_tower");
                return;
            }

            var spendEnergy = request.SpendEnergy && (_pendingSummon == null || _pendingSummon.Source == PendingSummonSource.Summon);
            var placed = _towers.Place(def, new GridCell(request.Col, request.Row), spendEnergy);
            if (!placed)
            {
                FailPlacement(towerId, request.Col, request.Row, "placement_rejected");
                HandleCancelSummon();
                return;
            }

            if (_pendingSummon != null && towerId == _pendingSummon.TowerId)
            {
                GameEvents.RaiseSummonConfirmed(towerId);
                _pendingSummon = null;
                _cancelledPoolDraw = null;
                _cancelledGachaDraw = null;
            }
        }

        void HandleSellTower(string instanceId)
        {
            if (!_towers.Sell(instanceId))
                Reject("sell_rejected");
        }

        void HandleMoveTower(TowerMoveRequest request)
        {
            if (!_towers.Move(request.InstanceId, new GridCell(request.Col, request.Row)))
                Reject("move_rejected");
        }

        void HandleMerge(TowerMergeRequest request)
        {
            var from = _towers.GetAt(new GridCell(request.FromCol, request.FromRow));
            var to = _towers.GetAt(new GridCell(request.ToCol, request.ToRow));
            if (from == null || to == null)
            {
                GameEvents.RaiseMergeFailed(request.FromCol, request.FromRow, request.ToCol, request.ToRow, "invalid-tile");
                return;
            }

            var result = MergeSystem.Resolve(from.Def, to.Def, _database.towers, _database.mergeChain);
            if (!result.Success)
            {
                GameEvents.RaiseMergeFailed(
                    request.FromCol,
                    request.FromRow,
                    request.ToCol,
                    request.ToRow,
                    MergeSystem.ToEventReason(result.Reason));
                return;
            }

            var target = to.Cell;
            _towers.Sell(from.InstanceId);
            _towers.Sell(to.InstanceId);
            if (!_towers.Place(result.Output, target, spendEnergy: false))
            {
                GameEvents.RaiseMergeFailed(request.FromCol, request.FromRow, request.ToCol, request.ToRow, "invalid-tile");
                return;
            }

            GameEvents.RaiseTowersMerged(target.Col, target.Row, result.Output.id, result.Output.tier);
        }

        void HandleGacha(GachaRequest request)
        {
            if (request.TargetTier < 2 || request.TargetTier > 4)
            {
                Reject("invalid_gacha_tier");
                return;
            }

            var cost = GachaSystem.GetCost(_database.energy, request.TargetTier);
            if (_energy != null && !_energy.Spend(cost))
            {
                Reject("insufficient_energy");
                return;
            }

            if (_cancelledGachaDraw != null && _cancelledGachaDraw.TargetTier != request.TargetTier)
                _cancelledGachaDraw = null;

            if (_cancelledGachaDraw != null)
            {
                _pendingSummon = _cancelledGachaDraw;
                _cancelledGachaDraw = null;
                GameEvents.RaiseSummonOffered(_pendingSummon.TowerId);
                return;
            }

            var oddsBonus = _upgrades != null ? _upgrades.TierOddsBonus : 0f;
            var tower = GachaSystem.Draw(_database.towers, _database.energy, request.TargetTier, _rng, oddsBonus);
            if (tower == null)
            {
                if (cost > 0)
                    _energy?.Add(cost);
                Reject("gacha_pool_empty");
                return;
            }

            _pendingSummon = new PendingSummon
            {
                TowerId = tower.id,
                Source = PendingSummonSource.Gacha,
                EnergyRefund = cost,
                TargetTier = request.TargetTier
            };
            GameEvents.RaiseSummonOffered(tower.id);
        }

        void HandleUpgradePick(string upgradeId)
        {
            if (_upgrades == null || !TryParseUpgradeId(upgradeId, out var id))
            {
                Reject("unknown_upgrade");
                return;
            }

            var stacks = _upgrades.Apply(id);
            ApplyUpgradeModifiers();
            GameEvents.RaiseUpgradeApplied(upgradeId, stacks);
        }

        void HandleUpgradeReroll()
        {
            OfferUpgrades();
        }

        void HandleWaveCompleted(int waveSlot)
        {
            if (waveSlot > 0 && waveSlot % 10 == 0)
                OfferUpgrades();
        }

        void OfferUpgrades()
        {
            if (_upgrades == null)
                return;

            var offered = _upgrades.Offer(3, _rng);
            var choices = new UpgradeChoice[offered.Count];
            for (var i = 0; i < offered.Count; i++)
            {
                var card = offered[i];
                choices[i] = new UpgradeChoice(ToSharedUpgradeId(card.id), card.name, card.description, card.icon);
            }
            _pendingUpgradeChoices = choices;
            GameEvents.RaiseUpgradeChoiceReady(choices);
        }

        void ApplyUpgradeModifiers()
        {
            if (_upgrades == null)
                return;

            _towers.RuntimeDamageMultiplier = _upgrades.DamageMultiplier;
            _towers.RuntimeCritDamageBonus = _upgrades.CritDamageBonus;
        }

        static bool TryParseUpgradeId(string id, out UpgradeCardType type)
        {
            switch (id)
            {
                case "dmg_up":
                case "DmgUp":
                    type = UpgradeCardType.DmgUp;
                    return true;
                case "crit_dmg":
                case "CritDmg":
                    type = UpgradeCardType.CritDmg;
                    return true;
                case "energy_harvest":
                case "EnergyHarvest":
                    type = UpgradeCardType.EnergyHarvest;
                    return true;
                case "energy_regen":
                case "EnergyRegen":
                    type = UpgradeCardType.EnergyRegen;
                    return true;
                case "effect_amp":
                case "EffectAmp":
                    type = UpgradeCardType.EffectAmp;
                    return true;
                case "tier_odds_up":
                case "TierOddsUp":
                    type = UpgradeCardType.TierOddsUp;
                    return true;
                default:
                    type = default;
                    return false;
            }
        }

        static string ToSharedUpgradeId(UpgradeCardType type)
        {
            switch (type)
            {
                case UpgradeCardType.DmgUp:
                    return "dmg_up";
                case UpgradeCardType.CritDmg:
                    return "crit_dmg";
                case UpgradeCardType.EnergyHarvest:
                    return "energy_harvest";
                case UpgradeCardType.EnergyRegen:
                    return "energy_regen";
                case UpgradeCardType.EffectAmp:
                    return "effect_amp";
                case UpgradeCardType.TierOddsUp:
                    return "tier_odds_up";
                default:
                    return type.ToString();
            }
        }

        string DrawFromSummonPool()
        {
            var pool = _database.summonPool;
            if (pool == null)
                return null;

            var totalWeight = 0;
            if (pool.entries != null)
            {
                foreach (var entry in pool.entries)
                    if (entry.weight > 0 && !string.IsNullOrEmpty(entry.towerId))
                        totalWeight += entry.weight;
            }

            if (totalWeight > 0)
            {
                var roll = _rng.NextInt(totalWeight);
                var cursor = 0;
                foreach (var entry in pool.entries)
                {
                    if (entry.weight <= 0 || string.IsNullOrEmpty(entry.towerId))
                        continue;
                    cursor += entry.weight;
                    if (roll < cursor)
                        return entry.towerId;
                }
            }

            if (pool.towerIds == null || pool.towerIds.Length == 0)
                return null;
            return pool.towerIds[_rng.NextInt(pool.towerIds.Length)];
        }

        void FailPlacement(string towerId, int col, int row, string reason)
        {
            GameEvents.RaiseTowerPlacementFailed(towerId, col, row, reason);
            Reject(reason);
        }

        static void Reject(string reason)
        {
            GameEvents.RaiseRequestRejected(reason);
            GameEvents.RaiseLog(reason);
        }
    }
}
