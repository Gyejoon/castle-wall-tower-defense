using System;
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    [Serializable]
    public struct TowerSpriteEntry
    {
        public string towerId;
        public Sprite staticSprite;
        public Sprite fireSprite;
    }

    [CreateAssetMenu(menuName = "GLD/Visuals/TowerSpriteCatalog", fileName = "TowerSpriteCatalog")]
    public sealed class TowerSpriteCatalogSO : ScriptableObject
    {
        public TowerSpriteEntry[] entries;

        Dictionary<string, TowerSpriteEntry> _byTowerId;

        void OnEnable()
        {
            RebuildIndex();
        }

        public Sprite FindStatic(string towerId)
        {
            return TryFind(towerId, out var entry) ? entry.staticSprite : null;
        }

        public Sprite FindFire(string towerId)
        {
            return TryFind(towerId, out var entry) ? entry.fireSprite : null;
        }

        bool TryFind(string towerId, out TowerSpriteEntry entry)
        {
            if (_byTowerId == null)
                RebuildIndex();

            if (!string.IsNullOrEmpty(towerId) && _byTowerId.TryGetValue(towerId, out entry))
                return true;

            entry = default;
            return false;
        }

        void RebuildIndex()
        {
            _byTowerId = new Dictionary<string, TowerSpriteEntry>();
            if (entries == null)
                return;

            foreach (var entry in entries)
            {
                if (!string.IsNullOrEmpty(entry.towerId))
                    _byTowerId[entry.towerId] = entry;
            }
        }
    }
}
