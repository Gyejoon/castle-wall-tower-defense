// WaveDefSO.cs — Per-wave definition ScriptableObject.
// Mirrors one element of the waves.json array.
// Field order: alphabetic per design-decisions Q2-2.

using System;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// One spawn group within a wave: a unit type + how many to spawn.
    /// Boss waves can include optional per-group HP multiplier.
    /// Mirrors WaveGroup in packages/shared/src/constants/waves.ts.
    /// </summary>
    [Serializable]
    public struct WaveGroup
    {
        public int   count;
        [Tooltip("Per-group HP boost multiplier stacked on top of WAVE_SCALING. Default 1.")]
        public float hpMultiplier;
        [Tooltip("Unit definition id (matches UnitDefSO.id).")]
        public string unitId;
    }

    /// <summary>
    /// Immutable definition for one wave slot in endless mode.
    /// slotIndex 10,20,30,40,50 are boss waves.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Data/WaveDef", fileName = "WaveDef")]
    public sealed class WaveDefSO : ScriptableObject
    {
        [Tooltip("Seconds to wait after this wave is cleared before spawning next.")]
        public float       delayAfterClearSec;
        public WaveGroup[] groups;
        public WaveKind    kind;
        [Tooltip("1-based wave slot index in endless mode.")]
        public int         slotIndex;
    }
}
