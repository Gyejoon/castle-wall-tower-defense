using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    public sealed class GLDPanel : VisualElement
    {
        const string Block = "gld-panel";

        public string Variant { get; set; } = "default";
        public string Padding { get; set; } = "md";

        public GLDPanel()
        {
            ApplyStyles();
        }

        public void ApplyStyles()
        {
            GLDPrimitiveStyles.ResetModifiers(this, Block);
            GLDPrimitiveStyles.ApplyBlock(this, Block);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Variant);
            GLDPrimitiveStyles.ApplyModifier(this, Block, $"pad-{Padding}");
        }

        public new class UxmlFactory : UxmlFactory<GLDPanel, UxmlTraits> { }

        public new class UxmlTraits : VisualElement.UxmlTraits
        {
            readonly UxmlStringAttributeDescription _variant = new UxmlStringAttributeDescription { name = "variant", defaultValue = "default" };
            readonly UxmlStringAttributeDescription _padding = new UxmlStringAttributeDescription { name = "padding", defaultValue = "md" };
            readonly UxmlStringAttributeDescription _name = new UxmlStringAttributeDescription { name = "name", defaultValue = "" };

            public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc)
            {
                base.Init(ve, bag, cc);
                var panel = (GLDPanel)ve;
                panel.Variant = _variant.GetValueFromBag(bag, cc);
                panel.Padding = _padding.GetValueFromBag(bag, cc);
                var name = _name.GetValueFromBag(bag, cc);
                if (!string.IsNullOrEmpty(name))
                    panel.name = name;
                panel.ApplyStyles();
            }
        }
    }
}
