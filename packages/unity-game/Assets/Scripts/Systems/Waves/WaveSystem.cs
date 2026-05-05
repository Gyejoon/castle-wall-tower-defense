using System;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Units;
using UnityEngine;

namespace GLD.Systems.Waves
{
    public enum WavePhase
    {
        Idle,
        Running,
        Interwave,
        Victory
    }

    public sealed class WaveSystem
    {
        const float SpawnIntervalSeconds = 0.75f;

        readonly WaveCatalogSO _waves;
        readonly UnitCatalogSO _unitsCatalog;
        readonly UnitSystem _units;
        WaveDefSO _currentWave;
        int _groupIndex;
        int _spawnedInGroup;
        float _spawnTimer;
        float _interwaveTimer;

        public int CurrentWaveSlot { get; private set; }
        public WavePhase Phase { get; private set; } = WavePhase.Idle;
        public int SpawnedCount { get; private set; }

        public event Action<int> WaveStarted;
        public event Action<int> WaveCompleted;

        public WaveSystem(WaveCatalogSO waves, UnitCatalogSO unitsCatalog, UnitSystem units)
        {
            _waves = waves ?? throw new ArgumentNullException(nameof(waves));
            _unitsCatalog = unitsCatalog ?? throw new ArgumentNullException(nameof(unitsCatalog));
            _units = units ?? throw new ArgumentNullException(nameof(units));
        }

        public bool Start(int slot = 1)
        {
            if (Phase == WavePhase.Running)
                return false;

            var wave = _waves.FindBySlot(slot);
            if (wave == null)
                return false;

            CurrentWaveSlot = slot;
            _currentWave = wave;
            _groupIndex = 0;
            _spawnedInGroup = 0;
            _spawnTimer = 0f;
            SpawnedCount = 0;
            Phase = WavePhase.Running;
            WaveStarted?.Invoke(CurrentWaveSlot);
            GameEvents.RaiseWaveStarted(CurrentWaveSlot);
            return true;
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;

            if (Phase == WavePhase.Interwave)
            {
                _interwaveTimer -= deltaSeconds;
                if (_interwaveTimer <= 0f)
                    Start(CurrentWaveSlot + 1);
                return;
            }

            if (Phase != WavePhase.Running || _currentWave == null)
                return;

            TickSpawns(deltaSeconds);

            if (AllGroupsSpawned() && _units.ActiveCount == 0)
                CompleteCurrentWave();
        }

        void TickSpawns(float deltaSeconds)
        {
            _spawnTimer -= deltaSeconds;
            while (_spawnTimer <= 0f && !AllGroupsSpawned())
            {
                var group = _currentWave.groups[_groupIndex];
                var def = _unitsCatalog.FindById(group.unitId);
                if (def == null)
                    throw new InvalidOperationException($"Unknown unit id '{group.unitId}' in wave {CurrentWaveSlot}.");

                _units.Spawn(def, group.hpMultiplier > 0f ? group.hpMultiplier : 1f);
                SpawnedCount++;
                _spawnedInGroup++;
                _spawnTimer += SpawnIntervalSeconds;

                if (_spawnedInGroup >= group.count)
                {
                    _groupIndex++;
                    _spawnedInGroup = 0;
                }
            }
        }

        bool AllGroupsSpawned() => _currentWave.groups == null || _groupIndex >= _currentWave.groups.Length;

        void CompleteCurrentWave()
        {
            WaveCompleted?.Invoke(CurrentWaveSlot);
            GameEvents.RaiseWaveCompleted(CurrentWaveSlot);

            if (CurrentWaveSlot >= 50 || _waves.FindBySlot(CurrentWaveSlot + 1) == null)
            {
                Phase = WavePhase.Victory;
                GameEvents.RaiseGameOver(true);
                return;
            }

            Phase = WavePhase.Interwave;
            _interwaveTimer = Mathf.Max(0f, _currentWave.delayAfterClearSec);
        }
    }
}
