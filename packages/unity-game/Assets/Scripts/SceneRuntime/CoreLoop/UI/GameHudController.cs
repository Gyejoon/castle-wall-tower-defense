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
            _menuButton = root.Q<Button>("hud-menu");
        }

        void RegisterButtons()
        {
            _summonButton?.RegisterCallback<ClickEvent>(_ => RequestSummon());
            _gacha2Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(2));
            _gacha3Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(3));
            _gacha4Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(4));
            _menuButton?.RegisterCallback<ClickEvent>(_ => RequestMenu());
        }

        public void RequestSummon() => GameEvents.RaiseRequestSummon();

        public void RequestGacha(int tier) => GameEvents.RaiseRequestGacha(new GachaRequest(tier));

        public void RequestMenu() => GameEvents.RaiseRequestPause();

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
                _statusLabel.text = state.IsPaused ? "Paused" : $"{state.RunStatus} x{state.SpeedMultiplier:0.##}";
        }

        static VisualElement BuildFallbackHud()
        {
            var hud = new VisualElement { name = "game-hud" };
            hud.AddToClassList("game-hud");

            var top = new VisualElement { name = "game-hud-top" };
            top.AddToClassList("game-hud__top");
            top.Add(new GLDBadge("E 0/0") { name = "hud-energy", Variant = "accent" });
            top.Add(new GLDBadge("W 0") { name = "hud-wave" });
            top.Add(new GLDBadge("HP 20") { name = "hud-hp", Variant = "danger" });

            var status = new Label("Building x1") { name = "hud-status" };
            status.AddToClassList("game-hud__status");

            var bottom = new GLDSheet { name = "game-hud-bottom", Anchor = "bottom" };
            bottom.AddToClassList("game-hud__bottom");
            var row = new VisualElement { name = "game-hud-actions" };
            row.AddToClassList("game-hud__actions");
            row.Add(new GLDButton("Summon") { name = "hud-summon", Variant = "primary" });
            row.Add(new GLDButton("T2") { name = "hud-gacha-t2", Variant = "secondary", Tier = 2 });
            row.Add(new GLDButton("T3") { name = "hud-gacha-t3", Variant = "secondary", Tier = 3 });
            row.Add(new GLDButton("T4") { name = "hud-gacha-t4", Variant = "secondary", Tier = 4 });
            row.Add(new GLDButton("Menu") { name = "hud-menu", Variant = "secondary" });
            bottom.Add(row);

            hud.Add(top);
            hud.Add(status);
            hud.Add(bottom);
            return hud;
        }
    }
}
