using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace GLD.Tests.EditMode.Assets
{
    public class AtlasBoundaryTests
    {
        [Test]
        public void Atlases_HaveValidBoundaries()
        {
            var guids = AssetDatabase.FindAssets("t:SpriteAtlas");
            if (guids.Length == 0)
            {
                Assert.Inconclusive(
                    "No Sprite Atlas V2 assets present. Phase 0b user creates them via " +
                    "Assets → Create → 2D → Sprite Atlas V2. Test runs meaningfully once 10 " +
                    "atlases (Towers/Units_Core/Units_Boss/etc.) exist.");
                return;
            }

            // When atlases exist: for each, pack and verify 1px border alpha=0.
            Assert.Fail("TODO: implement per-atlas boundary check when Phase 0b atlases land.");
        }
    }
}
