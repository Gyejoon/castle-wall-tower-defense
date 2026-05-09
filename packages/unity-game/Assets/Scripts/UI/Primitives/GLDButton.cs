using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    [UxmlElement]
    public sealed partial class GLDButton : Button
    {
        const string Block = "gld-btn";

        string _variant = "primary";
        string _size = "md";
        int _tier;
        string _element;

        [UxmlAttribute("variant")]
        public string Variant
        {
            get => _variant;
            set
            {
                _variant = string.IsNullOrEmpty(value) ? "primary" : value;
                ApplyStyles();
            }
        }

        [UxmlAttribute("size")]
        public string Size
        {
            get => _size;
            set
            {
                _size = string.IsNullOrEmpty(value) ? "md" : value;
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
            GLDPrimitiveStyles.ApplyButtonVisual(this, Variant, Size);
        }
    }
}
