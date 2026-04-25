// Slice2HudController.cs — Phase 2 Task 5 UI Toolkit HUD driver.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.1 Plain C# events; HUD subscribes to MinimalEnergySystem
//          .OnEnergyChanged, MinimalWaveSystem.OnWaveStarted,
//          MinimalTowerSystem.OnTowerPlaceRejected.
//   - §1.3 View ≠ simulation: HUD only mirrors what the systems already
//          decided. Cached strings/values in this file are render mirrors,
//          never source-of-truth.
//   - §1.5 Anti-patterns:
//          * No FindObjectOfType — controller reference is wired via
//            [SerializeField] in the scene.
//          * No Coroutine / WaitForSeconds. The button's enabled state is
//            recomputed on OnEnergyChanged events; no timer needed.
//          * Time.deltaTime is NOT read here. Only Slice2SceneController
//            reads it once per frame (Task 4 invariant).
//          * HP label is a STATIC PLACEHOLDER (`❤100`) — Phase 2 has no
//            castle-wall HP system, so no OnPlayerDamaged event exists. See
//            TODO comment in Slice2Hud.uxml for the Phase 3 integration.
//
// Plan reference: docs/superpowers/plans/2026-04-24-unity-phase-2-poc-vertical-slice.md
//   - Task 5: button "Place Archer (⚡20)". Cost reads dynamically from
//     controller.GetTowerDef().cost so OQ-4 (cost=20) stays the single source
//     of truth in TowerCatalog.
//
// Phase 1 lesson: UIDocument has no inspector "Style Sheets" field on Unity
// 6 — the USS import lives inside the UXML via <ui:Style src="..."/>.

using GLD.Data;
using GLD.Systems.Minimal;
using UnityEngine;
using UnityEngine.UIElements;

namespace GLD.SceneRuntime.Slice2
{
    /// <summary>
    /// UI Toolkit HUD bound to Slice2_PoC. Subscribes to MinimalEnergySystem,
    /// MinimalWaveSystem, and MinimalTowerSystem events to mirror current
    /// state to four UI elements: energy / wave / hp / place-archer button.
    /// Owns the <see cref="PlacementModeActive"/> toggle the
    /// <see cref="PlacementController"/> reads each frame.
    /// </summary>
    public sealed class Slice2HudController : MonoBehaviour
    {
        [Header("Wiring (set in scene inspector — NEVER FindObjectOfType)")]
        [Tooltip("UIDocument that hosts Slice2Hud.uxml. Required.")]
        [SerializeField] UIDocument document;

        [Tooltip("Scene controller that owns the system POCOs (Energy, Wave, Towers, GetTowerDef).")]
        [SerializeField] Slice2SceneController controller;

        // ── HUD-owned UI state (NOT simulation state) ─────────────────────

        /// <summary>
        /// True when the user has armed placement mode by clicking the button.
        /// PlacementController polls this flag each frame. Toggled by the UI
        /// button click. NOT simulation state — losing this on domain reload
        /// is a no-op gameplay-wise (player just clicks the button again).
        /// </summary>
        public bool PlacementModeActive { get; private set; }

        // Cached UI element references; resolved in OnEnable.
        Label _energyLabel;
        Label _waveLabel;
        Label _hpLabel;
        Button _placeArcherButton;

        // Last-seen energy (cached for re-rendering button enabled state when
        // affordability flips). This is a RENDER mirror, not source of truth —
        // the EnergySystem owns the canonical value.
        int _lastSeenEnergy;
        int _archerCost = 20; // refreshed in OnEnable from TowerDefSO

        // Active subscription guards so OnDisable doesn't unsub a stale system
        // (e.g. domain reload mid-scene).
        bool _subscribed;

        // ── Lifecycle ─────────────────────────────────────────────────────

        void Awake()
        {
            // Defensive: tolerate missing wiring so existing PlayMode tests
            // (Slice2_LoadsAndProducesCanonicalKillCount, _ControllerDrivesPrep…)
            // continue passing even if their scene snapshot lacks the HUD GO.
            // The scene file we ship always provides them; this only matters
            // when a future test loads a stripped-down scene.
        }

        void OnEnable()
        {
            if (controller == null || document == null) return;

            BindUI();
            Subscribe();
            // Initial render: pull current energy / wave once so HUD shows
            // accurate values before the first event fires.
            if (controller.Energy != null)
            {
                _lastSeenEnergy = controller.Energy.EnergyInt;
                RenderEnergy(_lastSeenEnergy);
            }
            RefreshButtonAffordability();
        }

        void OnDisable()
        {
            Unsubscribe();
        }

        // ── UI binding ────────────────────────────────────────────────────

        void BindUI()
        {
            var root = document.rootVisualElement;
            if (root == null) return;

            _energyLabel = root.Q<Label>("energy-label");
            _waveLabel = root.Q<Label>("wave-label");
            _hpLabel = root.Q<Label>("hp-label"); // static placeholder; Phase 3
            _placeArcherButton = root.Q<Button>("place-archer-button");

            // Resolve archer cost from the TowerDefSO so OQ-4 (cost=20) stays
            // the single source of truth. If the def isn't wired (script-order
            // edge case where GameDatabase has not Activated yet, or a
            // misconfigured scene), log loudly so a CI player-build smoke run
            // surfaces the wiring bug instead of silently using the
            // happens-to-be-correct PoC fallback.
            var def = controller != null ? controller.GetTowerDef() : null;
            if (def == null)
            {
                Debug.LogError(
                    "Slice2HudController: GameDatabase tower 'archer' not resolved at OnEnable. " +
                    "Falling back to cost=20. Verify GameDatabase asset is wired on " +
                    "Slice2SceneController and Activate/EnsureActive ran before HUD enable.");
                _archerCost = 20;
            }
            else
            {
                _archerCost = def.cost;
            }

            if (_placeArcherButton != null)
            {
                _placeArcherButton.text = $"Place Archer (⚡{_archerCost})";
                _placeArcherButton.clicked += OnPlaceArcherClicked;
            }
        }

        // ── Event subscription ────────────────────────────────────────────

        void Subscribe()
        {
            if (_subscribed) return;
            if (controller == null) return;

            if (controller.Energy != null)
                controller.Energy.OnEnergyChanged += HandleEnergyChanged;
            if (controller.Wave != null)
                controller.Wave.OnWaveStarted += HandleWaveStarted;
            if (controller.Towers != null)
                controller.Towers.OnTowerPlaceRejected += HandleTowerPlaceRejected;

            _subscribed = true;
        }

        void Unsubscribe()
        {
            if (!_subscribed) return;
            if (controller != null)
            {
                if (controller.Energy != null)
                    controller.Energy.OnEnergyChanged -= HandleEnergyChanged;
                if (controller.Wave != null)
                    controller.Wave.OnWaveStarted -= HandleWaveStarted;
                if (controller.Towers != null)
                    controller.Towers.OnTowerPlaceRejected -= HandleTowerPlaceRejected;
            }
            if (_placeArcherButton != null)
            {
                _placeArcherButton.clicked -= OnPlaceArcherClicked;
            }
            _subscribed = false;
        }

        // ── Event handlers ────────────────────────────────────────────────

        void HandleEnergyChanged(int newEnergy)
        {
            _lastSeenEnergy = newEnergy;
            RenderEnergy(newEnergy);
            RefreshButtonAffordability();
        }

        void HandleWaveStarted()
        {
            if (_waveLabel == null || controller?.Wave == null) return;
            // PoC has only Wave 1; we render the static text here so future
            // multi-wave runs (Phase 3) can swap to a wave-number prop.
            _waveLabel.text = "Wave 1";
        }

        void HandleTowerPlaceRejected(TowerDefSO def, GridCell cell, PlacementRejection reason)
        {
            // Phase 2 PoC: log rejection so dev/test sees feedback. Gated
            // behind UNITY_EDITOR || DEVELOPMENT_BUILD so misclick warnings do
            // not ship to player log files in release builds. Phase 3 replaces
            // this with a HUD toast/flash; until then the conditional log is
            // the dev-facing surface.
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            Debug.LogWarning(
                $"[Slice2HudController] TryPlace rejected at ({cell.Col},{cell.Row}): {reason}");
#endif
        }

        // ── Render helpers ────────────────────────────────────────────────

        void RenderEnergy(int energy)
        {
            if (_energyLabel == null) return;
            _energyLabel.text = $"⚡{energy}";
        }

        void RefreshButtonAffordability()
        {
            if (_placeArcherButton == null) return;
            bool canAfford = _lastSeenEnergy >= _archerCost;
            _placeArcherButton.SetEnabled(canAfford);
            // If placement mode is on but the player can no longer afford,
            // we leave PlacementModeActive=true so a press lands as a
            // rejection (HUD log shows InsufficientFunds). Behaviour mirrors
            // the TS replay-runner: input is buffered, gating is the system's
            // job.
        }

        // ── Button click ──────────────────────────────────────────────────

        void OnPlaceArcherClicked()
        {
            // Toggle: clicking arms placement mode; clicking again disarms.
            // The button stays focusable; the PlacementController polls
            // PlacementModeActive each frame.
            PlacementModeActive = !PlacementModeActive;

            // Visually mark the button so the player can tell the mode is on.
            if (_placeArcherButton != null)
            {
                if (PlacementModeActive)
                    _placeArcherButton.AddToClassList("placement-mode-active");
                else
                    _placeArcherButton.RemoveFromClassList("placement-mode-active");
            }
        }

#if UNITY_INCLUDE_TESTS
        /// <summary>
        /// Test-only seam: directly toggles placement mode without going through
        /// the UI button click. Avoids coupling tests to UI Toolkit click-event
        /// internals (ClickEvent / NavigationSubmitEvent / PointerUpEvent shift
        /// across Unity 2022.x → 2023.x → 6000.x). The button itself is still
        /// tested indirectly via OnClickPlaceArcher() which the production path
        /// exercises. Public (rather than internal) because the test asmdef
        /// (GLD.Tests.PlayMode) is a separate assembly from GLD.SceneRuntime;
        /// the UNITY_INCLUDE_TESTS guard plus the Test_ prefix keep the
        /// production-call surface clear.
        /// </summary>
        public void Test_SetPlacementModeActive(bool active)
        {
            PlacementModeActive = active;
            if (_placeArcherButton != null)
            {
                if (active) _placeArcherButton.AddToClassList("placement-mode-active");
                else _placeArcherButton.RemoveFromClassList("placement-mode-active");
            }
        }
#endif
    }
}
