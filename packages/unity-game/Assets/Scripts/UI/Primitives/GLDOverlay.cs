using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    public sealed class GLDOverlay : VisualElement
    {
        const string Block = "gld-overlay";

        public string Dim { get; set; } = "default";
        public bool Visible { get; set; } = true;

        public GLDOverlay()
        {
            ApplyStyles();
        }

        public void ApplyStyles()
        {
            GLDPrimitiveStyles.ResetModifiers(this, Block);
            GLDPrimitiveStyles.ApplyBlock(this, Block);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Dim);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Visible ? "visible" : "hidden");
        }

        public new class UxmlFactory : UxmlFactory<GLDOverlay, UxmlTraits> { }

        public new class UxmlTraits : VisualElement.UxmlTraits
        {
            readonly UxmlStringAttributeDescription _dim = new UxmlStringAttributeDescription { name = "dim", defaultValue = "default" };
            readonly UxmlBoolAttributeDescription _visible = new UxmlBoolAttributeDescription { name = "visible", defaultValue = true };
            readonly UxmlStringAttributeDescription _name = new UxmlStringAttributeDescription { name = "name", defaultValue = "" };

            public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc)
            {
                base.Init(ve, bag, cc);
                var overlay = (GLDOverlay)ve;
                overlay.Dim = _dim.GetValueFromBag(bag, cc);
                overlay.Visible = _visible.GetValueFromBag(bag, cc);
                var name = _name.GetValueFromBag(bag, cc);
                if (!string.IsNullOrEmpty(name))
                    overlay.name = name;
                overlay.ApplyStyles();
            }
        }
    }
}
