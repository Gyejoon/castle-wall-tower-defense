// UnitCatalogSO.cs — Catalog for units, including wrapper-level fields from units.json.
// The JSON shape is: { minMoveSpeed, stunImmunityWindowMs, units: [...] }
// All three are stored here. Anti-pattern watchlist (Q1-4): data + O(1) lookup ONLY.

using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Catalog of all unit definitions, plus global movement constraints from units.json wrapper.
    /// Provides O(1) lookup by unit id string.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Catalog/UnitCatalog", fileName = "UnitCatalog")]
    public sealed class UnitCatalogSO : ScriptableObject
    {
        [Header("Global Constraints")]
        [Tooltip("Minimum movement speed for any unit (tiles/sec). Matches units.json minMoveSpeed.")]
        public float minMoveSpeed;
        [Tooltip("Milliseconds during which a unit cannot be re-stunned after a stun ends.")]
        public float stunImmunityWindowMs;

        [Header("Units")]
        public UnitDefSO[] units;

        Dictionary<string, UnitDefSO> _byId;

        void OnEnable()
        {
            if (units == null) return;
            _byId = new Dictionary<string, UnitDefSO>(units.Length);
            foreach (var u in units)
            {
                if (u != null && !string.IsNullOrEmpty(u.id))
                    _byId[u.id] = u;
            }
        }

        /// <summary>Returns the UnitDefSO with the given id, or null if not found.</summary>
        public UnitDefSO FindById(string id)
        {
            if (_byId == null) OnEnable();
            _byId.TryGetValue(id, out var result);
            return result;
        }
    }
}
