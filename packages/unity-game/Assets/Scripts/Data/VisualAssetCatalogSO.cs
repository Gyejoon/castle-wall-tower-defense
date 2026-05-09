using System;
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    [Serializable]
    public struct VisualSpriteEntry
    {
        public string key;
        public Sprite sprite;
    }

    [Serializable]
    public struct CastleWallSpriteSet
    {
        public Sprite healthy;
        public Sprite damaged;
        public Sprite critical;
    }

    [CreateAssetMenu(menuName = "GLD/Visuals/VisualAssetCatalog", fileName = "VisualAssetCatalog")]
    public sealed class VisualAssetCatalogSO : ScriptableObject
    {
        [Header("Runtime Catalogs")]
        public TowerSpriteCatalogSO towers;
        public UnitSpriteCatalogSO units;
        public TileSpriteCatalogSO tiles;

        [Header("Castle Wall")]
        public CastleWallSpriteSet castleWall;

        [Header("Sprite Groups")]
        public VisualSpriteEntry[] mapSprites;
        public VisualSpriteEntry[] hudSprites;
        public VisualSpriteEntry[] uiSprites;

        Dictionary<string, Sprite> _byKey;

        void OnEnable()
        {
            RebuildIndex();
        }

        public Sprite Find(string key)
        {
            if (_byKey == null)
                RebuildIndex();

            return !string.IsNullOrEmpty(key) && _byKey.TryGetValue(key, out var sprite)
                ? sprite
                : null;
        }

        void RebuildIndex()
        {
            _byKey = new Dictionary<string, Sprite>();

            Add("castle_wall.healthy", castleWall.healthy);
            Add("castle_wall.damaged", castleWall.damaged);
            Add("castle_wall.critical", castleWall.critical);
            Add(mapSprites);
            Add(hudSprites);
            Add(uiSprites);
        }

        void Add(VisualSpriteEntry[] entries)
        {
            if (entries == null)
                return;

            foreach (var entry in entries)
                Add(entry.key, entry.sprite);
        }

        void Add(string key, Sprite sprite)
        {
            if (!string.IsNullOrEmpty(key) && sprite != null)
                _byKey[key] = sprite;
        }
    }
}
