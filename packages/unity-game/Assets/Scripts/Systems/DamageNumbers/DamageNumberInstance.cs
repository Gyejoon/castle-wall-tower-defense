using UnityEngine;

namespace GLD.Systems.DamageNumbers
{
    public sealed class DamageNumberInstance
    {
        const float LifetimeSeconds = 0.8f;

        readonly GameObject _view;
        readonly TextMesh _text;
        readonly MeshRenderer _renderer;
        readonly Color _baseColor;
        float _ageSeconds;

        public bool Active => _view != null && _view.activeSelf;

        public DamageNumberInstance(Transform parent)
        {
            _view = new GameObject("DamageNumber");
            _view.transform.SetParent(parent, false);
            _text = _view.AddComponent<TextMesh>();
            _text.anchor = TextAnchor.MiddleCenter;
            _text.alignment = TextAlignment.Center;
            _text.fontSize = 28;
            _text.characterSize = 0.08f;
            _renderer = _view.GetComponent<MeshRenderer>();
            _renderer.sortingOrder = 80;
            _baseColor = new Color(1f, 0.86f, 0.42f, 1f);
            _text.color = _baseColor;
            _view.SetActive(false);
        }

        public void Show(Vector2 worldPosition, float value)
        {
            if (_view == null)
                return;

            _ageSeconds = 0f;
            _text.text = Mathf.CeilToInt(value).ToString();
            _text.color = _baseColor;
            _view.transform.position = new Vector3(worldPosition.x, worldPosition.y + 0.35f, -0.5f);
            _view.SetActive(true);
        }

        public void Tick(float unscaledDeltaSeconds)
        {
            if (!Active)
                return;

            _ageSeconds += Mathf.Max(0f, unscaledDeltaSeconds);
            var t = Mathf.Clamp01(_ageSeconds / LifetimeSeconds);
            _view.transform.position += new Vector3(0f, 0.8f * unscaledDeltaSeconds, 0f);
            _text.color = new Color(_baseColor.r, _baseColor.g, _baseColor.b, 1f - t);

            if (_ageSeconds >= LifetimeSeconds)
                _view.SetActive(false);
        }

        public void Destroy()
        {
            if (_view == null)
                return;
#if UNITY_EDITOR
            if (!Application.isPlaying)
            {
                Object.DestroyImmediate(_view);
                return;
            }
#endif
            Object.Destroy(_view);
        }
    }
}
