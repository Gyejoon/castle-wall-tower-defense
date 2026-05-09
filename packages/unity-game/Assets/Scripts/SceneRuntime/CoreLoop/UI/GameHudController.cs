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
        Label _progressLabel;
        Button _gacha2Button;
        Button _gacha3Button;
        Button _gacha4Button;
        Button _speedButton;
        Button _menuButton;
        VisualElement _wallRepairPrompt;
        Label _wallRepairLabel;
        Button _wallRepairButton;
        Button _wallDamageButton;
        Button _wallSpeedButton;
        Button _wallRangeButton;
        RunState _runState;
        WallState _wallState;

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
            BindWallEvents();
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
            BindWallEvents();
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
            GameEvents.OnWallSelected -= HandleWallSelected;
            GameEvents.OnWallStateChanged -= HandleWallStateChanged;
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
            _progressLabel = root.Q<Label>("hud-progress-label");
            _gacha2Button = root.Q<Button>("hud-gacha-t2");
            _gacha3Button = root.Q<Button>("hud-gacha-t3");
            _gacha4Button = root.Q<Button>("hud-gacha-t4");
            _speedButton = root.Q<Button>("hud-speed");
            _menuButton = root.Q<Button>("hud-menu");
            _wallRepairPrompt = root.Q<VisualElement>("hud-wall-repair");
            _wallRepairLabel = root.Q<Label>("hud-wall-repair-label");
            _wallRepairButton = root.Q<Button>("hud-wall-repair-button");
            _wallDamageButton = root.Q<Button>("hud-wall-damage-button");
            _wallSpeedButton = root.Q<Button>("hud-wall-speed-button");
            _wallRangeButton = root.Q<Button>("hud-wall-range-button");
            ApplyHudLayout(root);
            ApplyHudButtonSizing();
            HideWallRepairPrompt();
        }

        void RegisterButtons()
        {
            _gacha2Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(2));
            _gacha3Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(3));
            _gacha4Button?.RegisterCallback<ClickEvent>(_ => RequestGacha(4));
            _speedButton?.RegisterCallback<ClickEvent>(_ => RequestToggleSpeed());
            _menuButton?.RegisterCallback<ClickEvent>(_ => RequestMenu());
            _wallRepairPrompt?.RegisterCallback<PointerDownEvent>(HandleWallRepairOverlayPointerDown);
            _wallRepairButton?.RegisterCallback<ClickEvent>(_ => RequestWallRepair());
            _wallDamageButton?.RegisterCallback<ClickEvent>(_ => RequestWallDamageUpgrade());
            _wallSpeedButton?.RegisterCallback<ClickEvent>(_ => RequestWallSpeedUpgrade());
            _wallRangeButton?.RegisterCallback<ClickEvent>(_ => RequestWallRangeUpgrade());
        }

        void BindWallEvents()
        {
            GameEvents.OnWallSelected -= HandleWallSelected;
            GameEvents.OnWallStateChanged -= HandleWallStateChanged;
            GameEvents.OnWallSelected += HandleWallSelected;
            GameEvents.OnWallStateChanged += HandleWallStateChanged;
        }

        public void RequestWallRepair()
        {
            GameEvents.RaiseRequestRepairWall();
            HideWallRepairPrompt();
        }

        public void DismissWallMenu() => HideWallRepairPrompt();

        public void RequestWallDamageUpgrade()
        {
            GameEvents.RaiseRequestUpgradeWallDamage();
            HideWallRepairPrompt();
        }

        public void RequestWallSpeedUpgrade()
        {
            GameEvents.RaiseRequestUpgradeWallSpeed();
            HideWallRepairPrompt();
        }

        public void RequestWallRangeUpgrade()
        {
            GameEvents.RaiseRequestUpgradeWallRange();
            HideWallRepairPrompt();
        }

        public void RequestGacha(int tier)
        {
            if (tier == 2)
                GameEvents.RaiseRequestCastTactic(new TacticCastRequest(PlayerTacticKind.ForceMove, 0f, 0f, 3.5f));
            else if (tier == 3)
                GameEvents.RaiseRequestCastTactic(new TacticCastRequest(PlayerTacticKind.Freeze, 0f, 0f, 3.5f));
            else
                GameEvents.RaiseRequestUpgradeReroll();
        }

        public void RequestMenu() => GameEvents.RaiseRequestPause();

        public void RequestToggleSpeed()
        {
            var current = _runState != null ? _runState.SpeedMultiplier : 1f;
            GameEvents.RaiseRequestSetSpeed(current >= 3f ? 1f : 3f);
        }

        void HandleRunStateChanged(RunState state)
        {
            if (_energyLabel != null)
                _energyLabel.text = state.Energy.ToString();
            if (_waveLabel != null)
                _waveLabel.text = $"{state.Wave}/20";
            if (_progressLabel != null)
                _progressLabel.text = $"공격 {state.Wave}/13";
            if (_speedButton != null)
                _speedButton.text = state.SpeedMultiplier >= 3f ? "x1" : "x3 ››";
        }

        void HandleWallSelected()
        {
            UpdateWallRepairLabel();
            if (_wallRepairPrompt != null)
            {
                if (_wallRepairPrompt is GLDOverlay overlay)
                    overlay.Visible = true;
                _wallRepairPrompt.style.display = DisplayStyle.Flex;
            }
        }

        void HandleWallStateChanged(WallState state)
        {
            _wallState = state;
            UpdateWallRepairLabel();
        }

        void HandleWallRepairOverlayPointerDown(PointerDownEvent evt)
        {
            if (evt.target is VisualElement target && target != _wallRepairPrompt && _wallRepairPrompt.Contains(target))
                return;

            HideWallRepairPrompt();
        }

        void UpdateWallRepairLabel()
        {
            if (_wallRepairLabel == null)
                return;

            var cooldown = Mathf.CeilToInt(_wallState.RepairCooldownRemainingSec);
            _wallRepairLabel.text = cooldown > 0
                ? $"성벽 {Mathf.Max(0, _wallState.CurrentHp)}/{Mathf.Max(1, _wallState.MaxHp)} · {cooldown}s"
                : $"성벽 {Mathf.Max(0, _wallState.CurrentHp)}/{Mathf.Max(1, _wallState.MaxHp)} · 수리권 {_wallState.InstantRepairCharges}";
            if (_wallRepairButton != null)
            {
                _wallRepairButton.text = $"즉시 수리 x{_wallState.InstantRepairCharges}";
                _wallRepairButton.SetEnabled(_wallState.InstantRepairCharges > 0 && _wallState.CurrentHp < _wallState.MaxHp);
            }
            if (_wallDamageButton != null)
                _wallDamageButton.text = $"공격력 E{_wallState.DamageUpgradeCost}";
            if (_wallSpeedButton != null)
                _wallSpeedButton.text = $"공격 속도 E{_wallState.SpeedUpgradeCost}";
            if (_wallRangeButton != null)
                _wallRangeButton.text = $"공격 범위 E{_wallState.RangeUpgradeCost}";
        }

        void HideWallRepairPrompt()
        {
            if (_wallRepairPrompt == null)
                return;

            if (_wallRepairPrompt is GLDOverlay overlay)
                overlay.Visible = false;
            _wallRepairPrompt.style.display = DisplayStyle.None;
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
            hud.style.paddingLeft = 12;
            hud.style.paddingRight = 12;
            hud.style.paddingTop = 14;
            hud.style.paddingBottom = 16;

            var top = new VisualElement { name = "game-hud-top" };
            top.AddToClassList("game-hud__top");
            top.pickingMode = PickingMode.Ignore;
            top.style.flexDirection = FlexDirection.Row;
            top.style.justifyContent = Justify.FlexStart;
            top.style.position = Position.Absolute;
            top.style.left = 10;
            top.style.top = 10;
            top.Add(BuildFallbackEnergyPanel());
            top.Add(BuildFallbackWavePanel());

            var topRight = new VisualElement { name = "game-hud-top-right" };
            topRight.AddToClassList("game-hud__top-right");
            topRight.pickingMode = PickingMode.Ignore;
            topRight.style.position = Position.Absolute;
            topRight.style.right = 11;
            topRight.style.top = 10;
            topRight.style.flexDirection = FlexDirection.Column;
            var menu = new Button { name = "hud-menu", text = "II" };
            menu.AddToClassList("game-hud__round-control");
            menu.AddToClassList("game-hud__round-control--pause");
            var speed = new Button { name = "hud-speed", text = "x3 ››" };
            speed.AddToClassList("game-hud__round-control");
            speed.AddToClassList("game-hud__round-control--speed");
            topRight.Add(menu);
            topRight.Add(speed);

            var row = new VisualElement { name = "game-hud-actions" };
            row.AddToClassList("game-hud__actions");
            row.pickingMode = PickingMode.Ignore;
            row.style.position = Position.Absolute;
            row.style.left = 13;
            row.style.bottom = 14;
            row.style.flexDirection = FlexDirection.Row;
            row.style.justifyContent = Justify.FlexStart;
            row.Add(CreateFallbackSkillButton("hud-gacha-t2", "↯", "밀치기", "game-hud__skill-button--push"));
            row.Add(CreateFallbackSkillButton("hud-gacha-t3", "❄", "정지", "game-hud__skill-button--freeze"));

            hud.Add(top);
            hud.Add(topRight);
            hud.Add(BuildFallbackLeftStack());
            hud.Add(BuildFallbackWallRepairPrompt());
            hud.Add(row);
            return hud;
        }

        static VisualElement BuildFallbackEnergyPanel()
        {
            var panel = new VisualElement { name = "hud-energy-panel" };
            panel.AddToClassList("game-hud__stat");
            panel.AddToClassList("game-hud__stat--energy");
            var medal = new VisualElement();
            medal.AddToClassList("game-hud__stat-medal");
            var icon = new Label("⚡");
            icon.AddToClassList("game-hud__stat-icon");
            medal.Add(icon);
            var value = new Label("0") { name = "hud-energy" };
            value.AddToClassList("game-hud__stat-value");
            panel.Add(medal);
            panel.Add(value);
            return panel;
        }

        static VisualElement BuildFallbackWavePanel()
        {
            var panel = new VisualElement { name = "hud-wave-panel" };
            panel.AddToClassList("game-hud__stat");
            panel.AddToClassList("game-hud__stat--wave");
            var title = new Label("WAVE");
            title.AddToClassList("game-hud__stat-title");
            var value = new Label("0/20") { name = "hud-wave" };
            value.AddToClassList("game-hud__stat-value");
            value.AddToClassList("game-hud__stat-value--wave");
            panel.Add(title);
            panel.Add(value);
            return panel;
        }

        static VisualElement BuildFallbackLeftStack()
        {
            var stack = new VisualElement { name = "game-hud-left-stack" };
            stack.AddToClassList("game-hud__left-stack");
            stack.pickingMode = PickingMode.Ignore;

            var progress = new VisualElement { name = "hud-progress-panel" };
            progress.AddToClassList("game-hud__progress");
            var skull = new Label("☠");
            skull.AddToClassList("game-hud__progress-icon");
            progress.Add(skull);
            progress.Add(new Label("공격 0/13") { name = "hud-progress-label" });
            var rail = new VisualElement();
            rail.AddToClassList("game-hud__progress-rail");
            for (var i = 0; i < 6; i++)
            {
                var dot = new VisualElement();
                dot.AddToClassList("game-hud__progress-dot");
                if (i < 3)
                    dot.AddToClassList("game-hud__progress-dot--on");
                rail.Add(dot);
            }
            progress.Add(rail);

            var preview = new VisualElement { name = "hud-card-preview" };
            preview.AddToClassList("game-hud__card-preview");
            preview.Add(new Label("BOSS") { name = "hud-card-preview-icon" });
            preview.Add(new Label("0") { name = "hud-card-preview-count" });

            stack.Add(progress);
            stack.Add(preview);
            return stack;
        }

        static VisualElement BuildFallbackWallRepairPrompt()
        {
            var overlay = new GLDOverlay { name = "hud-wall-repair", Dim = "soft", Visible = false };
            overlay.AddToClassList("wall-repair-overlay");
            overlay.style.display = DisplayStyle.None;

            var prompt = new GLDPanel { name = "hud-wall-repair-panel", Variant = "elevated", Padding = "md" };
            prompt.AddToClassList("wall-repair-prompt");
            prompt.Add(new Label("성벽 메뉴") { name = "hud-wall-repair-title" });
            prompt.Add(new Label("성벽 20/20 · E25") { name = "hud-wall-repair-label" });
            prompt.Add(CreateFallbackButton("hud-wall-repair-button", "즉시 수리 x0", "primary"));
            prompt.Add(CreateFallbackButton("hud-wall-damage-button", "공격력 E45", "secondary"));
            prompt.Add(CreateFallbackButton("hud-wall-speed-button", "공격 속도 E50", "secondary"));
            prompt.Add(CreateFallbackButton("hud-wall-range-button", "공격 범위 E40", "secondary"));
            overlay.Add(prompt);
            return overlay;
        }

        static GLDButton CreateFallbackButton(string name, string text, string variant, string size = "md")
        {
            var button = new GLDButton(text) { name = name, Variant = variant, Size = size };
            button.ApplyStyles();
            button.style.minWidth = 0;
            button.style.marginLeft = 4;
            button.style.marginRight = 4;
            return button;
        }

        static Button CreateFallbackSkillButton(string name, string iconText, string labelText, string modifierClass)
        {
            var button = new Button { name = name };
            button.AddToClassList("game-hud__skill-button");
            button.AddToClassList(modifierClass);
            var icon = new Label(iconText);
            icon.AddToClassList("game-hud__skill-icon");
            var label = new Label(labelText) { name = $"{name}-label" };
            label.AddToClassList("game-hud__skill-label");
            button.Add(icon);
            button.Add(label);
            return button;
        }

        void ApplyHudButtonSizing()
        {
            ApplyMiniButton(_speedButton);
            ApplyMiniButton(_menuButton);
            ApplySkillButton(_gacha2Button);
            ApplySkillButton(_gacha3Button);
        }

        static void ApplyHudLayout(VisualElement root)
        {
            var top = root.Q<VisualElement>("game-hud-top");
            if (top != null)
            {
                top.style.position = Position.Absolute;
                top.style.left = 10f;
                top.style.top = 10f;
                top.style.flexDirection = FlexDirection.Row;
            }

            ApplyStatPanel(root.Q<VisualElement>("hud-energy-panel"), 108f);
            ApplyStatPanel(root.Q<VisualElement>("hud-wave-panel"), 104f);
            var energyMedal = root.Q<VisualElement>(className: "game-hud__stat-medal");
            if (energyMedal != null)
            {
                energyMedal.style.width = 34f;
                energyMedal.style.height = 34f;
                energyMedal.style.marginRight = 9f;
                ApplyFrame(energyMedal, new Color32(201, 147, 22, 255), new Color32(244, 207, 93, 255), 3f, 3f, 17f);
            }
            root.Query<Label>(className: "game-hud__stat-icon").ForEach(label => ApplyLabel(label, new Color32(255, 242, 166, 255), 21f));
            root.Query<Label>(className: "game-hud__stat-title").ForEach(label => ApplyLabel(label, new Color32(232, 213, 164, 255), 10f));
            root.Query<Label>(className: "game-hud__stat-value").ForEach(label => ApplyLabel(label, new Color32(240, 232, 216, 255), label.ClassListContains("game-hud__stat-value--wave") ? 20f : 24f));

            var topRight = root.Q<VisualElement>("game-hud-top-right");
            if (topRight != null)
            {
                topRight.style.position = Position.Absolute;
                topRight.style.right = 11f;
                topRight.style.top = 10f;
                topRight.style.flexDirection = FlexDirection.Column;
            }

            var leftStack = root.Q<VisualElement>("game-hud-left-stack");
            if (leftStack != null)
            {
                leftStack.style.position = Position.Absolute;
                leftStack.style.left = 10f;
                leftStack.style.top = 72f;
                leftStack.style.width = 70f;
                leftStack.style.maxWidth = 70f;
                leftStack.style.flexDirection = FlexDirection.Column;
                leftStack.style.alignItems = Align.FlexStart;
            }

            var progress = root.Q<VisualElement>("hud-progress-panel");
            if (progress != null)
            {
                progress.style.width = 70f;
                progress.style.maxWidth = 70f;
                progress.style.height = 154f;
                progress.style.maxHeight = 154f;
                progress.style.paddingLeft = 5f;
                progress.style.paddingRight = 5f;
                progress.style.paddingTop = 5f;
                progress.style.paddingBottom = 5f;
                progress.style.alignItems = Align.Center;
                ApplyFrame(progress, new Color32(35, 24, 12, 240), new Color32(138, 103, 46, 255), 3f, 5f, 6f);
            }
            root.Query<Label>(className: "game-hud__progress-icon").ForEach(label => ApplyLabel(label, new Color32(239, 226, 199, 255), 26f));
            root.Query<Label>(className: "game-hud__progress-dot").ForEach(_ => { });
            if (root.Q<Label>("hud-progress-label") != null)
                ApplyLabel(root.Q<Label>("hud-progress-label"), new Color32(240, 232, 216, 255), 10f);
            root.Query<VisualElement>(className: "game-hud__progress-dot").ForEach(dot =>
            {
                dot.style.width = 14f;
                dot.style.height = 14f;
                dot.style.marginTop = 3f;
                ApplyFrame(dot, dot.ClassListContains("game-hud__progress-dot--on") ? new Color32(242, 197, 47, 255) : new Color32(8, 6, 3, 230), new Color32(184, 151, 85, 255), 2f, 2f, 7f);
            });

            var card = root.Q<VisualElement>("hud-card-preview");
            if (card != null)
            {
                card.style.width = 70f;
                card.style.maxWidth = 70f;
                card.style.height = 88f;
                card.style.maxHeight = 88f;
                card.style.marginTop = 10f;
                card.style.paddingLeft = 4f;
                card.style.paddingRight = 4f;
                card.style.paddingTop = 4f;
                card.style.paddingBottom = 4f;
                card.style.alignItems = Align.Center;
                card.style.justifyContent = Justify.Center;
                ApplyFrame(card, new Color32(35, 20, 15, 245), new Color32(178, 99, 202, 255), 3f, 5f, 6f);
            }
            if (root.Q<Label>("hud-card-preview-icon") != null)
                ApplyLabel(root.Q<Label>("hud-card-preview-icon"), new Color32(255, 138, 48, 255), 10f);
            if (root.Q<Label>("hud-card-preview-count") != null)
                ApplyLabel(root.Q<Label>("hud-card-preview-count"), new Color32(240, 232, 216, 255), 10f);

            var actions = root.Q<VisualElement>("game-hud-actions");
            if (actions != null)
            {
                actions.style.position = Position.Absolute;
                actions.style.left = 13f;
                actions.style.bottom = 14f;
                actions.style.flexDirection = FlexDirection.Row;
                actions.style.alignItems = Align.Center;
            }
            root.Query<Label>(className: "game-hud__skill-icon").ForEach(label =>
            {
                label.style.width = 76f;
                label.style.height = 76f;
                ApplyFrame(label, label.text == "❄" ? new Color32(23, 124, 189, 255) : new Color32(183, 71, 23, 255), new Color32(242, 199, 96, 255), 4f, 6f, 38f);
                ApplyLabel(label, new Color32(255, 245, 201, 255), 34f);
            });
            root.Query<Label>(className: "game-hud__skill-label").ForEach(label =>
            {
                label.style.width = 72f;
                label.style.minHeight = 24f;
                label.style.marginTop = -4f;
                ApplyFrame(label, new Color32(36, 25, 13, 250), new Color32(214, 169, 77, 255), 2f, 4f, 4f);
                ApplyLabel(label, new Color32(248, 234, 208, 255), 12f);
            });
        }

        static void ApplyMiniButton(Button button)
        {
            if (button == null)
                return;

            button.style.width = 54f;
            button.style.minWidth = 54f;
            button.style.maxWidth = 54f;
            button.style.height = 54f;
            button.style.minHeight = 54f;
            button.style.maxHeight = 54f;
            button.style.paddingLeft = 0f;
            button.style.paddingRight = 0f;
            button.style.paddingTop = 0f;
            button.style.paddingBottom = 0f;
            button.style.marginBottom = 9f;
            button.style.borderTopLeftRadius = 27f;
            button.style.borderTopRightRadius = 27f;
            button.style.borderBottomLeftRadius = 27f;
            button.style.borderBottomRightRadius = 27f;
            ApplyFrame(button, new Color32(39, 27, 13, 245), new Color32(214, 169, 77, 255), 3f, 5f, 27f);
            button.style.color = new Color(246f / 255f, 230f / 255f, 184f / 255f, 1f);
            button.style.fontSize = 18f;
            button.style.unityFontStyleAndWeight = FontStyle.Bold;
            button.style.unityTextAlign = TextAnchor.MiddleCenter;
        }

        static void ApplySkillButton(Button button)
        {
            if (button == null)
                return;

            button.style.width = 88f;
            button.style.minWidth = 88f;
            button.style.maxWidth = 88f;
            button.style.height = 104f;
            button.style.minHeight = 104f;
            button.style.maxHeight = 104f;
            button.style.paddingLeft = 0f;
            button.style.paddingRight = 0f;
            button.style.paddingTop = 0f;
            button.style.paddingBottom = 0f;
            button.style.marginRight = 9f;
            button.style.alignItems = Align.Center;
            button.style.justifyContent = Justify.FlexStart;
            button.style.backgroundColor = new Color(0f, 0f, 0f, 0f);
            button.style.borderTopWidth = 0f;
            button.style.borderRightWidth = 0f;
            button.style.borderBottomWidth = 0f;
            button.style.borderLeftWidth = 0f;
        }

        static void ApplyStatPanel(VisualElement panel, float width)
        {
            if (panel == null)
                return;

            panel.style.width = width;
            panel.style.height = 48f;
            panel.style.minHeight = 48f;
            panel.style.marginRight = 8f;
            panel.style.paddingLeft = 6f;
            panel.style.paddingRight = 10f;
            panel.style.paddingTop = 4f;
            panel.style.paddingBottom = 5f;
            panel.style.flexDirection = panel.ClassListContains("game-hud__stat--wave") ? FlexDirection.Column : FlexDirection.Row;
            panel.style.alignItems = Align.Center;
            panel.style.justifyContent = Justify.Center;
            ApplyFrame(panel, new Color32(36, 25, 13, 235), new Color32(123, 90, 39, 255), 3f, 5f, 6f);
        }

        static void ApplyLabel(Label label, Color color, float fontSize)
        {
            if (label == null)
                return;

            label.style.color = color;
            label.style.fontSize = fontSize;
            label.style.unityFontStyleAndWeight = FontStyle.Bold;
            label.style.unityTextAlign = TextAnchor.MiddleCenter;
        }

        static void ApplyFrame(VisualElement element, Color background, Color border, float borderWidth, float bottomWidth, float radius)
        {
            if (element == null)
                return;

            element.style.backgroundColor = background;
            element.style.borderTopColor = border;
            element.style.borderRightColor = border;
            element.style.borderBottomColor = border;
            element.style.borderLeftColor = border;
            element.style.borderTopWidth = borderWidth;
            element.style.borderRightWidth = borderWidth;
            element.style.borderBottomWidth = bottomWidth;
            element.style.borderLeftWidth = borderWidth;
            element.style.borderTopLeftRadius = radius;
            element.style.borderTopRightRadius = radius;
            element.style.borderBottomLeftRadius = radius;
            element.style.borderBottomRightRadius = radius;
        }
    }
}
