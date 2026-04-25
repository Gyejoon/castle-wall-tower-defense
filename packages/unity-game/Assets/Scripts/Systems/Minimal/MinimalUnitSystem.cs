// MinimalUnitSystem.cs — Phase 2 Slice2 unit container + path advancement.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.1 Plain C# events (OnUnitSpawned / OnUnitKilled / OnUnitReachedExit).
//   - §1.2 Plain List<UnitInstance> storage; no RuntimeSet SO.
//   - §1.3 UnitInstance is a POCO (NOT MonoBehaviour).
//   - §1.4 Construction order: Grid → Energy → Units → Towers → Waves.
//   - §1.5 Tick(float dtSec); injected RNG only (System.Random); no Coroutine.
//   - §3.6 RNG NOT consumed at PoC scope (no CC towers in slice2_poc).
//
// Mirrors tickUnits() + ApplyDamage logic from
// packages/shared/src/testing/replay-runner.ts.
//
// Pathfinding note (Step 4 of plan): Phase 2 uses the path baked into the
// MapDef directly — no BFS needed because the slice2_poc map has a single
// pre-authored straight-then-L lane. "Plain straight-line BFS" referenced in
// the plan reduces to "follow path[]" when the lane is already linear.
// This matches the TS replay-runner shape exactly.

using System;
using System.Collections.Generic;
using GLD.Data;

namespace GLD.Systems.Minimal
{
    /// <summary>
    /// Manages live UnitInstance list. Advances units along the
    /// MinimalGridManager.Path each tick; emits POCO events when units
    /// are spawned, killed, or reach the exit.
    /// </summary>
    public sealed class MinimalUnitSystem
    {
        readonly MinimalGridManager _grid;
        readonly System.Random _rng; // reserved for Phase 3+ (CC procs)
        readonly List<UnitInstance> _units = new List<UnitInstance>(32);
        int _nextInstanceId = 1;

        public IReadOnlyList<UnitInstance> Units => _units;

        public event Action<UnitInstance> OnUnitSpawned;
        public event Action<UnitInstance> OnUnitKilled;
        public event Action<UnitInstance> OnUnitReachedExit;
        public event Action<UnitInstance, int, bool> OnUnitDamaged;

        public MinimalUnitSystem(MinimalGridManager grid, System.Random rng)
        {
            _grid = grid ?? throw new ArgumentNullException(nameof(grid));
            _rng = rng ?? new System.Random(0);
        }

        /// <summary>Spawn a fresh unit at path[0] from a UnitDefSO.</summary>
        public UnitInstance Spawn(UnitDefSO def)
        {
            if (def == null) throw new ArgumentNullException(nameof(def));
            var unit = new UnitInstance
            {
                InstanceId = _nextInstanceId++,
                Def = def,
                Hp = def.stats.hp,
                MaxHp = def.stats.hp,
                Armor = def.stats.armor,
                SpeedTilesPerSec = def.stats.speed,
                PathIndex = 0,
                CellProgress = 0f,
                Alive = true,
            };
            _units.Add(unit);
            OnUnitSpawned?.Invoke(unit);
            return unit;
        }

        /// <summary>Advance every live unit along the path by dt. Emits
        /// OnUnitReachedExit when a unit reaches the last path cell.</summary>
        public void Tick(float dtSec)
        {
            if (dtSec <= 0f) return;
            var path = _grid.Path;
            int last = path.Count - 1;
            if (last <= 0) return;

            for (int i = 0; i < _units.Count; i++)
            {
                var u = _units[i];
                if (!u.Alive) continue;
                if (u.PathIndex >= last) continue;

                float remaining = u.SpeedTilesPerSec * dtSec;
                while (remaining > 0f && u.Alive && u.PathIndex < last)
                {
                    float need = 1f - u.CellProgress;
                    if (remaining >= need)
                    {
                        remaining -= need;
                        u.PathIndex++;
                        u.CellProgress = 0f;
                        if (u.PathIndex >= last)
                        {
                            u.Alive = false;
                            OnUnitReachedExit?.Invoke(u);
                            break;
                        }
                    }
                    else
                    {
                        u.CellProgress += remaining;
                        remaining = 0f;
                    }
                }
            }
        }

        /// <summary>Continuous (col, row) position used by tower targeting.</summary>
        public bool TryGetPosition(UnitInstance unit, out float col, out float row)
        {
            if (!unit.Alive) { col = row = 0; return false; }
            var path = _grid.Path;
            int last = path.Count - 1;
            int i = unit.PathIndex;
            if (i < 0 || i > last) { col = row = 0; return false; }
            var a = path[i];
            if (i >= last) { col = a.Col; row = a.Row; return true; }
            var b = path[i + 1];
            float t = unit.CellProgress;
            col = a.Col + (b.Col - a.Col) * t;
            row = a.Row + (b.Row - a.Row) * t;
            return true;
        }

        /// <summary>Apply damage to a target unit. Mirrors resolveDamage()
        /// in the TS runner: armor reduction (unless pierce), floor() before
        /// applying. Returns the actual integer damage applied.</summary>
        public int ApplyDamage(UnitInstance target, int damage, bool armorPierce)
        {
            if (target == null || !target.Alive) return 0;
            int reduced = armorPierce ? damage : System.Math.Max(0, damage - target.Armor);
            // floor is implicit — `reduced` is already an int.
            int applied = reduced;
            target.Hp -= applied;
            OnUnitDamaged?.Invoke(target, applied, armorPierce);
            if (target.Hp <= 0)
            {
                target.Alive = false;
                OnUnitKilled?.Invoke(target);
            }
            return applied;
        }

        /// <summary>Lookup by id (linear scan; live and dead alike).</summary>
        public UnitInstance FindByInstanceId(int id)
        {
            for (int i = 0; i < _units.Count; i++)
                if (_units[i].InstanceId == id) return _units[i];
            return null;
        }

        /// <summary>True when every spawned unit is non-Alive (dead or exited).</summary>
        public bool AllUnitsCleared()
        {
            for (int i = 0; i < _units.Count; i++)
                if (_units[i].Alive) return false;
            return true;
        }
    }
}
