// DesignTokensSO.cs — Design tokens ScriptableObject (UI color palette, spacing, typography, etc.).
// Mirrors designTokens.json. Deeply nested JSON is flattened into typed structs.
// Field order: alphabetic per design-decisions Q2-2.

using System;
using UnityEngine;

namespace GLD.Data
{
    // ─── Elevation ─────────────────────────────────────────────────────────────

    [Serializable]
    public struct ElevationTokens
    {
        [Tooltip("CSS box-shadow string for elevation 0 (none).")]
        public string e0;
        public string e1;
        public string e2;
        public string e3;
        public string e4;
    }

    // ─── Font Family ───────────────────────────────────────────────────────────

    [Serializable]
    public struct FontFamilyTokens
    {
        public string display;
        public string pixel;
    }

    // ─── Motion ────────────────────────────────────────────────────────────────

    [Serializable]
    public struct MotionDuration
    {
        public int base_;  // 'base' is a C# keyword; mapped from JSON "base"
        public int cinematic;
        public int fast;
        public int slow;
    }

    [Serializable]
    public struct MotionEasing
    {
        public string decelerate;
        public string emphatic;
        public string standard;
        public string stepwise;
    }

    [Serializable]
    public struct MotionPreset
    {
        public string cinematic;
        public string interactive;
        public string overlay;
        public string punch;
        public string ui;
    }

    [Serializable]
    public struct MotionTokens
    {
        public MotionDuration duration;
        public MotionEasing   easing;
        public MotionPreset   preset;
    }

    // ─── Overlay Dim ───────────────────────────────────────────────────────────

    [Serializable]
    public struct OverlayDimTokens
    {
        public string cinematic;
        public string default_;  // mapped from JSON "default"
        public string heavy;
        public string soft;
    }

    // ─── Palette ───────────────────────────────────────────────────────────────

    [Serializable]
    public struct CorePaletteTokens
    {
        public string accent;
        public string armorPierce;
        public string bg;
        public string border;
        public string bossPhase1;
        public string danger;
        public string gold;
        public string gradeUnique;
        public string info;
        public string panel;
        public string success;
        public string text;
        public string textSecondary;
        public string tierBright;
    }

    [Serializable]
    public struct ElementColorPair
    {
        public string glow;
        public string primary;
    }

    [Serializable]
    public struct ElementPaletteTokens
    {
        public ElementColorPair earth;
        public ElementColorPair fire;
        public ElementColorPair lightning;
        public ElementColorPair neutral;
        public ElementColorPair water;
    }

    [Serializable]
    public struct StatePaletteTokens
    {
        public string disabledBg;
        public string disabledFg;
        public string focus;
        public string hover;
        public string pressed;
        public string warning;
    }

    [Serializable]
    public struct SurfaceAlphaTokens
    {
        public string accent20;
        public string bg76;
        public string bg80;
        public string bg95;
        public string danger20;
        public string overlay60;
        public string overlay70;
        public string overlayDark;
        public string overlayHeavy;
        public string panel70;
        public string panel85;
        public string panel90;
        public string panel92;
        public string panel95;
        public string panel96;
    }

    [Serializable]
    public struct SurfacePaletteTokens
    {
        public SurfaceAlphaTokens alpha;
        public string             bg;
        public string             panel;
        public string             panelElevated;
        public string             panelSunken;
    }

    [Serializable]
    public struct TierColorEntry
    {
        public string bright;
        public string dark;
        public string primary;
        public int    tier;
    }

    [Serializable]
    public struct PaletteTokens
    {
        public CorePaletteTokens    core;
        public ElementPaletteTokens element;
        public StatePaletteTokens   state;
        public SurfacePaletteTokens surface;
        public TierColorEntry[]     tier;
    }

    // ─── Radius ────────────────────────────────────────────────────────────────

    [Serializable]
    public struct RadiusTokens
    {
        public int lg;
        public int md;
        public int none;
        public int pill;
        public int sm;
        public int xl;
        public int xs;
    }

    // ─── Spacing ───────────────────────────────────────────────────────────────

    [Serializable]
    public struct SpacingTokens
    {
        public int lg;
        public int md;
        public int sm;
        public int xl;
        public int xs;
        public int xxl;
        public int xxxl;
    }

    // ─── Typography ────────────────────────────────────────────────────────────

    [Serializable]
    public struct TypographyEntry
    {
        public string family;
        public float  lineHeight;
        public string key;   // typography name, e.g. "body14", "h1"
        public string size;
        public int    weight;
    }

    // ─── Z-Index ───────────────────────────────────────────────────────────────

    [Serializable]
    public struct ZIndexTokens
    {
        public int board;
        public int floating;
        public int hud;
        public int modal;
        public int overlay;
        public int toast;
    }

    // ─── Root SO ───────────────────────────────────────────────────────────────

    /// <summary>
    /// All design tokens from designTokens.json, typed and grouped.
    /// Primarily consumed by Unity UI (runtime Canvas/Shader lookups) and
    /// the parity test harness for CSS-to-Unity color mapping.
    /// </summary>
    [CreateAssetMenu(menuName = "GLD/Config/DesignTokens", fileName = "DesignTokens")]
    public sealed class DesignTokensSO : ScriptableObject
    {
        public ElevationTokens  elevation;
        public FontFamilyTokens fontFamily;
        public MotionTokens     motion;
        public OverlayDimTokens overlayDim;
        public PaletteTokens    palette;
        public RadiusTokens     radius;
        public SpacingTokens    spacing;
        public TypographyEntry[] typography;
        public ZIndexTokens     zIndex;
    }
}
