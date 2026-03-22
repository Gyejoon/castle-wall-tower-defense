using UnityEngine;

namespace GLD.Core
{
    public class TowerPlacer : MonoBehaviour
    {
        [SerializeField] private GridManager _gridManager;
        [SerializeField] private GameObject _towerPrefab;
        [SerializeField] private TowerData[] _availableTowers;

        private int _selectedTowerIndex = 0;
        private Camera _mainCamera;

        public TowerData SelectedTower => _availableTowers.Length > 0
            ? _availableTowers[_selectedTowerIndex]
            : null;

        private void Awake()
        {
            _mainCamera = Camera.main;
        }

        private void Update()
        {
            HandleTowerSelection();
            HandlePlacement();
        }

        private void HandleTowerSelection()
        {
            for (int i = 0; i < Mathf.Min(_availableTowers.Length, 4); i++)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1 + i))
                {
                    _selectedTowerIndex = i;
                }
            }
        }

        private void HandlePlacement()
        {
            if (!Input.GetMouseButtonDown(0)) return;
            if (SelectedTower == null) return;

            Vector3 worldPos = _mainCamera.ScreenToWorldPoint(Input.mousePosition);
            Vector2Int gridPos = _gridManager.WorldToGrid(worldPos);

            if (_gridManager.PlaceTower(gridPos.x, gridPos.y, SelectedTower.Id))
            {
                SpawnTowerVisual(gridPos.x, gridPos.y, SelectedTower);
            }
        }

        private void SpawnTowerVisual(int x, int y, TowerData data)
        {
            Vector3 worldPos = _gridManager.GridToWorld(x, y);
            var go = Instantiate(_towerPrefab, worldPos, Quaternion.identity, transform);

            var tower = go.GetComponent<Tower>();
            tower.Initialize(data, x, y, _gridManager);

            var sr = go.GetComponent<SpriteRenderer>();
            if (sr != null)
            {
                sr.color = data.TowerColor;
            }
        }
    }
}
