using GLD.Systems.Minimal;
using UnityEngine;
using UnityEngine.InputSystem;

namespace GLD.SceneRuntime.Slice2
{
    public sealed class PlacementController : MonoBehaviour
    {
        Slice2SceneController _controller;
        Camera _camera;
        bool _placementMode;

        public bool IsPlacementMode => _placementMode;

        public void Bind(Slice2SceneController controller, Camera gameplayCamera)
        {
            _controller = controller;
            _camera = gameplayCamera != null ? gameplayCamera : Camera.main;
        }

        public void BeginPlacement() => _placementMode = true;

        public void CancelPlacement() => _placementMode = false;

        void Update()
        {
            if (!_placementMode || _controller == null) return;

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
                TryPlaceAtScreenPosition(Mouse.current.position.ReadValue());

            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
                TryPlaceAtScreenPosition(Touchscreen.current.primaryTouch.position.ReadValue());
        }

        public bool TryPlaceAtScreenPosition(Vector2 screenPosition)
        {
            if (_controller == null || _camera == null) return false;
            var world3 = _camera.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -_camera.transform.position.z));
            var cell = _controller.Grid.WorldToGrid(new Vector2(world3.x, world3.y));
            var placed = _controller.Towers.PlaceArcher(_controller.ArcherDef, cell);
            if (placed) _placementMode = false;
            return placed;
        }
    }
}
