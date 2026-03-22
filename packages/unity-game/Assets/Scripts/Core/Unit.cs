using UnityEngine;
using System.Collections.Generic;

namespace GLD.Core
{
    public class Unit : MonoBehaviour
    {
        public float MaxHp { get; private set; }
        public float CurrentHp { get; private set; }
        public float Speed { get; private set; }
        public float Armor { get; private set; }

        private List<Vector2Int> _path;
        private int _pathIndex;
        private GridManager _gridManager;

        public event System.Action<Unit> OnReachedExit;
        public event System.Action<Unit> OnDied;

        public void Initialize(float hp, float speed, float armor, List<Vector2Int> path, GridManager gridManager)
        {
            MaxHp = hp;
            CurrentHp = hp;
            Speed = speed;
            Armor = armor;
            _path = path;
            _pathIndex = 0;
            _gridManager = gridManager;

            if (_path != null && _path.Count > 0)
            {
                transform.position = _gridManager.GridToWorld(_path[0].x, _path[0].y);
            }
        }

        private void Update()
        {
            if (_path == null || _pathIndex >= _path.Count) return;

            Vector3 target = _gridManager.GridToWorld(_path[_pathIndex].x, _path[_pathIndex].y);
            transform.position = Vector3.MoveTowards(transform.position, target, Speed * Time.deltaTime);

            if (Vector3.Distance(transform.position, target) < 0.05f)
            {
                _pathIndex++;

                if (_pathIndex >= _path.Count)
                {
                    OnReachedExit?.Invoke(this);
                    Destroy(gameObject);
                }
            }
        }

        public void TakeDamage(float damage)
        {
            float effectiveDamage = Mathf.Max(damage - Armor, 1f);
            CurrentHp -= effectiveDamage;

            if (CurrentHp <= 0)
            {
                OnDied?.Invoke(this);
                Destroy(gameObject);
            }
        }
    }
}
