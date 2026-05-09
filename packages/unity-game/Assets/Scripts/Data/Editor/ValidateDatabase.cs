// ValidateDatabase.cs — Editor cross-reference integrity checker for GLD ScriptableObjects.
// Menu: GLD/Validate Database
// Fail-loud: logs each violation via Debug.LogError, then throws if any found.
//
// Checks:
//   1. TowerDefSO.sameFamilyMergeTargetId references resolve in TowerCatalogSO (if non-empty).
//   2. MergeChainSO.rules inputA, inputB, output all resolve in TowerCatalogSO.
//   3. SummonPoolSO.towerIds all resolve in TowerCatalogSO.
//   4. WaveDefSO.groups[i].unitId all resolve in UnitCatalogSO.
//   5. WaveDefSO at GDD v1 boss slotIndex (5,10,15,20) have kind == WaveKind.Boss.

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace GLD.Data.Editor
{
    public static class ValidateDatabase
    {
        const string OutputDir = "Assets/Data";

        [MenuItem("GLD/Validate Database")]
        public static void ValidateDatabaseMenu()
        {
            try
            {
                int violations = RunValidation();
                if (violations == 0)
                    EditorUtility.DisplayDialog("GLD Validate", "All checks passed.", "OK");
                else
                    EditorUtility.DisplayDialog("GLD Validate",
                        $"{violations} violation(s) found. Check Console for details.", "OK");
            }
            catch (Exception e)
            {
                EditorUtility.DisplayDialog("GLD Validate FAILED", e.Message, "OK");
                throw;
            }
        }

        /// <summary>
        /// Runs all cross-reference checks. Returns violation count; throws if > 0.
        /// Can be called from CI via -executeMethod.
        /// </summary>
        public static int ValidateAll()
        {
            return RunValidation();
        }

        static int RunValidation()
        {
            var violations = new List<string>();

            // Load all relevant SOs from the canonical paths.
            var towerCatalog = AssetDatabase.LoadAssetAtPath<TowerCatalogSO>($"{OutputDir}/TowerCatalog.asset");
            var unitCatalog  = AssetDatabase.LoadAssetAtPath<UnitCatalogSO>($"{OutputDir}/UnitCatalog.asset");
            var waveCatalog  = AssetDatabase.LoadAssetAtPath<WaveCatalogSO>($"{OutputDir}/WaveCatalog.asset");
            var summonPool   = AssetDatabase.LoadAssetAtPath<SummonPoolSO>($"{OutputDir}/SummonPool.asset");
            var mergeChain   = AssetDatabase.LoadAssetAtPath<MergeChainSO>($"{OutputDir}/MergeChain.asset");

            if (towerCatalog == null)
            {
                violations.Add("TowerCatalog.asset not found — run GLD/Import Shared Data first.");
                ReportAndThrow(violations);
                return violations.Count;
            }

            // Build lookup sets for fast resolution.
            var towerIds = BuildTowerIdSet(towerCatalog);
            var unitIds  = BuildUnitIdSet(unitCatalog);

            // 1. Tower sameFamilyMergeTargetId integrity.
            if (towerCatalog.towers != null)
            {
                foreach (var t in towerCatalog.towers)
                {
                    if (t == null) continue;
                    if (!string.IsNullOrEmpty(t.sameFamilyMergeTargetId) &&
                        !towerIds.Contains(t.sameFamilyMergeTargetId))
                    {
                        violations.Add(
                            $"towers.{t.id} references missing merge target '{t.sameFamilyMergeTargetId}'");
                    }
                }
            }

            // 2. MergeChain integrity.
            // Rules with empty inputB are "same-tower" merges (e.g. "archer_1_same" → "wind_spire").
            // The inputA in that case is a composite key, not a tower id — only validate the output.
            // Rules with non-empty inputB are cross-family pair merges — validate both inputs and output.
            if (mergeChain != null && mergeChain.rules != null)
            {
                for (int i = 0; i < mergeChain.rules.Length; i++)
                {
                    var r = mergeChain.rules[i];
                    if (!string.IsNullOrEmpty(r.inputB))
                    {
                        // Cross-family rule: both inputs should be real tower ids.
                        if (!towerIds.Contains(r.inputA))
                            violations.Add($"mergeChain[{i}].inputA '{r.inputA}' not in TowerCatalog");
                        if (!towerIds.Contains(r.inputB))
                            violations.Add($"mergeChain[{i}].inputB '{r.inputB}' not in TowerCatalog");
                    }
                    // Always validate output.
                    if (!string.IsNullOrEmpty(r.output) && !towerIds.Contains(r.output))
                        violations.Add($"mergeChain[{i}].output '{r.output}' not in TowerCatalog");
                }
            }

            // 3. SummonPool tower id integrity.
            if (summonPool != null)
            {
                if (summonPool.towerIds != null)
                {
                    for (int i = 0; i < summonPool.towerIds.Length; i++)
                    {
                        string id = summonPool.towerIds[i];
                        if (!towerIds.Contains(id))
                            violations.Add($"summonPool.towerIds[{i}] '{id}' not in TowerCatalog");
                    }
                }
                if (summonPool.entries != null)
                {
                    for (int i = 0; i < summonPool.entries.Length; i++)
                    {
                        string id = summonPool.entries[i].towerId;
                        if (!towerIds.Contains(id))
                            violations.Add($"summonPool.entries[{i}].towerId '{id}' not in TowerCatalog");
                    }
                }
            }

            // 4. Wave group unit id integrity.
            if (waveCatalog != null && waveCatalog.waves != null && unitCatalog != null)
            {
                foreach (var wave in waveCatalog.waves)
                {
                    if (wave == null || wave.groups == null) continue;
                    for (int gi = 0; gi < wave.groups.Length; gi++)
                    {
                        string uid = wave.groups[gi].unitId;
                        if (!unitIds.Contains(uid))
                            violations.Add(
                                $"waves[{wave.slotIndex}].groups[{gi}].unitId '{uid}' not in UnitCatalog");
                    }
                }
            }

            // 5. Boss wave kind check: slotIndex 5,10,15,20 should be Boss kind.
            if (waveCatalog != null && waveCatalog.waves != null)
            {
                var bossSlots = new HashSet<int> { 5, 10, 15, 20 };
                foreach (var wave in waveCatalog.waves)
                {
                    if (wave == null) continue;
                    if (bossSlots.Contains(wave.slotIndex) && wave.kind != WaveKind.Boss)
                        violations.Add(
                            $"waves[{wave.slotIndex}] is at a boss slot but kind = {wave.kind} (expected Boss)");
                }
            }

            if (violations.Count > 0)
                ReportAndThrow(violations);
            else
                Debug.Log("[GLD Validate] All cross-reference checks passed.");

            return violations.Count;
        }

        static void ReportAndThrow(List<string> violations)
        {
            Debug.LogError($"[GLD Validate] FAIL: {violations.Count} violations");
            foreach (var v in violations)
                Debug.LogError($"  - {v}");

            throw new InvalidOperationException(
                $"[GLD Validate] {violations.Count} violation(s) found:\n" +
                string.Join("\n", violations.Select(v => "  - " + v)));
        }

        static HashSet<string> BuildTowerIdSet(TowerCatalogSO catalog)
        {
            var set = new HashSet<string>();
            if (catalog?.towers == null) return set;
            foreach (var t in catalog.towers)
                if (t != null && !string.IsNullOrEmpty(t.id))
                    set.Add(t.id);
            return set;
        }

        static HashSet<string> BuildUnitIdSet(UnitCatalogSO catalog)
        {
            var set = new HashSet<string>();
            if (catalog?.units == null) return set;
            foreach (var u in catalog.units)
                if (u != null && !string.IsNullOrEmpty(u.id))
                    set.Add(u.id);
            return set;
        }
    }
}
