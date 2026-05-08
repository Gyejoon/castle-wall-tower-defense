using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.CoreLoop.UI
{
    static class RuntimeUiDocument
    {
        const string PanelSettingsResourcePath = "UI/GameHudPanelSettings";

        public static void EnsurePanelSettings(UIDocument document)
        {
            if (document == null || document.panelSettings != null)
                return;

            var settings = Resources.Load<PanelSettings>(PanelSettingsResourcePath);
            document.panelSettings = settings != null ? settings : ScriptableObject.CreateInstance<PanelSettings>();
        }
    }
}
