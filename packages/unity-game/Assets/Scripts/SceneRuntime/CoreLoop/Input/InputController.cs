using System;
using GLD.Core;
using GLD.SceneRuntime.CoreLoop.Render;
using UnityEngine;
using UnityEngine.InputSystem;

namespace GLD.SceneRuntime.CoreLoop.Input
{
    public sealed class InputController : IDisposable
    {
        const float TopHudHitHeight = 96f;
        const float BottomHudHitHeight = 104f;

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
            if (_controller == null || _placement == null)
                return;

            if (Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame)
                TryInteractAtScreenPosition(Mouse.current.position.ReadValue());

            if (Touchscreen.current != null && Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
                TryInteractAtScreenPosition(Touchscreen.current.primaryTouch.position.ReadValue());
        }

        public void Dispose()
        {
        }

        bool TryInteractAtScreenPosition(Vector2 screenPosition)
        {
            if (IsUiScreenPosition(screenPosition))
                return false;

            var camera = _renderer != null && _renderer.GameplayCamera != null ? _renderer.GameplayCamera : Camera.main;
            if (camera == null)
                return false;

            var world3 = camera.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, -camera.transform.position.z));
            var cell = _controller.Grid.WorldToGrid(new Vector2(world3.x, world3.y));
            if (_placement.IsPlacementMode)
                return _placement.TryPlace(cell);

            var tower = _controller.Towers.GetAt(cell);
            if (tower == null)
            {
                GameEvents.RaiseTowerDeselected();
                return false;
            }

            GameEvents.RaiseTowerSelected(tower.InstanceId, cell.Col, cell.Row);
            GameEvents.RaiseRequestSelectTower(tower.InstanceId);
            return true;
        }

        static bool IsUiScreenPosition(Vector2 screenPosition)
        {
            return screenPosition.y <= BottomHudHitHeight || screenPosition.y >= Screen.height - TopHudHitHeight;
        }
    }
}
