using System;

namespace GLD.Core
{
    public static class GameEvents
    {
        public static event Action OnBootComplete;
        public static event Action<int, int> OnEnergyChanged;
        public static event Action<string, int, int> OnTowerPlaced;
        public static event Action<string> OnTowerSold;
        public static event Action<string, int, int, int, int> OnTowerMoved;
        public static event Action<string> OnUnitSpawned;
        public static event Action<string> OnUnitKilled;
        public static event Action<string> OnUnitEscaped;
        public static event Action<int> OnWaveStarted;
        public static event Action<int> OnWaveCompleted;
        public static event Action<bool> OnGameOver;

        internal static void RaiseBootComplete() => OnBootComplete?.Invoke();

        public static void RaiseEnergyChanged(int current, int max) => OnEnergyChanged?.Invoke(current, max);
        public static void RaiseTowerPlaced(string towerId, int col, int row) => OnTowerPlaced?.Invoke(towerId, col, row);
        public static void RaiseTowerSold(string towerId) => OnTowerSold?.Invoke(towerId);
        public static void RaiseTowerMoved(string towerId, int fromCol, int fromRow, int toCol, int toRow) =>
            OnTowerMoved?.Invoke(towerId, fromCol, fromRow, toCol, toRow);
        public static void RaiseUnitSpawned(string unitId) => OnUnitSpawned?.Invoke(unitId);
        public static void RaiseUnitKilled(string unitId) => OnUnitKilled?.Invoke(unitId);
        public static void RaiseUnitEscaped(string unitId) => OnUnitEscaped?.Invoke(unitId);
        public static void RaiseWaveStarted(int waveSlot) => OnWaveStarted?.Invoke(waveSlot);
        public static void RaiseWaveCompleted(int waveSlot) => OnWaveCompleted?.Invoke(waveSlot);
        public static void RaiseGameOver(bool victory) => OnGameOver?.Invoke(victory);

        public static void ClearRuntimeListeners()
        {
            OnEnergyChanged = null;
            OnTowerPlaced = null;
            OnTowerSold = null;
            OnTowerMoved = null;
            OnUnitSpawned = null;
            OnUnitKilled = null;
            OnUnitEscaped = null;
            OnWaveStarted = null;
            OnWaveCompleted = null;
            OnGameOver = null;
        }
    }
}
