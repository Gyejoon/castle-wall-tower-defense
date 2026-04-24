using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace GLD.BuildScripts.Editor
{
    /// <summary>
    /// WebGL build driver. Invoked from CLI:
    ///   Unity -batchmode -nographics -projectPath . \
    ///     -executeMethod GLD.BuildScripts.Editor.WebGLBuilder.Build -logFile -
    /// Output: packages/unity-game/Build/WebGL/ (consumed by scripts/merge-build.ts).
    /// </summary>
    public static class WebGLBuilder
    {
        const string DefaultOutputDir = "Build/WebGL";
        const string TemplateName = "PROJECT:GLDMobilePortrait";

        [MenuItem("GLD/Build/WebGL")]
        public static void BuildFromMenu() => Build();

        public static void Build()
        {
            string outputDir = Environment.GetEnvironmentVariable("GLD_WEBGL_OUTPUT_DIR") ?? DefaultOutputDir;
            string absOutput = Path.GetFullPath(outputDir);
            Directory.CreateDirectory(absOutput);

            var scenes = new List<string>();
            foreach (var s in EditorBuildSettings.scenes)
            {
                if (s.enabled && !string.IsNullOrEmpty(s.path))
                    scenes.Add(s.path);
            }

            if (scenes.Count == 0)
            {
                // Phase 0a: no scenes authored yet. Allow build to proceed with an empty
                // scene list so CI can at least smoke-test the toolchain. Phase 0b adds
                // Boot.unity + Root.unity.
                Debug.LogWarning("[WebGLBuilder] No scenes in EditorBuildSettings. Building with empty scene list (Phase 0a expected state).");
            }

            PlayerSettings.WebGL.template = TemplateName;
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
            PlayerSettings.WebGL.decompressionFallback = false;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.memorySize = 256;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL, ScriptingImplementation.IL2CPP);

            var options = new BuildPlayerOptions
            {
                scenes = scenes.ToArray(),
                locationPathName = absOutput,
                target = BuildTarget.WebGL,
                targetGroup = BuildTargetGroup.WebGL,
                options = BuildOptions.None
            };

            Debug.Log($"[WebGLBuilder] Building to {absOutput} ({scenes.Count} scenes, template={TemplateName})");
            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            if (summary.result == BuildResult.Succeeded)
            {
                Debug.Log($"[WebGLBuilder] Build succeeded: {summary.totalSize} bytes in {summary.totalTime}");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"[WebGLBuilder] Build failed: result={summary.result}, errors={summary.totalErrors}");
                EditorApplication.Exit(1);
            }
        }
    }
}
