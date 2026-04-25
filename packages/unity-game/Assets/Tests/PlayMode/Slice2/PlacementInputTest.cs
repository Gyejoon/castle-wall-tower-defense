// PlacementInputTest.cs — Phase 2 Task 5 PlayMode test for input → placement.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.5 #1: tests are allowed to use FindFirstObjectByType (precedent
//             from Slice2SmokeTest); production code may NOT.
//   - §4 OQ-3 / OQ-4: archer at (3,14), cost ⚡20.
//
// Test approach: Option B from the Task 5 brief — direct controller API.
// Justification:
//   * The Input System TestFixture (com.unity.inputsystem's TestFramework
//     assembly) has a `UNITY_TESTS_FRAMEWORK` define-constraint and is not
//     referenced by GLD.Tests.PlayMode.asmdef. Adding it would expand the
//     test asmdef's surface and risk ripple in CI; the brief permits Option B.
//   * Option B exercises the screen→world→grid→TryPlace chain via
//     PlacementController.HandlePointerPress (the test seam), which is
//     exactly the endpoint the InputSystem callback delegates to in
//     production.
//   * The Phase 5 input-actions migration will switch to Option A; for the
//     PoC this is sufficient and self-contained.
//
// This test is robust to small camera/orthographic-size tweaks because it
// computes the screen-position FROM the grid cell at runtime via
// Camera.WorldToScreenPoint, then feeds that screen position back into the
// controller. If the camera changes, the round-trip still lands on (3,14).

using System.Collections;
using GLD.SceneRuntime.Slice2;
using GLD.Systems.Minimal;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.Slice2
{
    [TestFixture]
    public class PlacementInputTest
    {
        const string SceneName = "Slice2_PoC";

        [UnityTest]
        public IEnumerator Slice2_ClickAtScreenPos_PlacesArcherAtCorrectGridCell()
        {
            // ── 1. Load the scene additively (single mode mirrors the smoke test).
            var loadOp = SceneManager.LoadSceneAsync(SceneName, LoadSceneMode.Single);
            Assert.IsNotNull(loadOp, $"Scene '{SceneName}' must be in build settings.");
            while (!loadOp.isDone) yield return null;
            yield return null; // Awake/OnEnable settled.

            // ── 2. Resolve scene actors. FindFirstObjectByType is allowed in
            //      tests (precedent: Slice2SmokeTest).
#if UNITY_2023_1_OR_NEWER
            var controller = Object.FindFirstObjectByType<Slice2SceneController>();
            var hud = Object.FindFirstObjectByType<Slice2HudController>();
            var placement = Object.FindFirstObjectByType<PlacementController>();
#else
            var controller = Object.FindObjectOfType<Slice2SceneController>();
            var hud = Object.FindObjectOfType<Slice2HudController>();
            var placement = Object.FindObjectOfType<PlacementController>();
#endif
            Assert.IsNotNull(controller, "Slice2SceneController must be present in scene.");
            Assert.IsNotNull(hud, "Slice2HudController must be present in scene.");
            Assert.IsNotNull(placement, "PlacementController must be present in scene.");
            Assert.IsNotNull(controller.Towers, "Tower system must be constructed in Awake.");
            Assert.IsNotNull(controller.Grid, "Grid must be constructed in Awake.");

            // Disable the controller's Update loop so the wave system does not
            // spawn units mid-test and our placement runs in a clean state.
            // We then manually drain pending inputs at the canonical phase.
            controller.enabled = false;

            // ── 3. Arm placement mode via the test-only seam on the HUD.
            //      See Slice2HudController.Test_SetPlacementModeActive (gated
            //      behind UNITY_INCLUDE_TESTS): bypasses UI Toolkit click-event
            //      synthesis (ClickEvent / NavigationSubmitEvent shift across
            //      Unity 2022.x → 2023.x → 6000.x), so the test does not couple
            //      to UIElements internals. The production button-click path is
            //      still exercised via OnPlaceArcherClicked() in normal play.
            hud.Test_SetPlacementModeActive(true);
            yield return null;
            Assert.IsTrue(hud.PlacementModeActive,
                "Test_SetPlacementModeActive(true) must arm placement mode.");

            // ── 4. Compute the screen-space position that corresponds to grid
            //      cell (3,14) and feed it through the public test seam. This
            //      exercises the screen→world→grid→TryPlace chain.
            var grid = controller.Grid;
            Vector2 worldCenter = grid.GridToWorld(new GridCell(3, 14));

            var cam = Camera.main;
            Assert.IsNotNull(cam, "Slice2_PoC scene must have a Main Camera.");
            Vector3 screenPos = cam.WorldToScreenPoint(new Vector3(worldCenter.x, worldCenter.y, 0f));

            placement.HandlePointerPress(new Vector2(screenPos.x, screenPos.y));

            // ── 5. Drain at the canonical applyInputs phase. The scene
            //      controller is disabled, so we do this by hand.
            placement.ApplyPendingInputs(0.1f);

            // ── 6. Assertions.
            Assert.IsTrue(controller.Towers.TryGetAt(new GridCell(3, 14), out var placed),
                "Tower must be placed at (3,14) after click at corresponding screen position.");
            Assert.IsNotNull(placed, "TryGetAt out parameter must be non-null on success.");
            Assert.AreEqual(1, controller.Towers.Towers.Count,
                "Exactly one tower should exist after a single placement click.");
            Assert.AreEqual("archer", placed.Def.id,
                "Placed tower must be the archer (per OQ-3).");

            // Energy should have decreased by the archer cost (initial 40 → 20).
            Assert.AreEqual(40 - placed.Def.cost, controller.Energy.EnergyInt,
                "Energy must drop by tower cost (OQ-4: cost = 20).");

            yield break;
        }
    }
}
