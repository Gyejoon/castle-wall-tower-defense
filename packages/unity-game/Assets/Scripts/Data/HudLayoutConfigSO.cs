using UnityEngine;

namespace GLD.Data
{
    [CreateAssetMenu(menuName = "GLD/UI/HudLayoutConfig", fileName = "HudLayoutConfig")]
    public sealed class HudLayoutConfigSO : ScriptableObject
    {
        [Header("Editor Drag Tuning")]
        public bool enableDragEditing = true;

        [Header("Top Left")]
        public float topLeftX = 10f;
        public float topY = 14f;
        public float energyPanelWidth = 108f;
        public float wavePanelWidth = 104f;
        public float statPanelHeight = 48f;
        public float statPanelGap = 8f;

        [Header("Top Right")]
        public float topRightX = 11f;
        public float topRightY = 14f;
        public float topRightButtonSize = 54f;
        public float topRightButtonGap = 9f;
    }
}
