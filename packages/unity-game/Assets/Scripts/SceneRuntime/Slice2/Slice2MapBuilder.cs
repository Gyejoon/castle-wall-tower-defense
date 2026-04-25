// Slice2MapBuilder.cs — Phase 2 Task 4 single-source-of-truth map builder.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §4 OQ-1/OQ-2: 8×18 slice2_poc map, exit at (4,0) (per the runner's
//     deviation noted in seed-001-slice2-poc.json _comment block — exit
//     moved from the original (7,0) proposal to (4,0) so the ascending
//     leg passes adjacent to the archer at (3,14)).
//
// Mirrors seed-001-slice2-poc.json so the shared TS replay-runner and the
// Unity scene/test layers all see the same path. MapLayoutSO contains only
// `main_long`; slice2_poc is intentionally programmatic — there is no
// .asset for it on disk and Phase 2 does not add one.
//
// MinimalSystemsTest.cs delegates here so the map definition has exactly
// one home (DRY: any future PoC tweak — different exit, longer L-bend,
// etc. — flips both the test fixture and the smoke-test/scene at once).

using System.Collections.Generic;
using GLD.Data;

namespace GLD.SceneRuntime.Slice2
{
    /// <summary>
    /// Builds the slice2_poc <see cref="MapDef"/> programmatically. Headless-safe
    /// (no Unity API surface), so EditMode tests can call it directly without
    /// loading any scene or asset.
    /// </summary>
    public static class Slice2MapBuilder
    {
        /// <summary>
        /// Build the canonical slice2_poc map (8×18, L-path, exit at (4,0)).
        /// Path layout:
        ///   * Descend col 0 from y=0 to y=17 (18 cells)
        ///   * Traverse row 17 from x=1 to x=4 (4 cells)
        ///   * Ascend col 4 from y=16 to y=0 (17 cells)
        /// Total path length = 39 cells.
        /// </summary>
        public static MapDef BuildSlice2PocMap()
        {
            var path = new List<GridPoint>(39);
            // Descend col 0 from y=0 to y=17.
            for (int y = 0; y <= 17; y++) path.Add(new GridPoint { x = 0, y = y });
            // Traverse row 17 from x=1 to x=4.
            for (int x = 1; x <= 4; x++) path.Add(new GridPoint { x = x, y = 17 });
            // Ascend col 4 from y=16 to y=0.
            for (int y = 16; y >= 0; y--) path.Add(new GridPoint { x = 4, y = y });

            var pathArr = path.ToArray();
            return new MapDef
            {
                id = "slice2_poc",
                name = "Slice2 PoC",
                width = 8,
                height = 18,
                tileSize = 64,
                spawnPoint = new GridPoint { x = 0, y = 0 },
                exitPoint = new GridPoint { x = 4, y = 0 },
                path = pathArr,
                blockedPlacementPoints = pathArr,
                buildablePoints = new GridPoint[0],
                obstacles = new GridPoint[0],
                castleWallTiles = new GridPoint[0],
                decorations = new MapDecoration[0],
                difficultyHpMult = 1f,
                recommendedPower = 0,
                rewardMultiplier = 1f,
                tilemapKey = "",
                tilesetKey = "",
            };
        }
    }
}
