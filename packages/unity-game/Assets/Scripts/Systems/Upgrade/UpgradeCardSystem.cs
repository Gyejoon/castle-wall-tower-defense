using System;
using System.Collections.Generic;
using GLD.Core.Random;
using GLD.Data;

namespace GLD.Systems.Upgrade
{
    public sealed class UpgradeCardSystem
    {
        public const int MaxStacks = 10;

        readonly UpgradeCardCatalogSO _catalog;
        readonly Dictionary<UpgradeCardType, int> _stacks = new Dictionary<UpgradeCardType, int>();
        float _energyRegenTimerSeconds;

        public UpgradeCardSystem(UpgradeCardCatalogSO catalog)
        {
            _catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
        }

        public IReadOnlyList<UpgradeCardSO> Offer(int count, DeterministicRng rng)
        {
            if (rng == null)
                throw new ArgumentNullException(nameof(rng));

            var pool = new List<UpgradeCardSO>();
            if (_catalog.cards != null)
            {
                foreach (var card in _catalog.cards)
                    if (card != null)
                        pool.Add(card);
            }

            var targetCount = Math.Max(0, Math.Min(count, pool.Count));
            var picks = new List<UpgradeCardSO>(targetCount);
            for (var i = 0; i < targetCount; i++)
            {
                var index = rng.NextInt(pool.Count);
                picks.Add(pool[index]);
                pool.RemoveAt(index);
            }
            return picks;
        }

        public int Apply(UpgradeCardType id)
        {
            var current = GetStacks(id);
            var next = Math.Min(MaxStacks, current + 1);
            _stacks[id] = next;
            return next;
        }

        public int GetStacks(UpgradeCardType id) => _stacks.TryGetValue(id, out var count) ? count : 0;

        public float GetModifier(UpgradeCardType id)
        {
            var card = _catalog.FindById(id);
            if (card == null)
                return 0f;

            var stacks = GetStacks(id);
            if (stacks == 0)
                return card.stackType == StackType.Multiply ? 1f : 0f;

            return card.stackType == StackType.Multiply
                ? (float)Math.Pow(card.value, stacks)
                : card.value * stacks;
        }

        public float DamageMultiplier => GetModifier(UpgradeCardType.DmgUp);
        public float CritDamageBonus => GetModifier(UpgradeCardType.CritDmg);
        public float EnergyPerKillBonus => GetModifier(UpgradeCardType.EnergyHarvest);
        public float EffectDurationMultiplier => GetModifier(UpgradeCardType.EffectAmp);
        public float TierOddsBonus => GetModifier(UpgradeCardType.TierOddsUp);

        public int TickEnergyRegen(float deltaSeconds)
        {
            var stacks = GetStacks(UpgradeCardType.EnergyRegen);
            if (stacks <= 0 || deltaSeconds <= 0f)
                return 0;

            var card = _catalog.FindById(UpgradeCardType.EnergyRegen);
            var intervalMs = card != null && card.interval > 0 ? card.interval : 5000;
            var intervalSeconds = Math.Max(0.001f, intervalMs / 1000f);
            var amount = card != null && card.amount > 0 ? card.amount : 2;
            var granted = 0;

            _energyRegenTimerSeconds += deltaSeconds;
            while (_energyRegenTimerSeconds >= intervalSeconds)
            {
                _energyRegenTimerSeconds -= intervalSeconds;
                granted += stacks * amount;
            }
            return granted;
        }
    }
}
