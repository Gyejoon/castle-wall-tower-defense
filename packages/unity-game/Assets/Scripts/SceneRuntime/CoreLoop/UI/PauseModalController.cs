using GLD.Core;
using GLD.SceneRuntime;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class PauseModalController : MonoBehaviour
    {
        VisualElement _root;
        Button _resumeButton;
        Button _quitButton;
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

            if (root.Q<VisualElement>("pause-modal") == null)
                root.Add(BuildFallbackModal());

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
            _root = root.Q<VisualElement>("pause-modal");
            _resumeButton = root.Q<Button>("pause-resume");
            _quitButton = root.Q<Button>("pause-quit");
        }

        void RegisterButtons()
        {
            _resumeButton?.UnregisterCallback<ClickEvent>(HandleResumeClicked);
            _resumeButton?.RegisterCallback<ClickEvent>(HandleResumeClicked);
            _quitButton?.UnregisterCallback<ClickEvent>(HandleQuitClicked);
            _quitButton?.RegisterCallback<ClickEvent>(HandleQuitClicked);
        }

        public void RequestResume() => GameEvents.RaiseRequestResume();

        public void RequestQuit() => GameEvents.RaiseRequestQuitToLobby();

        void HandleRunStateChanged(RunState state)
        {
            if (state != null && state.IsPaused)
                Show();
            else
                Hide();
        }

        void HandleResumeClicked(ClickEvent evt) => RequestResume();

        void HandleQuitClicked(ClickEvent evt) => RequestQuit();

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

        static VisualElement BuildFallbackModal()
        {
            var overlay = new GLDOverlay { name = "pause-modal", Dim = "default" };
            overlay.AddToClassList("pause-modal");

            var panel = new GLDPanel { name = "pause-panel", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("pause-panel");
            panel.Add(new Label("일시정지") { name = "pause-title" });
            panel.Add(new GLDButton("재개") { name = "pause-resume", Variant = "primary" });
            panel.Add(new GLDButton("포기") { name = "pause-quit", Variant = "danger" });
            overlay.Add(panel);
            return overlay;
        }
    }
}
