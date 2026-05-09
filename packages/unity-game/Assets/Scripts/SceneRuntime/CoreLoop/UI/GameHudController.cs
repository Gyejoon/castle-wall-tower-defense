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
            _menuButton = root.Q<Button>("hud-menu");
            ApplyHudLayout(root, _visuals, _layout);
            ApplyHudButtonSizing(_layout);
            RegisterHudDragEditing(root, _visuals, _layout);
        }

        void RegisterButtons()
        {
            _menuButton?.UnregisterCallback<ClickEvent>(HandleMenuClicked);
            _menuButton?.RegisterCallback<ClickEvent>(HandleMenuClicked);
        }

        public void RequestMenu() => GameEvents.RaiseRequestPause();

        void HandleMenuClicked(ClickEvent evt) => RequestMenu();

        void HandleRunStateChanged(RunState state)
        {
            if (_energyLabel != null)
                _energyLabel.text = state.Energy.ToString();
            if (_waveLabel != null)
                _waveLabel.text = $"{state.Wave}/20";
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
            var menu = new Button { name = "hud-menu", text = "☰" };
            menu.AddToClassList("game-hud__round-control");
            menu.AddToClassList("game-hud__round-control--menu");
            topRight.Add(menu);

            hud.Add(top);
            hud.Add(topRight);
            return hud;
        }

        static VisualElement BuildFallbackEnergyPanel()
        {
            var panel = new VisualElement { name = "hud-energy-panel" };
            panel.AddToClassList("game-hud__stat");
            panel.AddToClassList("game-hud__stat--energy");
            var title = new Label("E");
            title.AddToClassList("game-hud__stat-title");
            title.AddToClassList("game-hud__stat-title--energy");
            var value = new Label("0") { name = "hud-energy" };
            value.AddToClassList("game-hud__stat-value");
            panel.Add(title);
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

            root.Query<Label>(className: "game-hud__stat-title").ForEach(label => ApplyLabel(label, label.ClassListContains("game-hud__stat-title--energy") ? new Color32(240, 208, 96, 255) : new Color32(232, 213, 164, 255), 12f));
            root.Query<Label>(className: "game-hud__stat-value").ForEach(label => ApplyLabel(label, new Color32(240, 232, 216, 255), label.ClassListContains("game-hud__stat-value--wave") ? 19f : 22f));
            ApplyStatLabelLayout(root);

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
            ApplyMiniButton(_menuButton, layout);
        }

        static void ApplyMiniButton(Button button, HudLayoutConfigSO layout)
        {
            if (button == null)
                return;

            var hudLayout = ResolveLayout(layout);
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
            button.style.borderTopWidth = 2f;
            button.style.borderRightWidth = 2f;
            button.style.borderBottomWidth = 2f;
            button.style.borderLeftWidth = 2f;
            var radius = hudLayout.topRightButtonSize * 0.5f;
            button.style.borderTopLeftRadius = radius;
            button.style.borderTopRightRadius = radius;
            button.style.borderBottomRightRadius = radius;
            button.style.borderBottomLeftRadius = radius;
            button.style.borderTopColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            button.style.borderRightColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            button.style.borderBottomColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            button.style.borderLeftColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            button.style.backgroundColor = new Color(0.165f, 0.125f, 0.063f, 1f);
            button.style.color = new Color(0.965f, 0.902f, 0.722f, 1f);
            button.style.fontSize = 22f;
            button.style.unityFontStyleAndWeight = FontStyle.Bold;
            button.style.unityTextAlign = TextAnchor.MiddleCenter;
            button.style.unityBackgroundScaleMode = ScaleMode.StretchToFill;

            if (button.name == "hud-menu")
                button.text = "☰";
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
            panel.style.paddingLeft = 12f;
            panel.style.paddingRight = 12f;
            panel.style.paddingTop = 0f;
            panel.style.paddingBottom = 0f;
            panel.style.borderTopWidth = 2f;
            panel.style.borderRightWidth = 2f;
            panel.style.borderBottomWidth = 2f;
            panel.style.borderLeftWidth = 2f;
            var radius = hudLayout.statPanelHeight * 0.5f;
            panel.style.borderTopLeftRadius = radius;
            panel.style.borderTopRightRadius = radius;
            panel.style.borderBottomRightRadius = radius;
            panel.style.borderBottomLeftRadius = radius;
            panel.style.borderTopColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            panel.style.borderRightColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            panel.style.borderBottomColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            panel.style.borderLeftColor = new Color(0.784f, 0.608f, 0.235f, 1f);
            panel.style.backgroundColor = new Color(0.165f, 0.125f, 0.063f, 1f);
            panel.style.flexDirection = FlexDirection.Row;
            panel.style.alignItems = Align.Center;
            panel.style.justifyContent = Justify.Center;
        }

        static void ApplyStatLabelLayout(VisualElement root)
        {
            var energy = root.Q<Label>("hud-energy");
            if (energy != null)
            {
                energy.style.width = 50f;
                energy.style.minWidth = 50f;
                energy.style.maxWidth = 50f;
            }

            root.Query<Label>(className: "game-hud__stat-title").ForEach(label =>
            {
                label.style.marginRight = 6f;
                label.style.marginTop = 0f;
                label.style.marginBottom = 0f;
            });
            var wave = root.Q<Label>("hud-wave");
            if (wave != null)
            {
                wave.style.width = 50f;
                wave.style.minWidth = 50f;
                wave.style.maxWidth = 50f;
                wave.style.marginTop = 0f;
            }
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
