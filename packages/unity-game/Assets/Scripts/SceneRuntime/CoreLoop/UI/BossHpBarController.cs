using GLD.SceneRuntime;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class BossHpBarController : MonoBehaviour
    {
        VisualElement _root;
        VisualElement _fill;
        Label _nameLabel;
        Label _hpLabel;
        RunState _runState;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;

        public void Bind(RunState runState, UIDocument document)
        {
            if (document == null)
                return;

            RuntimeUiDocument.EnsurePanelSettings(document);
            Bind(runState, document.rootVisualElement);
        }

        public void Bind(RunState runState, VisualElement root)
        {
            Unbind();
            _runState = runState;
            if (root == null)
                return;

            if (root.Q<VisualElement>("boss-hp-bar") == null)
                root.Add(BuildFallbackBar());

            ResolveElements(root);
            if (_runState != null)
            {
                _runState.OnChanged += HandleRunStateChanged;
                HandleRunStateChanged(_runState);
            }
            else
            {
                Hide();
            }
            IsBound = true;
        }

        void OnDestroy()
        {
            Unbind();
        }

        void Unbind()
        {
            if (_runState != null)
                _runState.OnChanged -= HandleRunStateChanged;
            _runState = null;
            IsBound = false;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("boss-hp-bar");
            _fill = root.Q<VisualElement>("boss-hp-fill");
            _nameLabel = root.Q<Label>("boss-hp-name");
            _hpLabel = root.Q<Label>("boss-hp-value");
        }

        void HandleRunStateChanged(RunState state)
        {
            if (state == null || state.BossMaxHp <= 0)
            {
                Hide();
                return;
            }

            var ratio = Mathf.Clamp01((float)state.BossHp / Mathf.Max(1, state.BossMaxHp));
            if (_nameLabel != null)
                _nameLabel.text = ResolveBossLabel(state);
            if (_hpLabel != null)
                _hpLabel.text = $"{state.BossHp}/{state.BossMaxHp}";
            if (_fill != null)
                _fill.style.width = Length.Percent(Mathf.Round(ratio * 100f));
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
            if (_root != null)
                _root.style.display = DisplayStyle.None;
        }

        static string ResolveBossLabel(RunState state)
        {
            var id = !string.IsNullOrEmpty(state.BossDefId) ? state.BossDefId : state.BossUnitId;
            if (string.IsNullOrEmpty(id))
                return "Boss";
            return state.BossPhase > 0 ? $"{id} P{state.BossPhase}" : id;
        }

        static VisualElement BuildFallbackBar()
        {
            var panel = new GLDPanel { name = "boss-hp-bar", Variant = "elevated", Padding = "sm" };
            panel.AddToClassList("boss-hp-bar");

            var header = new VisualElement { name = "boss-hp-header" };
            header.AddToClassList("boss-hp-header");
            header.Add(new Label("Boss") { name = "boss-hp-name" });
            header.Add(new Label("0/0") { name = "boss-hp-value" });

            var track = new VisualElement { name = "boss-hp-track" };
            track.AddToClassList("boss-hp-track");
            track.Add(new VisualElement { name = "boss-hp-fill" });

            panel.Add(header);
            panel.Add(track);
            return panel;
        }
    }
}
