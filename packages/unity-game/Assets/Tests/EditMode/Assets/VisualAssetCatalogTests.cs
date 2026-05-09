using GLD.Data;
using NUnit.Framework;
using UnityEditor;

namespace GLD.Tests.EditMode.Assets
{
    public sealed class VisualAssetCatalogTests
    {
        const string CatalogPath = "Assets/Resources/Visuals/VisualAssetCatalog.asset";

        [Test]
        public void VisualAssetCatalogExposesUnityReadyReferenceGroups()
        {
            var catalog = AssetDatabase.LoadAssetAtPath<VisualAssetCatalogSO>(CatalogPath);
            Assert.That(catalog, Is.Not.Null, $"Missing visual asset catalog at {CatalogPath}");

            Assert.That(catalog.towers, Is.Not.Null);
            Assert.That(catalog.units, Is.Not.Null);
            Assert.That(catalog.tiles, Is.Not.Null);

            Assert.That(catalog.Find("castle_wall.healthy"), Is.Not.Null);
            Assert.That(catalog.Find("castle_wall.damaged"), Is.Not.Null);
            Assert.That(catalog.Find("castle_wall.critical"), Is.Not.Null);

            Assert.That(catalog.Find("map.main_long_bg"), Is.Not.Null);
            Assert.That(catalog.Find("map.path_tile"), Is.Not.Null);
            Assert.That(catalog.Find("hud.energy_panel"), Is.Not.Null);
            Assert.That(catalog.Find("hud.wave_panel"), Is.Not.Null);
            Assert.That(catalog.Find("hud.action_move"), Is.Not.Null);
            Assert.That(catalog.Find("hud.action_freeze"), Is.Not.Null);
            Assert.That(catalog.Find("hud.action_wall_menu"), Is.Not.Null);
            Assert.That(catalog.Find("ui.icon_energy"), Is.Not.Null);
            Assert.That(catalog.Find("ui.tower_card_rare"), Is.Not.Null);
        }
    }
}
