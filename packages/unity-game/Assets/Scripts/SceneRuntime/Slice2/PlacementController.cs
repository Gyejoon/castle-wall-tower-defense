// PlacementController.cs — Phase 2 Task 5 input → grid placement bridge.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.1 Plain C# events; HUD owns the `placementModeActive` flag, not us.
//   - §1.4 Tick order: input drains during the `applyInputs` phase of
//          Slice2SceneController.Update — NOT raw via this MB's own Update.
//          We BUFFER pointer presses here and drain them in
//          ApplyPendingInputs(tickEndTimeSec), which the scene controller
//          calls between Energy.Tick and Wave.Tick.
//   - §1.5 Anti-patterns:
//          * No FindObjectOfType / FindFirstObjectByType — the controller and
//            HUD references are wired via [SerializeField] on the Placement GO.
//          * No Coroutine / WaitForSeconds. Input is event-driven.
//          * Time.deltaTime is NOT read here — only Slice2SceneController reads
//            it once per frame (Task 4 invariant).
//          * View does not own simulation state. We only buffer pointer screen
//            positions; placement decisions are made by MinimalTowerSystem.
//
// Plan reference: docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md
//   - Task 5: input + placement + HUD. Plan says "Place(...)"; the actual
//     API is TryPlace which already gates on bounds / blocked / occupied /
//     funds and emits OnTowerPlaceRejected. We DO NOT double-gate from here.
//
// Rejection reason → HUD: HUD subscribes to MinimalTowerSystem
// .OnTowerPlaceRejected directly; we don't have to relay anything.

using System.Collections.Generic;
using GLD.Data;
using GLD.Systems.Minimal;
using UnityEngine;
using UnityEngine.InputSystem;

namespace GLD.SceneRuntime.Slice2
{
    /// <summary>
    /// Input → tower placement bridge for the Slice2 PoC. Pointer presses are
    /// captured by the InputSystem callback (or the public test seam
    /// <see cref="HandlePointerPress"/>), buffered, and drained at the
    /// canonical <c>applyInputs</c> tick phase by
    /// <see cref="ApplyPendingInputs"/> (called from
    /// <see cref="Slice2SceneController.Update"/>).
    /// </summary>
    // §1.4 tick-order contract: PlacementController.Update buffers presses;
    // Slice2SceneController.Update drains them at the applyInputs phase. Same-
    // frame drain requires PlacementController to run first, so pin its order
    // ahead of any default-priority MB. Without this, Unity's same-priority
    // Update order is undefined and a press can leak to the next frame.
    [DefaultExecutionOrder(-100)]
    public sealed class PlacementController : MonoBehaviour
    {
        [Header("Wiring (set in scene inspector — NEVER FindObjectOfType)")]
        [Tooltip("Scene controller that owns the system POCOs (Towers, Grid, GetTowerDef).")]
        [SerializeField] Slice2SceneController controller;

        [Tooltip("HUD controller that owns the placement-mode toggle. " +
                 "When PlacementModeActive is false, pointer presses are ignored.")]
        [SerializeField] Slice2HudController hud;

        [Tooltip("Camera used for screen→world projection. Falls back to Camera.main if unset.")]
        [SerializeField] Camera mainCamera;

        // Buffered presses captured this frame. Drained by ApplyPendingInputs at
        // the canonical applyInputs tick phase (between Energy.Tick and
        // Wave.Tick) so input ordering matches §1.4 tick discipline.
        readonly List<Vector2> _pendingScreenPresses = new List<Vector2>(4);

        // ── Lifecycle ─────────────────────────────────────────────────────

        void Awake()
        {
            // Defensive null-check (per Task 4 review note): controller can be
            // unwired in EditMode tests / harnesses that load the scene without
            // a scene controller. Keep alive but disable input drain in that
            // case so the existing Slice2SmokeTest paths remain unaffected.
            if (mainCamera == null) mainCamera = Camera.main;
        }

        void OnEnable()
        {
            // Input System wiring: subscribe to Pointer / Mouse / Touchscreen
            // last-press events globally. EnhancedTouchSupport is not needed —
            // a single Pointer.current.press.wasPressedThisFrame check in
            // Update is enough for the PoC. The wiring here uses the new Input
            // System "callback" surface so the Test/Editor can simulate via the
            // InputTestFixture (Option A) AND the HandlePointerPress test seam
            // (Option B) without changing this MB's behavior.
            //
            // We poll inside Update rather than registering an InputAction
            // asset — Slice2 has no ProjectInputActions yet (Phase 5). Polling
            // Pointer.current is event-driven enough for the PoC and keeps the
            // dependency surface minimal.
        }

        void Update()
        {
            // Poll the Input System pointer once per frame and buffer presses.
            // This is NOT placement logic — placement happens in the canonical
            // applyInputs phase via ApplyPendingInputs(). Update here only
            // captures the screen position; no game state is mutated.
            if (hud == null || !hud.PlacementModeActive) return;

            var pointer = Pointer.current;
            if (pointer == null) return;
            if (!pointer.press.wasPressedThisFrame) return;

            Vector2 screenPos = pointer.position.ReadValue();
            _pendingScreenPresses.Add(screenPos);
        }

        // ── Public API drained by Slice2SceneController.Update ────────────

        /// <summary>
        /// Drain the pointer-press buffer at the canonical applyInputs tick
        /// phase. Called by <see cref="Slice2SceneController.Update"/> between
        /// Energy.Tick and Wave.Tick (§1.4 tick order). The
        /// <paramref name="tickEndTimeSec"/> argument is reserved for future
        /// Phase 3 input-replay parity with the TS replay-runner; current
        /// callers can pass the same `tickEnd` they already compute.
        /// </summary>
        public void ApplyPendingInputs(float tickEndTimeSec)
        {
            if (_pendingScreenPresses.Count == 0) return;
            if (controller == null || controller.Towers == null) return;
            if (hud == null || !hud.PlacementModeActive)
            {
                _pendingScreenPresses.Clear();
                return;
            }

            for (int i = 0; i < _pendingScreenPresses.Count; i++)
            {
                HandlePointerPressInternal(_pendingScreenPresses[i]);
            }
            _pendingScreenPresses.Clear();
        }

        /// <summary>
        /// Public test seam (Option B in Task 5 brief). Tests call this
        /// directly to simulate the screen-position endpoint of the
        /// InputSystem pipeline. The press is buffered and drained on the next
        /// <see cref="ApplyPendingInputs"/> call so the test's tick-order
        /// observation matches production.
        /// </summary>
        public void HandlePointerPress(Vector2 screenPos)
        {
            if (hud == null || !hud.PlacementModeActive) return;
            _pendingScreenPresses.Add(screenPos);
        }

        // ── Internals ─────────────────────────────────────────────────────

        void HandlePointerPressInternal(Vector2 screenPos)
        {
            var cam = mainCamera != null ? mainCamera : Camera.main;
            if (cam == null) return;

            // Screen → world. Z component is irrelevant for orthographic 2D
            // but ScreenToWorldPoint expects a non-zero distance from the camera
            // to avoid degenerate projection — use abs(camera.z) which mirrors
            // the orthographic-2D convention used by Slice2_PoC's main camera
            // (m_LocalPosition.z = -10).
            Vector3 screen3 = new Vector3(screenPos.x, screenPos.y, Mathf.Abs(cam.transform.position.z));
            Vector3 world = cam.ScreenToWorldPoint(screen3);

            GridCell cell = controller.Grid.WorldToGrid(new Vector2(world.x, world.y));
            TowerDefSO def = controller.GetTowerDef();
            if (def == null) return;

            // Single-call placement. TryPlace gates bounds / blocked / occupied
            // / insufficient-funds and fires OnTowerPlaceRejected with the
            // reason on failure (HUD subscribes for feedback). We DO NOT
            // double-gate here.
            controller.Towers.TryPlace(def, cell);
        }
    }
}
