using UnityEngine.UIElements;

namespace GLD.UI.Primitives
{
    static class GLDPrimitiveStyles
    {
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
    }
}
