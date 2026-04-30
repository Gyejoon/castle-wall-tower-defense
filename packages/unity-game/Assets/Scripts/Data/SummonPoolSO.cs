// SummonPoolSO.cs — Summon pool ScriptableObject.
// Mirrors summonPools.json: { entries: [{towerId, weight}], towerIds: string[] }
// Field order: alphabetic per design-decisions Q2-2.

using System;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>One weighted entry in the summon pool.</summary>
    [Serializable]
    public struct SummonPoolEntry
    {
        public string towerId;
        public int    weight;
    }

    /// <summary>
    /// Gacha summon pool definition: weighted tower entries and a flat id list.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/SummonPool", fileName = "SummonPool")]
    public sealed class SummonPoolSO : ScriptableObject
    {
        public SummonPoolEntry[] entries;
        [Tooltip("Flat list of tower ids in this pool (redundant with entries; kept for fast iteration).")]
        public string[]          towerIds;
    }
}
