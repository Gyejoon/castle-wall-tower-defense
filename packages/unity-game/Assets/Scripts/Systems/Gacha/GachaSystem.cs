using System;
using GLD.Core.Random;
using GLD.Data;

namespace GLD.Systems.Gacha
{
    public static class GachaSystem
    {
        public const float SuccessRateCap = 0.95f;

        static readonly TowerFamily[] BaseFamilies =
        {
            TowerFamily.Archer,
            TowerFamily.Siege,
            TowerFamily.Frost,
            TowerFamily.Stun
        };

        public static int GetCost(EnergyConfigSO energy, int targetTier)
        {
            var entry = FindTierEntry(energy, targetTier);
            if (entry.tier == targetTier)
                return entry.cost;

            switch (targetTier)
            {
                case 2: return 40;
                case 3: return 80;
                case 4: return 160;
                default:
                    throw new ArgumentOutOfRangeException(nameof(targetTier), "targetTier must be 2, 3, or 4.");
            }
        }

        public static TowerDefSO Draw(TowerCatalogSO towers, EnergyConfigSO energy, int targetTier, DeterministicRng rng, float oddsBonus = 0f)
        {
            if (towers == null)
                throw new ArgumentNullException(nameof(towers));
            if (rng == null)
                throw new ArgumentNullException(nameof(rng));
            if (targetTier < 2 || targetTier > 4)
                throw new ArgumentOutOfRangeException(nameof(targetTier), "targetTier must be 2, 3, or 4.");

            var entry = FindTierEntry(energy, targetTier);
            var baseRate = entry.tier == targetTier ? entry.successRate : DefaultSuccessRate(targetTier);
            var successRate = Math.Min(SuccessRateCap, Math.Max(0f, baseRate + oddsBonus));
            var success = rng.NextFloat01() < successRate;
            var family = BaseFamilies[rng.NextInt(BaseFamilies.Length)];
            var tier = success ? targetTier : 1;
            return FindByFamilyTier(towers, family, tier);
        }

        public static TowerDefSO FindByFamilyTier(TowerCatalogSO towers, TowerFamily family, int tier)
        {
            if (towers?.towers == null)
                return null;

            foreach (var tower in towers.towers)
            {
                if (tower != null && tower.family == family && tower.tier == tier)
                    return tower;
            }

            return null;
        }

        static IngameGachaTierEntry FindTierEntry(EnergyConfigSO energy, int targetTier)
        {
            if (energy?.ingameGacha != null)
            {
                foreach (var entry in energy.ingameGacha)
                    if (entry.tier == targetTier)
                        return entry;
            }
            return default;
        }

        static float DefaultSuccessRate(int targetTier)
        {
            switch (targetTier)
            {
                case 2: return 0.6f;
                case 3: return 0.2f;
                case 4: return 0.05f;
                default: return 0f;
            }
        }
    }
}
