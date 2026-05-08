using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    public sealed class GLDCard : VisualElement
    {
        const string Block = "gld-card";

        public string Variant { get; set; } = "default";
        public int Tier { get; set; }
        public bool Selected { get; set; }

        public GLDCard()
        {
            ApplyStyles();
        }

        public void ApplyStyles()
        {
            GLDPrimitiveStyles.ResetModifiers(this, Block);
            GLDPrimitiveStyles.ApplyBlock(this, Block);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Variant);
            GLDPrimitiveStyles.ApplyTier(this, Block, Tier);
            GLDPrimitiveStyles.ApplyBoolModifier(this, Block, "selected", Selected);
        }

        public new class UxmlFactory : UxmlFactory<GLDCard, UxmlTraits> { }

        public new class UxmlTraits : VisualElement.UxmlTraits
        {
            readonly UxmlStringAttributeDescription _variant = new UxmlStringAttributeDescription { name = "variant", defaultValue = "default" };
            readonly UxmlIntAttributeDescription _tier = new UxmlIntAttributeDescription { name = "tier", defaultValue = 0 };
            readonly UxmlBoolAttributeDescription _selected = new UxmlBoolAttributeDescription { name = "selected", defaultValue = false };
            readonly UxmlStringAttributeDescription _name = new UxmlStringAttributeDescription { name = "name", defaultValue = "" };

            public override void Init(VisualElement ve, IUxmlAttributes bag, CreationContext cc)
            {
                base.Init(ve, bag, cc);
                var card = (GLDCard)ve;
                card.Variant = _variant.GetValueFromBag(bag, cc);
                card.Tier = _tier.GetValueFromBag(bag, cc);
                card.Selected = _selected.GetValueFromBag(bag, cc);
                var name = _name.GetValueFromBag(bag, cc);
                if (!string.IsNullOrEmpty(name))
                    card.name = name;
                card.ApplyStyles();
            }
        }
    }
}
