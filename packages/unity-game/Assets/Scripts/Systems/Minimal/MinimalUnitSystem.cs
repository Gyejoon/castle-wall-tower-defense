using System;
using System.Collections.Generic;
using GLD.Data;
using UnityEngine;

namespace GLD.Systems.Minimal
{
    public sealed class MinimalUnitState
    {
        public string InstanceId;
        public string UnitId;
        public float Hp;
        public float MaxHp;
        public float Armor;
        public float Speed;
        public Vector2 Position;
        public int PathIndex;
        public bool IsAlive = true;
        public bool Escaped;
    }

    public sealed class MinimalUnitSystem
    {
        readonly MinimalGridManager _grid;
        readonly MinimalEnergySystem _energy;
        readonly List<MinimalUnitState> _units = new List<MinimalUnitState>();
        int _nextUnitId;

        public event Action<MinimalUnitState> UnitSpawned;
        public event Action<MinimalUnitState> UnitKilled;
        public event Action<int> BaseHpChanged;

        public IReadOnlyList<MinimalUnitState> Units => _units;
        public int KillCount { get; private set; }
        public int EscapedCount { get; private set; }
        public float TotalDamage { get; private set; }
        public int BaseHp { get; private set; } = 20;
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

        public MinimalUnitSystem(MinimalGridManager grid, MinimalEnergySystem energy)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
            _energy = energy ?? throw new ArgumentNullException(nameof(energy));
        }

        public MinimalUnitState Spawn(UnitDefSO unitDef)
        {
            if (unitDef == null) throw new ArgumentNullException(nameof(unitDef));
            return Spawn(unitDef.id, unitDef.stats.hp, unitDef.stats.armor, unitDef.stats.speed);
        }

        public MinimalUnitState Spawn(string unitId, float hp = 30f, float armor = 0f, float speed = 3f)
        {
            if (_grid.Path.Count == 0)
                throw new InvalidOperationException("Cannot spawn without a path.");

            var unit = new MinimalUnitState
            {
                InstanceId = $"unit-{++_nextUnitId:000}",
                UnitId = unitId,
                Hp = hp,
                MaxHp = hp,
                Armor = armor,
                Speed = speed,
                Position = _grid.Path[0],
                PathIndex = 0
            };
            _units.Add(unit);
            UnitSpawned?.Invoke(unit);
            return unit;
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;
            foreach (var unit in _units)
            {
                if (!unit.IsAlive || unit.Escaped) continue;
                Move(unit, deltaSeconds);
            }
        }

        public float ApplyDamage(MinimalUnitState unit, float rawDamage)
        {
            if (unit == null || !unit.IsAlive || unit.Escaped || rawDamage <= 0f) return 0f;
            var applied = Mathf.Min(unit.Hp, Mathf.Max(1f, rawDamage - unit.Armor));
            unit.Hp -= applied;
            TotalDamage += applied;

            if (unit.Hp <= 0f)
            {
                unit.IsAlive = false;
                KillCount++;
                _energy.AddKillReward();
                UnitKilled?.Invoke(unit);
                MinimalGameEvents.RaiseUnitKilled(unit.UnitId);
            }

            return applied;
        }

        void Move(MinimalUnitState unit, float deltaSeconds)
        {
            var remaining = unit.Speed * deltaSeconds;
            while (remaining > 0f && unit.IsAlive && !unit.Escaped)
            {
                var nextIndex = unit.PathIndex + 1;
                if (nextIndex >= _grid.Path.Count)
                {
                    Escape(unit);
                    return;
                }

                var next = _grid.Path[nextIndex];
                var toNext = next - unit.Position;
                var distance = toNext.magnitude;
                if (distance <= 0.0001f)
                {
                    unit.PathIndex = nextIndex;
                    continue;
                }

                if (remaining >= distance)
                {
                    unit.Position = next;
                    unit.PathIndex = nextIndex;
                    remaining -= distance;
                }
                else
                {
                    unit.Position += toNext / distance * remaining;
                    remaining = 0f;
                }
            }
        }

        void Escape(MinimalUnitState unit)
        {
            unit.Escaped = true;
            EscapedCount++;
            BaseHp = Mathf.Max(0, BaseHp - 1);
            BaseHpChanged?.Invoke(BaseHp);
        }
    }
}
