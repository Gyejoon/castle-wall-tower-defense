// FamilyUpgradeConfigSO.cs — Family upgrade system configuration ScriptableObject.
// Mirrors familyUpgrade.json.
// Field order: alphabetic per design-decisions Q2-2.

using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Configuration for the persistent family-level upgrade system.
    /// Upgradeable families gain +upgradesDamagePerLevel% damage per level, up to maxFamilyUpgradeLevel.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/FamilyUpgradeConfig", fileName = "FamilyUpgradeConfig")]
    public sealed class FamilyUpgradeConfigSO : ScriptableObject
    {
        [Tooltip("Base gold/diamond cost for the first level of any family upgrade.")]
        public int   baseFamilyUpgradeCost;
        [Tooltip("Maximum upgrade level allowed per family.")]
        public int   maxFamilyUpgradeLevel;
        [Tooltip("Family ids that can be upgraded (archer, siege, frost, stun).")]
        public string[] upgradeableFamilies;
        [Tooltip("Flat damage bonus per upgrade level (as a fraction, e.g. 0.75 = +75% per level).")]
        public float upgradesDamagePerLevel;
    }
}
