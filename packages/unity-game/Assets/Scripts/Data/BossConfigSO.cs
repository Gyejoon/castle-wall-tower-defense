// BossConfigSO.cs — Boss behavior configuration ScriptableObject.
// Mirrors bossConfig.json.
// Field order: alphabetic per design-decisions Q2-2.

using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Global boss behavior configuration (speed multipliers, tints, phase thresholds).
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/BossConfig", fileName = "BossConfig")]
    public sealed class BossConfigSO : ScriptableObject
    {
        [Tooltip("Milliseconds of invulnerability after a boss phase transition.")]
        public int   invulnerabilityMs;
        [Tooltip("Speed multiplier applied when boss enters phase 2 (HP ratio <= phaseTransitionRatio).")]
        public float phase2SpeedMultiplier;
        [Tooltip("Tint color integer (0xRRGGBB) applied in phase 2.")]
        public int   phase2Tint;
        [Tooltip("Speed multiplier applied when boss enters phase 3.")]
        public float phase3SpeedMultiplier;
        [Tooltip("Tint color integer (0xRRGGBB) applied in phase 3.")]
        public int   phase3Tint;
        [Tooltip("HP ratio (0–1) at which the boss transitions to phase 3.")]
        public float phase3TransitionRatio;
        [Tooltip("HP ratio (0–1) at which the boss transitions to phase 2.")]
        public float phaseTransitionRatio;
    }
}
