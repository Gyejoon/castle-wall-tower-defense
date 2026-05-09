using UnityEngine;

namespace GLD.Systems.DamageNumbers
{
    public sealed class DamageNumberInstance
    {
        const float LifetimeSeconds = 0.8f;

        readonly Transform _parent;
        readonly Color _baseColor;
        GameObject _view;
        TextMesh _text;
        MeshRenderer _renderer;
        float _ageSeconds;

        public bool Active => _view != null && _view.activeSelf;

        public DamageNumberInstance(Transform parent)
        {
            _parent = parent;
            _baseColor = new Color(1f, 0.92f, 0.24f, 1f);
            CreateView();
        }

        void CreateView()
        {
            _view = new GameObject("DamageNumber");
            _view.transform.SetParent(_parent, false);
            _text = _view.AddComponent<TextMesh>();
            _text.anchor = TextAnchor.MiddleCenter;
            _text.alignment = TextAlignment.Center;
            _text.fontSize = 42;
            _text.characterSize = 0.07f;
            _renderer = _view.GetComponent<MeshRenderer>();
            _renderer.sortingLayerName = "Default";
            _renderer.sortingOrder = 80;
            _text.color = _baseColor;
            _view.SetActive(false);
        }

        public void Show(Vector2 worldPosition, float value)
        {
            if (_view == null)
                CreateView();

            _ageSeconds = 0f;
            _text.text = Mathf.CeilToInt(value).ToString();
            _text.color = _baseColor;
            _view.transform.position = new Vector3(worldPosition.x, worldPosition.y + 0.48f, -0.65f);
            _view.transform.localScale = Vector3.one;
            _view.SetActive(true);
        }

        public void Tick(float unscaledDeltaSeconds)
        {
            if (!Active)
                return;

            _ageSeconds += Mathf.Max(0f, unscaledDeltaSeconds);
            var t = Mathf.Clamp01(_ageSeconds / LifetimeSeconds);
            _view.transform.position += new Vector3(0f, 0.9f * unscaledDeltaSeconds, 0f);
            var scale = Mathf.Lerp(1.15f, 0.9f, t);
            _view.transform.localScale = new Vector3(scale, scale, 1f);
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
