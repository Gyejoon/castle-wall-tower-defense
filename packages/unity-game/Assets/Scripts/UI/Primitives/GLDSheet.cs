using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    [UxmlElement]
    public sealed partial class GLDSheet : VisualElement
    {
        const string Block = "gld-sheet";

        string _anchor = "bottom";
        string _variant = "default";

        [UxmlAttribute("anchor")]
        public string Anchor
        {
            get => _anchor;
            set
            {
                _anchor = string.IsNullOrEmpty(value) ? "bottom" : value;
                ApplyStyles();
            }
        }

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
            GLDPrimitiveStyles.ApplySheetVisual(this);
        }
    }
}
