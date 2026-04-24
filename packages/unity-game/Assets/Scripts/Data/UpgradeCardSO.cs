// UpgradeCardSO.cs — Per-card definition ScriptableObject.
// Mirrors one element of the upgradeCards.json array.
// Field order: alphabetic per design-decisions Q2-2.

using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Roguelike upgrade card definition. Stacking model:
    /// - Multiply: final multiplier = value^stackCount
    /// - Add: final value = value * stackCount
    /// Mirrors UpgradeCard in packages/shared/src/data/upgradeCards.ts.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Data/UpgradeCard", fileName = "UpgradeCard")]
    public sealed class UpgradeCardSO : ScriptableObject
    {
        [Tooltip("Amount granted per tick for periodic effects (energy_regen only).")]
        public int    amount;
        public string description;
        [Tooltip("Emoji icon string for the card (UI only, not a sprite reference).")]
        public string icon;
        public UpgradeCardType id;
        [Tooltip("Milliseconds between ticks for periodic effects (energy_regen only).")]
        public int    interval;
        public string name;
        public StackType stackType;
        public float  value;
    }
}
