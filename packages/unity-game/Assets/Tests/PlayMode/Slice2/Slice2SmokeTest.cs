// Slice2SmokeTest.cs — Phase 2 Task 4 PlayMode smoke test.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §3.5 / §3.7  Canonical kill count for slice2_poc fixture under faithful
//                  NearestInRange + projectile TTL: 3 (NOT 5; see deviation
//                  note in seed-001-slice2-poc.json _comment block).
//   - §1.4         Tick order: Energy → Wave → Units → Towers → ResolveDamage.
//
// Locked invariant L1 (project memory): kills == 3 for the slice2_poc fixture.
// MinimalSystemsTest.Integration_Wave1_ProducesLooseExpectedMetrics asserts
// the same value in EditMode; this PlayMode test additionally proves the
// scene + prefabs + scene controller load and wire correctly, then runs the
// same 60s deterministic simulation against the scene-constructed systems.
//
// The test bypasses Time.deltaTime entirely: it reads the system references
// off Slice2SceneController and ticks them with a fixed 1/60s dt. This keeps
// the test fast (<1s wall clock) and deterministic across CI hosts.

using System.Collections;
using GLD.Data;
using GLD.SceneRuntime.Slice2;
using GLD.Systems.Minimal;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace GLD.Tests.PlayMode.Slice2
{
    [TestFixture]
    public class Slice2SmokeTest
    {
        const string SceneName = "Slice2_PoC";

        [UnityTest]
        public IEnumerator Slice2_LoadsAndProducesCanonicalKillCount()
        {
            // ── 1. Load the scene additively. The scene must be in build
            //      settings (Phase 2 Task 4 modifies EditorBuildSettings.asset).
            var loadOp = SceneManager.LoadSceneAsync(SceneName, LoadSceneMode.Single);
            Assert.IsNotNull(loadOp, $"Scene '{SceneName}' must be in build settings.");
            while (!loadOp.isDone) yield return null;
            // After LoadSceneAsync completes, Awake/OnEnable have run for all
            // scene objects. We do NOT yield another frame here — that would
            // let Slice2SceneController.Update tick once and perturb the
            // initial energy/clock state. Instead we disable the controller
            // immediately and run our own deterministic loop below.

            // ── 2. Find the controller. Per anti-pattern #1, production code
            //      must NOT use FindObjectOfType — but tests are the legitimate
            //      consumer of scene state, so it's appropriate here.
#if UNITY_2023_1_OR_NEWER
            var controller = Object.FindFirstObjectByType<Slice2SceneController>();
#else
            var controller = Object.FindObjectOfType<Slice2SceneController>();
#endif
            Assert.IsNotNull(controller, "Slice2SceneController must be present in Slice2_PoC scene.");
            Assert.IsNotNull(controller.Grid, "Grid must be constructed in Awake.");
            Assert.IsNotNull(controller.Energy, "Energy system must be constructed in Awake.");
            Assert.IsNotNull(controller.Units, "Unit system must be constructed in Awake.");
            Assert.IsNotNull(controller.Towers, "Tower system must be constructed in Awake.");
            Assert.IsNotNull(controller.Wave, "Wave system must be constructed in Awake.");

            // Validate the slice2_poc map shape (8×18, exit at (4,0)).
            Assert.AreEqual(8, controller.Grid.Cols);
            Assert.AreEqual(18, controller.Grid.Rows);
            Assert.IsFalse(controller.Grid.IsBlocked(new GridCell(3, 14)),
                "(3,14) must be buildable on slice2_poc per OQ-3.");

            // ── 3. Tear down the scene-driven Update loop and run a clean
            //      60s deterministic simulation against the same systems
            //      using the same fixed-dt scheme as the EditMode integration
            //      test. Disabling the controller stops its Update from
            //      racing with our manual Tick calls.
            controller.enabled = false;

            var grid = controller.Grid;
            var energy = controller.Energy;
            var units = controller.Units;
            var towers = controller.Towers;
            var wave = controller.Wave;

            var archer = controller.GetTowerDef();
            Assert.IsNotNull(archer,
                "Tower id 'archer' must resolve from GameDatabase (catalog wiring).");

            int kills = 0;
            units.OnUnitKilled += unit => kills++;

            wave.StartWave1();

            const float tickSec = 1f / 60f;
            const float durationSec = 60f;
            float t = 0f;
            bool placedArcher = false;
            int totalTicks = (int)System.Math.Ceiling(durationSec / tickSec);

            for (int i = 0; i < totalTicks; i++)
            {
                float tickEnd = System.Math.Min(t + tickSec, durationSec);
                float dt = tickEnd - t;
                if (dt <= 0f) break;

                // §1.4 tick order: Energy → applyInputs → Wave → Units → Towers → ResolveDamage.
                energy.Tick(dt, tickEnd);
                if (!placedArcher && tickEnd >= 0.1f)
                {
                    var placed = towers.TryPlace(archer, new GridCell(3, 14));
                    Assert.IsNotNull(placed,
                        "archer should place at (3,14) — initial energy 40 ≥ cost 20.");
                    placedArcher = true;
                }
                wave.Tick(dt, tickEnd);
                units.Tick(dt);
                towers.Tick(dt, tickEnd);
                towers.ResolveDamage(tickEnd);

                t = tickEnd;
            }
            towers.FlushPendingDamage();

            // ── 4. Lock kills == 3 per L1 (memory) + MinimalSystemsTest §3.5
            //      deviation. The plan's "kills == 5" target is wrong; the
            //      faithful NearestInRange + projectile TTL implementation
            //      yields 3 deterministic kills for this fixture. If this
            //      changes, investigate against TS replay-runner.ts before
            //      relaxing the assertion. See seed-001-slice2-poc.json
            //      _comment block and design-decisions §3.5/§3.7.
            Assert.AreEqual(3, kills,
                "Canonical deterministic kill count for slice2_poc fixture (L1 lock). " +
                "If this changes, verify against TS replay-runner.ts and " +
                "EditMode/Slice2/MinimalSystemsTest.Integration_Wave1_ProducesLooseExpectedMetrics " +
                "first. See docs/unity-migration/phase-2-design-decisions.md §3.5 + §3.7.");

            yield break;
        }
    }
}
