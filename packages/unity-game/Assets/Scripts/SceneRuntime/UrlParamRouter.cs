// UrlParamRouter.cs — Phase 2 Task 6 URL-to-scene router.
//
// Authoritative spec: docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md
//   Task 6 Step 2: "?slice=poc → additively load Slice2_PoC and disable
//   Phase 0 label". Optional ?autostart=1 sets a public flag for future
//   Slice2SceneController consumption (no-op in Phase 2).
//
// Lifecycle: attached to a sibling GameObject in Root.unity. On Awake, parses
// the URL query string (WebGL via Application.absoluteURL; editor falls back to
// the inspector-override fields) and dispatches:
//   * `?slice=poc`       → SceneManager.LoadSceneAsync("Slice2_PoC", Additive)
//                          + disables `phase0Root` GameObject (the GLDPhase0Label
//                          marker; passed as a SerializeField to avoid runtime
//                          FindObjectOfType lookups).
//   * `?autostart=1`     → sets <see cref="AutostartRequested"/>; Slice2SceneController
//                          (or future controllers) read the flag if needed.
//
// Anti-patterns avoided (§1.5):
//   * No FindObjectOfType — phase0Root is wired in the inspector.
//   * No coroutine; SceneManager.LoadSceneAsync is fire-and-forget.
//   * No Time.deltaTime; the router runs once at Awake.
//
// Editor-mode override:
//   In Unity Editor (no real URL), the SerializeField overrides
//   <see cref="editorSlice"/> and <see cref="editorAutostart"/> simulate the
//   query parameters. Set them in the Root.unity inspector to test
//   `?slice=poc` or `?autostart=1` without a WebGL build.

using UnityEngine;
using UnityEngine.SceneManagement;

namespace GLD.SceneRuntime
{
    /// <summary>
    /// One-shot URL parameter router for the WebGL entry point. Reads
    /// <see cref="Application.absoluteURL"/> on Awake (WebGL) or the
    /// inspector-override fields (Editor / standalone), then dispatches scene
    /// loads + sibling state.
    /// </summary>
    public sealed class UrlParamRouter : MonoBehaviour
    {
        [Header("Scene wiring")]
        [Tooltip("GameObject hosting the Phase 0 label. Disabled when ?slice=poc is set " +
                 "so the additively loaded Slice2_PoC scene takes over the viewport.")]
        [SerializeField] GameObject phase0Root;

        [Tooltip("Scene name to load additively when ?slice=poc is requested. " +
                 "Must match a scene in Build Settings (Slice2_PoC).")]
        [SerializeField] string sliceSceneName = "Slice2_PoC";

        [Header("Editor / standalone overrides")]
        [Tooltip("Editor-only override for the `slice` URL param. Empty = no slice loaded. " +
                 "Set to 'poc' to simulate ?slice=poc in Play mode without a WebGL build.")]
        [SerializeField] string editorSlice = "";

        [Tooltip("Editor-only override for the `autostart` URL param. Sets " +
                 "AutostartRequested=true (consumed by Slice2SceneController in Phase 3).")]
        [SerializeField] bool editorAutostart;

        /// <summary>
        /// True when the URL contained <c>?autostart=1</c>. Currently a no-op
        /// in Phase 2 (Slice2SceneController starts wave 1 unconditionally
        /// in Awake); reserved for Phase 3 dev-mode auto-skip-prep.
        /// </summary>
        public bool AutostartRequested { get; private set; }

        /// <summary>
        /// True after <see cref="Awake"/> dispatched a slice load. Tests can
        /// read this to verify routing without observing scene state.
        /// </summary>
        public bool SliceDispatched { get; private set; }

        void Awake()
        {
            string slice;
            bool autostart;
            ResolveParams(out slice, out autostart);

            AutostartRequested = autostart;

            if (string.Equals(slice, "poc", System.StringComparison.OrdinalIgnoreCase))
            {
                if (phase0Root != null) phase0Root.SetActive(false);
                if (!string.IsNullOrEmpty(sliceSceneName))
                {
                    SceneManager.LoadSceneAsync(sliceSceneName, LoadSceneMode.Additive);
                    SliceDispatched = true;
                }
                else
                {
                    Debug.LogWarning(
                        "[UrlParamRouter] ?slice=poc handled but sliceSceneName is empty. " +
                        "Wire the Slice2_PoC scene name in the inspector.");
                }
            }
        }

        // ── Param resolution ──────────────────────────────────────────────

        /// <summary>
        /// Resolve `slice` and `autostart` from the runtime URL (WebGL) or
        /// fall back to the inspector overrides (Editor / standalone). The
        /// fallback path is taken whenever the URL doesn't include a query
        /// string — no need for a separate platform branch.
        /// </summary>
        void ResolveParams(out string slice, out bool autostart)
        {
            slice = "";
            autostart = false;

            string url = Application.absoluteURL;
            int queryIdx = string.IsNullOrEmpty(url) ? -1 : url.IndexOf('?');
            if (queryIdx < 0)
            {
                // Editor / standalone — no real URL. Use inspector overrides.
                slice = editorSlice ?? "";
                autostart = editorAutostart;
                return;
            }

            string query = url.Substring(queryIdx + 1);
            // Strip fragment if present.
            int hash = query.IndexOf('#');
            if (hash >= 0) query = query.Substring(0, hash);

            foreach (var pair in query.Split('&'))
            {
                if (string.IsNullOrEmpty(pair)) continue;
                int eq = pair.IndexOf('=');
                string key = eq >= 0 ? pair.Substring(0, eq) : pair;
                string val = eq >= 0 ? pair.Substring(eq + 1) : "";
                if (string.Equals(key, "slice", System.StringComparison.OrdinalIgnoreCase))
                    slice = val;
                else if (string.Equals(key, "autostart", System.StringComparison.OrdinalIgnoreCase))
                    autostart = val == "1" || string.Equals(val, "true", System.StringComparison.OrdinalIgnoreCase);
            }
        }
    }
}
