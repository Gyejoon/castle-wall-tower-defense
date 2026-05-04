using GLD.Systems.Minimal;
using UnityEngine;

namespace GLD.SceneRuntime.Slice2
{
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class TowerInstanceView : MonoBehaviour
    {
        [SerializeField] SpriteRenderer spriteRenderer;

        public string TowerId { get; private set; }
        public Vector2Int Cell { get; private set; }

        void Awake()
        {
            if (spriteRenderer == null)
                spriteRenderer = GetComponent<SpriteRenderer>();
        }

        public void Bind(MinimalTowerState tower, Sprite sprite)
        {
            TowerId = tower.TowerId;
            Cell = new Vector2Int(tower.Cell.Col, tower.Cell.Row);
            transform.position = new Vector3(tower.Position.x, tower.Position.y, -0.2f);
            spriteRenderer.sprite = sprite;
            spriteRenderer.color = new Color(0.78f, 0.63f, 0.29f, 1f);
            transform.localScale = new Vector3(0.72f, 0.72f, 1f);
        }
    }
}
