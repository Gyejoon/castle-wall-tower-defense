using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    [UxmlElement]
    public sealed partial class GLDBadge : Label
    {
        const string Block = "gld-badge";

        string _variant = "default";
        int _tier;
        string _element;

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

        [UxmlAttribute("element")]
        public string Element
        {
            get => _element;
            set
            {
                _element = value;
                ApplyStyles();
            }
        }

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
            GLDPrimitiveStyles.ApplyBadgeVisual(this, Variant);
        }
    }
}
