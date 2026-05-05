using System;
using System.Collections.Generic;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Boss;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Towers;

namespace GLD.Systems.Units
{
    public sealed class UnitSystem
    {
        readonly GridManager _grid;
        readonly EnergySystem _energy;
        readonly UnitCatalogSO _unitCatalog;
        readonly BossConfigSO _bossConfig;
        readonly float _minMoveSpeed;
        readonly float _stunImmunityWindowSec;
        readonly List<UnitInstance> _units = new List<UnitInstance>();
        TowerSystem _towerSystem;
        float _sceneTimeSeconds;
        int _nextUnitId;
        int _nextLaneIndex;

        public event Action<UnitInstance> UnitSpawned;
        public event Action<UnitInstance> UnitKilled;
        public event Action<UnitInstance> UnitEscaped;

        public IReadOnlyList<UnitInstance> Units => _units;
        public int KillCount { get; private set; }
        public int EscapedCount { get; private set; }
        public float TotalDamage { get; private set; }
        public int ActiveCount
        {
            get
            {
                var count = 0;
                foreach (var unit in _units)
                    if (unit.IsAlive && !unit.Escaped)
                        count++;
                return count;
            }
        }

        public UnitSystem(GridManager grid, EnergySystem energy, UnitCatalogSO unitCatalog = null, BossConfigSO bossConfig = null)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
            _energy = energy;
            _unitCatalog = unitCatalog;
            _bossConfig = bossConfig;
            _minMoveSpeed = unitCatalog != null && unitCatalog.minMoveSpeed > 0f ? unitCatalog.minMoveSpeed : 0.15f;
            _stunImmunityWindowSec = unitCatalog != null && unitCatalog.stunImmunityWindowMs > 0f
                ? unitCatalog.stunImmunityWindowMs / 1000f
                : 2f;
        }

        public void SetTowerSystem(TowerSystem towerSystem)
        {
            _towerSystem = towerSystem;
        }

        public UnitInstance SpawnById(string unitId, bool isClone = false, float hpMultiplier = 1f)
        {
            var def = _unitCatalog != null ? _unitCatalog.FindById(unitId) : null;
            if (def == null)
                return null;
            return Spawn(def, hpMultiplier, isClone);
        }

        public UnitInstance Spawn(UnitDefSO def, float hpMultiplier = 1f, bool isClone = false)
        {
            if (def == null)
                throw new ArgumentNullException(nameof(def));
            var path = NextPath();
            if (path.Count == 0)
                throw new InvalidOperationException("Cannot spawn without a path.");

            var unit = new UnitInstance(
                $"unit-{++_nextUnitId:000}",
                def,
                new PathFollower(path),
                new CCStateManager(_minMoveSpeed, _stunImmunityWindowSec),
                hpMultiplier,
                _bossConfig,
                isClone);
            _units.Add(unit);
            UnitSpawned?.Invoke(unit);
            GameEvents.RaiseUnitSpawned(def.id);
            unit.BossBehavior?.OnSpawn(CreateBossContext(unit));
            return unit;
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;
            _sceneTimeSeconds += deltaSeconds;

            for (var i = 0; i < _units.Count; i++)
            {
                var unit = _units[i];
                if (!unit.IsAlive || unit.Escaped) continue;

                unit.Tick(deltaSeconds);
                unit.BossBehavior?.OnTick(CreateBossContext(unit), deltaSeconds);
                if (unit.Escaped)
                {
                    EscapedCount++;
                    UnitEscaped?.Invoke(unit);
                    GameEvents.RaiseUnitEscaped(unit.Def.id);
                }
            }
        }

        public float ApplyDamage(UnitInstance unit, float rawDamage)
        {
            if (unit == null) return 0f;
            var applied = unit.ApplyDamage(rawDamage);
            TotalDamage += applied;

            if (applied > 0f && unit.Boss.IsBoss && unit.IsAlive)
            {
                var transition = unit.Boss.OnDamage(unit.Hp, unit.MaxHp);
                if (transition.HasValue)
                    GameEvents.RaiseBossPhaseChanged(unit.InstanceId, transition.Value.Phase);

                var hpRatio = unit.MaxHp > 0f ? unit.Hp / unit.MaxHp : 0f;
                unit.BossBehavior?.OnDamageTaken(CreateBossContext(unit), hpRatio);
                GameEvents.RaiseBossHpUpdated(unit.InstanceId, unit.Def.id, (int)System.Math.Max(0f, unit.Hp), (int)unit.MaxHp, unit.Boss.Phase);
            }

            if (applied > 0f && !unit.IsAlive)
            {
                KillCount++;
                _energy?.AddKillReward();
                if (unit.Boss.IsBoss)
                {
                    _energy?.AddBossKillReward();
                    GameEvents.RaiseBossDefeated(unit.InstanceId, 0);
                }
                UnitKilled?.Invoke(unit);
                GameEvents.RaiseUnitKilled(unit.Def.id);
            }

            return applied;
        }

        IReadOnlyList<UnityEngine.Vector2> NextPath()
        {
            if (_grid.Paths.Count == 0)
                return _grid.Path;

            var index = _nextLaneIndex++ % _grid.Paths.Count;
            return _grid.Paths[index];
        }

        BossContext CreateBossContext(UnitInstance unit)
        {
            return new BossContext(unit, _sceneTimeSeconds, this, _towerSystem);
        }
    }
}
