using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    static class GLDPrimitiveStyles
    {
        static readonly Color Accent = new Color(0.78f, 0.63f, 0.29f, 1f);
        static readonly Color Bg = new Color(0.10f, 0.07f, 0.03f, 1f);
        static readonly Color Border = new Color(0.29f, 0.23f, 0.13f, 1f);
        static readonly Color Danger = new Color(0.75f, 0.19f, 0.13f, 1f);
        static readonly Color Info = new Color(0.36f, 0.78f, 0.91f, 1f);
        static readonly Color Panel = new Color(0.16f, 0.12f, 0.06f, 0.94f);
        static readonly Color PanelElevated = new Color(0.21f, 0.16f, 0.09f, 0.96f);
        static readonly Color PanelSunken = new Color(0.12f, 0.09f, 0.03f, 0.96f);
        static readonly Color Text = new Color(0.94f, 0.91f, 0.85f, 1f);
        static readonly Color TextSecondary = new Color(0.63f, 0.56f, 0.44f, 1f);
        static readonly Color OverlayDefault = new Color(0f, 0f, 0f, 0.60f);
        static readonly Color OverlaySoft = new Color(0f, 0f, 0f, 0.35f);
        static readonly Color OverlayHeavy = new Color(0.04f, 0.03f, 0.02f, 0.82f);

        public static void ApplyBlock(VisualElement element, string block)
        {
            if (element == null || string.IsNullOrEmpty(block))
                return;

            element.AddToClassList(block);
        }

        public static void ResetModifiers(VisualElement element, string block)
        {
            if (element == null || string.IsNullOrEmpty(block))
                return;

            var prefix = $"{block}--";
            var toRemove = new System.Collections.Generic.List<string>();
            foreach (var className in element.GetClasses())
            {
                if (className.StartsWith(prefix, System.StringComparison.Ordinal))
                    toRemove.Add(className);
            }

            foreach (var className in toRemove)
                element.RemoveFromClassList(className);
        }

        public static void ApplyModifier(VisualElement element, string block, string modifier)
        {
            if (element == null || string.IsNullOrEmpty(block) || string.IsNullOrEmpty(modifier))
                return;

            element.AddToClassList($"{block}--{modifier}");
        }

        public static void ApplyBoolModifier(VisualElement element, string block, string modifier, bool enabled)
        {
            if (enabled)
                ApplyModifier(element, block, modifier);
        }

        public static void ApplyTier(VisualElement element, string block, int tier)
        {
            if (tier > 0)
                ApplyModifier(element, block, $"tier-{tier}");
        }

        public static void ApplyElement(VisualElement element, string block, string elementKey)
        {
            if (!string.IsNullOrEmpty(elementKey))
                ApplyModifier(element, block, $"element-{elementKey}");
        }

        public static void ApplyButtonVisual(Button button, string variant, string size)
        {
            if (button == null)
                return;

            button.style.minHeight = size == "lg" ? 48 : size == "sm" ? 30 : 38;
            button.style.paddingLeft = size == "lg" ? 16 : size == "sm" ? 8 : 12;
            button.style.paddingRight = button.style.paddingLeft;
            button.style.paddingTop = size == "lg" ? 10 : size == "sm" ? 5 : 8;
            button.style.paddingBottom = button.style.paddingTop;
            SetBorder(button, Border, 2, 4, 4);
            button.style.unityFontStyleAndWeight = FontStyle.Bold;
            button.style.unityTextAlign = TextAnchor.MiddleCenter;
            button.style.fontSize = size == "sm" ? 10 : size == "lg" ? 14 : 12;

            switch (variant)
            {
                case "danger":
                    button.style.backgroundColor = Danger;
                    button.style.color = Text;
                    break;
                case "ghost":
                    button.style.backgroundColor = new Color(0.10f, 0.07f, 0.03f, 0.76f);
                    button.style.color = TextSecondary;
                    break;
                case "secondary":
                    button.style.backgroundColor = PanelElevated;
                    button.style.color = Text;
                    break;
                default:
                    button.style.backgroundColor = Accent;
                    button.style.color = Bg;
                    break;
            }
        }

        public static void ApplyBadgeVisual(Label badge, string variant)
        {
            if (badge == null)
                return;

            badge.style.minHeight = 30;
            badge.style.paddingLeft = 10;
            badge.style.paddingRight = 10;
            badge.style.paddingTop = 5;
            badge.style.paddingBottom = 5;
            SetBorder(badge, Border, 2, 3, 4);
            badge.style.unityFontStyleAndWeight = FontStyle.Bold;
            badge.style.unityTextAlign = TextAnchor.MiddleCenter;
            badge.style.fontSize = 12;

            switch (variant)
            {
                case "accent":
                    badge.style.backgroundColor = Accent;
                    badge.style.color = Bg;
                    break;
                case "danger":
                    badge.style.backgroundColor = Danger;
                    badge.style.color = Text;
                    break;
                default:
                    badge.style.backgroundColor = Panel;
                    badge.style.color = Text;
                    break;
            }
        }

        public static void ApplyPanelVisual(VisualElement panel, string variant, string padding)
        {
            if (panel == null)
                return;

            SetBorder(panel, Border, 2, variant == "elevated" ? 5 : 4, 6);
            panel.style.backgroundColor = variant == "sunken" ? PanelSunken : variant == "elevated" ? PanelElevated : Panel;
            panel.style.color = Text;
            var pad = padding == "lg" ? 16 : padding == "sm" ? 8 : 12;
            panel.style.paddingLeft = pad;
            panel.style.paddingRight = pad;
            panel.style.paddingTop = pad;
            panel.style.paddingBottom = pad;
        }

        public static void ApplyCardVisual(VisualElement card, string variant)
        {
            if (card == null)
                return;

            SetBorder(card, Border, 2, variant == "elevated" ? 5 : 4, 6);
            card.style.backgroundColor = variant == "sunken" ? PanelSunken : variant == "elevated" ? PanelElevated : Panel;
            card.style.color = Text;
            card.style.paddingLeft = 12;
            card.style.paddingRight = 12;
            card.style.paddingTop = 12;
            card.style.paddingBottom = 12;
        }

        public static void ApplySheetVisual(VisualElement sheet)
        {
            if (sheet == null)
                return;

            SetBorder(sheet, Border, 2, 5, 8);
            sheet.style.backgroundColor = new Color(0.16f, 0.12f, 0.06f, 0.96f);
            sheet.style.color = Text;
            sheet.style.paddingLeft = 12;
            sheet.style.paddingRight = 12;
            sheet.style.paddingTop = 12;
            sheet.style.paddingBottom = 12;
        }

        public static void ApplyOverlayVisual(VisualElement overlay, string dim, bool visible)
        {
            if (overlay == null)
                return;

            overlay.style.position = Position.Absolute;
            overlay.style.left = 0;
            overlay.style.right = 0;
            overlay.style.top = 0;
            overlay.style.bottom = 0;
            overlay.style.alignItems = Align.Center;
            overlay.style.justifyContent = Justify.Center;
            overlay.style.display = visible ? DisplayStyle.Flex : DisplayStyle.None;
            overlay.style.backgroundColor = dim == "soft" ? OverlaySoft : dim == "heavy" || dim == "cinematic" ? OverlayHeavy : OverlayDefault;
            overlay.style.color = Text;
        }

        static void SetBorder(VisualElement element, Color color, float width, float bottomWidth, float radius)
        {
            element.style.borderTopWidth = width;
            element.style.borderRightWidth = width;
            element.style.borderBottomWidth = bottomWidth;
            element.style.borderLeftWidth = width;
            element.style.borderTopColor = color;
            element.style.borderRightColor = color;
            element.style.borderBottomColor = color;
            element.style.borderLeftColor = color;
            element.style.borderTopLeftRadius = radius;
            element.style.borderTopRightRadius = radius;
            element.style.borderBottomLeftRadius = radius;
            element.style.borderBottomRightRadius = radius;
        }
    }
}
