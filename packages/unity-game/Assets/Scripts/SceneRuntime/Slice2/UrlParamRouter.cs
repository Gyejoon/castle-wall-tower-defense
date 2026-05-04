using UnityEngine;
using UnityEngine.SceneManagement;

namespace GLD.SceneRuntime.Slice2
{
    public sealed class UrlParamRouter : MonoBehaviour
    {
        [SerializeField] string pocSceneName = "Slice2_PoC";
        [SerializeField] GameObject phase0Root;
        [SerializeField] string editorUrlOverride;

        void Awake()
        {
            var url = string.IsNullOrEmpty(editorUrlOverride) ? Application.absoluteURL : editorUrlOverride;
            if (!url.Contains("slice=poc")) return;

            if (phase0Root == null)
                phase0Root = GameObject.Find("Phase0Root");
            if (phase0Root != null)
                phase0Root.SetActive(false);

            if (!SceneManager.GetSceneByName(pocSceneName).isLoaded)
                SceneManager.LoadSceneAsync(pocSceneName, LoadSceneMode.Additive);
        }
    }
}
