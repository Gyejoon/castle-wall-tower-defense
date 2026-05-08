using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    public sealed class GLDSheet : VisualElement
    {
        const string Block = "gld-sheet";

        public string Anchor { get; set; } = "bottom";
        public string Variant { get; set; } = "default";

        public GLDSheet()
        {
            ApplyStyles();
        }

        public void ApplyStyles()
        {
            GLDPrimitiveStyles.ResetModifiers(this, Block);
            GLDPrimitiveStyles.ApplyBlock(this, Block);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Anchor);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Variant);
        }

        public new class UxmlFactory : UxmlFactory<GLDSheet, UxmlTraits> { }

        public new class UxmlTraits : VisualElement.UxmlTraits
        {
            readonly UxmlStringAttributeDescription _anchor = new UxmlStringAttributeDescription { name = "anchor", defaultValue = "bottom" };
            readonly UxmlStringAttributeDescription _variant = new UxmlStringAttributeDescription { name = "variant", defaultValue = "default" };
            readonly UxmlStringAttributeDescription _name = new UxmlStringAttributeDescription { name = "name", defaultValue = "" };

            public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc)
            {
                base.Init(ve, bag, cc);
                var sheet = (GLDSheet)ve;
                sheet.Anchor = _anchor.GetValueFromBag(bag, cc);
                sheet.Variant = _variant.GetValueFromBag(bag, cc);
                var name = _name.GetValueFromBag(bag, cc);
                if (!string.IsNullOrEmpty(name))
                    sheet.name = name;
                sheet.ApplyStyles();
            }
        }
    }
}
