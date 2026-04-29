using UnityEditor;
using UnityEngine;

namespace GLD.Data.Editor
{
    /// <summary>
    /// Enforces pixel-art import settings on every PNG under Assets/Art/Sprites/**.
    /// Per design-decisions doc Q3-4: PPU 64, Point filter, mipmaps off, sRGB on,
    /// isReadable off, Clamp wrap, alphaIsTransparency on, compressionQuality 100.
    /// Phase 1 compression: DXT5 on WebGL. iPhone/Android ASTC override is defined
    /// but disabled (overridden = false) until Phase 2 PoC validates on actual hardware.
    /// </summary>
    public sealed class SpriteImportPostprocessor : AssetPostprocessor
    {
        const string SpriteRoot = "Assets/Art/Sprites/";
        const float  PixelsPerUnit = 64f;

        void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(SpriteRoot, System.StringComparison.Ordinal)) return;
            if (!assetPath.EndsWith(".png", System.StringComparison.OrdinalIgnoreCase)) return;

            var ti = (TextureImporter)assetImporter;

            ti.textureType          = TextureImporterType.Sprite;
            ti.spriteImportMode     = SpriteImportMode.Single;
            ti.spritePixelsPerUnit  = PixelsPerUnit;
            ti.filterMode           = FilterMode.Point;
            ti.mipmapEnabled        = false;
            ti.sRGBTexture          = true;
            ti.isReadable           = false;
            ti.wrapMode             = TextureWrapMode.Clamp;
            ti.alphaIsTransparency  = true;
            ti.compressionQuality   = 100;

            ApplyWebGLOverride(ti);
            ApplyMobileOverrideDisabled(ti, "iPhone");
            ApplyMobileOverrideDisabled(ti, "Android");
        }

        static void ApplyWebGLOverride(TextureImporter ti)
        {
            ti.SetPlatformTextureSettings(new TextureImporterPlatformSettings
            {
                name                 = "WebGL",
                overridden           = true,
                maxTextureSize       = 4096,
                format               = TextureImporterFormat.DXT5,
                compressionQuality   = 100,
                allowsAlphaSplitting = false,
            });
        }

        // Phase 1: Write but disabled. Phase 2 will flip overridden=true.
        static void ApplyMobileOverrideDisabled(TextureImporter ti, string platform)
        {
            ti.SetPlatformTextureSettings(new TextureImporterPlatformSettings
            {
                name                 = platform,
                overridden           = false,  // TODO(Phase 2): flip to true after iPhone 8 실기 검증
                maxTextureSize       = 2048,
                format               = TextureImporterFormat.ASTC_6x6,
                compressionQuality   = 100,
                allowsAlphaSplitting = false,
            });
        }
    }
}
