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
        Button[] _speedButtons;
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
            _speedButtons = new[]
            {
                root.Q<Button>("pause-speed-x1"),
                root.Q<Button>("pause-speed-x2"),
                root.Q<Button>("pause-speed-x3")
            };
        }

        void RegisterButtons()
        {
            _resumeButton?.UnregisterCallback<ClickEvent>(HandleResumeClicked);
            _resumeButton?.RegisterCallback<ClickEvent>(HandleResumeClicked);
            _quitButton?.UnregisterCallback<ClickEvent>(HandleQuitClicked);
            _quitButton?.RegisterCallback<ClickEvent>(HandleQuitClicked);
            RegisterSpeedButton(0, HandleSpeedX1Clicked);
            RegisterSpeedButton(1, HandleSpeedX2Clicked);
            RegisterSpeedButton(2, HandleSpeedX3Clicked);
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

        void HandleResumeClicked(ClickEvent evt) => RequestResume();

        void HandleQuitClicked(ClickEvent evt) => RequestQuit();

        void RegisterSpeedButton(int index, EventCallback<ClickEvent> callback)
        {
            if (_speedButtons == null || index < 0 || index >= _speedButtons.Length || _speedButtons[index] == null)
                return;

            _speedButtons[index].UnregisterCallback(callback);
            _speedButtons[index].RegisterCallback(callback);
        }

        void HandleSpeedX1Clicked(ClickEvent evt) => RequestSpeed(1f);

        void HandleSpeedX2Clicked(ClickEvent evt) => RequestSpeed(2f);

        void HandleSpeedX3Clicked(ClickEvent evt) => RequestSpeed(3f);

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
            panel.Add(new Label("설정") { name = "pause-title" });
            panel.Add(new Label("전투 속도와 일시정지를 조정합니다.") { name = "pause-subtitle" });
            var speedRow = new VisualElement { name = "pause-speed-row" };
            speedRow.AddToClassList("pause-speed-row");
            speedRow.Add(new GLDButton("x1") { name = "pause-speed-x1", Variant = "secondary" });
            speedRow.Add(new GLDButton("x2") { name = "pause-speed-x2", Variant = "secondary" });
            speedRow.Add(new GLDButton("x3") { name = "pause-speed-x3", Variant = "secondary" });
            panel.Add(speedRow);
            panel.Add(new GLDButton("재개") { name = "pause-resume", Variant = "primary" });
            panel.Add(new GLDButton("포기") { name = "pause-quit", Variant = "danger" });
            overlay.Add(panel);
            return overlay;
        }

        void SyncSpeedSelection(RunState state)
        {
            if (_speedButtons == null)
                return;

            var speed = state != null ? Mathf.Clamp(Mathf.RoundToInt(state.SpeedMultiplier), 1, 3) : 1;
            for (var i = 0; i < _speedButtons.Length; i++)
            {
                if (_speedButtons[i] == null)
                    continue;
                _speedButtons[i].EnableInClassList("pause-speed--selected", i + 1 == speed);
            }
        }
    }
}
