using System;
using GLD.Data;

namespace GLD.Systems.Minimal
{
    public sealed class MinimalWaveSystem
    {
        const int PocWaveNumber = 1;
        const int PocSpawnCount = 5;
        const float PocSpawnIntervalSeconds = 0.75f;

        readonly MinimalUnitSystem _units;
        readonly UnitDefSO _unitDef;
        bool _running;
        bool _completed;
        float _spawnTimer;
        int _spawned;

        public event Action<int> WaveStarted;
        public event Action<int> WaveCompleted;
        public event Action<MinimalUnitState> UnitSpawned;

        public int CurrentWave { get; private set; }
        public int SpawnedCount => _spawned;
        public bool IsRunning => _running;
        public bool IsCompleted => _completed;

        public MinimalWaveSystem(MinimalUnitSystem units, UnitDefSO unitDef)
        {
            _units = units ?? throw new ArgumentNullException(nameof(units));
            _unitDef = unitDef;
        }

        public void StartWave1()
        {
            if (_running || _completed) return;
            CurrentWave = PocWaveNumber;
            _running = true;
            _spawnTimer = 0f;
            _spawned = 0;
            WaveStarted?.Invoke(CurrentWave);
            MinimalGameEvents.RaiseWaveStarted(CurrentWave);
        }

        public void Tick(float deltaSeconds)
        {
            if (!_running || _completed) return;

            _spawnTimer -= deltaSeconds;
            while (_spawned < PocSpawnCount && _spawnTimer <= 0f)
            {
                var unit = _unitDef != null
                    ? _units.Spawn(_unitDef)
                    : _units.Spawn("scout_drone", 30f, 0f, 3f);
                UnitSpawned?.Invoke(unit);
                _spawned++;
                _spawnTimer += PocSpawnIntervalSeconds;
            }

            if (_spawned >= PocSpawnCount && _units.ActiveCount == 0)
            {
                _completed = true;
                _running = false;
                WaveCompleted?.Invoke(CurrentWave);
                MinimalGameEvents.RaiseWaveCompleted(CurrentWave);
            }
        }
    }
}
