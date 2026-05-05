using System;
using GLD.SceneRuntime.CoreLoop.Render;
using UnityEngine;
using UnityEngine.InputSystem;

namespace GLD.SceneRuntime.CoreLoop.Input
{
    public sealed class InputController : IDisposable
    {
        readonly GameSceneController _controller;
        readonly CoreLoopFieldRenderer _renderer;
        readonly PlacementCoordinator _placement;

        public InputController(GameSceneController controller, CoreLoopFieldRenderer renderer, PlacementCoordinator placement)
        {
            _controller = controller;
            _renderer = renderer;
            _placement = placement;
        }

        public void Tick()
        {
            if (_controller == null || _placement == null || !_placement.IsPlacementMode)
                return;

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
                TryPlaceAtScreenPosition(Mouse.current.position.ReadValue());

            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
                TryPlaceAtScreenPosition(Touchscreen.current.primaryTouch.position.ReadValue());
        }

        public void Dispose()
        {
        }

        bool TryPlaceAtScreenPosition(Vector2 screenPosition)
        {
            var camera = _renderer != null && _renderer.GameplayCamera != null ? _renderer.GameplayCamera : Camera.main;
            if (camera == null)
                return false;

            var world3 = camera.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -camera.transform.position.z));
            var cell = _controller.Grid.WorldToGrid(new Vector2(world3.x, world3.y));
            return _placement.TryPlace(cell);
        }
    }
}
