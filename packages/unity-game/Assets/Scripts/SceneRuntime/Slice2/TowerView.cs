// TowerView.cs — Phase 2 Task 4 scene-side observer for a TowerInstance POCO.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.3 Two parallel representations. TowerInstance is a POCO (plain C#
//     class). TowerView is the MonoBehaviour that observes ONE POCO and
//     renders it. Simulation NEVER reads from this view — data flows
//     POCO → View only.
//   - §1.5 Anti-patterns: views own only Unity-side concerns (sprite, range
//     circle, transform). NO simulation state. NO FindObjectOfType.
//
// Created by Slice2SceneController on the OnTowerPlaced event; destroyed on
// scene unload (or when the POCO becomes stale; for Slice2 towers never go
// away mid-wave so we tear down with the scene).

using GLD.Systems.Minimal;
using UnityEngine;

namespace GLD.SceneRuntime.Slice2
{
    /// <summary>
    /// Scene-only view that mirrors a single <see cref="TowerInstance"/>'s
    /// world position each frame. Holds no simulation state.
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class TowerView : MonoBehaviour
    {
        TowerInstance _state;
        SpriteRenderer _renderer;

        /// <summary>Bind this view to a POCO. Must be called once after
        /// instantiation. Subsequent <see cref="Tick"/> calls read from the
        /// POCO; the view never writes back.</summary>
        public void Bind(TowerInstance state, MinimalGridManager grid)
        {
            _state = state;
            _renderer = GetComponent<SpriteRenderer>();
            if (_state != null && grid != null)
            {
                Vector2 world = grid.GridToWorld(_state.Cell);
                transform.position = new Vector3(world.x, world.y, 0f);
            }
        }

        /// <summary>Read-only refresh from POCO state. Called by the scene
        /// controller in LateUpdate AFTER all simulation steps complete
        /// (per §1.4: View update happens after simulation).</summary>
        public void Tick()
        {
            if (_state == null) return;
            // Stationary tower; nothing to update beyond the initial bind for
            // Slice2. Hook left here so Phase 3 (charge animations / level-up
            // sprite swaps) reads ShotsFired / RuntimeDamage cleanly.
        }
    }
}
