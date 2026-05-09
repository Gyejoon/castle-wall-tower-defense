using GLD.Core;
using GLD.SceneRuntime;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class WallUpgradeOverlayController : MonoBehaviour
    {
        VisualElement _root;
        VisualElement _panel;
        Label _summaryLabel;
        Button _repairButton;
        Button _damageButton;
        Button _speedButton;
        Button _rangeButton;
        RunState _runState;
        WallState _state;
        bool _hasState;
        bool _overlayPaused;

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

            if (root.Q<VisualElement>("wall-upgrade-overlay") == null)
                root.Add(BuildFallbackOverlay());

            ResolveElements(root);
            RegisterButtons();
            Hide();
            GameEvents.OnWallSelected += Show;
            GameEvents.OnWallStateChanged += HandleWallStateChanged;
            GameEvents.OnTowerSelected += HandleTowerSelected;
            GameEvents.OnTowerDeselected += Hide;
            GameEvents.OnRequestRejected += HandleRequestRejected;
            IsBound = true;
        }

        void OnDestroy()
        {
            Unbind();
        }

        void Unbind()
        {
            GameEvents.OnWallSelected -= Show;
            GameEvents.OnWallStateChanged -= HandleWallStateChanged;
            GameEvents.OnTowerSelected -= HandleTowerSelected;
            GameEvents.OnTowerDeselected -= Hide;
            GameEvents.OnRequestRejected -= HandleRequestRejected;
            IsBound = false;
            SetOverlayPaused(false);
            _runState = null;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("wall-upgrade-overlay");
            _panel = root.Q<VisualElement>("wall-upgrade-panel");
            _summaryLabel = root.Q<Label>("wall-upgrade-summary");
            _repairButton = root.Q<Button>("wall-upgrade-repair");
            _damageButton = root.Q<Button>("wall-upgrade-damage");
            _speedButton = root.Q<Button>("wall-upgrade-speed");
            _rangeButton = root.Q<Button>("wall-upgrade-range");
            if (_root != null)
                _root.pickingMode = PickingMode.Position;
            if (_panel != null)
                _panel.pickingMode = PickingMode.Position;
        }

        void RegisterButtons()
        {
            _root?.UnregisterCallback<PointerDownEvent>(HandleOverlayPointerDown);
            _root?.RegisterCallback<PointerDownEvent>(HandleOverlayPointerDown);
            _root?.UnregisterCallback<ClickEvent>(HandleOverlayClicked);
            _root?.RegisterCallback<ClickEvent>(HandleOverlayClicked);
            _panel?.UnregisterCallback<PointerDownEvent>(HandlePanelPointerDown);
            _panel?.RegisterCallback<PointerDownEvent>(HandlePanelPointerDown);
            _panel?.UnregisterCallback<ClickEvent>(HandlePanelClicked);
            _panel?.RegisterCallback<ClickEvent>(HandlePanelClicked);
            _repairButton?.UnregisterCallback<ClickEvent>(HandleRepairClicked);
            _repairButton?.RegisterCallback<ClickEvent>(HandleRepairClicked);
            _damageButton?.UnregisterCallback<ClickEvent>(HandleDamageClicked);
            _damageButton?.RegisterCallback<ClickEvent>(HandleDamageClicked);
            _speedButton?.UnregisterCallback<ClickEvent>(HandleSpeedClicked);
            _speedButton?.RegisterCallback<ClickEvent>(HandleSpeedClicked);
            _rangeButton?.UnregisterCallback<ClickEvent>(HandleRangeClicked);
            _rangeButton?.RegisterCallback<ClickEvent>(HandleRangeClicked);
        }

        void HandleOverlayPointerDown(PointerDownEvent evt) => evt.StopPropagation();

        void HandleOverlayClicked(ClickEvent evt)
        {
            Hide();
            evt.StopPropagation();
        }

        void HandlePanelPointerDown(PointerDownEvent evt) => evt.StopPropagation();

        void HandlePanelClicked(ClickEvent evt) => evt.StopPropagation();

        void HandleRepairClicked(ClickEvent evt) => RequestRepair();

        void HandleDamageClicked(ClickEvent evt) => RequestDamageUpgrade();

        void HandleSpeedClicked(ClickEvent evt) => RequestSpeedUpgrade();

        void HandleRangeClicked(ClickEvent evt) => RequestRangeUpgrade();

        void HandleWallStateChanged(WallState state)
        {
            _state = state;
            _hasState = true;
            SyncState();
        }

        void HandleTowerSelected(string instanceId, int col, int row) => Hide();

        void HandleRequestRejected(string reason)
        {
            if (!IsVisible || string.IsNullOrEmpty(reason) || !reason.StartsWith("wall"))
                return;

            SyncState();
        }

        public void Show()
        {
            if (_root == null)
                return;

            SyncState();
            _root.style.display = DisplayStyle.Flex;
            SetOverlayPaused(true);
            _root.BringToFront();
        }

        public void Hide()
        {
            if (_root != null)
                _root.style.display = DisplayStyle.None;
            SetOverlayPaused(false);
        }

        public void RequestRepair() => GameEvents.RaiseRequestRepairWall();

        public void RequestDamageUpgrade() => GameEvents.RaiseRequestUpgradeWallDamage();

        public void RequestSpeedUpgrade() => GameEvents.RaiseRequestUpgradeWallSpeed();

        public void RequestRangeUpgrade() => GameEvents.RaiseRequestUpgradeWallRange();

        void SyncState()
        {
            if (!_hasState)
                return;

            if (_summaryLabel != null)
            {
                _summaryLabel.text =
                    $"HP {_state.CurrentHp}/{_state.MaxHp}  DMG {_state.AutoAttackDamage:0}  SPD x{1f / Mathf.Max(0.01f, _state.AutoAttackIntervalSec):0.0}  RNG {_state.AutoAttackRange:0.0}";
            }

            if (_repairButton != null)
            {
                _repairButton.text = $"즉시 수리 ({_state.InstantRepairCharges})";
                _repairButton.SetEnabled(_state.InstantRepairCharges > 0 && _state.CurrentHp < _state.MaxHp);
            }

            if (_damageButton != null)
                _damageButton.text = $"공격력 강화  E {_state.DamageUpgradeCost}";
            if (_speedButton != null)
                _speedButton.text = $"공격 속도 강화  E {_state.SpeedUpgradeCost}";
            if (_rangeButton != null)
                _rangeButton.text = $"공격 범위 강화  E {_state.RangeUpgradeCost}";
        }

        static VisualElement BuildFallbackOverlay()
        {
            var overlay = new GLDOverlay { name = "wall-upgrade-overlay", Dim = "soft" };
            overlay.AddToClassList("wall-upgrade-overlay");
            overlay.pickingMode = PickingMode.Position;

            var panel = new GLDPanel { name = "wall-upgrade-panel", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("wall-upgrade-panel");
            panel.pickingMode = PickingMode.Position;
            panel.Add(new Label("성벽 메뉴") { name = "wall-upgrade-title" });
            panel.Add(new Label("HP -/-") { name = "wall-upgrade-summary" });

            var actions = new VisualElement { name = "wall-upgrade-actions" };
            actions.AddToClassList("wall-upgrade-actions");
            actions.Add(new GLDButton("즉시 수리") { name = "wall-upgrade-repair", Variant = "primary" });
            actions.Add(new GLDButton("공격력 강화") { name = "wall-upgrade-damage", Variant = "secondary" });
            actions.Add(new GLDButton("공격 속도 강화") { name = "wall-upgrade-speed", Variant = "secondary" });
            actions.Add(new GLDButton("공격 범위 강화") { name = "wall-upgrade-range", Variant = "secondary" });
            panel.Add(actions);

            overlay.Add(panel);
            return overlay;
        }

        void SetOverlayPaused(bool paused)
        {
            if (_overlayPaused == paused)
                return;

            _overlayPaused = paused;
            _runState?.SetOverlayPaused(paused);
        }
    }
}
