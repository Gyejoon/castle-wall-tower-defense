using System;
using GLD.Core;
using GLD.Systems.Grid;

namespace GLD.SceneRuntime.CoreLoop.Input
{
    public sealed class PlacementCoordinator : IDisposable
    {
        readonly GameSceneController _controller;
        string _selectedTowerId;

        public PlacementCoordinator(GameSceneController controller)
        {
            _controller = controller;
            GameEvents.OnSummonOffered += HandleSummonOffered;
            GameEvents.OnSummonCancelled += HandleSummonEnded;
            GameEvents.OnSummonConfirmed += HandleSummonEnded;
        }

        public string SelectedTowerId => _selectedTowerId;
        public bool IsPlacementMode => !string.IsNullOrEmpty(_selectedTowerId);

        public void BeginPlacement(string towerId)
        {
            _selectedTowerId = towerId;
            GameEvents.RaiseSummonOffered(towerId);
        }

        public void CancelPlacement()
        {
            if (!string.IsNullOrEmpty(_selectedTowerId))
                GameEvents.RaiseSummonCancelled(_selectedTowerId);
            _selectedTowerId = null;
        }

        public bool TryPlace(GridCell cell)
        {
            if (_controller == null || string.IsNullOrEmpty(_selectedTowerId))
                return false;

            var towerId = _selectedTowerId;
            GameEvents.RaiseRequestPlaceTower(new TowerPlacementRequest(towerId, cell.Col, cell.Row));
            return _controller.Towers.GetAt(cell) != null;
        }

        public void Dispose()
        {
            GameEvents.OnSummonOffered -= HandleSummonOffered;
            GameEvents.OnSummonCancelled -= HandleSummonEnded;
            GameEvents.OnSummonConfirmed -= HandleSummonEnded;
            _selectedTowerId = null;
        }

        void HandleSummonOffered(string towerId) => _selectedTowerId = towerId;

        void HandleSummonEnded(string _) => _selectedTowerId = null;
    }
}
