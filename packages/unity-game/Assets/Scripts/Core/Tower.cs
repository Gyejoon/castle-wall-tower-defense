using UnityEngine;

namespace GLD.Core
{
    public class Tower : MonoBehaviour
    {
        public TowerData Data { get; private set; }
        public int GridX { get; private set; }
        public int GridY { get; private set; }

        private float _attackTimer;
        private GridManager _gridManager;

        public void Initialize(TowerData data, int gridX, int gridY, GridManager gridManager)
        {
            Data = data;
            GridX = gridX;
            GridY = gridY;
            _gridManager = gridManager;
        }

        private void Update()
        {
            if (Data == null || Data.AttackSpeed <= 0) return;

            _attackTimer += Time.deltaTime;
            if (_attackTimer >= 1f / Data.AttackSpeed)
            {
                _attackTimer = 0f;
                TryAttack();
            }
        }

        private void TryAttack()
        {
            var units = FindObjectsByType<Unit>(FindObjectsSortMode.None);
            Unit closest = null;
            float closestDist = float.MaxValue;

            foreach (var unit in units)
            {
                float dist = Vector3.Distance(transform.position, unit.transform.position);
                if (dist <= Data.Range && dist < closestDist)
                {
                    closest = unit;
                    closestDist = dist;
                }
            }

            if (closest != null)
            {
                closest.TakeDamage(Data.Damage);
            }
        }
    }
}
