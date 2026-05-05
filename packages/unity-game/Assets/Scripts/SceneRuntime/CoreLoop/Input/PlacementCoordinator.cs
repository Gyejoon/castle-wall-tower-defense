using GLD.Core;
using GLD.Systems.Grid;

namespace GLD.SceneRuntime.CoreLoop.Input
{
    public sealed class PlacementCoordinator
    {
        readonly GameSceneController _controller;
        string _selectedTowerId;

        public PlacementCoordinator(GameSceneController controller)
        {
            _controller = controller;
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
            var placed = _controller.PlaceTower(towerId, cell.Col, cell.Row);
            if (placed)
            {
                _selectedTowerId = null;
                GameEvents.RaiseSummonConfirmed(towerId);
            }
            return placed;
        }
    }
}
