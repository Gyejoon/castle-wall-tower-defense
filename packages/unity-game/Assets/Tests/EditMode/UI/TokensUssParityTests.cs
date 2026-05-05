// TokensUssParityTests.cs — EditMode tests: verify tokens.uss values match
// DesignTokensSO fields (SO is the source of truth; USS is the derived output).
//
// Phase 1 Task 8.
//
// Graceful degradation:
//   - SO not found     → Assert.Ignore (run GLD/Import Shared Data first)
//   - USS not found    → Assert.Ignore (run GLD/Generate tokens.uss first)
//   - Mismatch         → Assert.Fail with full diff

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEditor;

namespace GLD.Tests.EditMode
{
    [TestFixture]
    public class TokensUssParityTests
    {
        const string SOPath     = "Assets/Data/DesignTokens.asset";
        const string UssPath    = "Assets/UI/Styles/tokens.uss";

        // ── Prerequisite checks ───────────────────────────────────────────────

        [Test]
        public void DesignTokensSO_Exists()
        {
            var so = AssetDatabase.LoadAssetAtPath<GLD.Data.DesignTokensSO>(SOPath);
            if (so == null)
                Assert.Ignore(
                    $"DesignTokensSO not found at '{SOPath}'. " +
                    "Run GLD/Import Shared Data first.");
            Assert.IsNotNull(so);
        }

        [Test]
        public void TokensUss_Exists()
        {
            if (!File.Exists(UssPath))
                Assert.Ignore(
                    $"tokens.uss not found at '{UssPath}'. " +
                    "Run GLD/Generate tokens.uss first.");
            Assert.IsTrue(File.Exists(UssPath));
        }

        [Test]
        public void TokensUss_StartsWithRootBlock()
        {
            if (!File.Exists(UssPath))
                Assert.Ignore($"tokens.uss not found at '{UssPath}'.");

            string content = File.ReadAllText(UssPath);
            StringAssert.Contains(":root {", content,
                "tokens.uss must contain a :root { } block.");
        }

        // ── Core color parity ─────────────────────────────────────────────────

        [Test]
        public void CoreColors_MatchSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;  // already marked inconclusive

            var failures = new List<string>();
            var core = so.palette.core;

            AssertColorVar(vars, "color-accent",         core.accent,         failures);
            AssertColorVar(vars, "color-border",         core.border,         failures);
            AssertColorVar(vars, "color-panel",          core.panel,          failures);
            AssertColorVar(vars, "color-bg",             core.bg,             failures);
            AssertColorVar(vars, "color-text",           core.text,           failures);
            AssertColorVar(vars, "color-text-secondary", core.textSecondary,  failures);
            AssertColorVar(vars, "color-danger",         core.danger,         failures);
            AssertColorVar(vars, "color-success",        core.success,        failures);
            AssertColorVar(vars, "color-gold",           core.gold,           failures);
            AssertColorVar(vars, "color-info",           core.info,           failures);

            FailIfAny(failures, "core color");
        }

        // ── Spacing parity ────────────────────────────────────────────────────

        [Test]
        public void Spacing_MatchesSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            var spc = so.spacing;

            AssertPxVar(vars, "space-xs",  spc.xs,   failures);
            AssertPxVar(vars, "space-sm",  spc.sm,   failures);
            AssertPxVar(vars, "space-md",  spc.md,   failures);
            AssertPxVar(vars, "space-lg",  spc.lg,   failures);
            AssertPxVar(vars, "space-xl",  spc.xl,   failures);
            AssertPxVar(vars, "space-2xl", spc.xxl,  failures);
            AssertPxVar(vars, "space-3xl", spc.xxxl, failures);

            FailIfAny(failures, "spacing");
        }

        // ── Radius parity ─────────────────────────────────────────────────────

        [Test]
        public void Radius_MatchesSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            var rad = so.radius;

            AssertPxVar(vars, "radius-none", rad.none, failures);
            AssertPxVar(vars, "radius-xs",   rad.xs,   failures);
            AssertPxVar(vars, "radius-sm",   rad.sm,   failures);
            AssertPxVar(vars, "radius-md",   rad.md,   failures);
            AssertPxVar(vars, "radius-lg",   rad.lg,   failures);
            AssertPxVar(vars, "radius-xl",   rad.xl,   failures);
            AssertPxVar(vars, "radius-pill", rad.pill, failures);

            FailIfAny(failures, "radius");
        }

        // ── Z-index parity ────────────────────────────────────────────────────

        [Test]
        public void ZIndex_MatchesSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            var zi = so.zIndex;

            AssertIntVar(vars, "z-board",    zi.board,    failures);
            AssertIntVar(vars, "z-hud",      zi.hud,      failures);
            AssertIntVar(vars, "z-floating", zi.floating, failures);
            AssertIntVar(vars, "z-overlay",  zi.overlay,  failures);
            AssertIntVar(vars, "z-modal",    zi.modal,    failures);
            AssertIntVar(vars, "z-toast",    zi.toast,    failures);

            FailIfAny(failures, "z-index");
        }

        // ── Motion duration parity ────────────────────────────────────────────

        [Test]
        public void MotionDuration_MatchesSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            var dur = so.motion.duration;

            AssertMsVar(vars, "motion-duration-fast",      dur.fast,      failures);
            AssertMsVar(vars, "motion-duration-base",      dur.base_,     failures);
            AssertMsVar(vars, "motion-duration-slow",      dur.slow,      failures);
            AssertMsVar(vars, "motion-duration-cinematic", dur.cinematic, failures);

            FailIfAny(failures, "motion duration");
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        (GLD.Data.DesignTokensSO so, Dictionary<string, string> vars) LoadBoth()
        {
            var so = AssetDatabase.LoadAssetAtPath<GLD.Data.DesignTokensSO>(SOPath);
            if (so == null)
            {
                Assert.Ignore($"DesignTokensSO not found at '{SOPath}'. Run GLD/Import Shared Data.");
                return (null, null);
            }

            if (!File.Exists(UssPath))
            {
                Assert.Ignore($"tokens.uss not found at '{UssPath}'. Run GLD/Generate tokens.uss.");
                return (null, null);
            }

            var vars = ParseUssVars(File.ReadAllText(UssPath));
            return (so, vars);
        }

        static Dictionary<string, string> ParseUssVars(string uss)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            // Match:  --key: value;
            var regex = new Regex(@"--(?<key>[a-zA-Z0-9_-]+)\s*:\s*(?<val>[^;]+);");
            foreach (Match m in regex.Matches(uss))
                result[m.Groups["key"].Value.Trim()] = m.Groups["val"].Value.Trim();
            return result;
        }

        static void AssertColorVar(
            Dictionary<string, string> vars, string key, string soValue,
            List<string> failures)
        {
            if (string.IsNullOrEmpty(soValue)) return;  // SO field blank → skip
            if (!vars.TryGetValue(key, out var ussValue))
            {
                failures.Add($"  MISSING --{key} in USS (expected: '{soValue}')");
                return;
            }
            if (!string.Equals(ussValue, soValue, StringComparison.OrdinalIgnoreCase))
                failures.Add($"  MISMATCH --{key}: USS='{ussValue}' SO='{soValue}'");
        }

        static void AssertPxVar(
            Dictionary<string, string> vars, string key, int soValue,
            List<string> failures)
        {
            string expected = $"{soValue}px";
            if (!vars.TryGetValue(key, out var ussValue))
            {
                failures.Add($"  MISSING --{key} in USS (expected: '{expected}')");
                return;
            }
            if (!string.Equals(ussValue, expected, StringComparison.OrdinalIgnoreCase))
                failures.Add($"  MISMATCH --{key}: USS='{ussValue}' SO='{expected}'");
        }

        static void AssertMsVar(
            Dictionary<string, string> vars, string key, int soValue,
            List<string> failures)
        {
            string expected = $"{soValue}ms";
            if (!vars.TryGetValue(key, out var ussValue))
            {
                failures.Add($"  MISSING --{key} in USS (expected: '{expected}')");
                return;
            }
            if (!string.Equals(ussValue, expected, StringComparison.OrdinalIgnoreCase))
                failures.Add($"  MISMATCH --{key}: USS='{ussValue}' SO='{expected}'");
        }

        static void AssertIntVar(
            Dictionary<string, string> vars, string key, int soValue,
            List<string> failures)
        {
            string expected = soValue.ToString();
            if (!vars.TryGetValue(key, out var ussValue))
            {
                failures.Add($"  MISSING --{key} in USS (expected: '{expected}')");
                return;
            }
            if (!string.Equals(ussValue, expected, StringComparison.OrdinalIgnoreCase))
                failures.Add($"  MISMATCH --{key}: USS='{ussValue}' SO='{expected}'");
        }

        static void FailIfAny(List<string> failures, string category)
        {
            if (failures.Count > 0)
                Assert.Fail(
                    $"{failures.Count} {category} parity failures:\n" +
                    string.Join("\n", failures) + "\n\n" +
                    "Run GLD/Generate tokens.uss to regenerate.");
        }
    }
}
