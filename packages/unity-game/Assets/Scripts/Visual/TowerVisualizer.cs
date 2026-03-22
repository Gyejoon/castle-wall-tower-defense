using UnityEngine;

namespace GLD.Visual
{
    public static class TowerVisualizer
    {
        public static Sprite CreateDiamond(int size = 8)
        {
            var tex = new Texture2D(size, size);
            tex.filterMode = FilterMode.Point;
            ClearTexture(tex);

            int half = size / 2;
            for (int y = 0; y < size; y++)
            {
                int width = y <= half ? y : size - 1 - y;
                for (int x = half - width; x <= half + width; x++)
                {
                    if (x >= 0 && x < size)
                        tex.SetPixel(x, y, Color.white);
                }
            }

            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        public static Sprite CreateCircle(int size = 8)
        {
            var tex = new Texture2D(size, size);
            tex.filterMode = FilterMode.Point;
            ClearTexture(tex);

            float center = size / 2f - 0.5f;
            float radius = size / 2f - 0.5f;

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dist = Mathf.Sqrt((x - center) * (x - center) + (y - center) * (y - center));
                    if (dist <= radius)
                        tex.SetPixel(x, y, Color.white);
                }
            }

            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        public static Sprite CreateHexagon(int size = 8)
        {
            var tex = new Texture2D(size, size);
            tex.filterMode = FilterMode.Point;
            ClearTexture(tex);

            int half = size / 2;
            for (int y = 0; y < size; y++)
            {
                int indent;
                if (y < size / 4) indent = half - y * 2;
                else if (y > size * 3 / 4) indent = half - (size - 1 - y) * 2;
                else indent = 0;

                indent = Mathf.Max(indent, 0);

                for (int x = indent; x < size - indent; x++)
                    tex.SetPixel(x, y, Color.white);
            }

            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static void ClearTexture(Texture2D tex)
        {
            var clear = new Color(0, 0, 0, 0);
            for (int x = 0; x < tex.width; x++)
                for (int y = 0; y < tex.height; y++)
                    tex.SetPixel(x, y, clear);
        }
    }
}
