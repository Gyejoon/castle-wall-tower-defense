using GLD.Core;
using GLD.Data;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class SummonRevealController : MonoBehaviour
    {
        VisualElement _root;
        Label _title;
        Label _subtitle;
        Button _cancelButton;
        GameSceneController _sceneController;
        UIDocument _document;
        string _offeredTowerId;
        bool _eventsBound;
        GUIStyle _panelStyle;
        GUIStyle _titleStyle;
        GUIStyle _subtitleStyle;
        GUIStyle _buttonStyle;

        public bool IsBound { get; private set; }
        public bool IsVisible => _root != null && _root.style.display.value != DisplayStyle.None;
        public string OfferedTowerId => _offeredTowerId;

        public void Bind(GameSceneController sceneController, UIDocument document)
        {
            if (document == null)
                return;

            RuntimeUiDocument.EnsurePanelSettings(document);
            Bind(sceneController, document.rootVisualElement);
            _document = document;
        }

        public void Bind(GameSceneController sceneController, VisualElement root)
        {
            Unbind();
            _sceneController = sceneController;
            if (root == null)
                return;

            if (root.Q<VisualElement>("summon-reveal") == null)
                root.Add(BuildFallbackReveal());

            ResolveElements(root);
            RegisterButtons();
            BindEvents();
            Hide();
            IsBound = true;
        }

        void LateUpdate()
        {
            if (_document == null || !IsBound)
                return;

            var currentRoot = _document.rootVisualElement;
            if (currentRoot == null || IsAttachedTo(currentRoot, _root))
                return;

            EnsureRevealElement(currentRoot);
            ResolveElements(currentRoot);
            RegisterButtons();
            if (string.IsNullOrEmpty(_offeredTowerId))
                Hide();
            else
                HandleSummonOffered(_offeredTowerId);
        }

        void OnGUI()
        {
            if (!ShouldDrawGuiFallback())
                return;

            EnsureGuiStyles();
            var width = Mathf.Min(280f, Screen.width - 24f);
            var rect = new Rect(Screen.width - width - 12f, Mathf.Max(104f, Screen.safeArea.yMin + 92f), width, 70f);
            GUI.Box(rect, GUIContent.none, _panelStyle);

            var def = _sceneController != null ? _sceneController.FindTowerDef(_offeredTowerId) : null;
            GUI.Label(new Rect(rect.x + 12f, rect.y + 9f, rect.width - 92f, 22f), ResolveTowerLabel(def, _offeredTowerId), _titleStyle);
            GUI.Label(new Rect(rect.x + 12f, rect.y + 34f, rect.width - 92f, 20f), "Tap a green tile to place", _subtitleStyle);
            if (GUI.Button(new Rect(rect.xMax - 76f, rect.y + 20f, 62f, 30f), "Cancel", _buttonStyle))
                RequestCancel();
        }

        bool ShouldDrawGuiFallback()
        {
            if (string.IsNullOrEmpty(_offeredTowerId))
                return false;
            if (_root == null)
                return true;

            if (_document != null && !IsAttachedTo(_document.rootVisualElement, _root))
                return true;

            if (_root.style.display.value == DisplayStyle.None || _root.resolvedStyle.display == DisplayStyle.None)
                return true;

            var bounds = _root.worldBound;
            return bounds.width <= 1f || bounds.height <= 1f;
        }

        void OnDestroy()
        {
            Unbind();
        }

        void Unbind()
        {
            UnbindEvents();
            _sceneController = null;
            _document = null;
            _offeredTowerId = null;
            IsBound = false;
        }

        void ResolveElements(VisualElement root)
        {
            _root = root.Q<VisualElement>("summon-reveal");
            _title = root.Q<Label>("summon-reveal-title");
            _subtitle = root.Q<Label>("summon-reveal-subtitle");
            _cancelButton = root.Q<Button>("summon-reveal-cancel");
        }

        void RegisterButtons()
        {
            _cancelButton?.UnregisterCallback<ClickEvent>(HandleCancelClicked);
            _cancelButton?.RegisterCallback<ClickEvent>(HandleCancelClicked);
        }

        void BindEvents()
        {
            if (_eventsBound)
                return;

            GameEvents.OnSummonOffered += HandleSummonOffered;
            GameEvents.OnSummonCancelled += HandleSummonSettled;
            GameEvents.OnSummonConfirmed += HandleSummonSettled;
            _eventsBound = true;
        }

        void UnbindEvents()
        {
            if (!_eventsBound)
                return;

            GameEvents.OnSummonOffered -= HandleSummonOffered;
            GameEvents.OnSummonCancelled -= HandleSummonSettled;
            GameEvents.OnSummonConfirmed -= HandleSummonSettled;
            _eventsBound = false;
        }

        public void RequestCancel()
        {
            if (string.IsNullOrEmpty(_offeredTowerId))
                return;

            GameEvents.RaiseRequestCancelSummon();
        }

        void HandleSummonOffered(string towerId)
        {
            _offeredTowerId = towerId;
            var def = _sceneController != null ? _sceneController.FindTowerDef(towerId) : null;
            if (_title != null)
                _title.text = ResolveTowerLabel(def, towerId);
            if (_subtitle != null)
                _subtitle.text = "Tap a green tile to place";

            Show();
        }

        void HandleSummonSettled(string towerId) => Hide();

        void Show()
        {
            if (_root != null)
            {
                _root.style.display = DisplayStyle.Flex;
                _root.BringToFront();
            }
        }

        void Hide()
        {
            _offeredTowerId = null;
            if (_root != null)
                _root.style.display = DisplayStyle.None;
        }

        void HandleCancelClicked(ClickEvent evt) => RequestCancel();

        static void EnsureRevealElement(VisualElement root)
        {
            if (FindByName(root, "summon-reveal") == null)
                root.Add(BuildFallbackReveal());
        }

        static bool IsAttachedTo(VisualElement root, VisualElement element)
        {
            if (root == null || element == null)
                return false;

            var current = element;
            while (current != null)
            {
                if (current == root)
                    return true;
                current = current.parent;
            }
            return false;
        }

        static VisualElement FindByName(VisualElement root, string name)
        {
            if (root == null)
                return null;
            if (root.name == name)
                return root;
            for (var i = 0; i < root.childCount; i++)
            {
                var found = FindByName(root.ElementAt(i), name);
                if (found != null)
                    return found;
            }
            return null;
        }

        static string ResolveTowerLabel(TowerDefSO def, string fallback)
        {
            if (def == null)
                return string.IsNullOrEmpty(fallback) ? "Tower" : fallback;
            return def.tier > 0 ? $"T{def.tier} {def.family}" : def.id;
        }

        static VisualElement BuildFallbackReveal()
        {
            var reveal = new GLDPanel { name = "summon-reveal", Variant = "elevated", Padding = "md" };
            reveal.AddToClassList("summon-reveal");
            ApplyFallbackRevealStyles(reveal);

            var text = new VisualElement { name = "summon-reveal-text" };
            text.AddToClassList("summon-reveal__text");
            text.style.flexGrow = 1f;
            text.style.marginRight = 8f;

            var title = new Label("Tower") { name = "summon-reveal-title" };
            title.style.color = new Color(0.96f, 0.9f, 0.78f);
            title.style.unityFontStyleAndWeight = FontStyle.Bold;
            title.style.fontSize = 13f;

            var subtitle = new Label("Tap a green tile to place") { name = "summon-reveal-subtitle" };
            subtitle.style.color = new Color(0.78f, 0.72f, 0.62f);
            subtitle.style.fontSize = 10f;
            text.Add(title);
            text.Add(subtitle);

            reveal.Add(text);
            var cancel = new GLDButton("Cancel") { name = "summon-reveal-cancel", Variant = "ghost", Size = "sm" };
            cancel.style.minWidth = 62f;
            cancel.style.height = 30f;
            cancel.style.color = new Color(0.96f, 0.9f, 0.78f);
            reveal.Add(cancel);
            return reveal;
        }

        static void ApplyFallbackRevealStyles(VisualElement reveal)
        {
            reveal.style.position = Position.Absolute;
            reveal.style.right = 12f;
            reveal.style.top = 98f;
            reveal.style.width = 244f;
            reveal.style.minHeight = 58f;
            reveal.style.flexDirection = FlexDirection.Row;
            reveal.style.alignItems = Align.Center;
            reveal.style.justifyContent = Justify.SpaceBetween;
            reveal.style.paddingLeft = 12f;
            reveal.style.paddingRight = 10f;
            reveal.style.paddingTop = 8f;
            reveal.style.paddingBottom = 8f;
            reveal.style.borderTopWidth = 2f;
            reveal.style.borderRightWidth = 2f;
            reveal.style.borderBottomWidth = 2f;
            reveal.style.borderLeftWidth = 2f;
            reveal.style.borderTopLeftRadius = 8f;
            reveal.style.borderTopRightRadius = 8f;
            reveal.style.borderBottomLeftRadius = 8f;
            reveal.style.borderBottomRightRadius = 8f;
            reveal.style.borderTopColor = new Color(0.78f, 0.63f, 0.29f);
            reveal.style.borderRightColor = new Color(0.78f, 0.63f, 0.29f);
            reveal.style.borderBottomColor = new Color(0.78f, 0.63f, 0.29f);
            reveal.style.borderLeftColor = new Color(0.78f, 0.63f, 0.29f);
            reveal.style.backgroundColor = new Color(0.12f, 0.09f, 0.04f, 0.96f);
        }

        void EnsureGuiStyles()
        {
            if (_panelStyle != null)
                return;

            _panelStyle = new GUIStyle(GUI.skin.box)
            {
                normal =
                {
                    background = Texture2D.whiteTexture,
                    textColor = new Color(0.96f, 0.9f, 0.78f)
                },
                padding = new RectOffset(10, 10, 8, 8)
            };
            _panelStyle.normal.background = MakeTexture(new Color(0.12f, 0.09f, 0.04f, 0.96f));

            _titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontStyle = FontStyle.Bold,
                fontSize = 13,
                normal = { textColor = new Color(0.96f, 0.9f, 0.78f) }
            };
            _subtitleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 10,
                normal = { textColor = new Color(0.78f, 0.72f, 0.62f) }
            };
            _buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 10,
                normal = { textColor = new Color(0.96f, 0.9f, 0.78f) }
            };
        }

        static Texture2D MakeTexture(Color color)
        {
            var texture = new Texture2D(1, 1);
            texture.SetPixel(0, 0, color);
            texture.Apply();
            return texture;
        }
    }
}
