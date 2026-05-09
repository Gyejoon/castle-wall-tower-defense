using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    [UxmlElement]
    public sealed partial class GLDCard : VisualElement
    {
        const string Block = "gld-card";

        string _variant = "default";
        int _tier;
        bool _selected;

        [UxmlAttribute("variant")]
        public string Variant
        {
            get => _variant;
            set
            {
                _variant = string.IsNullOrEmpty(value) ? "default" : value;
                ApplyStyles();
            }
        }

        [UxmlAttribute("tier")]
        public int Tier
        {
            get => _tier;
            set
            {
                _tier = value;
                ApplyStyles();
            }
        }

        [UxmlAttribute("selected")]
        public bool Selected
        {
            get => _selected;
            set
            {
                _selected = value;
                ApplyStyles();
            }
        }

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
            GLDPrimitiveStyles.ApplyCardVisual(this, Variant);
        }
    }
}
