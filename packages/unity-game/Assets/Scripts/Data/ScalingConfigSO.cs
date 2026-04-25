// ScalingConfigSO.cs — Wave scaling configuration ScriptableObject.
// Mirrors scalingConfig.json: { waveScaling: [{hp, speed}] }
// Field order: alphabetic per design-decisions Q2-2.

using System;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// HP and speed multiplier for one wave scaling tier.
    /// Mirrors the waveScaling array element shape in scalingConfig.json.
    /// </summary>
    [Serializable]
    public struct WaveScalingEntry
    {
        public float hp;
        public float speed;
    }

    /// <summary>
    /// Wave scaling table: 10 entries covering waves 1-10 (linear beyond 10 via formula in WaveService).
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/ScalingConfig", fileName = "ScalingConfig")]
    public sealed class ScalingConfigSO : ScriptableObject
    {
        [Tooltip("Array of 10 wave scaling entries (waves 1-10). Beyond wave 10 uses HP_SLOPE formula.")]
        public WaveScalingEntry[] waveScaling;
    }
}
