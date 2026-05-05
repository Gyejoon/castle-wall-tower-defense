using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    public sealed class GLDBadge : Label
    {
        const string Block = "gld-badge";

        public string Variant { get; set; } = "default";
        public int Tier { get; set; }
        public string Element { get; set; }

        public GLDBadge()
        {
            ApplyStyles();
        }

        public GLDBadge(string text) : base(text)
        {
            ApplyStyles();
        }

        public void ApplyStyles()
        {
            GLDPrimitiveStyles.ResetModifiers(this, Block);
            GLDPrimitiveStyles.ApplyBlock(this, Block);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Variant);
            GLDPrimitiveStyles.ApplyTier(this, Block, Tier);
            GLDPrimitiveStyles.ApplyElement(this, Block, Element);
        }

        public new class UxmlFactory : UxmlFactory<GLDBadge, UxmlTraits> { }

        public new class UxmlTraits : Label.UxmlTraits
        {
            readonly UxmlStringAttributeDescription _variant = new UxmlStringAttributeDescription { name = "variant", defaultValue = "default" };
            readonly UxmlIntAttributeDescription _tier = new UxmlIntAttributeDescription { name = "tier", defaultValue = 0 };
            readonly UxmlStringAttributeDescription _element = new UxmlStringAttributeDescription { name = "element", defaultValue = "" };
            readonly UxmlStringAttributeDescription _name = new UxmlStringAttributeDescription { name = "name", defaultValue = "" };

            public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc)
            {
                base.Init(ve, bag, cc);
                var badge = (GLDBadge)ve;
                badge.Variant = _variant.GetValueFromBag(bag, cc);
                badge.Tier = _tier.GetValueFromBag(bag, cc);
                badge.Element = _element.GetValueFromBag(bag, cc);
                var name = _name.GetValueFromBag(bag, cc);
                if (!string.IsNullOrEmpty(name))
                    badge.name = name;
                badge.ApplyStyles();
            }
        }
    }
}
