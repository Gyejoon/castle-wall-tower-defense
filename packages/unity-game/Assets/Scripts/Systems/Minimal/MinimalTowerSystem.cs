// MinimalTowerSystem.cs — Phase 2 Slice2 tower placement + targeting + damage.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.1 Plain C# events (OnTowerPlaced / OnTowerPlaceRejected /
//          OnProjectileLaunched / OnProjectileDropped).
//   - §1.2 List<TowerInstance> + sidecar Dictionary<GridCell, TowerInstance>.
//   - §1.3 TowerInstance is a POCO (NOT MonoBehaviour).
//   - §1.4 Construction order; tick AFTER unit move so targeting sees the
//          updated unit positions.
//   - §1.5 No UnityEngine.Random; no Coroutine; Tick(dtSec) only; buffs go
//          on TowerInstance.RuntimeDamage, never the def.
//   - §3.1 archer: NearestInRange targeting (squared grid distance, ties by
//          iteration order); 20 dmg armor-pierce; projectileSpeed 8 cells/sec
//          → TTL = round(dist/speed × 1000) clamped [40ms, 500ms].
//
// Mirrors applyInputs (placement) + tickTowers + resolveDamage phases of
// packages/shared/src/testing/replay-runner.ts.
//
// Ownership decision (judgment call documented per the task brief):
//   pendingDamage lives ON THIS SYSTEM. Mirrors the TS runner's structure
//   (state.pendingDamage is owned next to the tower update loop). Resolve
//   path: TowerSystem.ResolveDamage(t) → UnitSystem.ApplyDamage(...).

using System;
using System.Collections.Generic;
using GLD.Data;

namespace GLD.Systems.Minimal
{
    /// <summary>Reasons a TryPlace call may fail. Used for OnTowerPlaceRejected.</summary>
    public enum PlacementRejection
    {
        InsufficientFunds,
        Blocked,
        OccupiedByExistingTower,
        OutOfBounds,
    }

    /// <summary>
    /// Manages live TowerInstance list. Each tick decrements cooldowns,
    /// finds the nearest in-range unit, and schedules a projectile impact.
    /// ResolveDamage() flushes due impacts and applies them via UnitSystem.
    /// </summary>
    public sealed class MinimalTowerSystem
    {
        readonly MinimalGridManager _grid;
        readonly MinimalUnitSystem _units;
        readonly MinimalEnergySystem _energy;

        readonly List<TowerInstance> _towers = new List<TowerInstance>(32);
        readonly Dictionary<GridCell, TowerInstance> _byCell =
            new Dictionary<GridCell, TowerInstance>(32);
        readonly List<PendingDamage> _pending = new List<PendingDamage>(32);

        int _nextInstanceId = 1;

        public IReadOnlyList<TowerInstance> Towers => _towers;
        public IReadOnlyList<PendingDamage> PendingDamage => _pending;

        public event Action<TowerInstance> OnTowerPlaced;
        public event Action<TowerDefSO, GridCell, PlacementRejection> OnTowerPlaceRejected;
        public event Action<TowerInstance, UnitInstance, int, float> OnProjectileLaunched;
        public event Action<PendingDamage> OnProjectileDropped;

        public MinimalTowerSystem(MinimalGridManager grid, MinimalUnitSystem units,
            MinimalEnergySystem energy)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
            _units = units ?? throw new ArgumentNullException(nameof(units));
            _energy = energy ?? throw new ArgumentNullException(nameof(energy));
        }

        public bool TryGetAt(GridCell cell, out TowerInstance tower) =>
            _byCell.TryGetValue(cell, out tower);

        /// <summary>Try to place `def` at `cell`. Spends `def.cost` energy on
        /// success. Emits OnTowerPlaceRejected with the precise reason on
        /// failure. Returns the new instance (or null on rejection).</summary>
        public TowerInstance TryPlace(TowerDefSO def, GridCell cell)
        {
            if (def == null) throw new ArgumentNullException(nameof(def));
            if (!_grid.InBounds(cell))
            {
                OnTowerPlaceRejected?.Invoke(def, cell, PlacementRejection.OutOfBounds);
                return null;
            }
            if (_byCell.ContainsKey(cell))
            {
                OnTowerPlaceRejected?.Invoke(def, cell, PlacementRejection.OccupiedByExistingTower);
                return null;
            }
            if (_grid.IsBlocked(cell))
            {
                OnTowerPlaceRejected?.Invoke(def, cell, PlacementRejection.Blocked);
                return null;
            }
            if (!_energy.SpendOrFail(def.cost))
            {
                OnTowerPlaceRejected?.Invoke(def, cell, PlacementRejection.InsufficientFunds);
                return null;
            }

            var tower = new TowerInstance
            {
                InstanceId = _nextInstanceId++,
                Def = def,
                Cell = cell,
                RuntimeDamage = def.stats.damage,
                RangeCells = def.stats.range,
                RangeSqr = def.stats.range * def.stats.range,
                AttackIntervalSec =
                    def.stats.attackSpeed > 0f ? 1f / def.stats.attackSpeed : 1f,
                ProjectileSpeedTilesPerSec = def.stats.projectileSpeed,
                HasSpecial = !string.IsNullOrEmpty(def.stats.special),
                CooldownSec = 0f,
                ShotsFired = 0,
            };
            _towers.Add(tower);
            _byCell[cell] = tower;
            OnTowerPlaced?.Invoke(tower);
            return tower;
        }

        /// <summary>Remove a tower at `cell` (no refund). Returns true if removed.</summary>
        public bool Remove(GridCell cell)
        {
            if (!_byCell.TryGetValue(cell, out var t)) return false;
            _byCell.Remove(cell);
            _towers.Remove(t);
            return true;
        }

        /// <summary>Per-tick cooldown + targeting + projectile launch.
        /// `tickEndTimeSec` is the orchestrator's clock at the END of this
        /// tick — projectile impacts schedule from this baseline.</summary>
        public void Tick(float dtSec, float tickEndTimeSec)
        {
            if (dtSec <= 0f) return;

            for (int i = 0; i < _towers.Count; i++)
            {
                var tower = _towers[i];
                tower.CooldownSec -= dtSec;
                if (tower.CooldownSec > 0f) continue;

                // NearestInRange — squared grid distance, ties by iteration order.
                float bestDistSqr = float.PositiveInfinity;
                UnitInstance bestUnit = null;
                var unitList = _units.Units;
                for (int j = 0; j < unitList.Count; j++)
                {
                    var u = unitList[j];
                    if (!u.Alive) continue;
                    if (!_units.TryGetPosition(u, out float ux, out float uy)) continue;
                    float dx = tower.Cell.Col - ux;
                    float dy = tower.Cell.Row - uy;
                    float dSqr = dx * dx + dy * dy;
                    if (dSqr <= tower.RangeSqr && dSqr < bestDistSqr)
                    {
                        bestDistSqr = dSqr;
                        bestUnit = u;
                    }
                }
                if (bestUnit == null) continue;

                // TTL = cell-distance / projectileSpeed in ms, clamped [40, 500].
                // Identical formula to ArrowEmitter / TS replay-runner.
                float dist = (float)System.Math.Sqrt(bestDistSqr);
                float ttlMs;
                if (tower.ProjectileSpeedTilesPerSec > 0f)
                {
                    ttlMs = (float)System.Math.Round(
                        dist / tower.ProjectileSpeedTilesPerSec * 1000f);
                    if (ttlMs < 40f) ttlMs = 40f;
                    if (ttlMs > 500f) ttlMs = 500f;
                }
                else
                {
                    ttlMs = 120f;
                }
                int damage = (int)System.Math.Round(tower.RuntimeDamage);
                bool armorPierce = !tower.HasSpecial;
                float impactTimeSec = tickEndTimeSec + ttlMs / 1000f;

                _pending.Add(new PendingDamage
                {
                    ImpactTimeSec = impactTimeSec,
                    TowerInstanceId = tower.InstanceId,
                    TargetInstanceId = bestUnit.InstanceId,
                    Damage = damage,
                    ArmorPierce = armorPierce,
                });
                tower.ShotsFired++;
                OnProjectileLaunched?.Invoke(tower, bestUnit, damage, impactTimeSec);

                tower.CooldownSec += tower.AttackIntervalSec;
                if (tower.CooldownSec < 0f) tower.CooldownSec = 0f;
            }
        }

        /// <summary>Resolve pending projectile impacts whose ImpactTimeSec
        /// has elapsed by `tickEndTimeSec`. Mirrors resolveDamage() in the
        /// TS runner.</summary>
        public void ResolveDamage(float tickEndTimeSec)
        {
            for (int i = _pending.Count - 1; i >= 0; i--)
            {
                var p = _pending[i];
                if (p.ImpactTimeSec > tickEndTimeSec) continue;
                _pending.RemoveAt(i);
                var target = _units.FindByInstanceId(p.TargetInstanceId);
                if (target == null || !target.Alive) continue;
                _units.ApplyDamage(target, p.Damage, p.ArmorPierce);
            }
        }

        /// <summary>Drop any pending impacts still in flight at end of sim.
        /// Mirrors flushPendingDamage() in the TS runner — emits an event per
        /// dropped projectile so undercount surfaces visibly.</summary>
        public void FlushPendingDamage()
        {
            for (int i = 0; i < _pending.Count; i++)
                OnProjectileDropped?.Invoke(_pending[i]);
            _pending.Clear();
        }
    }
}
