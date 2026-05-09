using GLD.UI.Primitives;
using NUnit.Framework;
using UnityEditor;
using UnityEngine.UIElements;

namespace GLD.Tests.EditMode.UI
{
    public sealed class GLDPrimitivesTest
    {
        const string GalleryPath = "Assets/UI/Documents/_DebugPrimitivesGallery.uxml";
        const string Slice2HudPath = "Assets/UI/Documents/Slice2Hud.uxml";

        [Test]
        public void PrimitivesApplyExpectedClassNames()
        {
            var button = new GLDButton
            {
                Variant = "secondary",
                Size = "lg",
                Tier = 3,
                Element = "fire"
            };
            button.ApplyStyles();

            Assert.That(button.ClassListContains("gld-btn"), Is.True);
            Assert.That(button.ClassListContains("gld-btn--secondary"), Is.True);
            Assert.That(button.ClassListContains("gld-btn--lg"), Is.True);
            Assert.That(button.ClassListContains("gld-btn--tier-3"), Is.True);
            Assert.That(button.ClassListContains("gld-btn--element-fire"), Is.True);

            var card = new GLDCard { Variant = "elevated", Tier = 2, Selected = true };
            card.ApplyStyles();
            Assert.That(card.ClassListContains("gld-card--elevated"), Is.True);
            Assert.That(card.ClassListContains("gld-card--tier-2"), Is.True);
            Assert.That(card.ClassListContains("gld-card--selected"), Is.True);
        }

        [Test]
        public void DebugGalleryInstantiatesAllPrimitiveTypes()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(GalleryPath);
            Assert.That(asset, Is.Not.Null, $"Missing debug gallery at {GalleryPath}");

            var root = asset.CloneTree();
            var primary = root.Q<GLDButton>("primary-button");
            var selected = root.Q<GLDCard>("selected-card");
            var tier = root.Q<GLDBadge>("tier-badge");
            Assert.That(primary, Is.Not.Null);
            Assert.That(selected, Is.Not.Null);
            Assert.That(tier, Is.Not.Null);
            Assert.That(root.Q<GLDPanel>("debug-primitives-gallery"), Is.Not.Null);
            Assert.That(root.Q<GLDOverlay>("hidden-overlay"), Is.Not.Null);
            Assert.That(root.Q<GLDSheet>("floating-sheet"), Is.Not.Null);
            Assert.That(primary.ClassListContains("gld-btn--primary"), Is.True);
            Assert.That(primary.ClassListContains("gld-btn--lg"), Is.True);
            Assert.That(selected.ClassListContains("gld-card--elevated"), Is.True);
            Assert.That(selected.ClassListContains("gld-card--selected"), Is.True);
            Assert.That(tier.ClassListContains("gld-badge--tier-4"), Is.True);
        }

        [Test]
        public void Slice2HudUsesDesignSystemPrimitives()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(Slice2HudPath);
            Assert.That(asset, Is.Not.Null, $"Missing Slice2 HUD at {Slice2HudPath}");

            var root = asset.CloneTree();
            Assert.That(root.Q<GLDBadge>("energy-label"), Is.Not.Null);
            Assert.That(root.Q<GLDBadge>("wave-label"), Is.Not.Null);
            Assert.That(root.Q<GLDBadge>("hp-label"), Is.Not.Null);
            Assert.That(root.Q<GLDButton>("place-archer-button"), Is.Not.Null);
            Assert.That(root.Q<GLDButton>("place-archer-button").ClassListContains("gld-btn--primary"), Is.True);
        }
    }
}
