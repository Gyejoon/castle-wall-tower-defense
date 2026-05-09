using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    [UxmlElement]
    public sealed partial class GLDPanel : VisualElement
    {
        const string Block = "gld-panel";

        string _variant = "default";
        string _padding = "md";

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

        [UxmlAttribute("padding")]
        public string Padding
        {
            get => _padding;
            set
            {
                _padding = string.IsNullOrEmpty(value) ? "md" : value;
                ApplyStyles();
            }
        }

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
            GLDPrimitiveStyles.ApplyPanelVisual(this, Variant, Padding);
        }
    }
}
