using GLD.Core;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class BossWarningOverlayController : MonoBehaviour
    {
        const float DefaultVisibleSeconds = 2f;

        VisualElement _root;
        Label _title;
        Label _subtitle;
        float _remainingSeconds;
        bool _eventsBound;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public int WaveSlot { get; private set; }

        public void Bind(UIDocument document)
        {
            if (document == null)
                return;

            RuntimeUiDocument.EnsurePanelSettings(document);
            Bind(document.rootVisualElement);
        }

        public void Bind(VisualElement root)
        {
            Unbind();
            if (root == null)
                return;

            if (root.Q<VisualElement>("boss-warning-overlay") == null)
                root.Add(BuildFallbackOverlay());

            ResolveElements(root);
            BindEvents();
            Hide();
            IsBound = true;
        }

        void Update()
        {
            if (_remainingSeconds <= 0f)
                return;

            _remainingSeconds -= Time.unscaledDeltaTime;
            if (_remainingSeconds <= 0f)
                Hide();
        }

        void OnDestroy()
        {
            Unbind();
        }

        void Unbind()
        {
            UnbindEvents();
            _remainingSeconds = 0f;
            WaveSlot = 0;
            IsBound = false;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("boss-warning-overlay");
            _title = root.Q<Label>("boss-warning-title");
            _subtitle = root.Q<Label>("boss-warning-subtitle");
        }

        void BindEvents()
        {
            if (_eventsBound)
                return;

            GameEvents.OnBossWaveStarted += HandleBossWaveStarted;
            _eventsBound = true;
        }

        void UnbindEvents()
        {
            if (!_eventsBound)
                return;

            GameEvents.OnBossWaveStarted -= HandleBossWaveStarted;
            _eventsBound = false;
        }

        void HandleBossWaveStarted(int waveSlot)
        {
            WaveSlot = waveSlot;
            _remainingSeconds = DefaultVisibleSeconds;
            if (_title != null)
                _title.text = "Boss Wave";
            if (_subtitle != null)
                _subtitle.text = $"Wave {waveSlot}";
            Show();
        }

        void Show()
        {
            if (_root != null)
            {
                _root.style.display = DisplayStyle.Flex;
                _root.BringToFront();
            }
        }

        void Hide()
        {
            _remainingSeconds = 0f;
            if (_root != null)
                _root.style.display = DisplayStyle.None;
        }

        static VisualElement BuildFallbackOverlay()
        {
            var overlay = new GLDOverlay { name = "boss-warning-overlay", Dim = "soft" };
            overlay.AddToClassList("boss-warning-overlay");
            var panel = new GLDPanel { name = "boss-warning-panel", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("boss-warning-panel");
            panel.Add(new Label("Boss Wave") { name = "boss-warning-title" });
            panel.Add(new Label("Wave 0") { name = "boss-warning-subtitle" });
            overlay.Add(panel);
            return overlay;
        }
    }
}
