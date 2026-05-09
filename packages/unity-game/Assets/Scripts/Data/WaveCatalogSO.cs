// WaveCatalogSO.cs — Catalog holding active WaveDefSO entries + lookup.
// Anti-pattern watchlist (Q1-4): data + O(1) lookup ONLY.

using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Catalog of active wave definitions for the v1 run.
    /// Provides lookup by slotIndex (1-based).
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Catalog/WaveCatalog", fileName = "WaveCatalog")]
    public sealed class WaveCatalogSO : ScriptableObject
    {
        public int activeWaveLimit = 20;
        public WaveDefSO[] waves;

        Dictionary<int, WaveDefSO> _bySlot;

        public int ActiveWaveLimit =>
            activeWaveLimit > 0 ? activeWaveLimit : (waves != null ? waves.Length : 0);

        void OnEnable()
        {
            RebuildLookup();
        }

        void RebuildLookup()
        {
            if (waves == null)
            {
                _bySlot = null;
                return;
            }

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
            if (_bySlot == null || (waves != null && _bySlot.Count != waves.Length))
                RebuildLookup();
            if (_bySlot == null)
                return null;
            _bySlot.TryGetValue(slotIndex, out var result);
            return result;
        }
    }
}
