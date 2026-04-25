// ElementMatchupSO.cs — Element matchup multiplier table ScriptableObject.
// Mirrors elementMatchup.json: Record<attackElement, Record<defenseElement, float>>.
// Serialized as row array (per design-decisions Q1-3 Importer note).
// Field order: alphabetic per design-decisions Q2-2.

using System;
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>One attacker-defender multiplier pair within an ElementMatchupRow.</summary>
    [Serializable]
    public struct ElementMultiplier
    {
        [Tooltip("Defender's element.")]
        public string defenseElement;
        [Tooltip("Damage multiplier applied when this attacker-defender pair is matched.")]
        public float  value;
    }

    /// <summary>All defense multipliers for one attack element.</summary>
    [Serializable]
    public struct ElementMatchupRow
    {
        [Tooltip("Attacker's element (fire | water | lightning | neutral).")]
        public string             attackElement;
        public ElementMultiplier[] multipliers;
    }

    /// <summary>
    /// Element matchup multiplier table.
    /// Dictionary cache is built in OnEnable for O(1) runtime lookup.
    /// Key format: "attackElement:defenseElement" → multiplier float.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/ElementMatchup", fileName = "ElementMatchup")]
    public sealed class ElementMatchupSO : ScriptableObject
    {
        public ElementMatchupRow[] rows;

        Dictionary<string, float> _lookup;

        void OnEnable()
        {
            if (rows == null) return;
            _lookup = new Dictionary<string, float>(rows.Length * 4);
            foreach (var row in rows)
            {
                if (row.multipliers == null) continue;
                foreach (var m in row.multipliers)
                    _lookup[$"{row.attackElement}:{m.defenseElement}"] = m.value;
            }
        }

        /// <summary>
        /// Returns the damage multiplier for the given attacker and defender elements.
        /// Returns 1.0 if the pair is not found.
        /// </summary>
        public float GetMultiplier(string attackElement, string defenseElement)
        {
            if (_lookup == null) OnEnable();
            return _lookup.TryGetValue($"{attackElement}:{defenseElement}", out var v) ? v : 1f;
        }
    }
}
