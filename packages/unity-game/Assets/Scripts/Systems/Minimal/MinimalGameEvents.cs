using System;

namespace GLD.Systems.Minimal
{
    public static class MinimalGameEvents
    {
        public static event Action<float, float> OnEnergyChanged;
        public static event Action<int> OnWaveStarted;
        public static event Action<int> OnWaveCompleted;
        public static event Action<string> OnUnitKilled;
        public static event Action<string, int, int> OnTowerPlaced;

        public static void Clear()
        {
            OnEnergyChanged = null;
            OnWaveStarted = null;
            OnWaveCompleted = null;
            OnUnitKilled = null;
            OnTowerPlaced = null;
        }

        internal static void RaiseEnergyChanged(float current, float max) =>
            OnEnergyChanged?.Invoke(current, max);

        internal static void RaiseWaveStarted(int wave) =>
            OnWaveStarted?.Invoke(wave);

        internal static void RaiseWaveCompleted(int wave) =>
            OnWaveCompleted?.Invoke(wave);

        internal static void RaiseUnitKilled(string unitId) =>
            OnUnitKilled?.Invoke(unitId);

        internal static void RaiseTowerPlaced(string towerId, int col, int row) =>
            OnTowerPlaced?.Invoke(towerId, col, row);
    }
}
