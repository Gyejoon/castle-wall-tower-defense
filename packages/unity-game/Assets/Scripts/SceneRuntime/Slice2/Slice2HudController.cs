using GLD.Systems.Minimal;
using GLD.UI.Primitives;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.Slice2
{
    [RequireComponent(typeof(UIDocument))]
    public sealed class Slice2HudController : MonoBehaviour
    {
        Label _energyLabel;
        Label _waveLabel;
        Label _hpLabel;
        Button _placeButton;
        Slice2SceneController _controller;

        public void Bind(Slice2SceneController controller, UIDocument document)
        {
            _controller = controller;
            EnsureDocumentConfigured(document);
            var root = document.rootVisualElement;
            _energyLabel = root.Q<Label>("energy-label");
            _waveLabel = root.Q<Label>("wave-label");
            _hpLabel = root.Q<Label>("hp-label");
            _placeButton = root.Q<Button>("place-archer-button");

            _placeButton?.RegisterCallback<ClickEvent>(_ => _controller.Placement.BeginPlacement());
            MinimalGameEvents.OnEnergyChanged += SetEnergy;
            MinimalGameEvents.OnWaveStarted += SetWave;
            MinimalGameEvents.OnWaveCompleted += SetWaveComplete;
        }

        static void EnsureDocumentConfigured(UIDocument document)
        {
            if (document.panelSettings == null)
                document.panelSettings = ScriptableObject.CreateInstance<PanelSettings>();

            var root = document.rootVisualElement;
            if (root.Q<VisualElement>("slice2-hud") != null) return;

            var hud = new VisualElement { name = "slice2-hud" };
            hud.style.flexGrow = 1f;
            hud.style.justifyContent = Justify.SpaceBetween;
            hud.style.paddingLeft = 16;
            hud.style.paddingRight = 16;
            hud.style.paddingTop = 18;
            hud.style.paddingBottom = 24;

            var topRow = new VisualElement();
            topRow.style.flexDirection = FlexDirection.Row;
            topRow.style.justifyContent = Justify.SpaceBetween;

            topRow.Add(CreatePill("energy-label", "E 40/200", "accent"));
            topRow.Add(CreatePill("wave-label", "W 0/50", "default"));
            topRow.Add(CreatePill("hp-label", "HP 20", "danger"));

            var button = new GLDButton("궁수 배치 E10") { name = "place-archer-button", Variant = "primary", Size = "lg" };
            button.AddToClassList("place-button");

            hud.Add(topRow);
            hud.Add(button);
            root.Add(hud);
        }

        static Label CreatePill(string name, string text, string variant)
        {
            var label = new GLDBadge(text) { name = name, Variant = variant };
            label.AddToClassList("hud-pill");
            return label;
        }

        void OnDestroy()
        {
            MinimalGameEvents.OnEnergyChanged -= SetEnergy;
            MinimalGameEvents.OnWaveStarted -= SetWave;
            MinimalGameEvents.OnWaveCompleted -= SetWaveComplete;
        }

        public void SetEnergy(float current, float max)
        {
            if (_energyLabel != null)
                _energyLabel.text = $"E {Mathf.FloorToInt(current)}/{Mathf.FloorToInt(max)}";
        }

        public void SetWave(int wave)
        {
            if (_waveLabel != null)
                _waveLabel.text = $"W {wave}/50";
        }

        public void SetWaveComplete(int wave)
        {
            if (_waveLabel != null)
                _waveLabel.text = $"W {wave} clear";
        }

        public void SetBaseHp(int hp)
        {
            if (_hpLabel != null)
                _hpLabel.text = $"HP {hp}";
        }
    }
}
