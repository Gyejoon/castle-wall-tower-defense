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
using System.Globalization;
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
            AssertColorVar(vars, "color-armor-pierce",   core.armorPierce,    failures);
            AssertColorVar(vars, "color-boss-phase1",    core.bossPhase1,     failures);
            AssertColorVar(vars, "color-grade-unique",   core.gradeUnique,    failures);
            AssertColorVar(vars, "color-tier-bright",    core.tierBright,     failures);

            FailIfAny(failures, "core color");
        }

        [Test]
        public void PaletteSubcategories_MatchSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            var state = so.palette.state;
            AssertColorVar(vars, "state-disabled-bg", state.disabledBg, failures);
            AssertColorVar(vars, "state-disabled-fg", state.disabledFg, failures);
            AssertColorVar(vars, "state-focus",       state.focus,      failures);
            AssertColorVar(vars, "state-hover",       state.hover,      failures);
            AssertColorVar(vars, "state-pressed",     state.pressed,    failures);
            AssertColorVar(vars, "state-warning",     state.warning,    failures);

            var surface = so.palette.surface;
            AssertColorVar(vars, "surface-bg",             surface.bg,            failures);
            AssertColorVar(vars, "surface-panel",          surface.panel,         failures);
            AssertColorVar(vars, "surface-panel-elevated", surface.panelElevated, failures);
            AssertColorVar(vars, "surface-panel-sunken",   surface.panelSunken,   failures);

            var alpha = surface.alpha;
            AssertColorVar(vars, "surface-alpha-accent20",      alpha.accent20,     failures);
            AssertColorVar(vars, "surface-alpha-bg76",          alpha.bg76,         failures);
            AssertColorVar(vars, "surface-alpha-bg80",          alpha.bg80,         failures);
            AssertColorVar(vars, "surface-alpha-bg95",          alpha.bg95,         failures);
            AssertColorVar(vars, "surface-alpha-danger20",      alpha.danger20,     failures);
            AssertColorVar(vars, "surface-alpha-overlay60",     alpha.overlay60,    failures);
            AssertColorVar(vars, "surface-alpha-overlay70",     alpha.overlay70,    failures);
            AssertColorVar(vars, "surface-alpha-overlay-dark",  alpha.overlayDark,  failures);
            AssertColorVar(vars, "surface-alpha-overlay-heavy", alpha.overlayHeavy, failures);
            AssertColorVar(vars, "surface-alpha-panel70",       alpha.panel70,      failures);
            AssertColorVar(vars, "surface-alpha-panel85",       alpha.panel85,      failures);
            AssertColorVar(vars, "surface-alpha-panel90",       alpha.panel90,      failures);
            AssertColorVar(vars, "surface-alpha-panel92",       alpha.panel92,      failures);
            AssertColorVar(vars, "surface-alpha-panel95",       alpha.panel95,      failures);
            AssertColorVar(vars, "surface-alpha-panel96",       alpha.panel96,      failures);

            var element = so.palette.element;
            AssertElement(vars, "earth",     element.earth,     failures);
            AssertElement(vars, "fire",      element.fire,      failures);
            AssertElement(vars, "lightning", element.lightning, failures);
            AssertElement(vars, "neutral",   element.neutral,   failures);
            AssertElement(vars, "water",     element.water,     failures);

            if (so.palette.tier != null)
            {
                foreach (var tier in so.palette.tier)
                {
                    AssertColorVar(vars, $"tier-{tier.tier}-primary", tier.primary, failures);
                    AssertColorVar(vars, $"tier-{tier.tier}-bright",  tier.bright,  failures);
                    AssertColorVar(vars, $"tier-{tier.tier}-dark",    tier.dark,    failures);
                }
            }

            FailIfAny(failures, "palette subcategory");
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

        [Test]
        public void MotionEasingAndPreset_MatchSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            var easing = so.motion.easing;
            AssertStrVar(vars, "motion-easing-standard",   easing.standard,   failures);
            AssertStrVar(vars, "motion-easing-emphatic",   easing.emphatic,   failures);
            AssertStrVar(vars, "motion-easing-decelerate", easing.decelerate, failures);
            AssertStrVar(vars, "motion-easing-stepwise",   easing.stepwise,   failures);

            var preset = so.motion.preset;
            AssertStrVar(vars, "motion-preset-interactive", preset.interactive, failures);
            AssertStrVar(vars, "motion-preset-ui",          preset.ui,          failures);
            AssertStrVar(vars, "motion-preset-overlay",     preset.overlay,     failures);
            AssertStrVar(vars, "motion-preset-punch",       preset.punch,       failures);
            AssertStrVar(vars, "motion-preset-cinematic",   preset.cinematic,   failures);

            FailIfAny(failures, "motion easing/preset");
        }

        [Test]
        public void ElevationOverlayDimAndFonts_MatchSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            var elevation = so.elevation;
            AssertStrVar(vars, "elevation-0", elevation.e0, failures);
            AssertStrVar(vars, "elevation-1", elevation.e1, failures);
            AssertStrVar(vars, "elevation-2", elevation.e2, failures);
            AssertStrVar(vars, "elevation-3", elevation.e3, failures);
            AssertStrVar(vars, "elevation-4", elevation.e4, failures);

            var overlay = so.overlayDim;
            AssertColorVar(vars, "overlay-dim-cinematic", overlay.cinematic, failures);
            AssertColorVar(vars, "overlay-dim-default",   overlay.default_,  failures);
            AssertColorVar(vars, "overlay-dim-heavy",     overlay.heavy,     failures);
            AssertColorVar(vars, "overlay-dim-soft",      overlay.soft,      failures);

            AssertStrVar(vars, "font-family-display", so.fontFamily.display, failures);
            AssertStrVar(vars, "font-family-pixel",   so.fontFamily.pixel,   failures);

            FailIfAny(failures, "elevation/overlay/font");
        }

        [Test]
        public void Typography_MatchesSO()
        {
            var (so, vars) = LoadBoth();
            if (so == null || vars == null) return;

            var failures = new List<string>();
            if (so.typography != null)
            {
                foreach (var entry in so.typography)
                {
                    if (string.IsNullOrEmpty(entry.key)) continue;

                    var key = ToCssKey(entry.key);
                    AssertStrVar(vars, $"type-{key}-family", entry.family, failures);
                    AssertStrVar(vars, $"type-{key}-size", entry.size, failures);
                    AssertFloatVar(vars, $"type-{key}-line-height", entry.lineHeight, failures);
                    AssertIntVar(vars, $"type-{key}-weight", entry.weight, failures);
                }
            }

            FailIfAny(failures, "typography");
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

        static void AssertElement(
            Dictionary<string, string> vars, string key, GLD.Data.ElementColorPair pair,
            List<string> failures)
        {
            AssertColorVar(vars, $"elem-{key}-primary", pair.primary, failures);
            AssertColorVar(vars, $"elem-{key}-glow",    pair.glow,    failures);
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

        static void AssertFloatVar(
            Dictionary<string, string> vars, string key, float soValue,
            List<string> failures)
        {
            string expected = soValue.ToString(CultureInfo.InvariantCulture);
            if (!vars.TryGetValue(key, out var ussValue))
            {
                failures.Add($"  MISSING --{key} in USS (expected: '{expected}')");
                return;
            }
            if (!string.Equals(ussValue, expected, StringComparison.OrdinalIgnoreCase))
                failures.Add($"  MISMATCH --{key}: USS='{ussValue}' SO='{expected}'");
        }

        static void AssertStrVar(
            Dictionary<string, string> vars, string key, string soValue,
            List<string> failures)
        {
            if (string.IsNullOrEmpty(soValue)) return;
            if (!vars.TryGetValue(key, out var ussValue))
            {
                failures.Add($"  MISSING --{key} in USS (expected: '{soValue}')");
                return;
            }
            if (!string.Equals(ussValue, soValue, StringComparison.OrdinalIgnoreCase))
                failures.Add($"  MISMATCH --{key}: USS='{ussValue}' SO='{soValue}'");
        }

        static string ToCssKey(string key)
        {
            var result = new System.Text.StringBuilder();
            for (var i = 0; i < key.Length; i++)
            {
                var c = key[i];
                if (char.IsUpper(c))
                {
                    if (i > 0)
                        result.Append('-');
                    result.Append(char.ToLowerInvariant(c));
                }
                else if (char.IsLetterOrDigit(c))
                    result.Append(char.ToLowerInvariant(c));
                else
                    result.Append('-');
            }
            return result.ToString();
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
