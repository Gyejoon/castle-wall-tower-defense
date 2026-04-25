// MinimalWaveSystem.cs — Phase 2 Slice2 single-wave spawn driver.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.1 Plain C# events (OnWaveStarted / OnUnitSpawned / OnWaveCompleted).
//   - §1.4 Construction order: Wave system depends on Units (it spawns into
//          MinimalUnitSystem). Never bidirectional with Towers (§1.5 #5).
//   - §1.5 No Coroutine; explicit `_nextSpawnDueSec` decremented in Tick.
//   - §3.3 PoC schedule: 5 battle_robots, 300ms cadence (slice2_poc fixture).
//
// Mirrors tickWave() phase in packages/shared/src/testing/replay-runner.ts
// for a single group, single wave (no stage-level scaling at PoC scope).

using System;
using GLD.Data;

namespace GLD.Systems.Minimal
{
    /// <summary>
    /// Single-wave driver. Schedules `count` spawns at `intervalSec` cadence
    /// after `prepEndSec`. Fires OnWaveCompleted once every spawned unit is
    /// non-Alive (dead OR reached exit).
    /// </summary>
    public sealed class MinimalWaveSystem
    {
        readonly MinimalUnitSystem _units;
        readonly UnitDefSO _unitDef;
        readonly int _count;
        readonly float _intervalSec;
        readonly float _prepEndSec;

        bool _started;
        bool _completed;
        int _spawned;
        float _nextSpawnDueSec;

        public bool Started => _started;
        public bool Completed => _completed;
        public int SpawnedCount => _spawned;
        public int TotalCount => _count;

        public event Action OnWaveStarted;
        public event Action<UnitInstance> OnUnitSpawned;
        public event Action OnWaveCompleted;

        public MinimalWaveSystem(MinimalUnitSystem units, UnitDefSO unitDef,
            int count, float spawnIntervalSec, float prepEndSec = 0f)
        {
            _units = units ?? throw new ArgumentNullException(nameof(units));
            _unitDef = unitDef ?? throw new ArgumentNullException(nameof(unitDef));
            _count = System.Math.Max(0, count);
            _intervalSec = System.Math.Max(0f, spawnIntervalSec);
            _prepEndSec = System.Math.Max(0f, prepEndSec);
            _nextSpawnDueSec = _prepEndSec;
        }

        /// <summary>
        /// Mark wave 1 as started. Per Step 3 of the plan, this is the entry
        /// point that schedules the 5 spawns. After this call, subsequent
        /// Tick invocations advance the spawn schedule.
        /// </summary>
        public void StartWave1()
        {
            if (_started) return;
            _started = true;
            OnWaveStarted?.Invoke();
        }

        /// <summary>Per-tick spawn scheduler + completion check.</summary>
        public void Tick(float dtSec, float tickEndTimeSec)
        {
            if (!_started || _completed) return;

            while (_spawned < _count && _nextSpawnDueSec < tickEndTimeSec)
            {
                var unit = _units.Spawn(_unitDef);
                OnUnitSpawned?.Invoke(unit);
                _spawned++;
                _nextSpawnDueSec += _intervalSec;
            }

            if (_spawned >= _count && _units.AllUnitsCleared())
            {
                _completed = true;
                OnWaveCompleted?.Invoke();
            }
        }
    }
}
