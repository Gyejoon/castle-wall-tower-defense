// MinimalReplayFixture.cs — Phase 2 Task 6 fixture DTO.
//
// Authoritative spec: docs/unity-migration/phase-2-design-decisions.md §3, §4.
//
// Mirrors the TS `ReplayFixture` interface in
// packages/shared/src/testing/replay-runner.ts. Both runtimes parse the same
// canonical JSON file (packages/shared/src/testing/replay-fixtures/seed-001-
// slice2-poc.json + its Unity-side mirror under
// Assets/Tests/EditMode/Replay/Fixtures/). Field names are camelCase to match
// the JSON; Newtonsoft.Json uses [JsonProperty] explicitly so the C# fields
// stay PascalCase for idiomatic consumption while the wire format remains
// identical to the TS shape.
//
// Fields are kept as simple POCOs (no JsonConverter customization) — every
// fixture key the TS runner reads is mirrored here verbatim. Adding a new
// fixture field means adding it BOTH to the TS interface and to this DTO;
// the mirroring is the parity contract.

using Newtonsoft.Json;

namespace GLD.Replay
{
    /// <summary>
    /// Top-level fixture object. Deserialized from a canonical JSON file by
    /// <see cref="MinimalReplayRunner.Run"/>.
    /// </summary>
    public sealed class MinimalReplayFixture
    {
        [JsonProperty("fixtureId")] public string FixtureId;
        [JsonProperty("description")] public string Description;
        [JsonProperty("seed")] public int Seed;

        /// <summary>Total simulation duration in milliseconds (e.g. 60000 = 60s).</summary>
        [JsonProperty("durationMs")] public float DurationMs;

        /// <summary>Fixed tick step in milliseconds (e.g. 16.6667).</summary>
        [JsonProperty("tickMs")] public float TickMs;

        [JsonProperty("map")] public MapBlock Map;
        [JsonProperty("energy")] public EnergyBlock Energy;
        [JsonProperty("wave")] public WaveBlock Wave;

        /// <summary>Scheduled input events (e.g. place_tower at tMs).</summary>
        [JsonProperty("events")] public InputEvent[] Events;

        /// <summary>Bounded expected metrics for parity assertions.</summary>
        [JsonProperty("expected")] public ExpectedBlock Expected;

        // ── Nested blocks ──────────────────────────────────────────────────

        public sealed class MapBlock
        {
            [JsonProperty("cols")] public int Cols;
            [JsonProperty("rows")] public int Rows;
            [JsonProperty("spawn")] public int[] Spawn;
            [JsonProperty("exit")] public int[] Exit;
            /// <summary>Path cells, each a [col, row] pair.</summary>
            [JsonProperty("path")] public int[][] Path;
            [JsonProperty("blocked")] public int[][] Blocked;
        }

        public sealed class EnergyBlock
        {
            [JsonProperty("initial")] public float Initial;
            [JsonProperty("regenPerSec")] public float RegenPerSec;
            [JsonProperty("cap")] public int Cap;
            [JsonProperty("regenGatedDuringPrep")] public bool RegenGatedDuringPrep;
        }

        public sealed class WaveBlock
        {
            [JsonProperty("prepMs")] public float PrepMs;
            [JsonProperty("spawnIntervalMs")] public float SpawnIntervalMs;
            [JsonProperty("unitId")] public string UnitId;
            [JsonProperty("count")] public int Count;
        }

        public sealed class InputEvent
        {
            [JsonProperty("tMs")] public float TMs;
            /// <summary>Currently only "place_tower" at PoC scope.</summary>
            [JsonProperty("kind")] public string Kind;
            [JsonProperty("towerId")] public string TowerId;
            /// <summary>[col, row] target cell.</summary>
            [JsonProperty("cell")] public int[] Cell;
        }

        public sealed class ExpectedBlock
        {
            [JsonProperty("kills")] public int Kills;
            [JsonProperty("totalDamage")] public Range TotalDamage;
            [JsonProperty("waveClearMs")] public Range WaveClearMs;
            [JsonProperty("energyPeak")] public Range EnergyPeak;
        }

        public sealed class Range
        {
            [JsonProperty("min")] public int Min;
            [JsonProperty("max")] public int Max;
        }
    }
}
