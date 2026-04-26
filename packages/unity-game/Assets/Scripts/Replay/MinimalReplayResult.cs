// MinimalReplayResult.cs — Phase 2 Task 6 result types.
//
// Mirrors the metric shape produced by packages/shared/src/testing/replay-runner.ts
// so cross-runtime parity tests can compare values directly.
//
// Phase 2 PoC scope: metrics-only. The TS runner additionally emits a sorted
// event stream; the C# runner SKIPS event emission deliberately at PoC scope
// (Task 6 task brief — event-stream parity is Phase 3 work). Subscribing to
// the existing `MinimalUnitSystem.OnUnitDamaged` / `OnUnitKilled` events from
// the runner is sufficient to compute every metric the parity gate checks.

namespace GLD.Replay
{
    /// <summary>
    /// Summary metrics from one Run(fixture) invocation. Field shape matches
    /// the TS `ReplayMetrics` interface:
    ///   * Kills      — exact integer (point-equality with fixture.expected.kills).
    ///   * TotalDamage — sum of integer-applied damage across the simulation.
    ///   * EnergyPeak  — Math.Floor(energy) high-water mark across the run.
    ///   * WaveClearMs — timestamp (ms, rounded half-away-from-zero) of the
    ///                   <c>fixture.expected.kills</c>-th kill, or <c>null</c>
    ///                   if that count was never reached.
    /// </summary>
    public struct MinimalReplayMetrics
    {
        public int Kills;
        public int TotalDamage;
        public int EnergyPeak;
        public int? WaveClearMs;
    }

    /// <summary>
    /// Public output of <see cref="MinimalReplayRunner.Run"/>. Currently
    /// metrics-only (see file header for the deliberate event-stream skip).
    /// </summary>
    public struct MinimalReplayResult
    {
        public MinimalReplayMetrics Metrics;
    }
}
