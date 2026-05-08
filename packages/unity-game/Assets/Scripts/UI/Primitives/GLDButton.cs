using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    public sealed class GLDButton : Button
    {
        const string Block = "gld-btn";

        public string Variant { get; set; } = "primary";
        public string Size { get; set; } = "md";
        public int Tier { get; set; }
        public string Element { get; set; }

        public GLDButton()
        {
            ApplyStyles();
        }

        public GLDButton(string text) : base()
        {
            this.text = text;
            ApplyStyles();
        }

        public void ApplyStyles()
        {
            GLDPrimitiveStyles.ResetModifiers(this, Block);
            GLDPrimitiveStyles.ApplyBlock(this, Block);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Variant);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Size);
            GLDPrimitiveStyles.ApplyTier(this, Block, Tier);
            GLDPrimitiveStyles.ApplyElement(this, Block, Element);
        }

        public new class UxmlFactory : UxmlFactory<GLDButton, UxmlTraits> { }

        public new class UxmlTraits : Button.UxmlTraits
        {
            readonly UxmlStringAttributeDescription _variant = new UxmlStringAttributeDescription { name = "variant", defaultValue = "primary" };
            readonly UxmlStringAttributeDescription _size = new UxmlStringAttributeDescription { name = "size", defaultValue = "md" };
            readonly UxmlIntAttributeDescription _tier = new UxmlIntAttributeDescription { name = "tier", defaultValue = 0 };
            readonly UxmlStringAttributeDescription _element = new UxmlStringAttributeDescription { name = "element", defaultValue = "" };
            readonly UxmlStringAttributeDescription _name = new UxmlStringAttributeDescription { name = "name", defaultValue = "" };

            public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc)
            {
                base.Init(ve, bag, cc);
                var button = (GLDButton)ve;
                button.Variant = _variant.GetValueFromBag(bag, cc);
                button.Size = _size.GetValueFromBag(bag, cc);
                button.Tier = _tier.GetValueFromBag(bag, cc);
                button.Element = _element.GetValueFromBag(bag, cc);
                var name = _name.GetValueFromBag(bag, cc);
                if (!string.IsNullOrEmpty(name))
                    button.name = name;
                button.ApplyStyles();
            }
        }
    }
}
