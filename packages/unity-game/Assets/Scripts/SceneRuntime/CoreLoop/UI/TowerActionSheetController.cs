using GLD.Core;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class TowerActionSheetController : MonoBehaviour
    {
        VisualElement _root;
        Label _title;
        Label _position;
        Button _mergeButton;
        Button _moveButton;
        Button _sellButton;
        Button _closeButton;
        string _selectedInstanceId;
        bool _eventsBound;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public string SelectedInstanceId => _selectedInstanceId;

        public void Bind(UIDocument document)
        {
            if (document == null)
                return;

            RuntimeUiDocument.EnsurePanelSettings(document);

            Bind(document.rootVisualElement);
        }

        public void Bind(VisualElement root)
        {
            Unbind();
            if (root == null)
                return;

            if (root.Q<VisualElement>("tower-action-sheet") == null)
                root.Add(BuildFallbackSheet());

            ResolveElements(root);
            RegisterButtons();
            BindEvents();
            Hide();
            IsBound = true;
        }

        void OnDestroy()
        {
            Unbind();
        }

        void Unbind()
        {
            UnbindEvents();
            IsBound = false;
            _selectedInstanceId = null;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("tower-action-sheet");
            _title = root.Q<Label>("tower-action-title");
            _position = root.Q<Label>("tower-action-position");
            _mergeButton = root.Q<Button>("tower-action-merge");
            _moveButton = root.Q<Button>("tower-action-move");
            _sellButton = root.Q<Button>("tower-action-sell");
            _closeButton = root.Q<Button>("tower-action-close");

            _mergeButton?.SetEnabled(false);
            _moveButton?.SetEnabled(false);
        }

        void RegisterButtons()
        {
            _sellButton?.RegisterCallback<ClickEvent>(_ => RequestSell());
            _closeButton?.RegisterCallback<ClickEvent>(_ => RequestClose());
        }

        void BindEvents()
        {
            if (_eventsBound)
                return;

            GameEvents.OnTowerSelected += HandleTowerSelected;
            GameEvents.OnTowerDeselected += Hide;
            GameEvents.OnTowerSold += HandleTowerSold;
            GameEvents.OnTowerMoved += HandleTowerMoved;
            GameEvents.OnTowersMerged += HandleTowersMerged;
            _eventsBound = true;
        }

        void UnbindEvents()
        {
            if (!_eventsBound)
                return;

            GameEvents.OnTowerSelected -= HandleTowerSelected;
            GameEvents.OnTowerDeselected -= Hide;
            GameEvents.OnTowerSold -= HandleTowerSold;
            GameEvents.OnTowerMoved -= HandleTowerMoved;
            GameEvents.OnTowersMerged -= HandleTowersMerged;
            _eventsBound = false;
        }

        public void RequestSell()
        {
            if (string.IsNullOrEmpty(_selectedInstanceId))
                return;

            GameEvents.RaiseRequestSellTower(_selectedInstanceId);
            Hide();
        }

        public void RequestClose() => GameEvents.RaiseTowerDeselected();

        void HandleTowerSelected(string instanceId, int col, int row)
        {
            _selectedInstanceId = instanceId;

            if (_title != null)
                _title.text = string.IsNullOrEmpty(instanceId) ? "Tower" : instanceId;
            if (_position != null)
                _position.text = $"Cell {col},{row}";

            Show();
        }

        void Show()
        {
            if (_root != null)
                _root.style.display = DisplayStyle.Flex;
        }

        void Hide()
        {
            _selectedInstanceId = null;
            if (_root != null)
                _root.style.display = DisplayStyle.None;
        }

        void HandleTowerSold(string towerId) => Hide();

        void HandleTowerMoved(string towerId, int fromCol, int fromRow, int toCol, int toRow) => Hide();

        void HandleTowersMerged(int col, int row, string towerId, int toTier) => Hide();

        static VisualElement BuildFallbackSheet()
        {
            var sheet = new GLDSheet { name = "tower-action-sheet", Anchor = "bottom", Variant = "default" };
            sheet.AddToClassList("tower-action-sheet");

            var header = new VisualElement { name = "tower-action-header" };
            header.AddToClassList("tower-action-sheet__header");
            header.Add(new Label("Tower") { name = "tower-action-title" });
            header.Add(new Label("Cell 0,0") { name = "tower-action-position" });

            var actions = new VisualElement { name = "tower-action-actions" };
            actions.AddToClassList("tower-action-sheet__actions");
            actions.Add(new GLDButton("Merge") { name = "tower-action-merge", Variant = "secondary" });
            actions.Add(new GLDButton("Move") { name = "tower-action-move", Variant = "secondary" });
            actions.Add(new GLDButton("Sell") { name = "tower-action-sell", Variant = "danger" });
            actions.Add(new GLDButton("Close") { name = "tower-action-close", Variant = "ghost" });

            sheet.Add(header);
            sheet.Add(actions);
            return sheet;
        }
    }
}
