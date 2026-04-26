// Slice2DefBuilder.cs — Phase 2 Task 6 single-source-of-truth def builders.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §3.1 Archer stats (damage 20, range 4, attackSpeed 1, projectileSpeed 8,
//          armor-pierce default, no special).
//   - §3.2 Battle robot stats (HP 80, speed 1.5 t/s, armor 5, neutral, ground).
//   - §4 OQ-3/OQ-4/OQ-5 PoC overrides.
//
// Mirrors the values shipped in
// packages/shared/src/testing/replay-fixtures/seed-001-slice2-poc.json
// AND the TS catalog in packages/shared/src/data/towers.ts / units.ts.
//
// Why a builder (not a Resources-loaded asset)?
//   The headless MinimalReplayRunner can't load Unity assets — it runs as a
//   pure C# class outside any scene/AssetDatabase context. Slice2SceneController
//   loads via GameDatabase (TowerCatalogSO/UnitCatalogSO) for the Slice2_PoC
//   scene, but EditMode tests + the runner allocate def SOs in-memory via this
//   builder. The values must stay aligned with the catalog assets — any drift
//   is caught by Task 6's parity gate (the catalog-loaded scene and the
//   builder-driven runner must produce identical kill counts).
//
// Single source dedup: MinimalSystemsTest.cs delegates here so both the
// integration test (which spawns 5 robots and verifies kills==3) and the
// replay-parity gate share one set of def values. Same pattern as
// Slice2MapBuilder (Task 4 lesson — single source dedup).

using GLD.Data;
using UnityEngine;

namespace GLD.SceneRuntime.Slice2
{
    /// <summary>
    /// Allocates the Phase 2 PoC tower/unit defs as fresh ScriptableObject
    /// instances. Headless-safe (no AssetDatabase / Resources). Callers OWN
    /// the returned instance and must <c>ScriptableObject.DestroyImmediate</c>
    /// it when done (EditMode tests do this in `try/finally`).
    /// </summary>
    public static class Slice2DefBuilder
    {
        /// <summary>
        /// Build the canonical PoC archer def (cost 20, dmg 20, range 4,
        /// attackSpeed 1, projectileSpeed 8, armor-pierce by default since
        /// <c>special</c> is empty).
        /// </summary>
        public static TowerDefSO BuildArcherDef()
        {
            var def = ScriptableObject.CreateInstance<TowerDefSO>();
            def.id = "archer";
            def.name = "Archer";
            def.color = "#777";
            def.cost = 20;
            def.element = Element.Neutral;
            def.family = TowerFamily.Archer;
            def.tier = 1;
            def.shape = TowerShape.Circle;
            def.isPremium = false;
            def.stats = new TowerStats
            {
                attackSpeed = 1f,
                damage = 20f,
                projectileSpeed = 8f,
                range = 4f,
                special = "",
            };
            def.sameFamilyMergeTargetId = "";
            return def;
        }

        /// <summary>
        /// Build the canonical PoC battle_robot def (HP 80, speed 1.5 t/s,
        /// armor 5, neutral element, ground type).
        /// </summary>
        public static UnitDefSO BuildBattleRobotDef()
        {
            var def = ScriptableObject.CreateInstance<UnitDefSO>();
            def.id = "battle_robot";
            def.name = "오크 전사";
            def.type = "ground";
            def.element = Element.Neutral;
            def.bounty = 12;
            def.stats = new UnitStats { hp = 80, speed = 1.5f, armor = 5 };
            def.flying = false;
            def.specialBehavior = UnitSpecialBehavior.None;
            def.specialParams = new SpecialParam[0];
            def.bossBehaviorId = "";
            def.bossCcResist = 0f;
            return def;
        }
    }
}
