using UnityEngine;
using System.Collections;
using System.Collections.Generic;

namespace GLD.Core
{
    public class UnitSpawner : MonoBehaviour
    {
        [SerializeField] private GridManager _gridManager;
        [SerializeField] private GameObject _unitPrefab;

        [Header("Spawn Settings")]
        [SerializeField] private float _spawnInterval = 0.3f;

        public event System.Action<Unit> OnUnitReachedExit;
        public event System.Action<Unit> OnUnitDied;

        public void SpawnWave(float hp, float speed, float armor, int count)
        {
            var path = Pathfinding.FindPath(
                _gridManager.Grid,
                _gridManager.SpawnPoint,
                _gridManager.ExitPoint
            );

            if (path == null)
            {
                Debug.LogWarning("No path available for unit spawning");
                return;
            }

            StartCoroutine(SpawnCoroutine(hp, speed, armor, count, path));
        }

        private IEnumerator SpawnCoroutine(float hp, float speed, float armor, int count, List<Vector2Int> path)
        {
            for (int i = 0; i < count; i++)
            {
                var go = Instantiate(
                    _unitPrefab,
                    _gridManager.GridToWorld(path[0].x, path[0].y),
                    Quaternion.identity,
                    transform
                );

                var unit = go.GetComponent<Unit>();
                unit.Initialize(hp, speed, armor, new List<Vector2Int>(path), _gridManager);
                unit.OnReachedExit += (u) => OnUnitReachedExit?.Invoke(u);
                unit.OnDied += (u) => OnUnitDied?.Invoke(u);

                yield return new WaitForSeconds(_spawnInterval);
            }
        }
    }
}
