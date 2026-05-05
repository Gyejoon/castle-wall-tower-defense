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
            if (url.Contains("phase0=1"))
            {
                SetCoreLoopActive(false);
                return;
            }

            if (url.Contains("slice=poc"))
            {
                HidePhase0Root();
                SetCoreLoopActive(false);

                if (!SceneManager.GetSceneByName(pocSceneName).isLoaded)
                    SceneManager.LoadSceneAsync(pocSceneName, LoadSceneMode.Additive);
                return;
            }

            HidePhase0Root();
            var controller = SetCoreLoopActive(true);
            if (url.Contains("autostart=1"))
                controller?.StartRun();
        }

        void HidePhase0Root()
        {
            if (phase0Root == null)
                phase0Root = GameObject.Find("Phase0Root");
            if (phase0Root != null)
                phase0Root.SetActive(false);
        }

        GameSceneController SetCoreLoopActive(bool active)
        {
            if (coreLoopRoot == null)
                coreLoopRoot = GameObject.Find("CoreLoopRoot");
            if (coreLoopRoot == null)
                return null;

            coreLoopRoot.SetActive(active);
            return active ? coreLoopRoot.GetComponent<GameSceneController>() : null;
        }
    }
}
