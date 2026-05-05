using GLD.Core;
using GLD.Data;
using GLD.SceneRuntime;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class LobbyMetaScreenController : MonoBehaviour
    {
        VisualElement _root;
        VisualElement _homePanel;
        VisualElement _metaPanel;
        Button _homeTab;
        Button _metaTab;
        Button _startButton;
        Button _metaStartButton;
        VisualElement _collectionGrid;
        Label _metaAtkLabel;
        Label _metaPerksLabel;
        TowerSpriteCatalogSO _towerSprites;
        RunState _runState;
        bool _showingMeta;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public bool IsMetaVisible => _metaPanel != null && _metaPanel.style.display.value != DisplayStyle.None;

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
            _showingMeta = false;
            if (_towerSprites == null)
                _towerSprites = Resources.Load<TowerSpriteCatalogSO>("Visuals/TowerSpriteCatalog");
            if (root == null)
                return;

            if (root.Q<VisualElement>("lobby-meta-screen") == null)
                root.Add(BuildFallbackScreen());

            ResolveElements(root);
            RegisterButtons();
            PopulateCollection();
            PopulateMetaSummary();
            if (_runState != null)
            {
                _runState.OnChanged += HandleRunStateChanged;
                HandleRunStateChanged(_runState);
            }
            else
            {
                Hide();
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

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("lobby-meta-screen");
            _homePanel = root.Q<VisualElement>("lobby-home-panel");
            _metaPanel = root.Q<VisualElement>("lobby-meta-panel");
            _homeTab = root.Q<Button>("lobby-tab-home");
            _metaTab = root.Q<Button>("lobby-tab-meta");
            _startButton = root.Q<Button>("lobby-start");
            _metaStartButton = root.Q<Button>("lobby-meta-start");
            _collectionGrid = root.Q<VisualElement>("lobby-collection-grid");
            _metaAtkLabel = root.Q<Label>("lobby-meta-atk");
            _metaPerksLabel = root.Q<Label>("lobby-meta-perks");
        }

        void RegisterButtons()
        {
            _homeTab?.UnregisterCallback<ClickEvent>(HandleHomeClicked);
            _homeTab?.RegisterCallback<ClickEvent>(HandleHomeClicked);
            _metaTab?.UnregisterCallback<ClickEvent>(HandleMetaClicked);
            _metaTab?.RegisterCallback<ClickEvent>(HandleMetaClicked);
            _startButton?.UnregisterCallback<ClickEvent>(HandleStartClicked);
            _startButton?.RegisterCallback<ClickEvent>(HandleStartClicked);
            _metaStartButton?.UnregisterCallback<ClickEvent>(HandleStartClicked);
            _metaStartButton?.RegisterCallback<ClickEvent>(HandleStartClicked);
        }

        public void ShowHome()
        {
            _showingMeta = false;
            RefreshPanels();
        }

        public void ShowMeta()
        {
            _showingMeta = true;
            RefreshPanels();
        }

        public void RequestStartRun()
        {
            Hide();
            GameEvents.RaiseRequestStartRun();
        }

        void HandleRunStateChanged(RunState state)
        {
            if (state != null && state.RunStatus == RunStatus.Building && state.Wave == 0)
                Show();
            else
                Hide();
        }

        void HandleHomeClicked(ClickEvent evt) => ShowHome();

        void HandleMetaClicked(ClickEvent evt) => ShowMeta();

        void HandleStartClicked(ClickEvent evt) => RequestStartRun();

        void RefreshPanels()
        {
            if (_homePanel != null)
                _homePanel.style.display = _showingMeta ? DisplayStyle.None : DisplayStyle.Flex;
            if (_metaPanel != null)
                _metaPanel.style.display = _showingMeta ? DisplayStyle.Flex : DisplayStyle.None;
        }

        void PopulateCollection()
        {
            if (_collectionGrid == null || _collectionGrid.childCount > 0)
                return;

            AddTowerCard("archer", "궁수탑", "T1");
            AddTowerCard("nova_cannon", "투석기", "T1");
            AddTowerCard("emp", "눈보라탑", "T1");
            AddTowerCard("shield", "성기사제단", "T1");
            AddTowerCard("hybrid_ab", "비전포성", "T5");
            AddTowerCard("ultimate", "세계의 끝", "T6");
        }

        void AddTowerCard(string towerId, string label, string tier)
        {
            var card = new GLDCard { name = $"lobby-tower-card-{towerId}", Variant = "sunken" };
            card.AddToClassList("lobby-tower-card");

            var sprite = _towerSprites != null ? _towerSprites.FindStatic(towerId) : null;
            var image = new Image { name = $"lobby-tower-image-{towerId}", scaleMode = ScaleMode.ScaleToFit };
            image.AddToClassList("lobby-tower-image");
            if (sprite != null)
                image.image = sprite.texture;

            var nameLabel = new Label(label) { name = $"lobby-tower-name-{towerId}" };
            nameLabel.AddToClassList("lobby-tower-name");

            var tierLabel = new Label(tier) { name = $"lobby-tower-tier-{towerId}" };
            tierLabel.AddToClassList("lobby-tower-tier");

            card.Add(image);
            card.Add(nameLabel);
            card.Add(tierLabel);
            _collectionGrid.Add(card);
        }

        void PopulateMetaSummary()
        {
            if (_metaAtkLabel != null)
                _metaAtkLabel.text = "전역 공격력 +0%";
            if (_metaPerksLabel != null)
                _metaPerksLabel.text = "가문 퍽 0 / 4";
        }

        void Show()
        {
            RefreshPanels();
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

        static VisualElement BuildFallbackScreen()
        {
            var overlay = new GLDOverlay { name = "lobby-meta-screen", Dim = "default" };
            overlay.AddToClassList("lobby-meta-screen");

            var panel = new GLDPanel { name = "lobby-meta-shell", Variant = "elevated", Padding = "lg" };
            panel.AddToClassList("lobby-meta-shell");

            var tabs = new VisualElement { name = "lobby-tabs" };
            tabs.AddToClassList("lobby-tabs");
            tabs.Add(new GLDButton("전투") { name = "lobby-tab-home", Variant = "secondary" });
            tabs.Add(new GLDButton("강화") { name = "lobby-tab-meta", Variant = "secondary" });

            var home = new VisualElement { name = "lobby-home-panel" };
            home.AddToClassList("lobby-panel");
            home.Add(new Label("Grid Line Defense") { name = "lobby-title" });
            home.Add(new Label("랜덤 소환과 합성으로 50 웨이브를 버텨라") { name = "lobby-subtitle" });
            home.Add(new GLDButton("전투 시작") { name = "lobby-start", Variant = "primary" });

            var profile = new VisualElement { name = "lobby-profile-row" };
            profile.AddToClassList("lobby-profile-row");
            profile.Add(new Label("지휘관 Lv. 1") { name = "lobby-profile-level" });
            profile.Add(new Label("최고 W 0") { name = "lobby-profile-best-wave" });
            home.Add(profile);

            home.Add(new Label("타워 컬렉션") { name = "lobby-collection-title" });
            var collectionGrid = new VisualElement { name = "lobby-collection-grid" };
            collectionGrid.AddToClassList("lobby-collection-grid");
            home.Add(collectionGrid);

            var meta = new VisualElement { name = "lobby-meta-panel" };
            meta.AddToClassList("lobby-panel");
            meta.Add(new Label("전쟁 대장간") { name = "lobby-meta-title" });
            meta.Add(new Label("전역 공격력 +0%") { name = "lobby-meta-atk" });
            meta.Add(new Label("가문 퍽 0 / 4") { name = "lobby-meta-perks" });
            meta.Add(new Label("영구 강화 저장은 후속 단계에서 연결") { name = "lobby-meta-note" });
            meta.Add(new GLDButton("전투 시작") { name = "lobby-meta-start", Variant = "primary" });

            panel.Add(tabs);
            panel.Add(home);
            panel.Add(meta);
            overlay.Add(panel);
            return overlay;
        }
    }
}
