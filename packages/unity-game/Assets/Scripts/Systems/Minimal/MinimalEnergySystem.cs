using System;
using UnityEngine;

namespace GLD.Systems.Minimal
{
    public sealed class MinimalEnergySystem
    {
        public const float DefaultInitial = 40f;
        public const float DefaultMax = 200f;
        public const float DefaultPassivePerSecond = 1f;
        public const float DefaultKillReward = 1f;

        public event Action<float, float> EnergyChanged;

        public float Current { get; private set; }
        public float Max { get; }
        public float Peak { get; private set; }

        readonly float _passivePerSecond;
        readonly float _killReward;

        public MinimalEnergySystem(
            float initial = DefaultInitial,
            float max = DefaultMax,
            float passivePerSecond = DefaultPassivePerSecond,
            float killReward = DefaultKillReward)
        {
            Max = max;
            _passivePerSecond = passivePerSecond;
            _killReward = killReward;
            Current = Mathf.Clamp(initial, 0f, Max);
            Peak = Current;
            Notify();
        }

        public bool CanSpend(float amount) => Current + 0.0001f >= amount;

        public bool SpendOrFail(float amount)
        {
            if (!CanSpend(amount)) return false;
            Current = Mathf.Max(0f, Current - amount);
            Notify();
            return true;
        }

        public void AddKillReward() => Add(_killReward);

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;
            Add(deltaSeconds * _passivePerSecond);
        }

        void Add(float amount)
        {
            if (amount <= 0f) return;
            Current = Mathf.Min(Max, Current + amount);
            Peak = Mathf.Max(Peak, Current);
            Notify();
        }

        void Notify()
        {
            EnergyChanged?.Invoke(Current, Max);
            MinimalGameEvents.RaiseEnergyChanged(Current, Max);
        }
    }
}
