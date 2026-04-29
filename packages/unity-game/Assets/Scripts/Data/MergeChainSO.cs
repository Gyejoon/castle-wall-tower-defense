// MergeChainSO.cs — Merge chain rule table ScriptableObject.
// Mirrors mergeChain.json: a flat Record<"idA+idB", "outputId"> map.
// Deserialized as MergeRule[] by Task 4 importer; OnEnable builds bidirectional lookup.
// Per design-decisions Q1-2 (lines 84-102).

using System;
using System.Collections.Generic;
using UnityEngine;

namespace GLD.Data
{
    /// <summary>
    /// One merge rule: two input tower ids produce one output tower id.
    /// Cross-family and ultimate rules (not same-family same-tier) live here.
    /// Same-family rules are also included for completeness.
    /// </summary>
    [Serializable]
    public struct MergeRule
    {
        public string inputA;
        public string inputB;
        public string output;
    }

    /// <summary>
    /// Complete merge chain rule table. Bidirectional lookup cache is built in OnEnable
    /// so both (A+B) and (B+A) orderings resolve to the same output.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Data/MergeChain", fileName = "MergeChain")]
    public sealed class MergeChainSO : ScriptableObject
    {
        public MergeRule[] rules;

        Dictionary<string, string> _lookup;

        void OnEnable()
        {
            if (rules == null) return;
            _lookup = new Dictionary<string, string>(rules.Length * 2);
            foreach (var r in rules)
            {
                _lookup[$"{r.inputA}+{r.inputB}"] = r.output;
                _lookup[$"{r.inputB}+{r.inputA}"] = r.output;
            }
        }

        /// <summary>
        /// Returns the output tower id for merging towers a and b.
        /// Order-independent (bidirectional). Returns null if no rule found.
        /// </summary>
        public string Resolve(string a, string b)
        {
            if (_lookup == null) OnEnable();
            return _lookup.TryGetValue($"{a}+{b}", out var r) ? r : null;
        }
    }
}
