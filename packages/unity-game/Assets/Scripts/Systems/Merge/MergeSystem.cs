using System;
using GLD.Data;

namespace GLD.Systems.Merge
{
    public enum MergeFailureReason
    {
        InvalidTile,
        DifferentTower,
        DifferentTier,
        MaxTier
    }

    public readonly struct MergeResult
    {
        public readonly bool Success;
        public readonly TowerDefSO Output;
        public readonly MergeFailureReason Reason;

        MergeResult(bool success, TowerDefSO output, MergeFailureReason reason)
        {
            Success = success;
            Output = output;
            Reason = reason;
        }

        public static MergeResult Ok(TowerDefSO output) => new MergeResult(true, output, default);
        public static MergeResult Fail(MergeFailureReason reason) => new MergeResult(false, null, reason);
    }

    public static class MergeSystem
    {
        public static MergeResult Resolve(TowerDefSO a, TowerDefSO b, TowerCatalogSO towers, MergeChainSO chain)
        {
            if (a == null || b == null || towers == null)
                return MergeResult.Fail(MergeFailureReason.InvalidTile);

            var outputId = ResolveOutputId(a, b, chain);
            if (string.IsNullOrEmpty(outputId))
                return MergeResult.Fail(ClassifyFailure(a, b));

            var output = towers.FindById(outputId);
            return output != null
                ? MergeResult.Ok(output)
                : MergeResult.Fail(MergeFailureReason.InvalidTile);
        }

        public static string ResolveOutputId(TowerDefSO a, TowerDefSO b, MergeChainSO chain)
        {
            if (a == null || b == null)
                return null;

            if (a.family == b.family && a.tier == b.tier && a.tier < 4)
                return !string.IsNullOrEmpty(a.sameFamilyMergeTargetId)
                    ? a.sameFamilyMergeTargetId
                    : chain?.Resolve($"{ToSharedFamilyId(a.family)}_{a.tier}_same", string.Empty);

            return chain?.Resolve(a.id, b.id);
        }

        static string ToSharedFamilyId(TowerFamily family)
        {
            switch (family)
            {
                case TowerFamily.Archer:
                    return "archer";
                case TowerFamily.Frost:
                    return "frost";
                case TowerFamily.Siege:
                    return "siege";
                case TowerFamily.Stun:
                    return "stun";
                case TowerFamily.Hybrid:
                    return "hybrid";
                case TowerFamily.Ultimate:
                    return "ultimate";
                default:
                    return family.ToString().ToLowerInvariant();
            }
        }

        static MergeFailureReason ClassifyFailure(TowerDefSO a, TowerDefSO b)
        {
            if (a.family == b.family && a.tier == b.tier && a.tier >= 4)
                return MergeFailureReason.MaxTier;
            if (a.tier != b.tier)
                return MergeFailureReason.DifferentTier;
            return MergeFailureReason.DifferentTower;
        }

        public static string ToEventReason(MergeFailureReason reason)
        {
            switch (reason)
            {
                case MergeFailureReason.DifferentTower:
                    return "different-tower";
                case MergeFailureReason.DifferentTier:
                    return "different-tier";
                case MergeFailureReason.MaxTier:
                    return "max-tier";
                case MergeFailureReason.InvalidTile:
                default:
                    return "invalid-tile";
            }
        }
    }
}
