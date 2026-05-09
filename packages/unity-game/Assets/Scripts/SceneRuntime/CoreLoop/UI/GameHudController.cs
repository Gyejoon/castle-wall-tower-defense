using GLD.Core;
using GLD.Data;
using UnityEngine;
using UnityEngine.UIElements;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class GameHudController : MonoBehaviour
    {
        Label _energyLabel;
        Label _waveLabel;
        Button _speedButton;
        Button _menuButton;
        RunState _runState;
        VisualAssetCatalogSO _visuals;
        HudLayoutConfigSO _layout;
        static HudLayoutConfigSO s_DefaultLayout;

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
            _visuals = Resources.Load<VisualAssetCatalogSO>("Visuals/VisualAssetCatalog");
            _layout = Resources.Load<HudLayoutConfigSO>("UI/HudLayoutConfig");
            _energyLabel = root.Q<Label>("hud-energy");
            _waveLabel = root.Q<Label>("hud-wave");
            _speedButton = root.Q<Button>("hud-speed");
            _menuButton = root.Q<Button>("hud-menu");
            ApplyHudLayout(root, _visuals, _layout);
            ApplyHudButtonSizing(_layout);
            RegisterHudDragEditing(root, _visuals, _layout);
        }

        void RegisterButtons()
        {
            _speedButton?.RegisterCallback<ClickEvent>(_ => RequestToggleSpeed());
            _menuButton?.RegisterCallback<ClickEvent>(_ => RequestMenu());
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
            if (_speedButton != null)
                _speedButton.text = string.Empty;
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

            var top = new VisualElement { name = "game-hud-top" };
            top.AddToClassList("game-hud__top");
            top.pickingMode = PickingMode.Ignore;
            top.style.flexDirection = FlexDirection.Row;
            top.style.justifyContent = Justify.FlexStart;
            top.style.position = Position.Absolute;
            top.Add(BuildFallbackEnergyPanel());
            top.Add(BuildFallbackWavePanel());

            var topRight = new VisualElement { name = "game-hud-top-right" };
            topRight.AddToClassList("game-hud__top-right");
            topRight.pickingMode = PickingMode.Ignore;
            topRight.style.position = Position.Absolute;
            topRight.style.flexDirection = FlexDirection.Column;
            var menu = new Button { name = "hud-menu" };
            menu.AddToClassList("game-hud__round-control");
            menu.AddToClassList("game-hud__round-control--pause");
            var speed = new Button { name = "hud-speed" };
            speed.AddToClassList("game-hud__round-control");
            speed.AddToClassList("game-hud__round-control--speed");
            topRight.Add(menu);
            topRight.Add(speed);

            hud.Add(top);
            hud.Add(topRight);
            return hud;
        }

        static VisualElement BuildFallbackEnergyPanel()
        {
            var panel = new VisualElement { name = "hud-energy-panel" };
            panel.AddToClassList("game-hud__stat");
            panel.AddToClassList("game-hud__stat--energy");
            var medal = new VisualElement();
            medal.AddToClassList("game-hud__stat-medal");
            var icon = new Label("E");
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

        static HudLayoutConfigSO ResolveLayout(HudLayoutConfigSO layout)
        {
            if (layout != null)
                return layout;

            if (s_DefaultLayout == null)
            {
                s_DefaultLayout = ScriptableObject.CreateInstance<HudLayoutConfigSO>();
                s_DefaultLayout.hideFlags = HideFlags.HideAndDontSave;
            }

            return s_DefaultLayout;
        }

        static void ApplyHudLayout(VisualElement root, VisualAssetCatalogSO visuals, HudLayoutConfigSO layout)
        {
            var hudLayout = ResolveLayout(layout);
            var top = root.Q<VisualElement>("game-hud-top");
            if (top != null)
            {
                top.style.position = Position.Absolute;
                top.style.left = hudLayout.topLeftX;
                top.style.top = hudLayout.topY;
                top.style.flexDirection = FlexDirection.Row;
                top.style.alignItems = Align.FlexStart;
            }

            ApplyStatPanel(root.Q<VisualElement>("hud-energy-panel"), hudLayout.energyPanelWidth, hudLayout);
            ApplyStatPanel(root.Q<VisualElement>("hud-wave-panel"), hudLayout.wavePanelWidth, hudLayout);
            ApplyHudSprite(root.Q<VisualElement>("hud-energy-panel"), visuals, "hud.energy_panel");
            ApplyHudSprite(root.Q<VisualElement>("hud-wave-panel"), visuals, "hud.wave_panel");

            var energyMedal = root.Q<VisualElement>(className: "game-hud__stat-medal");
            if (energyMedal != null)
            {
                energyMedal.style.width = 34f;
                energyMedal.style.height = 34f;
                energyMedal.style.marginRight = 9f;
                energyMedal.style.borderTopWidth = 0f;
                energyMedal.style.borderRightWidth = 0f;
                energyMedal.style.borderBottomWidth = 0f;
                energyMedal.style.borderLeftWidth = 0f;
                energyMedal.style.backgroundColor = new Color(0f, 0f, 0f, 0f);
                energyMedal.style.alignItems = Align.Center;
                energyMedal.style.justifyContent = Justify.Center;
            }

            root.Query<Label>(className: "game-hud__stat-icon").ForEach(label =>
            {
                label.style.width = 34f;
                label.style.height = 34f;
                ApplyLabel(label, new Color32(255, 242, 166, 255), 20f);
            });
            root.Query<Label>(className: "game-hud__stat-title").ForEach(label => ApplyLabel(label, new Color32(232, 213, 164, 255), 10f));
            root.Query<Label>(className: "game-hud__stat-value").ForEach(label => ApplyLabel(label, new Color32(240, 232, 216, 255), label.ClassListContains("game-hud__stat-value--wave") ? 20f : 24f));

            var topRight = root.Q<VisualElement>("game-hud-top-right");
            if (topRight != null)
            {
                topRight.style.position = Position.Absolute;
                topRight.style.right = hudLayout.topRightX;
                topRight.style.top = hudLayout.topRightY;
                topRight.style.flexDirection = FlexDirection.Column;
                topRight.style.alignItems = Align.Center;
            }
        }

        void ApplyHudButtonSizing(HudLayoutConfigSO layout)
        {
            ApplyMiniButton(_speedButton, _visuals, layout);
            ApplyMiniButton(_menuButton, _visuals, layout);
        }

        static void ApplyMiniButton(Button button, VisualAssetCatalogSO visuals, HudLayoutConfigSO layout)
        {
            if (button == null)
                return;

            var hudLayout = ResolveLayout(layout);
            button.text = string.Empty;
            button.style.width = hudLayout.topRightButtonSize;
            button.style.minWidth = hudLayout.topRightButtonSize;
            button.style.maxWidth = hudLayout.topRightButtonSize;
            button.style.height = hudLayout.topRightButtonSize;
            button.style.minHeight = hudLayout.topRightButtonSize;
            button.style.maxHeight = hudLayout.topRightButtonSize;
            button.style.paddingLeft = 0f;
            button.style.paddingRight = 0f;
            button.style.paddingTop = 0f;
            button.style.paddingBottom = 0f;
            button.style.marginBottom = hudLayout.topRightButtonGap;
            button.style.borderTopWidth = 0f;
            button.style.borderRightWidth = 0f;
            button.style.borderBottomWidth = 0f;
            button.style.borderLeftWidth = 0f;
            button.style.backgroundColor = new Color(0f, 0f, 0f, 0f);
            button.style.unityTextAlign = TextAnchor.MiddleCenter;
            button.style.unityBackgroundScaleMode = ScaleMode.ScaleToFit;

            if (button.name == "hud-menu")
                ApplyHudSprite(button, visuals, "hud.pause_button", ScaleMode.ScaleToFit);
            else if (button.name == "hud-speed")
                ApplyHudSprite(button, visuals, "hud.speed_x3_button", ScaleMode.ScaleToFit);
        }

        static void ApplyStatPanel(VisualElement panel, float width, HudLayoutConfigSO layout)
        {
            if (panel == null)
                return;

            var hudLayout = ResolveLayout(layout);
            panel.style.width = width;
            panel.style.height = hudLayout.statPanelHeight;
            panel.style.minHeight = hudLayout.statPanelHeight;
            panel.style.marginRight = hudLayout.statPanelGap;
            panel.style.paddingLeft = 6f;
            panel.style.paddingRight = 10f;
            panel.style.paddingTop = 0f;
            panel.style.paddingBottom = 0f;
            panel.style.borderTopWidth = 0f;
            panel.style.borderRightWidth = 0f;
            panel.style.borderBottomWidth = 0f;
            panel.style.borderLeftWidth = 0f;
            panel.style.backgroundColor = new Color(0f, 0f, 0f, 0f);
            panel.style.flexDirection = panel.ClassListContains("game-hud__stat--wave") ? FlexDirection.Column : FlexDirection.Row;
            panel.style.alignItems = Align.Center;
            panel.style.justifyContent = Justify.Center;
        }

        static void RegisterHudDragEditing(VisualElement root, VisualAssetCatalogSO visuals, HudLayoutConfigSO layout)
        {
#if UNITY_EDITOR
            if (root == null || layout == null || !layout.enableDragEditing)
                return;

            root.focusable = true;
            root.RegisterCallback<KeyDownEvent>(evt => HandleHudEditKeyDown(evt, root, visuals, layout));
            RegisterDragTarget(root.Q<VisualElement>("game-hud-top"), layout, HudDragTarget.TopLeft);
            RegisterDragTarget(root.Q<VisualElement>("game-hud-top-right"), layout, HudDragTarget.TopRight);
#endif
        }

#if UNITY_EDITOR
        enum HudDragTarget
        {
            TopLeft,
            TopRight
        }

        static void RegisterDragTarget(VisualElement element, HudLayoutConfigSO layout, HudDragTarget target)
        {
            if (element == null)
                return;

            element.pickingMode = PickingMode.Position;
            element.focusable = true;

            var startPointer = Vector2.zero;
            var startPrimary = 0f;
            var startSecondary = 0f;
            const int InactivePointerId = -1;
            var activePointerId = InactivePointerId;

            element.RegisterCallback<PointerDownEvent>(evt =>
            {
                activePointerId = evt.pointerId;
                startPointer = (Vector2)evt.position;
                ReadDragStart(layout, target, out startPrimary, out startSecondary);
                Undo.RecordObject(layout, "Drag HUD Layout");
                element.CapturePointer(activePointerId);
                element.Focus();
                evt.StopPropagation();
            });

            element.RegisterCallback<PointerMoveEvent>(evt =>
            {
                if (activePointerId != evt.pointerId || !element.HasPointerCapture(activePointerId))
                    return;

                ApplyDragDelta(element, layout, target, (Vector2)evt.position - startPointer, startPrimary, startSecondary);
                evt.StopPropagation();
            });

            element.RegisterCallback<PointerUpEvent>(evt =>
            {
                if (activePointerId != evt.pointerId || !element.HasPointerCapture(activePointerId))
                    return;

                element.ReleasePointer(activePointerId);
                activePointerId = InactivePointerId;
                SaveHudLayout(layout);
                evt.StopPropagation();
            });
        }

        static void HandleHudEditKeyDown(KeyDownEvent evt, VisualElement root, VisualAssetCatalogSO visuals, HudLayoutConfigSO layout)
        {
            if (!evt.actionKey || evt.keyCode != KeyCode.Z)
                return;

            Undo.PerformUndo();
            ApplyHudLayout(root, visuals, layout);
            SaveHudLayout(layout);
            evt.StopPropagation();
        }

        static void ReadDragStart(HudLayoutConfigSO layout, HudDragTarget target, out float primary, out float secondary)
        {
            primary = target == HudDragTarget.TopRight ? layout.topRightX : layout.topLeftX;
            secondary = target == HudDragTarget.TopRight ? layout.topRightY : layout.topY;
        }

        static void ApplyDragDelta(VisualElement element, HudLayoutConfigSO layout, HudDragTarget target, Vector2 delta, float startPrimary, float startSecondary)
        {
            if (target == HudDragTarget.TopRight)
            {
                layout.topRightX = RoundPx(startPrimary - delta.x);
                layout.topRightY = RoundPx(startSecondary + delta.y);
                element.style.right = layout.topRightX;
                element.style.top = layout.topRightY;
                return;
            }

            layout.topLeftX = RoundPx(startPrimary + delta.x);
            layout.topY = RoundPx(startSecondary + delta.y);
            element.style.left = layout.topLeftX;
            element.style.top = layout.topY;
        }

        static void SaveHudLayout(HudLayoutConfigSO layout)
        {
            EditorUtility.SetDirty(layout);
            AssetDatabase.SaveAssetIfDirty(layout);
        }

        static float RoundPx(float value) => Mathf.Max(0f, Mathf.Round(value));
#endif

        static void ApplyLabel(Label label, Color color, float fontSize)
        {
            if (label == null)
                return;

            label.style.color = color;
            label.style.fontSize = fontSize;
            label.style.unityFontStyleAndWeight = FontStyle.Bold;
            label.style.unityTextAlign = TextAnchor.MiddleCenter;
            label.style.alignSelf = Align.Center;
            label.style.marginLeft = 0f;
            label.style.marginRight = 0f;
            label.style.marginTop = 0f;
            label.style.marginBottom = 0f;
        }

        static void ApplyHudSprite(VisualElement element, VisualAssetCatalogSO visuals, string key, ScaleMode scaleMode = ScaleMode.StretchToFill)
        {
            if (element == null || visuals == null)
                return;

            var sprite = visuals.Find(key);
            if (sprite == null)
                return;

            element.style.backgroundImage = new StyleBackground(sprite);
            element.style.backgroundColor = new Color(0f, 0f, 0f, 0f);
            element.style.unityBackgroundScaleMode = scaleMode;
        }
    }
}
