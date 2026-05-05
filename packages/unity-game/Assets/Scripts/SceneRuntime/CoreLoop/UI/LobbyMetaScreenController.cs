using GLD.Core;
using GLD.SceneRuntime;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class LobbyMetaScreenController : MonoBehaviour
    {
        VisualElement _root;
        VisualElement _homePanel;
        VisualElement _metaPanel;
        Button _homeTab;
        Button _metaTab;
        Button _startButton;
        Button _metaStartButton;
        RunState _runState;
        bool _showingMeta;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public bool IsMetaVisible => _metaPanel != null && _metaPanel.style.display.value != DisplayStyle.None;

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
            _showingMeta = false;
            if (root == null)
                return;

            if (root.Q<VisualElement>("lobby-meta-screen") == null)
                root.Add(BuildFallbackScreen());

            ResolveElements(root);
            RegisterButtons();
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
            _root = root.Q<VisualElement>("lobby-meta-screen");
            _homePanel = root.Q<VisualElement>("lobby-home-panel");
            _metaPanel = root.Q<VisualElement>("lobby-meta-panel");
            _homeTab = root.Q<Button>("lobby-tab-home");
            _metaTab = root.Q<Button>("lobby-tab-meta");
            _startButton = root.Q<Button>("lobby-start");
            _metaStartButton = root.Q<Button>("lobby-meta-start");
        }

        void RegisterButtons()
        {
            _homeTab?.UnregisterCallback<ClickEvent>(HandleHomeClicked);
            _homeTab?.RegisterCallback<ClickEvent>(HandleHomeClicked);
            _metaTab?.UnregisterCallback<ClickEvent>(HandleMetaClicked);
            _metaTab?.RegisterCallback<ClickEvent>(HandleMetaClicked);
            _startButton?.UnregisterCallback<ClickEvent>(HandleStartClicked);
            _startButton?.RegisterCallback<ClickEvent>(HandleStartClicked);
            _metaStartButton?.UnregisterCallback<ClickEvent>(HandleStartClicked);
            _metaStartButton?.RegisterCallback<ClickEvent>(HandleStartClicked);
        }

        public void ShowHome()
        {
            _showingMeta = false;
            RefreshPanels();
        }

        public void ShowMeta()
        {
            _showingMeta = true;
            RefreshPanels();
        }

        public void RequestStartRun()
        {
            Hide();
            GameEvents.RaiseRequestStartRun();
        }

        void HandleRunStateChanged(RunState state)
        {
            if (state != null && state.RunStatus == RunStatus.Building && state.Wave == 0)
                Show();
            else
                Hide();
        }

        void HandleHomeClicked(ClickEvent evt) => ShowHome();

        void HandleMetaClicked(ClickEvent evt) => ShowMeta();

        void HandleStartClicked(ClickEvent evt) => RequestStartRun();

        void RefreshPanels()
        {
            if (_homePanel != null)
                _homePanel.style.display = _showingMeta ? DisplayStyle.None : DisplayStyle.Flex;
            if (_metaPanel != null)
                _metaPanel.style.display = _showingMeta ? DisplayStyle.Flex : DisplayStyle.None;
        }

        void Show()
        {
            RefreshPanels();
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

        static VisualElement BuildFallbackScreen()
        {
            var overlay = new GLDOverlay { name = "lobby-meta-screen", Dim = "default" };
            overlay.AddToClassList("lobby-meta-screen");

            var panel = new GLDPanel { name = "lobby-meta-shell", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("lobby-meta-shell");

            var tabs = new VisualElement { name = "lobby-tabs" };
            tabs.AddToClassList("lobby-tabs");
            tabs.Add(new GLDButton("Home") { name = "lobby-tab-home", Variant = "secondary" });
            tabs.Add(new GLDButton("Meta") { name = "lobby-tab-meta", Variant = "secondary" });

            var home = new VisualElement { name = "lobby-home-panel" };
            home.AddToClassList("lobby-panel");
            home.Add(new Label("Grid Line Defense") { name = "lobby-title" });
            home.Add(new Label("Wave 50 endless run") { name = "lobby-subtitle" });
            home.Add(new GLDButton("Start Battle") { name = "lobby-start", Variant = "primary" });

            var meta = new VisualElement { name = "lobby-meta-panel" };
            meta.AddToClassList("lobby-panel");
            meta.Add(new Label("Meta Forge") { name = "lobby-meta-title" });
            meta.Add(new Label("Global ATK +0%") { name = "lobby-meta-atk" });
            meta.Add(new Label("Family perks locked") { name = "lobby-meta-perks" });
            meta.Add(new GLDButton("Start Battle") { name = "lobby-meta-start", Variant = "primary" });

            panel.Add(tabs);
            panel.Add(home);
            panel.Add(meta);
            overlay.Add(panel);
            return overlay;
        }
    }
}
