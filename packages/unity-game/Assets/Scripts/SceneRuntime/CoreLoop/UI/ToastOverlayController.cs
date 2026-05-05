using GLD.Core;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class ToastOverlayController : MonoBehaviour
    {
        const float VisibleSeconds = 2.5f;

        VisualElement _root;
        Label _messageLabel;
        float _remainingSeconds;
        bool _eventsBound;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public string CurrentMessage { get; private set; }

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

            if (root.Q<VisualElement>("toast-overlay") == null)
                root.Add(BuildFallbackToast());

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
            CurrentMessage = null;
            IsBound = false;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("toast-overlay");
            _messageLabel = root.Q<Label>("toast-message");
        }

        void BindEvents()
        {
            if (_eventsBound)
                return;

            GameEvents.OnRequestRejected += HandleRequestRejected;
            GameEvents.OnTowerPlacementFailed += HandleTowerPlacementFailed;
            GameEvents.OnMergeFailed += HandleMergeFailed;
            GameEvents.OnTowersMerged += HandleTowersMerged;
            GameEvents.OnUpgradeApplied += HandleUpgradeApplied;
            _eventsBound = true;
        }

        void UnbindEvents()
        {
            if (!_eventsBound)
                return;

            GameEvents.OnRequestRejected -= HandleRequestRejected;
            GameEvents.OnTowerPlacementFailed -= HandleTowerPlacementFailed;
            GameEvents.OnMergeFailed -= HandleMergeFailed;
            GameEvents.OnTowersMerged -= HandleTowersMerged;
            GameEvents.OnUpgradeApplied -= HandleUpgradeApplied;
            _eventsBound = false;
        }

        public void ShowMessage(string message)
        {
            if (string.IsNullOrEmpty(message))
                return;

            CurrentMessage = message;
            _remainingSeconds = VisibleSeconds;
            if (_messageLabel != null)
                _messageLabel.text = message;
            Show();
        }

        void HandleRequestRejected(string reason) => ShowMessage($"Rejected: {reason}");

        void HandleTowerPlacementFailed(string towerId, int col, int row, string reason) =>
            ShowMessage($"Cannot place {towerId}: {reason}");

        void HandleMergeFailed(int fromCol, int fromRow, int toCol, int toRow, string reason) =>
            ShowMessage($"Merge failed: {reason}");

        void HandleTowersMerged(int col, int row, string towerId, int tier) =>
            ShowMessage($"Merged T{tier} {towerId}");

        void HandleUpgradeApplied(string upgradeId, int stacks) =>
            ShowMessage($"{upgradeId} stack {stacks}");

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

        static VisualElement BuildFallbackToast()
        {
            var panel = new GLDPanel { name = "toast-overlay", Variant = "elevated", Padding = "sm" };
            panel.AddToClassList("toast-overlay");
            panel.Add(new Label(string.Empty) { name = "toast-message" });
            return panel;
        }
    }
}
