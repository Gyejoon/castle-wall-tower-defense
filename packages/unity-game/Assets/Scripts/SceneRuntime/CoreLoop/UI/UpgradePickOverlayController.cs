using GLD.Core;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class UpgradePickOverlayController : MonoBehaviour
    {
        VisualElement _root;
        Label _title;
        Label[] _cardTitles;
        Label[] _cardDescriptions;
        Button[] _pickButtons;
        Button _rerollButton;
        UpgradeChoice[] _choices;
        bool _eventsBound;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public int ChoiceCount => _choices != null ? _choices.Length : 0;

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

            if (root.Q<VisualElement>("upgrade-pick-overlay") == null)
                root.Add(BuildFallbackOverlay());

            ResolveElements(root);
            RegisterButtons();
            BindEvents();
            Hide();
            IsBound = true;
        }

        void OnDestroy()
        {
            Unbind();
        }

        void Unbind()
        {
            UnbindEvents();
            _choices = null;
            IsBound = false;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("upgrade-pick-overlay");
            _title = root.Q<Label>("upgrade-pick-title");
            _rerollButton = root.Q<Button>("upgrade-pick-reroll");
            _cardTitles = new[]
            {
                root.Q<Label>("upgrade-card-0-title"),
                root.Q<Label>("upgrade-card-1-title"),
                root.Q<Label>("upgrade-card-2-title")
            };
            _cardDescriptions = new[]
            {
                root.Q<Label>("upgrade-card-0-description"),
                root.Q<Label>("upgrade-card-1-description"),
                root.Q<Label>("upgrade-card-2-description")
            };
            _pickButtons = new[]
            {
                root.Q<Button>("upgrade-card-0-pick"),
                root.Q<Button>("upgrade-card-1-pick"),
                root.Q<Button>("upgrade-card-2-pick")
            };
        }

        void RegisterButtons()
        {
            _pickButtons[0]?.UnregisterCallback<ClickEvent>(HandlePick0Clicked);
            _pickButtons[1]?.UnregisterCallback<ClickEvent>(HandlePick1Clicked);
            _pickButtons[2]?.UnregisterCallback<ClickEvent>(HandlePick2Clicked);
            _pickButtons[0]?.RegisterCallback<ClickEvent>(HandlePick0Clicked);
            _pickButtons[1]?.RegisterCallback<ClickEvent>(HandlePick1Clicked);
            _pickButtons[2]?.RegisterCallback<ClickEvent>(HandlePick2Clicked);
            _rerollButton?.UnregisterCallback<ClickEvent>(HandleRerollClicked);
            _rerollButton?.RegisterCallback<ClickEvent>(HandleRerollClicked);
        }

        void BindEvents()
        {
            if (_eventsBound)
                return;

            GameEvents.OnUpgradeChoiceReady += HandleUpgradeChoiceReady;
            GameEvents.OnUpgradeApplied += HandleUpgradeApplied;
            _eventsBound = true;
        }

        void UnbindEvents()
        {
            if (!_eventsBound)
                return;

            GameEvents.OnUpgradeChoiceReady -= HandleUpgradeChoiceReady;
            GameEvents.OnUpgradeApplied -= HandleUpgradeApplied;
            _eventsBound = false;
        }

        public void RequestPick(int index)
        {
            if (_choices == null || index < 0 || index >= _choices.Length)
                return;

            GameEvents.RaiseRequestUpgradePick(_choices[index].Id);
        }

        public void RequestReroll() => GameEvents.RaiseRequestUpgradeReroll();

        void HandleUpgradeChoiceReady(UpgradeChoice[] choices)
        {
            _choices = choices ?? new UpgradeChoice[0];
            if (_title != null)
                _title.text = "Pick an upgrade";

            for (var i = 0; i < 3; i++)
            {
                var active = i < _choices.Length;
                if (_cardTitles[i] != null)
                    _cardTitles[i].text = active ? ResolveName(_choices[i]) : "-";
                if (_cardDescriptions[i] != null)
                    _cardDescriptions[i].text = active ? ResolveDescription(_choices[i]) : string.Empty;
                _pickButtons[i]?.SetEnabled(active);
            }

            Show();
        }

        void HandleUpgradeApplied(string upgradeId, int stacks) => Hide();

        void HandlePick0Clicked(ClickEvent evt) => RequestPick(0);

        void HandlePick1Clicked(ClickEvent evt) => RequestPick(1);

        void HandlePick2Clicked(ClickEvent evt) => RequestPick(2);

        void HandleRerollClicked(ClickEvent evt) => RequestReroll();

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
            _choices = null;
            if (_root != null)
                _root.style.display = DisplayStyle.None;
        }

        static string ResolveName(UpgradeChoice choice) => string.IsNullOrEmpty(choice.Name) ? choice.Id : choice.Name;

        static string ResolveDescription(UpgradeChoice choice) => string.IsNullOrEmpty(choice.Description) ? choice.Id : choice.Description;

        static VisualElement BuildFallbackOverlay()
        {
            var overlay = new GLDOverlay { name = "upgrade-pick-overlay", Dim = "default" };
            overlay.AddToClassList("upgrade-pick-overlay");

            var panel = new GLDPanel { name = "upgrade-pick-panel", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("upgrade-pick-panel");
            panel.Add(new Label("Pick an upgrade") { name = "upgrade-pick-title" });

            var cards = new VisualElement { name = "upgrade-pick-cards" };
            cards.AddToClassList("upgrade-pick-cards");
            for (var i = 0; i < 3; i++)
                cards.Add(BuildFallbackCard(i));
            panel.Add(cards);

            panel.Add(new GLDButton("Reroll") { name = "upgrade-pick-reroll", Variant = "secondary" });
            overlay.Add(panel);
            return overlay;
        }

        static VisualElement BuildFallbackCard(int index)
        {
            var card = new GLDCard { name = $"upgrade-card-{index}", Variant = "default" };
            card.AddToClassList("upgrade-pick-card");
            card.Add(new Label("-") { name = $"upgrade-card-{index}-title" });
            card.Add(new Label(string.Empty) { name = $"upgrade-card-{index}-description" });
            card.Add(new GLDButton("Pick") { name = $"upgrade-card-{index}-pick", Variant = "primary" });
            return card;
        }
    }
}
