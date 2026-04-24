using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.Core
{
    /// <summary>
    /// Phase 0 exit-gate component. Attach to a GameObject in Root.unity alongside a UIDocument
    /// whose visualTreeAsset references Assets/UI/Documents/Phase0Label.uxml. Renders the
    /// "Unity Phase 0" label so the Vercel /unity/ preview can be verified end-to-end.
    /// Removed in Phase 2 when PoC vertical slice lands.
    /// </summary>
    [RequireComponent(typeof(UIDocument))]
    public sealed class GLDPhase0Label : MonoBehaviour
    {
        const string LabelElementName = "phase0-label";
        const string LabelText = "Unity Phase 0";

        void OnEnable()
        {
            var doc = GetComponent<UIDocument>();
            var root = doc != null ? doc.rootVisualElement : null;
            if (root == null)
            {
                Debug.LogWarning($"[GLDPhase0Label] UIDocument on '{gameObject.name}' has no rootVisualElement — check PanelSettings + UIDocument initialization order.");
                return;
            }

            var label = root.Q<Label>(LabelElementName);
            if (label != null)
            {
                label.text = LabelText;
            }
        }
    }
}
