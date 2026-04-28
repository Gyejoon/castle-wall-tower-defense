// WaveCatalogSO.cs — Catalog holding all 50 WaveDefSO entries + lookup.
// Anti-pattern watchlist (Q1-4): data + O(1) lookup ONLY.

using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Catalog of all wave definitions (50 waves for endless mode).
    /// Provides lookup by slotIndex (1-based).
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Catalog/WaveCatalog", fileName = "WaveCatalog")]
    public sealed class WaveCatalogSO : ScriptableObject
    {
        public WaveDefSO[] waves;

        Dictionary<int, WaveDefSO> _bySlot;

        void OnEnable()
        {
            if (waves == null) return;
            _bySlot = new Dictionary<int, WaveDefSO>(waves.Length);
            foreach (var w in waves)
            {
                if (w != null)
                    _bySlot[w.slotIndex] = w;
            }
        }

        /// <summary>Returns the WaveDefSO for the given 1-based slot index, or null if not found.</summary>
        public WaveDefSO FindBySlot(int slotIndex)
        {
            if (_bySlot == null) OnEnable();
            _bySlot.TryGetValue(slotIndex, out var result);
            return result;
        }
    }
}
