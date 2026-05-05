using UnityEngine;

namespace GLD.Data
{
    [CreateAssetMenu(menuName = "GLD/Visuals/TileSpriteCatalog", fileName = "TileSpriteCatalog")]
    public sealed class TileSpriteCatalogSO : ScriptableObject
    {
        public Sprite mainLongBackground;
        public Sprite ground;
        public Sprite path;
        public Sprite buildable;
        public Sprite blocked;
        public Sprite spawn;
        public Sprite exit;
    }
}
