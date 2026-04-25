// UnitDefSO.cs — Per-unit definition ScriptableObject.
// Mirrors one element of the units.json "units" array.
// Field order: alphabetic per design-decisions Q2-2.

using System;
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// Core stats for a unit, mirroring UnitStats in unit.ts.
    /// </summary>
    [Serializable]
    public struct UnitStats
    {
        public int   armor;
        public int   hp;
        public float speed;
    }

    /// <summary>
    /// Optional params for units with special behaviors.
    /// Mirrors specialParams Record&lt;string, number&gt; in unit.ts.
    /// </summary>
    [Serializable]
    public struct SpecialParam
    {
        public string key;
        public float  value;
    }

    /// <summary>
    /// Immutable definition for one enemy unit variant.
    /// Boss units additionally populate bossBehaviorId and bossCcResist.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Data/UnitDef", fileName = "UnitDef")]
    public sealed class UnitDefSO : ScriptableObject
    {
        [Header("Identity")]
        public string id;
        public bool   isPremium;
        public string name;
        public string type;

        [Header("Combat")]
        public int     bounty;
        public Element element;
        public UnitStats stats;

        [Header("Special Behaviors")]
        [Tooltip("Flying units bypass ground path collision detection.")]
        public bool flying;
        [Tooltip("Special mechanic enum for ranged_tower_attack or damage_shield.")]
        public UnitSpecialBehavior specialBehavior;
        [Tooltip("Key-value pairs for special behavior parameters (e.g. damage, range, cooldownMs, shieldHp).")]
        public SpecialParam[] specialParams;

        [Header("Boss")]
        [Tooltip("Boss behavior handler id looked up in boss-ai registry at spawn time.")]
        public string bossBehaviorId;
        [Tooltip("CC resistance 0.0–1.0. Boss units only.")]
        public float  bossCcResist;
    }
}
