using System;
using UnityEngine;

namespace GLD.Systems.DamageNumbers
{
    public sealed class DamageNumberSystem : IDisposable
    {
        const int DefaultPoolSize = 24;

        readonly DamageNumberInstance[] _pool;
        int _nextIndex;
        bool _disposed;

        public DamageNumberSystem(Transform parent, int poolSize = DefaultPoolSize)
        {
            if (parent == null)
                throw new ArgumentNullException(nameof(parent));

            _pool = new DamageNumberInstance[Mathf.Max(1, poolSize)];
            for (var i = 0; i < _pool.Length; i++)
                _pool[i] = new DamageNumberInstance(parent);
        }

        public void Show(Vector2 worldPosition, float value)
        {
            if (_disposed)
                return;
            if (value <= 0f)
                return;

            var instance = _pool[_nextIndex];
            _nextIndex = (_nextIndex + 1) % _pool.Length;
            instance.Show(worldPosition, value);
        }

        public void TickUnscaled(float unscaledDeltaSeconds)
        {
            if (_disposed)
                return;

            foreach (var instance in _pool)
                instance.Tick(unscaledDeltaSeconds);
        }

        public void Dispose()
        {
            if (_disposed)
                return;

            _disposed = true;
            foreach (var instance in _pool)
                instance.Destroy();
        }
    }
}
