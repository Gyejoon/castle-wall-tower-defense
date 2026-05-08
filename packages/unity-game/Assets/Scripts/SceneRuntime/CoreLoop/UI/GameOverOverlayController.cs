using GLD.Core;
using GLD.SceneRuntime;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class GameOverOverlayController : MonoBehaviour
    {
        VisualElement _root;
        Label _title;
        Label _subtitle;
        Label _stats;
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

            if (root.Q<VisualElement>("game-over-overlay") == null)
                root.Add(BuildFallbackOverlay());

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
            _root = root.Q<VisualElement>("game-over-overlay");
            _title = root.Q<Label>("game-over-title");
            _subtitle = root.Q<Label>("game-over-subtitle");
            _stats = root.Q<Label>("game-over-stats");
            _quitButton = root.Q<Button>("game-over-quit");
        }

        void RegisterButtons()
        {
            _quitButton?.UnregisterCallback<ClickEvent>(HandleQuitClicked);
            _quitButton?.RegisterCallback<ClickEvent>(HandleQuitClicked);
        }

        public void RequestQuit() => GameEvents.RaiseRequestQuitToLobby();

        void HandleRunStateChanged(RunState state)
        {
            if (state == null || (state.RunStatus != RunStatus.Victory && state.RunStatus != RunStatus.Defeat))
            {
                Hide();
                return;
            }

            var victory = state.RunStatus == RunStatus.Victory;
            if (_title != null)
                _title.text = victory ? "Victory" : "Defeat";
            if (_subtitle != null)
                _subtitle.text = victory ? "All waves cleared" : "Base destroyed";
            if (_stats != null)
                _stats.text = $"Wave {state.Wave}  HP {state.Lives}  Time {FormatTime(state.ElapsedSeconds)}";
            Show();
        }

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

        static string FormatTime(float seconds)
        {
            var totalSeconds = Mathf.Max(0, Mathf.FloorToInt(seconds));
            return $"{totalSeconds / 60:00}:{totalSeconds % 60:00}";
        }

        static VisualElement BuildFallbackOverlay()
        {
            var overlay = new GLDOverlay { name = "game-over-overlay", Dim = "default" };
            overlay.AddToClassList("game-over-overlay");

            var panel = new GLDPanel { name = "game-over-panel", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("game-over-panel");
            panel.Add(new Label("Defeat") { name = "game-over-title" });
            panel.Add(new Label("Base destroyed") { name = "game-over-subtitle" });
            panel.Add(new Label("Wave 0  HP 0  Time 00:00") { name = "game-over-stats" });
            panel.Add(new GLDButton("Lobby") { name = "game-over-quit", Variant = "primary" });
            overlay.Add(panel);
            return overlay;
        }
    }
}
