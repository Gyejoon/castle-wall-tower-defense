using GLD.Data;
using NUnit.Framework;
using UnityEditor;

namespace GLD.Tests.EditMode.Assets
{
    public sealed class VisualSpriteCatalogTests
    {
        static readonly string[] ExpectedUnitIds =
        {
            "arcane_mage",
            "battle_robot",
            "corrupted_archmage",
            "dragon",
            "flame_imp",
            "forge_master",
            "heavy_walker",
            "lava_golem",
            "mana_shield",
            "orc_warlord",
            "scout_drone",
            "stealth_drone"
        };

        [Test]
        public void UnitSpriteCatalogContainsAllCurrentUnits()
        {
            var catalog = AssetDatabase.LoadAssetAtPath<UnitSpriteCatalogSO>("Assets/Resources/Visuals/UnitSpriteCatalog.asset");
            Assert.That(catalog, Is.Not.Null);
            Assert.That(catalog.entries, Has.Length.EqualTo(ExpectedUnitIds.Length));

            foreach (var unitId in ExpectedUnitIds)
            {
                Assert.That(catalog.FindWalk(unitId), Is.Not.Null, $"Missing walk sheet for {unitId}");
                Assert.That(catalog.FindIdle(unitId), Is.Not.Null, $"Missing idle sheet for {unitId}");
                Assert.That(catalog.FindDeath(unitId), Is.Not.Null, $"Missing death sheet for {unitId}");
            }
        }

        [Test]
        public void TileSpriteCatalogContainsCoreFieldTiles()
        {
            var catalog = AssetDatabase.LoadAssetAtPath<TileSpriteCatalogSO>("Assets/Resources/Visuals/TileSpriteCatalog.asset");
            Assert.That(catalog, Is.Not.Null);
            Assert.That(catalog.mainLongBackground, Is.Not.Null);
            Assert.That(catalog.ground, Is.Not.Null);
            Assert.That(catalog.path, Is.Not.Null);
            Assert.That(catalog.buildable, Is.Not.Null);
            Assert.That(catalog.blocked, Is.Not.Null);
            Assert.That(catalog.spawn, Is.Not.Null);
            Assert.That(catalog.exit, Is.Not.Null);
        }
    }
}
