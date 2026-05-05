using GLD.Data;
using GLD.Data.Editor;
using NUnit.Framework;
using UnityEngine;

namespace GLD.Tests.EditMode.Editor
{
    public sealed class MapPlacementAnchorEditorWindowTest
    {
        [Test]
        public void AnchorPositionRoundTripsThroughSceneCoordinates()
        {
            var map = CreateMap();
            var anchor = new PlacementAnchor
            {
                x = 3,
                y = 4,
                worldX = (3 + 0.5f) * map.tileSize,
                worldY = (4 + 0.5f) * map.tileSize,
            };

            var scenePosition = MapPlacementAnchorEditorWindow.AnchorToScenePosition(map, anchor);
            var result = MapPlacementAnchorEditorWindow.ScenePositionToAnchor(map, anchor, scenePosition);

            Assert.That(result.x, Is.EqualTo(anchor.x));
            Assert.That(result.y, Is.EqualTo(anchor.y));
            Assert.That(result.worldX, Is.EqualTo(anchor.worldX).Within(0.001f));
            Assert.That(result.worldY, Is.EqualTo(anchor.worldY).Within(0.001f));
        }

        [Test]
        public void ScenePositionToAnchorPreservesSubCellOffset()
        {
            var map = CreateMap();
            var anchor = new PlacementAnchor { x = 5, y = 6 };
            var scenePosition = MapPlacementAnchorEditorWindow.GridPointToScenePosition(map, 5.25f, 6.75f);

            var result = MapPlacementAnchorEditorWindow.ScenePositionToAnchor(map, anchor, scenePosition);

            Assert.That(result.x, Is.EqualTo(5));
            Assert.That(result.y, Is.EqualTo(6));
            Assert.That(result.worldX, Is.EqualTo((5.25f + 0.5f) * map.tileSize).Within(0.001f));
            Assert.That(result.worldY, Is.EqualTo((6.75f + 0.5f) * map.tileSize).Within(0.001f));
        }

        [Test]
        public void BuildDefaultAnchorUsesGridCellCenter()
        {
            var map = CreateMap();
            var point = new GridPoint { x = 2, y = 11 };

            var anchor = MapPlacementAnchorEditorWindow.BuildDefaultAnchor(map, point);

            Assert.That(anchor.x, Is.EqualTo(point.x));
            Assert.That(anchor.y, Is.EqualTo(point.y));
            Assert.That(anchor.worldX, Is.EqualTo((point.x + 0.5f) * map.tileSize));
            Assert.That(anchor.worldY, Is.EqualTo((point.y + 0.5f) * map.tileSize));
        }

        static MapDef CreateMap()
        {
            return new MapDef
            {
                id = "test",
                width = 9,
                height = 18,
                tileSize = 64,
            };
        }
    }
}
