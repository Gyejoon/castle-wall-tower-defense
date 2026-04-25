// UnitView.cs — Phase 2 Task 4 scene-side observer for a UnitInstance POCO.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.3 UnitInstance is a POCO; UnitView is the MonoBehaviour that
//     observes ONE POCO. Simulation NEVER reads from this view.
//   - §1.5 No simulation state on the view. Read POCO → mirror transform.
//
// Created on OnUnitSpawned, destroyed on OnUnitKilled / OnUnitReachedExit
// (events fired by MinimalUnitSystem). The controller owns the unit→view
// dictionary and is responsible for Destroy() calls.

using GLD.Systems.Minimal;
using UnityEngine;

namespace GLD.SceneRuntime.Slice2
{
    /// <summary>
    /// Scene-only view that mirrors a single <see cref="UnitInstance"/>'s
    /// continuous world position each <see cref="Tick"/>. Holds no
    /// simulation state.
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class UnitView : MonoBehaviour
    {
        UnitInstance _state;
        MinimalUnitSystem _units;
        MinimalGridManager _grid;

        /// <summary>Bind this view to a POCO. Must be called once after
        /// instantiation.</summary>
        public void Bind(UnitInstance state, MinimalUnitSystem units, MinimalGridManager grid)
        {
            _state = state;
            _units = units;
            _grid = grid;
        }

        /// <summary>Read-only refresh from POCO. Called by the scene controller
        /// in LateUpdate AFTER simulation. Maps grid (col, row) → world
        /// (col + 0.5, row + 0.5) so the sprite sits on the cell center.</summary>
        public void Tick()
        {
            if (_state == null || _units == null || _grid == null) return;
            if (!_state.Alive) return;
            if (!_units.TryGetPosition(_state, out float col, out float row)) return;
            // GridToWorld() applies the +0.5 cell-center offset; do it manually
            // for the fractional position so the unit interpolates smoothly
            // between cells.
            transform.position = new Vector3(col + 0.5f, row + 0.5f, 0f);
        }
    }
}
