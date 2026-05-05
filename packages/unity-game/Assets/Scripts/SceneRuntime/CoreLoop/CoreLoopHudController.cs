using GLD.Core;
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
        enum InteractionMode
        {
            None,
            Placement,
            Merge
        }

        const string DefaultTowerId = "archer";
        const float TopHudHeight = 76f;
        const float BottomHudHeight = 212f;
        const float RuntimeTopHudHitHeight = 88f;
        const float RuntimeBottomHudHitHeight = 92f;
        const float CompactActionBarHeight = 68f;

        [SerializeField] CoreLoopFieldRenderer fieldRenderer;
        [SerializeField] bool showDebugHud;
        [SerializeField] bool showCompactFallbackBar;

        GameSceneController _controller;
        string _selectedTowerId;
        GridCell? _mergeFrom;
        InteractionMode _mode;
        string _lastMessage = "Archer button, then tap a green tile.";
        UpgradeChoice[] _upgradeChoices;
        string _bossLabel;
        int _bossHp;
        int _bossMaxHp;
        int _bossPhase;
        GUIStyle _panelStyle;
        GUIStyle _labelStyle;
        GUIStyle _buttonStyle;
        GUIStyle _messageStyle;
        bool _eventsBound;

        public string SelectedTowerId => _selectedTowerId;
        public string LastMessage => _lastMessage;
        public bool IsPlacementMode => _mode == InteractionMode.Placement && !string.IsNullOrEmpty(_selectedTowerId);
        public bool IsMergeMode => _mode == InteractionMode.Merge;
        public int UpgradeChoiceCount => _upgradeChoices != null ? _upgradeChoices.Length : 0;

        public void Bind(GameSceneController controller, CoreLoopFieldRenderer renderer)
        {
            _controller = controller;
            fieldRenderer = renderer;
        }

        void OnEnable()
        {
            BindEvents();
        }

        void OnDisable()
        {
            UnbindEvents();
        }

        void OnDestroy()
        {
            UnbindEvents();
        }

        void Update()
        {
            if (_controller == null || _mode == InteractionMode.None)
                return;
            if (!showDebugHud && !showCompactFallbackBar)
                return;

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
                TryInteractAtScreenPosition(Mouse.current.position.ReadValue());

            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
                TryInteractAtScreenPosition(Touchscreen.current.primaryTouch.position.ReadValue());
        }

        public void BeginPlacement(string towerId)
        {
            _selectedTowerId = towerId;
            _mergeFrom = null;
            _mode = InteractionMode.Placement;
            var def = _controller != null ? _controller.FindTowerDef(towerId) : null;
            _lastMessage = $"{ResolveTowerLabel(def, towerId)} selected. Tap a green tile.";
            fieldRenderer?.ShowPlacementMarkers(towerId);
        }

        public void CancelPlacement()
        {
            if (!string.IsNullOrEmpty(_selectedTowerId))
                GameEvents.RaiseRequestCancelSummon();
            _selectedTowerId = null;
            _mergeFrom = null;
            _mode = InteractionMode.None;
            _lastMessage = "Placement cancelled.";
            fieldRenderer?.HidePlacementMarkers();
        }

        public void BeginMergeMode()
        {
            _selectedTowerId = null;
            _mergeFrom = null;
            _mode = InteractionMode.Merge;
            _lastMessage = "Merge: tap source tower, then target tower.";
        }

        public bool TryInteractAtScreenPosition(Vector2 screenPosition)
        {
            if (_controller == null || _mode == InteractionMode.None || IsHudScreenPosition(screenPosition, showDebugHud))
                return false;

            var camera = ResolveCamera();
            if (camera == null)
            {
                _lastMessage = "No gameplay camera.";
                return false;
            }

            var world3 = camera.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -camera.transform.position.z));
            var cell = _controller.Grid.WorldToPlacementGrid(new Vector2(world3.x, world3.y));
            return TryInteractAtCell(cell);
        }

        public bool TryPlaceAtScreenPosition(Vector2 screenPosition) => TryInteractAtScreenPosition(screenPosition);

        public bool TryInteractAtCell(GridCell cell)
        {
            if (_mode == InteractionMode.Merge)
                return TryMergeAtCell(cell);
            return TryPlaceAtCell(cell);
        }

        public bool TryPlaceAtCell(GridCell cell)
        {
            if (_controller == null || !IsPlacementMode)
                return false;

            var towerId = _selectedTowerId;
            var def = _controller.FindTowerDef(towerId);
            var label = ResolveTowerLabel(def, towerId);
            GameEvents.RaiseRequestPlaceTower(new TowerPlacementRequest(towerId, cell.Col, cell.Row));
            var placed = _controller.Towers.GetAt(cell) != null;
            if (placed)
            {
                _lastMessage = $"{label} placed at {cell.Col},{cell.Row}.";
                _selectedTowerId = null;
                _mode = InteractionMode.None;
                fieldRenderer?.HidePlacementMarkers();
                return true;
            }

            _lastMessage = $"Cannot place {label} at {cell.Col},{cell.Row}.";
            return false;
        }

        public bool ChooseUpgrade(int index)
        {
            if (_upgradeChoices == null || index < 0 || index >= _upgradeChoices.Length)
                return false;

            var choice = _upgradeChoices[index];
            GameEvents.RaiseRequestUpgradePick(choice.Id);
            _upgradeChoices = null;
            return true;
        }

        bool TryMergeAtCell(GridCell cell)
        {
            if (_controller == null || _controller.Towers.GetAt(cell) == null)
            {
                _lastMessage = "Merge needs a tower tile.";
                return false;
            }

            if (_mergeFrom == null)
            {
                _mergeFrom = cell;
                _lastMessage = $"Merge source {cell.Col},{cell.Row}. Tap target tower.";
                return true;
            }

            var from = _mergeFrom.Value;
            if (from.Equals(cell))
            {
                _lastMessage = "Merge target must be a different tower.";
                return false;
            }

            GameEvents.RaiseRequestMerge(new TowerMergeRequest(from.Col, from.Row, cell.Col, cell.Row));
            _mergeFrom = null;
            _mode = InteractionMode.None;
            return true;
        }

        void OnGUI()
        {
            if (_controller == null)
                return;

            EnsureStyles();
            if (showDebugHud)
            {
                DrawTopHud();
                DrawBottomHud();
                return;
            }

            if (showCompactFallbackBar)
                DrawCompactActionBar();
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

            var boss = !string.IsNullOrEmpty(_bossLabel) && _bossMaxHp > 0
                ? $"   Boss {_bossLabel} P{_bossPhase} {_bossHp}/{_bossMaxHp}"
                : string.Empty;
            var counts = $"Towers {_controller.Towers.Towers.Count}   Units {_controller.Units.ActiveCount}{boss}";
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
            var buttonWidth = (panel.width - 28f - gap * 3f) / 4f;
            if (GUI.Button(new Rect(panel.x + 14f, buttonY, buttonWidth, 38f), "Summon", _buttonStyle))
            {
                GameEvents.RaiseRequestSummon();
                _lastMessage = "Summon requested.";
            }

            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap), buttonY, buttonWidth, 38f), "Gacha T2", _buttonStyle))
                RequestGacha(2);

            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap) * 2f, buttonY, buttonWidth, 38f), "Gacha T3", _buttonStyle))
                RequestGacha(3);

            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap) * 3f, buttonY, buttonWidth, 38f), "Gacha T4", _buttonStyle))
                RequestGacha(4);

            var row2Y = buttonY + 46f;
            if (GUI.Button(new Rect(panel.x + 14f, row2Y, buttonWidth, 38f), BuildTowerButtonLabel(DefaultTowerId), _buttonStyle))
                BeginPlacement(DefaultTowerId);

            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap), row2Y, buttonWidth, 38f), "Merge", _buttonStyle))
                BeginMergeMode();

            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap) * 2f, row2Y, buttonWidth, 38f), "Cards", _buttonStyle))
            {
                GameEvents.RaiseRequestUpgradeReroll();
                _lastMessage = "Upgrade cards requested.";
            }

            var startLabel = _mode != InteractionMode.None ? "Cancel" : "Start";
            if (GUI.Button(new Rect(panel.x + 14f + (buttonWidth + gap) * 3f, row2Y, buttonWidth, 38f), startLabel, _buttonStyle))
            {
                if (_mode != InteractionMode.None)
                    CancelPlacement();
                else
                    GameEvents.RaiseRequestStartRun();
            }

            var row3Y = row2Y + 46f;
            if (IsPlacementMode)
            {
                var selected = _controller.FindTowerDef(_selectedTowerId);
                GUI.Label(new Rect(panel.x + 14f, row3Y + 8f, panel.width - 28f, 24f), $"Placement: {ResolveTowerLabel(selected, _selectedTowerId)}", _messageStyle);
            }
            else if (IsMergeMode)
            {
                var mergeText = _mergeFrom.HasValue
                    ? $"Merge source: {_mergeFrom.Value.Col},{_mergeFrom.Value.Row}"
                    : "Merge mode";
                GUI.Label(new Rect(panel.x + 14f, row3Y + 8f, panel.width - 28f, 24f), mergeText, _messageStyle);
            }
        }

        void DrawCompactActionBar()
        {
            var safeBottom = Mathf.Max(8f, Screen.height - Screen.safeArea.yMax + 8f);
            var panel = new Rect(
                10f,
                Screen.height - CompactActionBarHeight - safeBottom,
                Screen.width - 20f,
                CompactActionBarHeight);
            GUI.Box(panel, GUIContent.none, _panelStyle);

            var gap = 6f;
            var buttonY = panel.y + 14f;
            var buttonWidth = (panel.width - 20f - gap * 5f) / 6f;
            var x = panel.x + 10f;

            if (GUI.Button(new Rect(x, buttonY, buttonWidth, 40f), "소환", _buttonStyle))
            {
                GameEvents.RaiseRequestSummon();
                _lastMessage = "Summon requested.";
            }

            if (GUI.Button(new Rect(x + (buttonWidth + gap), buttonY, buttonWidth, 40f), "T2", _buttonStyle))
                RequestGacha(2);
            if (GUI.Button(new Rect(x + (buttonWidth + gap) * 2f, buttonY, buttonWidth, 40f), "T3", _buttonStyle))
                RequestGacha(3);
            if (GUI.Button(new Rect(x + (buttonWidth + gap) * 3f, buttonY, buttonWidth, 40f), "T4", _buttonStyle))
                RequestGacha(4);
            if (GUI.Button(new Rect(x + (buttonWidth + gap) * 4f, buttonY, buttonWidth, 40f), "합성", _buttonStyle))
                BeginMergeMode();

            var lastLabel = _mode != InteractionMode.None ? "취소" : "시작";
            if (GUI.Button(new Rect(x + (buttonWidth + gap) * 5f, buttonY, buttonWidth, 40f), lastLabel, _buttonStyle))
            {
                if (_mode != InteractionMode.None)
                    CancelPlacement();
                else
                    GameEvents.RaiseRequestStartRun();
            }
        }

        void DrawUpgradeChoices(Rect panel, float y, float gap)
        {
            var count = Mathf.Min(3, _upgradeChoices.Length);
            var cardWidth = (panel.width - 28f - gap * (count - 1)) / count;
            for (var i = 0; i < count; i++)
            {
                var choice = _upgradeChoices[i];
                var label = string.IsNullOrEmpty(choice.Name) ? choice.Id : choice.Name;
                if (GUI.Button(new Rect(panel.x + 14f + (cardWidth + gap) * i, y, cardWidth, 42f), label, _buttonStyle))
                    ChooseUpgrade(i);
            }
        }

        public void RequestGacha(int tier)
        {
            GameEvents.RaiseRequestGacha(new GachaRequest(tier));
            _lastMessage = $"Gacha T{tier} requested.";
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

        static bool IsHudScreenPosition(Vector2 screenPosition, bool debugHudVisible)
        {
            var bottom = debugHudVisible ? BottomHudHeight + 24f : RuntimeBottomHudHitHeight;
            var top = debugHudVisible ? TopHudHeight + 24f : RuntimeTopHudHitHeight;
            return screenPosition.y <= bottom || screenPosition.y >= Screen.height - top;
        }

        void BindEvents()
        {
            if (_eventsBound) return;
            GameEvents.OnSummonOffered += HandleSummonOffered;
            GameEvents.OnSummonCancelled += HandleSummonCancelled;
            GameEvents.OnSummonConfirmed += HandleSummonConfirmed;
            GameEvents.OnRequestRejected += HandleRequestRejected;
            GameEvents.OnTowerPlacementFailed += HandleTowerPlacementFailed;
            GameEvents.OnTowersMerged += HandleTowersMerged;
            GameEvents.OnMergeFailed += HandleMergeFailed;
            GameEvents.OnUpgradeChoiceReady += HandleUpgradeChoiceReady;
            GameEvents.OnUpgradeApplied += HandleUpgradeApplied;
            GameEvents.OnBossHpUpdated += HandleBossHpUpdated;
            GameEvents.OnBossPhaseChanged += HandleBossPhaseChanged;
            GameEvents.OnBossDefeated += HandleBossDefeated;
            _eventsBound = true;
        }

        void UnbindEvents()
        {
            if (!_eventsBound) return;
            GameEvents.OnSummonOffered -= HandleSummonOffered;
            GameEvents.OnSummonCancelled -= HandleSummonCancelled;
            GameEvents.OnSummonConfirmed -= HandleSummonConfirmed;
            GameEvents.OnRequestRejected -= HandleRequestRejected;
            GameEvents.OnTowerPlacementFailed -= HandleTowerPlacementFailed;
            GameEvents.OnTowersMerged -= HandleTowersMerged;
            GameEvents.OnMergeFailed -= HandleMergeFailed;
            GameEvents.OnUpgradeChoiceReady -= HandleUpgradeChoiceReady;
            GameEvents.OnUpgradeApplied -= HandleUpgradeApplied;
            GameEvents.OnBossHpUpdated -= HandleBossHpUpdated;
            GameEvents.OnBossPhaseChanged -= HandleBossPhaseChanged;
            GameEvents.OnBossDefeated -= HandleBossDefeated;
            _eventsBound = false;
        }

        void HandleSummonOffered(string towerId)
        {
            BeginPlacement(towerId);
            _lastMessage = $"Draw: {ResolveTowerLabel(_controller?.FindTowerDef(towerId), towerId)}. Tap a green tile.";
        }

        void HandleSummonCancelled(string towerId)
        {
            _selectedTowerId = null;
            _mode = InteractionMode.None;
            _lastMessage = $"Cancelled {towerId}.";
            fieldRenderer?.HidePlacementMarkers();
        }

        void HandleSummonConfirmed(string towerId)
        {
            _selectedTowerId = null;
            _mode = InteractionMode.None;
            _lastMessage = $"Placed {towerId}.";
            fieldRenderer?.HidePlacementMarkers();
        }

        void HandleRequestRejected(string reason)
        {
            _lastMessage = $"Rejected: {reason}.";
        }

        void HandleTowerPlacementFailed(string towerId, int col, int row, string reason)
        {
            _lastMessage = $"Cannot place {towerId} at {col},{row}: {reason}.";
        }

        void HandleTowersMerged(int col, int row, string towerId, int tier)
        {
            _mode = InteractionMode.None;
            _mergeFrom = null;
            _lastMessage = $"Merged T{tier} {towerId} at {col},{row}.";
        }

        void HandleMergeFailed(int fromCol, int fromRow, int toCol, int toRow, string reason)
        {
            _mode = InteractionMode.None;
            _mergeFrom = null;
            _lastMessage = $"Merge failed {fromCol},{fromRow}->{toCol},{toRow}: {reason}.";
        }

        void HandleUpgradeChoiceReady(UpgradeChoice[] choices)
        {
            _upgradeChoices = choices;
            _lastMessage = "Pick an upgrade card.";
        }

        void HandleUpgradeApplied(string upgradeId, int stacks)
        {
            _upgradeChoices = null;
            _lastMessage = $"{upgradeId} stack {stacks}.";
        }

        void HandleBossHpUpdated(string unitId, string defId, int hp, int maxHp, int phase)
        {
            _bossLabel = string.IsNullOrEmpty(defId) ? unitId : defId;
            _bossHp = hp;
            _bossMaxHp = maxHp;
            _bossPhase = phase;
        }

        void HandleBossPhaseChanged(string unitId, int phase)
        {
            _bossLabel = string.IsNullOrEmpty(_bossLabel) ? unitId : _bossLabel;
            _bossPhase = phase;
            _lastMessage = $"Boss phase {phase}.";
        }

        void HandleBossDefeated(string unitId, int waveSlot)
        {
            _bossLabel = null;
            _bossHp = 0;
            _bossMaxHp = 0;
            _bossPhase = 0;
            _lastMessage = $"Boss defeated on wave {waveSlot}.";
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
