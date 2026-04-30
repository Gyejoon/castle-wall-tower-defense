// EnergyConfigSO.cs — Energy economy configuration ScriptableObject.
// Mirrors energyConfig.json shape including ingameGacha sub-object.
// Field order: alphabetic per design-decisions Q2-2.

using System;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// In-game gacha tier entry: cost in energy + success rate.
    /// Mirrors ingameGacha.tier2/tier3/tier4 in energyConfig.json.
    /// </summary>
    [Serializable]
    public struct IngameGachaTierEntry
    {
        public int   cost;
        public float successRate;
        [Tooltip("Tier number (2, 3, or 4).")]
        public int   tier;
    }

    /// <summary>
    /// Full energy economy configuration: per-event energy grants, cap, and in-game gacha costs.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/EnergyConfig", fileName = "EnergyConfig")]
    public sealed class EnergyConfigSO : ScriptableObject
    {
        [Header("Energy Budget")]
        public int   energyCap;
        public int   energyInitial;
        public int   energyMax;
        public int   initialEnergy;

        [Header("Energy Per Event")]
        public int   energyPerBossFastClear;
        public int   energyPerBossKill;
        public int   energyPerKill;
        public float energyPerSecond;
        public int   energyPerWaveClear;

        [Header("Fast Clear")]
        [Tooltip("Milliseconds threshold below which a boss clear counts as 'fast'.")]
        public int   fastClearThresholdMs;

        [Header("In-Game Gacha")]
        public IngameGachaTierEntry[] ingameGacha;
    }
}
