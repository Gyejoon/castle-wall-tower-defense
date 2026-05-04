using GLD.Systems.Minimal;
using UnityEngine;

namespace GLD.SceneRuntime.Slice2
{
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class UnitInstanceView : MonoBehaviour
    {
        [SerializeField] SpriteRenderer spriteRenderer;

        public string InstanceId { get; private set; }

        void Awake()
        {
            if (spriteRenderer == null)
                spriteRenderer = GetComponent<SpriteRenderer>();
        }

        public void Bind(MinimalUnitState unit, Sprite sprite)
        {
            InstanceId = unit.InstanceId;
            spriteRenderer.sprite = sprite;
            spriteRenderer.color = new Color(0.86f, 0.27f, 0.2f, 1f);
            transform.localScale = new Vector3(0.48f, 0.48f, 1f);
            Sync(unit);
        }

        public void Sync(MinimalUnitState unit)
        {
            transform.position = new Vector3(unit.Position.x, unit.Position.y, -0.1f);
            gameObject.SetActive(unit.IsAlive && !unit.Escaped);
        }
    }
}
