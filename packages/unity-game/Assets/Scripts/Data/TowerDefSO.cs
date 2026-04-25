// TowerDefSO.cs — Per-tower definition ScriptableObject.
// Mirrors one element of the towers.json array.
// Field order: alphabetic per design-decisions Q2-2.
// Design decisions: Q1-2 (string sameFamilyMergeTargetId, not SO ref).

using System;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Flattened projectile configuration (per design-decisions Q2-4).
    /// Straight variant uses <see cref="speed"/>; Homing uses <see cref="turnRate"/>.
    /// </summary>
    [Serializable]
    public struct ProjectileConfig
    {
        public ProjectileKind kind;
        [Tooltip("Grid tiles per second — used for Straight projectiles.")]
        public float speed;
        [Tooltip("Turn rate in degrees/sec — used for Homing projectiles.")]
        public float turnRate;
    }

    /// <summary>
    /// Core combat stats for a tower, mirroring TowerStats in tower.ts.
    /// </summary>
    [Serializable]
    public struct TowerStats
    {
        public float attackSpeed;
        public float damage;
        [Tooltip("Optional projectile speed. 0 = instant (beam/melee).")]
        public float projectileSpeed;
        public float range;
        [Tooltip("Special mechanic string, e.g. 'splash_1.2', 'slow_30%', 'stun_300ms'.")]
        public string special;
    }

    /// <summary>
    /// Immutable definition for one tower variant.
    /// One .asset file per tower; referenced by TowerCatalogSO.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Data/TowerDef", fileName = "TowerDef")]
    public sealed class TowerDefSO : ScriptableObject
    {
        [Header("Identity")]
        public string color;
        public int    cost;
        [Tooltip("ElementType string: fire | water | lightning | neutral")]
        public Element element;
        [Tooltip("TowerFamily string: archer | siege | frost | stun | hybrid | ultimate")]
        public TowerFamily family;
        public string id;
        public bool   isPremium;
        public string name;
        [Tooltip("Visual shape enum.")]
        public TowerShape shape;
        public int    tier;

        [Header("Combat")]
        public TowerStats stats;

        [Header("Merge")]
        [Tooltip("Result tower id when two same-family same-tier towers are merged. Empty = terminal tier.")]
        public string sameFamilyMergeTargetId;
    }
}
