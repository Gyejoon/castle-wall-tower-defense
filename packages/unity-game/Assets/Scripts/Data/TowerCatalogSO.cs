// TowerCatalogSO.cs — Catalog holding all TowerDefSO entries + O(1) lookup.
// Anti-pattern watchlist (Q1-4): NO game logic here. Data + FindById ONLY.

using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Catalog of all tower definitions. Loaded once via GameDatabase.
    /// Provides O(1) lookup by tower id string (Dictionary built in OnEnable).
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Catalog/TowerCatalog", fileName = "TowerCatalog")]
    public sealed class TowerCatalogSO : ScriptableObject
    {
        public TowerDefSO[] towers;

        Dictionary<string, TowerDefSO> _byId;

        void OnEnable()
        {
            if (towers == null) return;
            _byId = new Dictionary<string, TowerDefSO>(towers.Length);
            foreach (var t in towers)
            {
                if (t != null && !string.IsNullOrEmpty(t.id))
                    _byId[t.id] = t;
            }
        }

        /// <summary>Returns the TowerDefSO with the given id, or null if not found.</summary>
        public TowerDefSO FindById(string id)
        {
            if (_byId == null) OnEnable();
            _byId.TryGetValue(id, out var result);
            return result;
        }
    }
}
