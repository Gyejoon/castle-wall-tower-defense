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
            _dismissed = true;
            Hide();
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
            if (state == null || state.RunStatus == RunStatus.Building || state.RunStatus == RunStatus.Lobby)
            {
                Hide();
                return;
            }

            if (state.RunStatus == RunStatus.Victory || state.RunStatus == RunStatus.Defeat)
            {
                Dismiss();
                return;
            }

            Refresh();
        }

        void HandleSummonOffered(string towerId) => SetStep(TutorialStep.Place);

        void HandleSummonConfirmed(string towerId) => SetStep(TutorialStep.Merge);

        void HandleTowersMerged(int col, int row, string towerId, int tier) => SetStep(TutorialStep.Upgrade);

        void HandleUpgradeChoiceReady(UpgradeChoice[] choices) => SetStep(TutorialStep.Upgrade);

        void HandleUpgradeApplied(string upgradeId, int stacks) => Dismiss();

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
                    title = "소환";
                    body = "소환 또는 가챠로 타워를 뽑습니다.";
                    break;
                case TutorialStep.Place:
                    title = "배치";
                    body = "빈 초록 칸을 눌러 뽑은 타워를 배치합니다.";
                    break;
                case TutorialStep.Merge:
                    title = "합성";
                    body = "같은 타워 둘을 합쳐 더 높은 tier로 올립니다.";
                    break;
                case TutorialStep.Upgrade:
                    title = "강화";
                    body = "보스 후 카드 하나를 골라 이번 런을 강화합니다.";
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
            panel.Add(new Label("소환") { name = "tutorial-title" });
            panel.Add(new Label("소환 또는 가챠로 타워를 뽑습니다.") { name = "tutorial-body" });
            return panel;
        }
    }
}
