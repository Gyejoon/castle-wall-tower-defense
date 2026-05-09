using System;
using System.Collections.Generic;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Energy;
using GLD.Systems.Grid;
using GLD.Systems.Towers;
using GLD.Systems.Units;
using UnityEngine;

namespace GLD.Systems.Act
{
    public sealed class WallSystem
    {
        readonly EnergySystem _energy;
        readonly UnitSystem _units;
        float _repairCooldownRemaining;
        float _autoAttackTimer;
        int _instantRepairCharges;
        int _damageUpgradeLevel;
        int _speedUpgradeLevel;
        int _rangeUpgradeLevel;

        public int MaxHp { get; private set; } = 20;
        public int CurrentHp { get; private set; } = 20;
        public int RepairCost { get; private set; } = 25;
        public int RepairAmount { get; private set; } = 5;
        public float RepairCooldownSec { get; private set; } = 12f;
        public float AutoAttackDamage { get; private set; } = 75f;
        public float AutoAttackIntervalSec { get; private set; } = 0.5f;
        public float AutoAttackRange { get; private set; } = 5f;
        public int InstantRepairCharges => _instantRepairCharges;
        public int DamageUpgradeCost => 45 + _damageUpgradeLevel * 15;
        public int SpeedUpgradeCost => 50 + _speedUpgradeLevel * 20;
        public int RangeUpgradeCost => 40 + _rangeUpgradeLevel * 15;
        public bool IsDestroyed => CurrentHp <= 0;

        public WallSystem(EnergySystem energy, UnitSystem units)
        {
            _energy = energy;
            _units = units;
            EmitState();
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f || IsDestroyed)
                return;

            if (_repairCooldownRemaining > 0f)
                _repairCooldownRemaining = Mathf.Max(0f, _repairCooldownRemaining - deltaSeconds);

            _autoAttackTimer -= deltaSeconds;
            if (_autoAttackTimer <= 0f)
            {
                _autoAttackTimer += AutoAttackIntervalSec;
                AutoAttack();
            }

            EmitState();
        }

        public void TakeDamage(int amount)
        {
            if (amount <= 0 || IsDestroyed)
                return;

            CurrentHp = Mathf.Max(0, CurrentHp - amount);
            EmitState();
        }

        public bool Repair()
        {
            if (IsDestroyed || _repairCooldownRemaining > 0f || CurrentHp >= MaxHp)
                return false;
            if (_energy != null && !_energy.Spend(RepairCost))
                return false;

            CurrentHp = Mathf.Min(MaxHp, CurrentHp + RepairAmount);
            _repairCooldownRemaining = RepairCooldownSec;
            EmitState();
            return true;
        }

        public void GrantInstantRepairCharge(int amount = 1)
        {
            if (amount <= 0)
                return;

            _instantRepairCharges += amount;
            EmitState();
        }

        public bool InstantRepair()
        {
            if (IsDestroyed || CurrentHp >= MaxHp || _instantRepairCharges <= 0)
                return false;

            _instantRepairCharges--;
            CurrentHp = MaxHp;
            _repairCooldownRemaining = 0f;
            EmitState();
            return true;
        }

        public bool UpgradeDamage()
        {
            if (_energy != null && !_energy.Spend(DamageUpgradeCost))
                return false;

            _damageUpgradeLevel++;
            AutoAttackDamage += 15f;
            EmitState();
            return true;
        }

        public bool UpgradeSpeed()
        {
            if (_energy != null && !_energy.Spend(SpeedUpgradeCost))
                return false;

            _speedUpgradeLevel++;
            AutoAttackIntervalSec = Mathf.Max(0.18f, AutoAttackIntervalSec - 0.06f);
            EmitState();
            return true;
        }

        public bool UpgradeRange()
        {
            if (_energy != null && !_energy.Spend(RangeUpgradeCost))
                return false;

            _rangeUpgradeLevel++;
            AutoAttackRange += 0.75f;
            EmitState();
            return true;
        }

        public void Upgrade()
        {
            GrantInstantRepairCharge();
        }

        void AutoAttack()
        {
            var target = FirstActiveUnit();
            if (target == null)
                return;

            var applied = _units.ApplyDamage(target, AutoAttackDamage, armorPierce: true);
            if (applied > 0f)
                GameEvents.RaiseWallAutoAttacked(new WallAttackEvent(target.Position.x, target.Position.y, applied));
        }

        UnitInstance FirstActiveUnit()
        {
            if (_units == null)
                return null;
            foreach (var unit in _units.Units)
            {
                if (unit == null || !unit.IsAlive || unit.Escaped)
                    continue;
                if (Vector2.Distance(unit.Position, unit.PathFollower.ExitPosition) <= AutoAttackRange)
                    return unit;
            }
            return null;
        }

        public WallState ToState() => new WallState(
            CurrentHp,
            MaxHp,
            RepairCost,
            RepairAmount,
            RepairCooldownSec,
            _repairCooldownRemaining,
            AutoAttackDamage,
            AutoAttackIntervalSec,
            AutoAttackRange,
            _instantRepairCharges,
            DamageUpgradeCost,
            SpeedUpgradeCost,
            RangeUpgradeCost,
            _damageUpgradeLevel,
            _speedUpgradeLevel,
            _rangeUpgradeLevel);

        public void EmitState()
        {
            var state = ToState();
            GameEvents.RaiseWallStateChanged(state);
            GameEvents.RaisePlayerHpChanged(state.CurrentHp);
        }
    }

    public sealed class TowerSlotSystem
    {
        sealed class Slot
        {
            public int Index;
            public TowerFamily Family;
            public int Tier;
            public GridCell Cell;
            public string InstanceId;
            public bool Unlocked => Tier > 0;
        }

        readonly GameDatabase _database;
        readonly TowerSystem _towers;
        readonly Slot[] _slots;

        public TowerSlotSystem(GameDatabase database, TowerSystem towers, GridManager grid)
        {
            _database = database;
            _towers = towers;
            _slots = new[]
            {
                CreateSlot(1, TowerFamily.Archer, new GridCell(3, 3)),
                CreateSlot(2, TowerFamily.Siege, new GridCell(5, 3)),
                CreateSlot(3, TowerFamily.Frost, new GridCell(2, 6)),
                CreateSlot(4, TowerFamily.Stun, new GridCell(6, 6)),
            };
            EmitAll();
        }

        public IReadOnlyList<TowerSlotState> States
        {
            get
            {
                var states = new List<TowerSlotState>(_slots.Length);
                foreach (var slot in _slots)
                    states.Add(ToState(slot));
                return states;
            }
        }

        public bool ApplyFamilyReward(TowerFamily family)
        {
            var slot = FindSlot(family);
            if (slot == null)
                return false;

            slot.Tier = Mathf.Clamp(slot.Tier + 1, 1, 4);
            ReplaceTower(slot);
            GameEvents.RaiseTowerSlotUpgraded(ToState(slot));
            return true;
        }

        public bool HasFamily(TowerFamily family) => FindSlot(family)?.Unlocked == true;

        static Slot CreateSlot(int index, TowerFamily family, GridCell cell)
        {
            return new Slot
            {
                Index = index,
                Family = family,
                Cell = cell
            };
        }

        Slot FindSlot(TowerFamily family)
        {
            foreach (var slot in _slots)
                if (slot.Family == family)
                    return slot;
            return null;
        }

        void ReplaceTower(Slot slot)
        {
            if (!string.IsNullOrEmpty(slot.InstanceId))
                _towers.Sell(slot.InstanceId);

            var def = FindTower(slot.Family, slot.Tier);
            if (def == null)
                return;

            if (_towers.Place(def, slot.Cell, spendEnergy: false))
            {
                var placed = _towers.GetAt(slot.Cell);
                slot.InstanceId = placed?.InstanceId;
            }
        }

        TowerDefSO FindTower(TowerFamily family, int tier)
        {
            if (_database == null || _database.towers == null || _database.towers.towers == null)
                return null;
            foreach (var tower in _database.towers.towers)
                if (tower != null && tower.family == family && tower.tier == tier)
                    return tower;
            return null;
        }

        void EmitAll()
        {
            foreach (var slot in _slots)
                GameEvents.RaiseTowerSlotUpgraded(ToState(slot));
        }

        static string FamilyId(TowerFamily family) => family.ToString().ToLowerInvariant();

        static TowerSlotState ToState(Slot slot) =>
            new TowerSlotState(slot.Index, FamilyId(slot.Family), slot.Tier, slot.Unlocked, slot.Cell.Col, slot.Cell.Row);
    }

    public sealed class PlayerTacticSystem
    {
        sealed class Tactic
        {
            public PlayerTacticKind Kind;
            public bool Unlocked;
            public int Level;
            public float CooldownSec;
            public float CooldownRemainingSec;
        }

        readonly UnitSystem _units;
        readonly Dictionary<PlayerTacticKind, Tactic> _tactics = new Dictionary<PlayerTacticKind, Tactic>();

        public PlayerTacticSystem(UnitSystem units)
        {
            _units = units;
            _tactics[PlayerTacticKind.ForceMove] = new Tactic { Kind = PlayerTacticKind.ForceMove, CooldownSec = 10f };
            _tactics[PlayerTacticKind.Freeze] = new Tactic { Kind = PlayerTacticKind.Freeze, CooldownSec = 14f };
            EmitAll();
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f)
                return;
            foreach (var tactic in _tactics.Values)
            {
                if (tactic.CooldownRemainingSec <= 0f)
                    continue;
                tactic.CooldownRemainingSec = Mathf.Max(0f, tactic.CooldownRemainingSec - deltaSeconds);
                Emit(tactic);
            }
        }

        public void Upgrade(PlayerTacticKind kind)
        {
            var tactic = _tactics[kind];
            tactic.Unlocked = true;
            tactic.Level = Mathf.Max(1, tactic.Level + 1);
            Emit(tactic);
        }

        public bool Cast(TacticCastRequest request)
        {
            if (!_tactics.TryGetValue(request.Kind, out var tactic) || !tactic.Unlocked || tactic.CooldownRemainingSec > 0f)
                return false;

            var center = new Vector2(request.X, request.Y);
            var radius = request.Radius > 0f ? request.Radius : 2.5f;
            var affected = request.Kind == PlayerTacticKind.ForceMove
                ? _units.ApplyForceMove(center, radius, 0.8f + tactic.Level * 0.25f)
                : _units.ApplyFreeze(center, radius, 1.2f + tactic.Level * 0.25f);

            if (affected <= 0)
                return false;

            tactic.CooldownRemainingSec = tactic.CooldownSec;
            Emit(tactic);
            return true;
        }

        void EmitAll()
        {
            foreach (var tactic in _tactics.Values)
                Emit(tactic);
        }

        static void Emit(Tactic tactic)
        {
            GameEvents.RaiseTacticStateChanged(new PlayerTacticState(
                tactic.Kind,
                tactic.Unlocked,
                tactic.Level,
                tactic.CooldownSec,
                tactic.CooldownRemainingSec));
        }
    }
}
