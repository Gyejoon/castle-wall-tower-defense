using GLD.Core;
using GLD.SceneRuntime;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class TutorialOverlayController : MonoBehaviour
    {
        enum TutorialStep
        {
            Summon,
            Place,
            Merge,
            Upgrade,
            Done
        }

        VisualElement _root;
        Label _title;
        Label _body;
        Button _nextButton;
        Button _skipButton;
        RunState _runState;
        TutorialStep _step;
        bool _eventsBound;
        bool _dismissed;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public string CurrentTitle => _title != null ? _title.text : string.Empty;
        public string CurrentBody => _body != null ? _body.text : string.Empty;

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
            _step = TutorialStep.Summon;
            _dismissed = false;
            if (root == null)
                return;

            if (root.Q<VisualElement>("tutorial-overlay") == null)
                root.Add(BuildFallbackOverlay());

            ResolveElements(root);
            RegisterButtons();
            BindEvents();
            if (_runState != null)
                _runState.OnChanged += HandleRunStateChanged;
            Refresh();
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
            UnbindEvents();
            IsBound = false;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("tutorial-overlay");
            _title = root.Q<Label>("tutorial-title");
            _body = root.Q<Label>("tutorial-body");
            _nextButton = root.Q<Button>("tutorial-next");
            _skipButton = root.Q<Button>("tutorial-skip");
        }

        void RegisterButtons()
        {
            _nextButton?.UnregisterCallback<ClickEvent>(HandleNextClicked);
            _nextButton?.RegisterCallback<ClickEvent>(HandleNextClicked);
            _skipButton?.UnregisterCallback<ClickEvent>(HandleSkipClicked);
            _skipButton?.RegisterCallback<ClickEvent>(HandleSkipClicked);
        }

        void BindEvents()
        {
            if (_eventsBound)
                return;

            GameEvents.OnSummonOffered += HandleSummonOffered;
            GameEvents.OnSummonConfirmed += HandleSummonConfirmed;
            GameEvents.OnTowersMerged += HandleTowersMerged;
            GameEvents.OnUpgradeChoiceReady += HandleUpgradeChoiceReady;
            GameEvents.OnUpgradeApplied += HandleUpgradeApplied;
            _eventsBound = true;
        }

        void UnbindEvents()
        {
            if (!_eventsBound)
                return;

            GameEvents.OnSummonOffered -= HandleSummonOffered;
            GameEvents.OnSummonConfirmed -= HandleSummonConfirmed;
            GameEvents.OnTowersMerged -= HandleTowersMerged;
            GameEvents.OnUpgradeChoiceReady -= HandleUpgradeChoiceReady;
            GameEvents.OnUpgradeApplied -= HandleUpgradeApplied;
            _eventsBound = false;
        }

        public void Advance()
        {
            if (_dismissed || _step == TutorialStep.Done)
                return;

            _step++;
            Refresh();
        }

        public void Dismiss()
        {
            _dismissed = true;
            _step = TutorialStep.Done;
            Hide();
        }

        void HandleRunStateChanged(RunState state)
        {
            if (state != null && (state.RunStatus == RunStatus.Victory || state.RunStatus == RunStatus.Defeat))
                Dismiss();
        }

        void HandleSummonOffered(string towerId) => SetStep(TutorialStep.Place);

        void HandleSummonConfirmed(string towerId) => SetStep(TutorialStep.Merge);

        void HandleTowersMerged(int col, int row, string towerId, int tier) => SetStep(TutorialStep.Upgrade);

        void HandleUpgradeChoiceReady(UpgradeChoice[] choices) => SetStep(TutorialStep.Upgrade);

        void HandleUpgradeApplied(string upgradeId, int stacks) => Dismiss();

        void HandleNextClicked(ClickEvent evt) => Advance();

        void HandleSkipClicked(ClickEvent evt) => Dismiss();

        void SetStep(TutorialStep step)
        {
            if (_dismissed || step <= _step)
                return;

            _step = step;
            Refresh();
        }

        void Refresh()
        {
            if (_dismissed || _step == TutorialStep.Done)
            {
                Hide();
                return;
            }

            var title = string.Empty;
            var body = string.Empty;
            switch (_step)
            {
                case TutorialStep.Summon:
                    title = "Summon";
                    body = "Use Summon or gacha to draw a tower.";
                    break;
                case TutorialStep.Place:
                    title = "Place";
                    body = "Tap an open green tile to place the drawn tower.";
                    break;
                case TutorialStep.Merge:
                    title = "Merge";
                    body = "Put two matching towers together to raise tier.";
                    break;
                case TutorialStep.Upgrade:
                    title = "Upgrade";
                    body = "After a boss wave, choose one run upgrade card.";
                    break;
            }

            if (_title != null)
                _title.text = title;
            if (_body != null)
                _body.text = body;
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

        static VisualElement BuildFallbackOverlay()
        {
            var panel = new GLDPanel { name = "tutorial-overlay", Variant = "elevated", Padding = "sm" };
            panel.AddToClassList("tutorial-overlay");
            panel.Add(new Label("Summon") { name = "tutorial-title" });
            panel.Add(new Label("Use Summon or gacha to draw a tower.") { name = "tutorial-body" });

            var actions = new VisualElement { name = "tutorial-actions" };
            actions.AddToClassList("tutorial-actions");
            actions.Add(new GLDButton("Next") { name = "tutorial-next", Variant = "secondary" });
            actions.Add(new GLDButton("Skip") { name = "tutorial-skip", Variant = "secondary" });
            panel.Add(actions);
            return panel;
        }
    }
}
