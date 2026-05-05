using System;
using System.Collections.Generic;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Units;

namespace GLD.Systems.Towers
{
    public sealed class TowerSystem
    {
        readonly GridManager _grid;
        readonly EnergySystem _energy;
        readonly UnitSystem _units;
        readonly ElementMatchupSO _elementMatchup;
        readonly Dictionary<GridCell, TowerInstance> _byCell = new Dictionary<GridCell, TowerInstance>();
        readonly List<TowerInstance> _towers = new List<TowerInstance>();
        int _nextTowerId;
        float _elapsedSeconds;

        public float GlobalAtkPct { get; set; }
        public float RuntimeDamageMultiplier { get; set; } = 1f;
        public float RuntimeCritDamageBonus { get; set; }
        public IReadOnlyList<TowerInstance> Towers => _towers;

        public event Action<TowerInstance> TowerPlaced;
        public event Action<TowerInstance> TowerSold;
        public event Action<TowerInstance, GridCell, GridCell> TowerMoved;
        public event Action<TowerInstance, float> TowerAttacked;

        public TowerSystem(GridManager grid, EnergySystem energy, UnitSystem units, ElementMatchupSO elementMatchup = null)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
            _energy = energy;
            _units = units ?? throw new ArgumentNullException(nameof(units));
            _elementMatchup = elementMatchup;
            _units.SetTowerSystem(this);
        }

        public TowerInstance GetAt(GridCell cell)
        {
            _byCell.TryGetValue(cell, out var tower);
            return tower;
        }

        public bool Place(TowerDefSO def, GridCell cell, bool spendEnergy = true)
        {
            if (def == null)
                throw new ArgumentNullException(nameof(def));
            if (!_grid.IsBuildable(cell) || _byCell.ContainsKey(cell))
                return false;

            var cost = def.cost > 0 ? def.cost : 10;
            if (spendEnergy && _energy != null && !_energy.Spend(cost))
                return false;

            var tower = new TowerInstance(
                $"tower-{++_nextTowerId:000}",
                def,
                cell,
                _grid.GridToPlacementWorld(cell),
                _grid.GridToWorld(cell),
                _elementMatchup);
            tower.GlobalAtkPct = GlobalAtkPct;
            _byCell[cell] = tower;
            _towers.Add(tower);
            TowerPlaced?.Invoke(tower);
            GameEvents.RaiseTowerPlaced(def.id, cell.Col, cell.Row);
            return true;
        }

        public bool Sell(string instanceId)
        {
            var tower = FindByInstanceId(instanceId);
            if (tower == null) return false;

            _byCell.Remove(tower.Cell);
            _towers.Remove(tower);
            TowerSold?.Invoke(tower);
            GameEvents.RaiseTowerSold(tower.Def.id);
            return true;
        }

        public bool Move(string instanceId, GridCell target)
        {
            var tower = FindByInstanceId(instanceId);
            if (tower == null || !_grid.IsBuildable(target) || _byCell.ContainsKey(target))
                return false;

            var from = tower.Cell;
            _byCell.Remove(from);
            tower.MoveTo(target, _grid.GridToPlacementWorld(target), _grid.GridToWorld(target));
            _byCell[target] = tower;
            TowerMoved?.Invoke(tower, from, target);
            GameEvents.RaiseTowerMoved(tower.Def.id, from.Col, from.Row, target.Col, target.Row);
            return true;
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;
            _elapsedSeconds += deltaSeconds;

            foreach (var tower in _towers)
            {
                tower.GlobalAtkPct = GlobalAtkPct;
                tower.RuntimeDamageMultiplier = RuntimeDamageMultiplier;
                tower.RuntimeCritDamageBonus = RuntimeCritDamageBonus;
                var applied = tower.Tick(deltaSeconds, _units, _elapsedSeconds);
                if (applied > 0f)
                    TowerAttacked?.Invoke(tower, applied);
            }
        }

        public bool DisableRandomTower(float untilSeconds)
        {
            foreach (var tower in _towers)
            {
                tower.DisableUntil(untilSeconds);
                return true;
            }

            return false;
        }

        TowerInstance FindByInstanceId(string instanceId)
        {
            foreach (var tower in _towers)
                if (tower.InstanceId == instanceId)
                    return tower;
            return null;
        }
    }
}
