using System;
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    [Serializable]
    public struct UnitSpriteEntry
    {
        public string unitId;
        public Sprite walkSheet;
        public Sprite idleSheet;
        public Sprite deathSheet;
    }

    [CreateAssetMenu(menuName = "GLD/Visuals/UnitSpriteCatalog", fileName = "UnitSpriteCatalog")]
    public sealed class UnitSpriteCatalogSO : ScriptableObject
    {
        public UnitSpriteEntry[] entries;

        Dictionary<string, UnitSpriteEntry> _byUnitId;

        void OnEnable()
        {
            RebuildIndex();
        }

        public Sprite FindWalk(string unitId)
        {
            return TryFind(unitId, out var entry) ? entry.walkSheet : null;
        }

        public Sprite FindIdle(string unitId)
        {
            return TryFind(unitId, out var entry) ? entry.idleSheet : null;
        }

        public Sprite FindDeath(string unitId)
        {
            return TryFind(unitId, out var entry) ? entry.deathSheet : null;
        }

        bool TryFind(string unitId, out UnitSpriteEntry entry)
        {
            if (_byUnitId == null)
                RebuildIndex();

            if (!string.IsNullOrEmpty(unitId) && _byUnitId.TryGetValue(unitId, out entry))
                return true;

            entry = default;
            return false;
        }

        void RebuildIndex()
        {
            _byUnitId = new Dictionary<string, UnitSpriteEntry>();
            if (entries == null)
                return;

            foreach (var entry in entries)
            {
                if (!string.IsNullOrEmpty(entry.unitId))
                    _byUnitId[entry.unitId] = entry;
            }
        }
    }
}
