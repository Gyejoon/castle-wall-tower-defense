using System;
using GLD.Core;
using GLD.Core.Random;
using GLD.Data;
using GLD.Systems.Grid;
using GLD.Systems.Towers;
using GLD.Systems.Waves;

namespace GLD.Systems.Orchestrator
{
    public sealed class CoreOrchestrator : IDisposable
    {
        readonly GameDatabase _database;
        readonly TowerSystem _towers;
        readonly WaveSystem _waves;
        readonly DeterministicRng _rng;
        string _pendingSummonTowerId;
        string _cancelledPoolDraw;
        bool _subscribed;

        public CoreOrchestrator(GameDatabase database, TowerSystem towers, WaveSystem waves, uint seed = 12345u)
        {
            _database = database ?? throw new ArgumentNullException(nameof(database));
            _towers = towers ?? throw new ArgumentNullException(nameof(towers));
            _waves = waves ?? throw new ArgumentNullException(nameof(waves));
            _rng = new DeterministicRng(seed);
        }

        public string PendingSummonTowerId => _pendingSummonTowerId;

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
            GameEvents.OnRequestMerge += HandlePhase4Stub;
            GameEvents.OnRequestGacha += HandlePhase4Stub;
            GameEvents.OnRequestUpgradePick += HandlePhase4Stub;
            GameEvents.OnRequestUpgradeReroll += HandleUpgradeRerollStub;
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
            GameEvents.OnRequestMerge -= HandlePhase4Stub;
            GameEvents.OnRequestGacha -= HandlePhase4Stub;
            GameEvents.OnRequestUpgradePick -= HandlePhase4Stub;
            GameEvents.OnRequestUpgradeReroll -= HandleUpgradeRerollStub;
            _subscribed = false;
        }

        void HandleStartRun()
        {
            _waves.Start(1);
        }

        void HandleSummon()
        {
            _pendingSummonTowerId = !string.IsNullOrEmpty(_cancelledPoolDraw)
                ? _cancelledPoolDraw
                : DrawFromSummonPool();
            _cancelledPoolDraw = null;

            if (string.IsNullOrEmpty(_pendingSummonTowerId))
            {
                Reject("summon_pool_empty");
                return;
            }

            GameEvents.RaiseSummonOffered(_pendingSummonTowerId);
        }

        void HandleCancelSummon()
        {
            if (string.IsNullOrEmpty(_pendingSummonTowerId))
                return;

            _cancelledPoolDraw = _pendingSummonTowerId;
            GameEvents.RaiseSummonCancelled(_pendingSummonTowerId);
            _pendingSummonTowerId = null;
        }

        void HandlePlaceTower(TowerPlacementRequest request)
        {
            var towerId = !string.IsNullOrEmpty(request.TowerId) ? request.TowerId : _pendingSummonTowerId;
            var def = _database.towers != null ? _database.towers.FindById(towerId) : null;
            if (def == null)
            {
                FailPlacement(towerId, request.Col, request.Row, "unknown_tower");
                return;
            }

            var placed = _towers.Place(def, new GridCell(request.Col, request.Row), request.SpendEnergy);
            if (!placed)
            {
                FailPlacement(towerId, request.Col, request.Row, "placement_rejected");
                return;
            }

            if (towerId == _pendingSummonTowerId)
            {
                GameEvents.RaiseSummonConfirmed(towerId);
                _pendingSummonTowerId = null;
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

        void HandlePhase4Stub(string _)
        {
            Reject("phase4_stub");
        }

        void HandleUpgradeRerollStub()
        {
            Reject("phase4_stub");
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
