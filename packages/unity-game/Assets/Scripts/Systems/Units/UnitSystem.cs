using System;
using System.Collections.Generic;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Energy;
using GLD.Systems.Grid;

namespace GLD.Systems.Units
{
    public sealed class UnitSystem
    {
        readonly GridManager _grid;
        readonly EnergySystem _energy;
        readonly float _minMoveSpeed;
        readonly float _stunImmunityWindowSec;
        readonly List<UnitInstance> _units = new List<UnitInstance>();
        int _nextUnitId;

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

        public UnitSystem(GridManager grid, EnergySystem energy, UnitCatalogSO unitCatalog = null)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
            _energy = energy;
            _minMoveSpeed = unitCatalog != null && unitCatalog.minMoveSpeed > 0f ? unitCatalog.minMoveSpeed : 0.15f;
            _stunImmunityWindowSec = unitCatalog != null && unitCatalog.stunImmunityWindowMs > 0f
                ? unitCatalog.stunImmunityWindowMs / 1000f
                : 2f;
        }

        public UnitInstance Spawn(UnitDefSO def, float hpMultiplier = 1f)
        {
            if (def == null)
                throw new ArgumentNullException(nameof(def));
            if (_grid.Path.Count == 0)
                throw new InvalidOperationException("Cannot spawn without a path.");

            var unit = new UnitInstance(
                $"unit-{++_nextUnitId:000}",
                def,
                new PathFollower(_grid.Path),
                new CCStateManager(_minMoveSpeed, _stunImmunityWindowSec),
                hpMultiplier);
            _units.Add(unit);
            UnitSpawned?.Invoke(unit);
            GameEvents.RaiseUnitSpawned(def.id);
            return unit;
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;

            foreach (var unit in _units)
            {
                if (!unit.IsAlive || unit.Escaped) continue;

                unit.Tick(deltaSeconds);
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

            if (applied > 0f && !unit.IsAlive)
            {
                KillCount++;
                _energy?.AddKillReward();
                if (unit.Boss.IsBoss)
                    _energy?.AddBossKillReward();
                UnitKilled?.Invoke(unit);
                GameEvents.RaiseUnitKilled(unit.Def.id);
            }

            return applied;
        }
    }
}
