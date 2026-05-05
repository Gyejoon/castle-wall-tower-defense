using UnityEngine;
using UnityEngine.SceneManagement;
using GLD.SceneRuntime.CoreLoop;

namespace GLD.SceneRuntime.Slice2
{
    public sealed class UrlParamRouter : MonoBehaviour
    {
        [SerializeField] string pocSceneName = "Slice2_PoC";
        [SerializeField] GameObject phase0Root;
        [SerializeField] GameObject coreLoopRoot;
        [SerializeField] string editorUrlOverride;

        void Awake()
        {
            var url = string.IsNullOrEmpty(editorUrlOverride) ? Application.absoluteURL : editorUrlOverride;
            if (url.Contains("autostart=1"))
            {
                HidePhase0Root();
                if (coreLoopRoot == null)
                    coreLoopRoot = GameObject.Find("CoreLoopRoot");
                if (coreLoopRoot != null)
                {
                    coreLoopRoot.SetActive(true);
                    var controller = coreLoopRoot.GetComponent<GameSceneController>();
                    controller?.StartRun();
                }
                return;
            }

            if (!url.Contains("slice=poc")) return;

            HidePhase0Root();

            if (!SceneManager.GetSceneByName(pocSceneName).isLoaded)
                SceneManager.LoadSceneAsync(pocSceneName, LoadSceneMode.Additive);
        }

        void HidePhase0Root()
        {
            if (phase0Root == null)
                phase0Root = GameObject.Find("Phase0Root");
            if (phase0Root != null)
                phase0Root.SetActive(false);
        }
    }
}
