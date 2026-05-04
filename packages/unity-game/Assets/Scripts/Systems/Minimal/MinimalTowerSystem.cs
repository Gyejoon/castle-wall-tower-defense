using System;
using System.Collections.Generic;
using GLD.Data;
using UnityEngine;

namespace GLD.Systems.Minimal
{
    public sealed class MinimalTowerState
    {
        public string InstanceId;
        public string TowerId;
        public MinimalGridCell Cell;
        public Vector2 Position;
        public float Damage;
        public float Range;
        public float AttackSpeed;
        public float CooldownSeconds;
    }

    public sealed class MinimalTowerSystem
    {
        public const float PocPlaceCost = 10f;

        readonly MinimalGridManager _grid;
        readonly MinimalEnergySystem _energy;
        readonly MinimalUnitSystem _units;
        readonly Dictionary<MinimalGridCell, MinimalTowerState> _byCell = new Dictionary<MinimalGridCell, MinimalTowerState>();
        readonly List<MinimalTowerState> _towers = new List<MinimalTowerState>();
        int _nextTowerId;

        public event Action<MinimalTowerState> TowerPlaced;
        public event Action<MinimalTowerState, MinimalUnitState, float> TowerAttacked;

        public IReadOnlyList<MinimalTowerState> Towers => _towers;

        public MinimalTowerSystem(MinimalGridManager grid, MinimalEnergySystem energy, MinimalUnitSystem units)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
            _energy = energy ?? throw new ArgumentNullException(nameof(energy));
            _units = units ?? throw new ArgumentNullException(nameof(units));
        }

        public bool HasTower(MinimalGridCell cell) => _byCell.ContainsKey(cell);

        public bool PlaceArcher(TowerDefSO archerDef, MinimalGridCell cell, bool spendEnergy = true)
        {
            if (archerDef == null) throw new ArgumentNullException(nameof(archerDef));
            return Place(
                archerDef.id,
                archerDef.stats.damage,
                archerDef.stats.range,
                archerDef.stats.attackSpeed,
                cell,
                spendEnergy);
        }

        public bool Place(
            string towerId,
            float damage,
            float range,
            float attackSpeed,
            MinimalGridCell cell,
            bool spendEnergy = true)
        {
            if (!_grid.IsBuildable(cell) || _byCell.ContainsKey(cell)) return false;
            if (spendEnergy && !_energy.SpendOrFail(PocPlaceCost)) return false;

            var tower = new MinimalTowerState
            {
                InstanceId = $"tower-{++_nextTowerId:000}",
                TowerId = towerId,
                Cell = cell,
                Position = _grid.GridToWorld(cell.Col, cell.Row),
                Damage = damage,
                Range = range,
                AttackSpeed = Mathf.Max(0.01f, attackSpeed),
                CooldownSeconds = 0f
            };
            _byCell[cell] = tower;
            _towers.Add(tower);
            TowerPlaced?.Invoke(tower);
            MinimalGameEvents.RaiseTowerPlaced(towerId, cell.Col, cell.Row);
            return true;
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;
            foreach (var tower in _towers)
            {
                tower.CooldownSeconds -= deltaSeconds;
                if (tower.CooldownSeconds > 0f) continue;

                var target = FindNearestTarget(tower);
                if (target == null) continue;

                var damage = _units.ApplyDamage(target, tower.Damage);
                TowerAttacked?.Invoke(tower, target, damage);
                tower.CooldownSeconds += 1f / tower.AttackSpeed;
            }
        }

        MinimalUnitState FindNearestTarget(MinimalTowerState tower)
        {
            MinimalUnitState best = null;
            var bestDistance = float.MaxValue;
            foreach (var unit in _units.Units)
            {
                if (!unit.IsAlive || unit.Escaped) continue;
                var distance = Vector2.Distance(tower.Position, unit.Position);
                if (distance > tower.Range || distance >= bestDistance) continue;
                best = unit;
                bestDistance = distance;
            }
            return best;
        }
    }
}
