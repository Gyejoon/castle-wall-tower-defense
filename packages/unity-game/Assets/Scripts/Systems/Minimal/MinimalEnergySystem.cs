// MinimalEnergySystem.cs — Phase 2 Slice2 energy economy.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md
//   - §1.1 Plain C# events (NOT SO channels, NOT static GameEvents).
//   - §1.5 Tick(float dtSec); never reads Time.deltaTime internally.
//   - §3.4 Initial 40, regen 1/s, cap 200 (PoC values from energyConfig.json).
//
// Mirrors tickEnergy() phase in packages/shared/src/testing/replay-runner.ts:
//   - Passive regen during tick (gating flag honored).
//   - SpendOrFail returns false if underfunded (Place input rejected).
//   - OnEnergyChanged fires after every mutation so HUD/views update.

using System;

namespace GLD.Systems.Minimal
{
    /// <summary>
    /// Per-tick passive energy regen + spend gate. Headless-safe.
    /// </summary>
    public sealed class MinimalEnergySystem
    {
        public float Energy { get; private set; }
        public int EnergyInt => (int)System.Math.Floor(Energy);
        public int Cap { get; }
        public float RegenPerSec { get; }

        /// <summary>If true, regen is suppressed while orchestrator clock &lt; PrepEndSec.</summary>
        public bool RegenGatedDuringPrep { get; }
        /// <summary>End of prep window in seconds. 0 = no gating.</summary>
        public float PrepEndSec { get; set; }

        /// <summary>Fired after every change to Energy (regen or spend).</summary>
        public event Action<int> OnEnergyChanged;

        /// <summary>Fired only on a successful TrySpend (not on regen).</summary>
        public event Action<int> OnEnergySpent;

        public MinimalEnergySystem(float initial, float regenPerSec, int cap,
            bool regenGatedDuringPrep = false, float prepEndSec = 0f)
        {
            Energy = System.Math.Min(initial, cap);
            RegenPerSec = regenPerSec;
            Cap = cap;
            RegenGatedDuringPrep = regenGatedDuringPrep;
            PrepEndSec = prepEndSec;
        }

        /// <summary>Per-tick passive regen, capped at Cap.</summary>
        public void Tick(float dtSec, float currentTimeSec)
        {
            if (RegenGatedDuringPrep && currentTimeSec < PrepEndSec) return;
            if (RegenPerSec <= 0f || dtSec <= 0f) return;

            float prev = Energy;
            float next = Energy + RegenPerSec * dtSec;
            if (next > Cap) next = Cap;
            Energy = next;
            if ((int)System.Math.Floor(prev) != (int)System.Math.Floor(next))
                OnEnergyChanged?.Invoke(EnergyInt);
        }

        /// <summary>Try to spend `amount`. Returns false (and is a no-op) when underfunded.</summary>
        public bool SpendOrFail(int amount)
        {
            if (amount < 0) return false;
            if (Energy < amount) return false;
            Energy -= amount;
            OnEnergySpent?.Invoke(amount);
            OnEnergyChanged?.Invoke(EnergyInt);
            return true;
        }

        /// <summary>Test-only: directly set energy (clamped to [0, Cap]).</summary>
        public void DebugSetEnergy(float value)
        {
            if (value < 0f) value = 0f;
            if (value > Cap) value = Cap;
            Energy = value;
            OnEnergyChanged?.Invoke(EnergyInt);
        }
    }
}
