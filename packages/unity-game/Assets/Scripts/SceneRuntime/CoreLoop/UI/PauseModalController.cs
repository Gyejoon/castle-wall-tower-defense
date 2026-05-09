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
        VisualElement _panel;
        Button _resumeButton;
        Button _quitButton;
        Button _speedButton;
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
            _panel = root.Q<VisualElement>("pause-panel");
            _resumeButton = root.Q<Button>("pause-resume");
            _quitButton = root.Q<Button>("pause-quit");
            _speedButton = root.Q<Button>("pause-speed-toggle");
            if (_root != null)
                _root.pickingMode = PickingMode.Position;
            if (_panel != null)
                _panel.pickingMode = PickingMode.Position;
        }

        void RegisterButtons()
        {
            _root?.UnregisterCallback<PointerDownEvent>(HandleBackdropPointerDown);
            _root?.RegisterCallback<PointerDownEvent>(HandleBackdropPointerDown);
            _root?.UnregisterCallback<ClickEvent>(HandleBackdropClicked);
            _root?.RegisterCallback<ClickEvent>(HandleBackdropClicked);
            _panel?.UnregisterCallback<PointerDownEvent>(HandlePanelPointerDown);
            _panel?.RegisterCallback<PointerDownEvent>(HandlePanelPointerDown);
            _panel?.UnregisterCallback<ClickEvent>(HandlePanelClicked);
            _panel?.RegisterCallback<ClickEvent>(HandlePanelClicked);
            _resumeButton?.UnregisterCallback<ClickEvent>(HandleResumeClicked);
            _resumeButton?.RegisterCallback<ClickEvent>(HandleResumeClicked);
            _quitButton?.UnregisterCallback<ClickEvent>(HandleQuitClicked);
            _quitButton?.RegisterCallback<ClickEvent>(HandleQuitClicked);
            _speedButton?.UnregisterCallback<ClickEvent>(HandleSpeedClicked);
            _speedButton?.RegisterCallback<ClickEvent>(HandleSpeedClicked);
        }

        public void RequestResume() => GameEvents.RaiseRequestResume();

        public void RequestQuit() => GameEvents.RaiseRequestQuitToLobby();

        public void RequestSpeed(float speedMultiplier) => GameEvents.RaiseRequestSetSpeed(speedMultiplier);

        void HandleRunStateChanged(RunState state)
        {
            if (state != null && state.IsPaused)
                Show();
            else
                Hide();
            SyncSpeedSelection(state);
        }

        void HandleBackdropPointerDown(PointerDownEvent evt) => evt.StopPropagation();

        void HandleBackdropClicked(ClickEvent evt)
        {
            RequestResume();
            evt.StopPropagation();
        }

        void HandlePanelPointerDown(PointerDownEvent evt) => evt.StopPropagation();

        void HandlePanelClicked(ClickEvent evt) => evt.StopPropagation();

        void HandleResumeClicked(ClickEvent evt)
        {
            RequestResume();
            evt.StopPropagation();
        }

        void HandleQuitClicked(ClickEvent evt)
        {
            RequestQuit();
            evt.StopPropagation();
        }

        void HandleSpeedClicked(ClickEvent evt)
        {
            RequestSpeed(ResolveNextSpeed(_runState));
            evt.StopPropagation();
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

        static VisualElement BuildFallbackModal()
        {
            var overlay = new GLDOverlay { name = "pause-modal", Dim = "default" };
            overlay.AddToClassList("pause-modal");
            overlay.pickingMode = PickingMode.Position;

            var panel = new GLDPanel { name = "pause-panel", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("pause-panel");
            panel.pickingMode = PickingMode.Position;
            panel.Add(new Label("설정") { name = "pause-title" });
            panel.Add(new Label("전투 속도와 일시정지를 조정합니다.") { name = "pause-subtitle" });
            panel.Add(new GLDButton("x1") { name = "pause-speed-toggle", Variant = "secondary" });
            panel.Add(new GLDButton("재개") { name = "pause-resume", Variant = "primary" });
            panel.Add(new GLDButton("포기") { name = "pause-quit", Variant = "danger" });
            overlay.Add(panel);
            return overlay;
        }

        void SyncSpeedSelection(RunState state)
        {
            if (_speedButton == null)
                return;

            var speed = state != null ? Mathf.Clamp(Mathf.RoundToInt(state.SpeedMultiplier), 1, 3) : 1;
            _speedButton.text = $"x{speed}";
        }

        static float ResolveNextSpeed(RunState state)
        {
            var current = state != null ? Mathf.Clamp(Mathf.RoundToInt(state.SpeedMultiplier), 1, 3) : 1;
            return current >= 3 ? 1f : current + 1f;
        }
    }
}
