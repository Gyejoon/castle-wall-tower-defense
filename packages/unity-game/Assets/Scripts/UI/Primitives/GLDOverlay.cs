using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    [UxmlElement]
    public sealed partial class GLDOverlay : VisualElement
    {
        const string Block = "gld-overlay";

        string _dim = "default";
        bool _visible = true;

        [UxmlAttribute("dim")]
        public string Dim
        {
            get => _dim;
            set
            {
                _dim = string.IsNullOrEmpty(value) ? "default" : value;
                ApplyStyles();
            }
        }

        [UxmlAttribute("visible")]
        public bool Visible
        {
            get => _visible;
            set
            {
                _visible = value;
                ApplyStyles();
            }
        }

        public GLDOverlay()
        {
            ApplyStyles();
        }

        public void ApplyStyles()
        {
            GLDPrimitiveStyles.ResetModifiers(this, Block);
            GLDPrimitiveStyles.ApplyBlock(this, Block);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Dim);
            GLDPrimitiveStyles.ApplyModifier(this, Block, Visible ? "visible" : "hidden");
            GLDPrimitiveStyles.ApplyOverlayVisual(this, Dim, Visible);
        }
    }
}
