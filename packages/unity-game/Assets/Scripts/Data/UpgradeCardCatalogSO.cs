// UpgradeCardCatalogSO.cs — Catalog holding all UpgradeCardSO entries + O(1) lookup.
// Anti-pattern watchlist (Q1-4): data + FindById ONLY.

using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Catalog of all 6 roguelike upgrade card definitions.
    /// Provides O(1) lookup by UpgradeCardType enum id.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Catalog/UpgradeCardCatalog", fileName = "UpgradeCardCatalog")]
    public sealed class UpgradeCardCatalogSO : ScriptableObject
    {
        public UpgradeCardSO[] cards;

        Dictionary<UpgradeCardType, UpgradeCardSO> _byId;

        void OnEnable()
        {
            if (cards == null) return;
            _byId = new Dictionary<UpgradeCardType, UpgradeCardSO>(cards.Length);
            foreach (var c in cards)
            {
                if (c != null)
                    _byId[c.id] = c;
            }
        }

        /// <summary>Returns the UpgradeCardSO with the given id, or null if not found.</summary>
        public UpgradeCardSO FindById(UpgradeCardType id)
        {
            if (_byId == null) OnEnable();
            _byId.TryGetValue(id, out var result);
            return result;
        }
    }
}
