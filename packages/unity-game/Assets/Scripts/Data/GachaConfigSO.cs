// GachaConfigSO.cs — Gacha system configuration ScriptableObject.
// Mirrors gachaConfig.json shape.
// Field order: alphabetic per design-decisions Q2-2.

using System;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>Cost definition for one gacha pull type.</summary>
    [Serializable]
    public struct GachaCostEntry
    {
        [Tooltip("Milliseconds before another free/ad pull is available. 0 = no cooldown.")]
        public int   cooldownMs;
        [Tooltip("Daily pull limit. 0 = unlimited.")]
        public int   dailyLimit;
        public int   diamond;
        [Tooltip("Cost type key matching gachaConfig.json costs object keys.")]
        public GachaCostType type;
    }

    /// <summary>
    /// Full gacha configuration: pull costs by type, pity threshold.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/GachaConfig", fileName = "GachaConfig")]
    public sealed class GachaConfigSO : ScriptableObject
    {
        public GachaCostEntry[] costs;
        [Tooltip("Number of pulls before guaranteed high-tier result.")]
        public int              pityThreshold;
    }
}
