using GLD.Data;
using NUnit.Framework;
using UnityEditor;

namespace GLD.Tests.EditMode.Assets
{
    public sealed class TowerSpriteCatalogTests
    {
        const string CatalogPath = "Assets/Resources/Visuals/TowerSpriteCatalog.asset";

        static readonly string[] ExpectedTowerIds =
        {
            "archer",
            "wind_spire",
            "flame_tower",
            "arcane_spire",
            "nova_cannon",
            "fortress",
            "earth_golem",
            "celestial",
            "emp",
            "stasis_field",
            "disruptor",
            "world_tree",
            "shield",
            "twin_archer",
            "holy_shrine",
            "divine_throne",
            "hybrid_ab",
            "hybrid_cd",
            "ultimate"
        };

        [Test]
        public void TowerSpriteCatalogContainsAllPhase5TowerSprites()
        {
            var catalog = AssetDatabase.LoadAssetAtPath<TowerSpriteCatalogSO>(CatalogPath);
            Assert.That(catalog, Is.Not.Null, $"Missing tower sprite catalog at {CatalogPath}");
            Assert.That(catalog.entries, Has.Length.EqualTo(ExpectedTowerIds.Length));

            foreach (var towerId in ExpectedTowerIds)
            {
                Assert.That(catalog.FindStatic(towerId), Is.Not.Null, $"Missing static sprite for {towerId}");
                Assert.That(catalog.FindFire(towerId), Is.Not.Null, $"Missing fire sprite for {towerId}");
            }
        }
    }
}
