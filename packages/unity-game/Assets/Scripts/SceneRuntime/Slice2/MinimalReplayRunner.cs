using GLD.Data;
using GLD.Systems.Minimal;
using UnityEngine;

namespace GLD.SceneRuntime.Slice2
{
    [System.Serializable]
    public sealed class ReplayPlacementEvent
    {
        public int tMs;
        public string towerId;
        public int col;
        public int row;
    }

    [System.Serializable]
    public sealed class ReplayExpectedMetrics
    {
        public int kills;
        public float totalDamage;
        public float energyPeak;
        public int waveClearMs;
    }

    [System.Serializable]
    public sealed class ReplayFixture
    {
        public string fixtureId;
        public int seed;
        public int durationMs = 60000;
        public float tickMs = 16.6667f;
        public bool phase4_dependent;
        public bool continueAfterWaveClear;
        public float speedMultiplier = 1f;
        public ReplayPlacementEvent[] placements;
        public ReplayExpectedMetrics expected;
    }

    [System.Serializable]
    public sealed class MinimalRunMetrics
    {
        public int kills;
        public float totalDamage;
        public float energyPeak;
        public int waveClearMs;
    }

    public static class MinimalReplayRunner
    {
        public static MinimalRunMetrics Run(string fixtureJson)
        {
            var fixture = JsonUtility.FromJson<ReplayFixture>(fixtureJson);
            return Run(fixture);
        }

        public static MinimalRunMetrics Run(ReplayFixture fixture)
        {
            Random.InitState(fixture.seed);
            MinimalGameEvents.Clear();

            var grid = new MinimalGridManager(CreatePocMap());
            var energy = new MinimalEnergySystem();
            var units = new MinimalUnitSystem(grid, energy);
            var towers = new MinimalTowerSystem(grid, energy, units);
            var waves = new MinimalWaveSystem(units, null);

            var clearMs = -1;
            waves.WaveCompleted += _ => clearMs = Mathf.RoundToInt(_elapsedMs);
            _elapsedMs = 0f;
            waves.StartWave1();

            var placementIndex = 0;
            var placements = fixture.placements ?? new ReplayPlacementEvent[0];
            var tickMs = fixture.tickMs > 0f ? fixture.tickMs : 16.6667f;
            var durationMs = fixture.durationMs > 0 ? fixture.durationMs : 60000;

            while (_elapsedMs <= durationMs && (!waves.IsCompleted || fixture.continueAfterWaveClear))
            {
                while (placementIndex < placements.Length && placements[placementIndex].tMs <= _elapsedMs)
                {
                    var p = placements[placementIndex++];
                    towers.Place(p.towerId, 20f, 4f, 1f, new MinimalGridCell(p.col, p.row));
                }

                var speedMultiplier = fixture.speedMultiplier > 0f ? fixture.speedMultiplier : 1f;
                var dt = (tickMs / 1000f) * speedMultiplier;
                energy.Tick(dt);
                if (!waves.IsCompleted)
                {
                    waves.Tick(dt);
                    units.Tick(dt);
                    towers.Tick(dt);
                }
                _elapsedMs += tickMs;
            }

            return new MinimalRunMetrics
            {
                kills = units.KillCount,
                totalDamage = units.TotalDamage,
                energyPeak = energy.Peak,
                waveClearMs = clearMs >= 0 ? clearMs : Mathf.RoundToInt(_elapsedMs)
            };
        }

        static float _elapsedMs;

        public static MapDef CreatePocMap()
        {
            var path = new GridPoint[]
            {
                new GridPoint { x = 0, y = 17 },
                new GridPoint { x = 1, y = 17 },
                new GridPoint { x = 2, y = 17 },
                new GridPoint { x = 3, y = 17 },
                new GridPoint { x = 3, y = 16 },
                new GridPoint { x = 3, y = 15 },
                new GridPoint { x = 3, y = 14 },
                new GridPoint { x = 3, y = 13 },
                new GridPoint { x = 4, y = 13 },
                new GridPoint { x = 5, y = 13 },
                new GridPoint { x = 5, y = 12 },
                new GridPoint { x = 5, y = 11 },
                new GridPoint { x = 5, y = 10 },
                new GridPoint { x = 4, y = 10 },
                new GridPoint { x = 3, y = 10 },
                new GridPoint { x = 3, y = 11 },
                new GridPoint { x = 3, y = 12 },
                new GridPoint { x = 3, y = 13 },
                new GridPoint { x = 3, y = 14 },
                new GridPoint { x = 3, y = 15 },
                new GridPoint { x = 3, y = 16 },
                new GridPoint { x = 3, y = 17 },
                new GridPoint { x = 4, y = 17 },
                new GridPoint { x = 5, y = 17 },
                new GridPoint { x = 5, y = 16 },
                new GridPoint { x = 5, y = 15 },
                new GridPoint { x = 5, y = 14 },
                new GridPoint { x = 5, y = 13 }
            };

            return new MapDef
            {
                id = "main_long",
                width = 9,
                height = 18,
                tileSize = 48,
                spawnPoint = path[0],
                exitPoint = path[path.Length - 1],
                path = path,
                buildablePoints = new[]
                {
                    new GridPoint { x = 3, y = 14 },
                    new GridPoint { x = 2, y = 14 },
                    new GridPoint { x = 4, y = 14 }
                },
                blockedPlacementPoints = new GridPoint[0],
                obstacles = new GridPoint[0]
            };
        }
    }
}
