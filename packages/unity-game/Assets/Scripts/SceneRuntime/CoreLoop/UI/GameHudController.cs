using GLD.Core;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class GameHudController : MonoBehaviour
    {
        Label _energyLabel;
        Label _waveLabel;
        Label _hpLabel;
        Label _statusLabel;
        Button _summonButton;
        Button _gacha2Button;
        Button _gacha3Button;
        Button _gacha4Button;
        Button _speedButton;
        Button _menuButton;
        RunState _runState;

        public bool IsBound { get; private set; }

        public void Bind(RunState runState, UIDocument document)
        {
            Unbind();
            _runState = runState;
            EnsureDocumentConfigured(document);
            ResolveElements(document.rootVisualElement);
            RegisterButtons();
            if (_runState != null)
            {
                _runState.OnChanged += HandleRunStateChanged;
                HandleRunStateChanged(_runState);
            }
            IsBound = true;
        }

        public void Bind(RunState runState, VisualElement root)
        {
            Unbind();
            _runState = runState;
            if (root.Q<VisualElement>("game-hud") == null)
                root.Add(BuildFallbackHud());
            ResolveElements(root);
            RegisterButtons();
            if (_runState != null)
            {
                _runState.OnChanged += HandleRunStateChanged;
                HandleRunStateChanged(_runState);
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

        static void EnsureDocumentConfigured(UIDocument document)
        {
            if (document == null)
                return;

            RuntimeUiDocument.EnsurePanelSettings(document);

            var root = document.rootVisualElement;
            if (root.Q<VisualElement>("game-hud") == null)
                root.Add(BuildFallbackHud());
        }

        void ResolveElements(VisualElement root)
        {
            _energyLabel = root.Q<Label>("hud-energy");
            _waveLabel = root.Q<Label>("hud-wave");
            _hpLabel = root.Q<Label>("hud-hp");
            _statusLabel = root.Q<Label>("hud-status");
            _summonButton = root.Q<Button>("hud-summon");
            _gacha2Button = root.Q<Button>("hud-gacha-t2");
            _gacha3Button = root.Q<Button>("hud-gacha-t3");
            _gacha4Button = root.Q<Button>("hud-gacha-t4");
            _speedButton = root.Q<Button>("hud-speed");
            _menuButton = root.Q<Button>("hud-menu");
        }

        void RegisterButtons()
        {
            _summonButton?.RegisterCallback<ClickEvent>(_ => RequestSummon());
            _gacha2Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(2));
            _gacha3Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(3));
            _gacha4Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(4));
            _speedButton?.RegisterCallback<ClickEvent>(_ => RequestToggleSpeed());
            _menuButton?.RegisterCallback<ClickEvent>(_ => RequestMenu());
        }

        public void RequestSummon() => GameEvents.RaiseRequestSummon();

        public void RequestGacha(int tier) => GameEvents.RaiseRequestGacha(new GachaRequest(tier));

        public void RequestMenu() => GameEvents.RaiseRequestPause();

        public void RequestToggleSpeed()
        {
            var current = _runState != null ? _runState.SpeedMultiplier : 1f;
            GameEvents.RaiseRequestSetSpeed(current >= 3f ? 1f : 3f);
        }

        void HandleRunStateChanged(RunState state)
        {
            if (_energyLabel != null)
                _energyLabel.text = $"E {state.Energy}/{state.EnergyMax}";
            if (_waveLabel != null)
                _waveLabel.text = state.WavePhase == GLD.Systems.Waves.WavePhase.Interwave
                    ? $"W {state.Wave}  {Mathf.CeilToInt(state.Countdown)}s"
                    : $"W {state.Wave}";
            if (_hpLabel != null)
                _hpLabel.text = $"HP {state.Lives}";
            if (_statusLabel != null)
                _statusLabel.text = ResolveStatusText(state);
            if (_speedButton != null)
                _speedButton.text = state.SpeedMultiplier >= 3f ? "x1" : "x3";
        }

        static VisualElement BuildFallbackHud()
        {
            var hud = new VisualElement { name = "game-hud" };
            hud.AddToClassList("game-hud");
            hud.pickingMode = PickingMode.Ignore;
            hud.style.position = Position.Absolute;
            hud.style.left = 0;
            hud.style.right = 0;
            hud.style.top = 0;
            hud.style.bottom = 0;
            hud.style.justifyContent = Justify.SpaceBetween;
            hud.style.paddingLeft = 12;
            hud.style.paddingRight = 12;
            hud.style.paddingTop = 14;
            hud.style.paddingBottom = 16;

            var top = new VisualElement { name = "game-hud-top" };
            top.AddToClassList("game-hud__top");
            top.pickingMode = PickingMode.Ignore;
            top.style.flexDirection = FlexDirection.Row;
            top.style.justifyContent = Justify.SpaceBetween;
            top.Add(CreateFallbackBadge("hud-energy", "E 0/0"));
            top.Add(CreateFallbackBadge("hud-wave", "W 0"));
            top.Add(CreateFallbackBadge("hud-hp", "HP 20"));

            var status = new Label("준비 x1") { name = "hud-status" };
            status.AddToClassList("game-hud__status");
            status.pickingMode = PickingMode.Ignore;
            status.style.alignSelf = Align.Center;
            status.style.paddingLeft = 8;
            status.style.paddingRight = 8;
            status.style.paddingTop = 4;
            status.style.paddingBottom = 4;
            status.style.backgroundColor = new Color(0.12f, 0.09f, 0.04f, 0.72f);
            status.style.color = new Color(0.90f, 0.82f, 0.62f, 1f);
            status.style.unityTextAlign = TextAnchor.MiddleCenter;

            var bottom = new GLDSheet { name = "game-hud-bottom", Anchor = "bottom" };
            bottom.AddToClassList("game-hud__bottom");
            bottom.pickingMode = PickingMode.Ignore;
            bottom.style.alignSelf = Align.Stretch;
            bottom.style.paddingLeft = 8;
            bottom.style.paddingRight = 8;
            bottom.style.paddingTop = 8;
            bottom.style.paddingBottom = 8;
            bottom.style.backgroundColor = new Color(0.10f, 0.08f, 0.04f, 0.88f);
            var row = new VisualElement { name = "game-hud-actions" };
            row.AddToClassList("game-hud__actions");
            row.style.flexDirection = FlexDirection.Row;
            row.style.justifyContent = Justify.SpaceBetween;
            row.Add(CreateFallbackButton("hud-summon", "소환", "primary"));
            row.Add(CreateFallbackButton("hud-gacha-t2", "T2", "secondary"));
            row.Add(CreateFallbackButton("hud-gacha-t3", "T3", "secondary"));
            row.Add(CreateFallbackButton("hud-gacha-t4", "T4", "secondary"));
            row.Add(CreateFallbackButton("hud-speed", "x3", "secondary"));
            row.Add(CreateFallbackButton("hud-menu", "메뉴", "secondary"));
            bottom.Add(row);

            hud.Add(top);
            hud.Add(status);
            hud.Add(bottom);
            return hud;
        }

        static Label CreateFallbackBadge(string name, string text)
        {
            var badge = new Label(text) { name = name };
            badge.style.minWidth = 76;
            badge.style.paddingLeft = 8;
            badge.style.paddingRight = 8;
            badge.style.paddingTop = 5;
            badge.style.paddingBottom = 5;
            badge.style.backgroundColor = new Color(0.12f, 0.09f, 0.04f, 0.88f);
            badge.style.color = new Color(0.94f, 0.86f, 0.66f, 1f);
            badge.style.unityTextAlign = TextAnchor.MiddleCenter;
            return badge;
        }

        static GLDButton CreateFallbackButton(string name, string text, string variant)
        {
            var button = new GLDButton(text) { name = name, Variant = variant };
            button.ApplyStyles();
            button.style.flexGrow = 1;
            button.style.height = 40;
            button.style.minWidth = 0;
            button.style.marginLeft = 2;
            button.style.marginRight = 2;
            button.style.backgroundColor = variant == "primary"
                ? new Color(0.78f, 0.57f, 0.20f, 1f)
                : new Color(0.18f, 0.14f, 0.07f, 1f);
            button.style.color = new Color(0.98f, 0.91f, 0.70f, 1f);
            button.style.borderTopColor = new Color(0.36f, 0.28f, 0.14f, 1f);
            button.style.borderRightColor = new Color(0.36f, 0.28f, 0.14f, 1f);
            button.style.borderBottomColor = new Color(0.36f, 0.28f, 0.14f, 1f);
            button.style.borderLeftColor = new Color(0.36f, 0.28f, 0.14f, 1f);
            button.style.unityTextAlign = TextAnchor.MiddleCenter;
            return button;
        }

        static string ResolveStatusLabel(RunStatus status)
        {
            switch (status)
            {
                case RunStatus.Running:
                    return "전투";
                case RunStatus.Victory:
                    return "승리";
                case RunStatus.Defeat:
                    return "패배";
                case RunStatus.Lobby:
                    return "로비";
                default:
                    return "준비";
            }
        }

        static string ResolveStatusText(RunState state)
        {
            if (state.IsPaused)
                return "일시정지";
            if (state.RunStatus == RunStatus.Building && state.Wave == 0 && state.Countdown > 0f)
                return $"시작 {Mathf.CeilToInt(state.Countdown)}s";
            return $"{ResolveStatusLabel(state.RunStatus)} x{state.SpeedMultiplier:0.##}";
        }
    }
}
