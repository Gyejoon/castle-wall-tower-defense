using System;
using GLD.Core;
using GLD.Data;
using UnityEngine;

namespace GLD.Systems.Energy
{
    public sealed class EnergySystem
    {
        const float SoftCapThreshold = 100f;
        const float SoftCapPerSecond = 0.5f;

        readonly float _perSecond;
        readonly int _perKill;
        readonly int _perBossKill;
        readonly int _perBossFastClear;
        float _current;

        public int Max { get; }
        public int Current => Mathf.FloorToInt(_current);

        public EnergySystem(EnergyConfigSO config)
        {
            if (config == null)
                throw new ArgumentNullException(nameof(config));

            Max = FirstPositive(config.energyMax, config.energyCap, 200);
            _current = Mathf.Clamp(FirstPositive(config.initialEnergy, config.energyInitial, 40), 0, Max);
            _perSecond = config.energyPerSecond > 0f ? config.energyPerSecond : 1f;
            _perKill = config.energyPerKill > 0 ? config.energyPerKill : 1;
            _perBossKill = config.energyPerBossKill > 0 ? config.energyPerBossKill : 20;
            _perBossFastClear = config.energyPerBossFastClear > 0 ? config.energyPerBossFastClear : 20;
            Publish();
        }

        public EnergySystem(int initial = 40, int max = 200, float perSecond = 1f, int perKill = 1, int perBossKill = 20, int perBossFastClear = 20)
        {
            Max = max;
            _current = Mathf.Clamp(initial, 0, Max);
            _perSecond = perSecond;
            _perKill = perKill;
            _perBossKill = perBossKill;
            _perBossFastClear = perBossFastClear;
            Publish();
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;

            var remaining = deltaSeconds;
            if (_current < SoftCapThreshold && _perSecond > 0f)
            {
                var toSoftCap = SoftCapThreshold - _current;
                var secondsBeforeSoftCap = toSoftCap / _perSecond;
                var preSoftCapSeconds = Mathf.Min(remaining, secondsBeforeSoftCap);
                Add(preSoftCapSeconds * _perSecond);
                remaining -= preSoftCapSeconds;
            }

            if (remaining > 0f)
                Add(remaining * SoftCapPerSecond);
        }

        public bool CanAfford(int amount) => Current >= amount;

        public bool Spend(int amount)
        {
            if (amount < 0)
                throw new ArgumentOutOfRangeException(nameof(amount));
            if (!CanAfford(amount)) return false;
            _current -= amount;
            Publish();
            return true;
        }

        public void AddKillReward() => Add(_perKill);
        public void AddBossKillReward() => Add(_perBossKill);
        public void AddFastClearReward() => Add(_perBossFastClear);

        public void Add(float amount)
        {
            if (amount <= 0f) return;
            var before = Current;
            _current = Mathf.Min(Max, _current + amount);
            if (Current != before)
                Publish();
        }

        static int FirstPositive(int a, int b, int fallback)
        {
            if (a > 0) return a;
            if (b > 0) return b;
            return fallback;
        }

        void Publish() => GameEvents.RaiseEnergyChanged(Current, Max);
    }
}
