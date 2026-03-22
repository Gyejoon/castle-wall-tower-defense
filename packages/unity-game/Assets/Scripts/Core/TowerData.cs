using UnityEngine;

namespace GLD.Core
{
    [CreateAssetMenu(fileName = "NewTower", menuName = "GLD/Tower Data")]
    public class TowerData : ScriptableObject
    {
        public string Id;
        public string DisplayName;
        public int Tier;
        public float Damage;
        public float Range;
        public float AttackSpeed;
        public int Cost;
        public Color TowerColor = Color.white;

        [Header("Visual")]
        public Sprite Icon;
    }
}
