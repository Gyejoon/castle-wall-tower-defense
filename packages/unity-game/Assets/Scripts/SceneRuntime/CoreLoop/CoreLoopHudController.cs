using GLD.Data;
using GLD.SceneRuntime.CoreLoop.Render;
using GLD.Systems.Grid;
using GLD.Systems.Waves;
using UnityEngine;
using UnityEngine.InputSystem;

namespace GLD.SceneRuntime.CoreLoop
{
    public sealed class CoreLoopHudController : MonoBehaviour
    {
        const string DefaultTowerId = "archer";
        const float TopHudHeight = 76f;
        const float BottomHudHeight = 132f;

        [SerializeField] CoreLoopFieldRenderer fieldRenderer;

        GameSceneController _controller;
        string _selectedTowerId;
        string _lastMessage = "Archer button, then tap a green tile.";
        GUIStyle _panelStyle;
        GUIStyle _labelStyle;
        GUIStyle _buttonStyle;
        GUIStyle _messageStyle;

        public string SelectedTowerId => _selectedTowerId;
        public bool IsPlacementMode => !string.IsNullOrEmpty(_selectedTowerId);

        public void Bind(GameSceneController controller, CoreLoopFieldRenderer renderer)
        {
            _controller = controller;
            fieldRenderer = renderer;
        }

        void Update()
        {
            if (_controller == null || !IsPlacementMode)
                return;

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
                TryPlaceAtScreenPosition(Mouse.current.position.ReadValue());

            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
                TryPlaceAtScreenPosition(Touchscreen.current.primaryTouch.position.ReadValue());
        }

        public void BeginPlacement(string towerId)
        {
            _selectedTowerId = towerId;
            var def = _controller != null ? _controller.FindTowerDef(towerId) : null;
            _lastMessage = $"{ResolveTowerLabel(def, towerId)} selected. Tap a green tile.";
        }

        public void CancelPlacement()
        {
            _selectedTowerId = null;
            _lastMessage = "Placement cancelled.";
        }

        public bool TryPlaceAtScreenPosition(Vector2 screenPosition)
        {
            if (_controller == null || !IsPlacementMode || IsHudScreenPosition(screenPosition))
                return false;

            var camera = ResolveCamera();
            if (camera == null)
            {
                _lastMessage = "No gameplay camera.";
                return false;
            }

            var world3 = camera.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -camera.transform.position.z));
            var cell = _controller.Grid.WorldToGrid(new Vector2(world3.x, world3.y));
            return TryPlaceAtCell(cell);
        }

        public bool TryPlaceAtCell(GridCell cell)
        {
            if (_controller == null || !IsPlacementMode)
                return false;

            var towerId = _selectedTowerId;
            var def = _controller.FindTowerDef(towerId);
            var label = ResolveTowerLabel(def, towerId);
            var placed = _controller.PlaceTower(towerId, cell.Col, cell.Row);
            if (placed)
            {
                _lastMessage = $"{label} placed at {cell.Col},{cell.Row}.";
                _selectedTowerId = null;
                return true;
            }

            _lastMessage = $"Cannot place {label} at {cell.Col},{cell.Row}.";
            return false;
        }

        void OnGUI()
        {
            if (_controller == null || _controller.Energy == null)
                return;

            EnsureStyles();
            DrawTopHud();
            DrawBottomHud();
        }

        void DrawTopHud()
        {
            var safeTop = Mathf.Max(10f, Screen.safeArea.yMin + 10f);
            var panel = new Rect(12f, safeTop, Screen.width - 24f, TopHudHeight);
            GUI.Box(panel, GUIContent.none, _panelStyle);

            var wave = _controller.Waves != null ? _controller.Waves.CurrentWaveSlot : 0;
            var phase = _controller.Waves != null ? _controller.Waves.Phase : WavePhase.Idle;
            var topLine = $"Energy {_controller.Energy.Current}/{_controller.Energy.Max}   Wave {wave}   {phase}";
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, panel.width - 28f, 24f), topLine, _labelStyle);

            var counts = $"Towers {_controller.Towers.Towers.Count}   Units {_controller.Units.ActiveCount}";
            GUI.Label(new Rect(panel.x + 14f, panel.y + 38f, panel.width - 28f, 24f), counts, _labelStyle);
        }

        void DrawBottomHud()
        {
            var safeBottom = Mathf.Max(10f, Screen.height - Screen.safeArea.yMax + 10f);
            var panel = new Rect(12f, Screen.height - BottomHudHeight - safeBottom, Screen.width - 24f, BottomHudHeight);
            GUI.Box(panel, GUIContent.none, _panelStyle);

            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, panel.width - 28f, 24f), _lastMessage, _messageStyle);

            var buttonY = panel.y + 46f;
            var gap = 8f;
            var buttonWidth = (panel.width - 28f - gap * 2f) / 3f;
            if (GUI.Button(new Rect(panel.x + 14f, buttonY, buttonWidth, 42f), BuildTowerButtonLabel(DefaultTowerId), _buttonStyle))
                BeginPlacement(DefaultTowerId);

            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap), buttonY, buttonWidth, 42f), BuildTowerButtonLabel("flame_tower"), _buttonStyle))
                BeginPlacement("flame_tower");

            var cancelLabel = IsPlacementMode ? "Cancel" : "Start";
            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap) * 2f, buttonY, buttonWidth, 42f), cancelLabel, _buttonStyle))
            {
                if (IsPlacementMode)
                    CancelPlacement();
                else
                    _controller.StartRun();
            }

            if (IsPlacementMode)
            {
                var selected = _controller.FindTowerDef(_selectedTowerId);
                GUI.Label(new Rect(panel.x + 14f, panel.y + 94f, panel.width - 28f, 24f), $"Placement: {ResolveTowerLabel(selected, _selectedTowerId)}", _messageStyle);
            }
        }

        string BuildTowerButtonLabel(string towerId)
        {
            var def = _controller.FindTowerDef(towerId);
            if (def == null)
                return towerId;

            var cost = def.cost > 0 ? def.cost : 10;
            return $"{ResolveTowerLabel(def, towerId)} {cost}E";
        }

        static string ResolveTowerLabel(TowerDefSO def, string fallback)
        {
            if (def == null)
                return fallback;
            return def.tier > 0 ? $"T{def.tier} {def.family}" : def.id;
        }

        Camera ResolveCamera()
        {
            if (fieldRenderer != null && fieldRenderer.GameplayCamera != null)
                return fieldRenderer.GameplayCamera;
            return Camera.main;
        }

        static bool IsHudScreenPosition(Vector2 screenPosition)
        {
            return screenPosition.y <= BottomHudHeight + 24f || screenPosition.y >= Screen.height - TopHudHeight - 24f;
        }

        void EnsureStyles()
        {
            if (_panelStyle != null) return;

            _panelStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = MakeTexture(new Color(0.10f, 0.08f, 0.04f, 0.88f)) },
                border = new RectOffset(8, 8, 8, 8)
            };
            _labelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 17,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.94f, 0.86f, 0.66f, 1f) }
            };
            _messageStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                normal = { textColor = new Color(0.90f, 0.82f, 0.62f, 1f) }
            };
            _buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.94f, 0.84f, 0.56f, 1f) },
                active = { textColor = Color.white },
                focused = { textColor = Color.white },
                hover = { textColor = Color.white }
            };
        }

        static Texture2D MakeTexture(Color color)
        {
            var texture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
            texture.SetPixel(0, 0, color);
            texture.Apply();
            return texture;
        }
    }
}
