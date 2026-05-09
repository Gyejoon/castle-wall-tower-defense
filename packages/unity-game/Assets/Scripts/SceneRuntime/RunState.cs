using System;
using GLD.Systems.Waves;
using UnityEngine;

namespace GLD.SceneRuntime
{
    public enum RunStatus
    {
        Lobby,
        Building,
        Running,
        Victory,
        Defeat
    }

    public sealed class RunState
    {
        const float FloatEpsilon = 0.0001f;

        public event Action<RunState> OnChanged;

        public string RunId { get; private set; }
        public RunStatus RunStatus { get; private set; }
        public int Energy { get; private set; }
        public int EnergyMax { get; private set; }
        public int Lives { get; private set; }
        public int Wave { get; private set; }
        public WavePhase WavePhase { get; private set; }
        public float Countdown { get; private set; }
        public float SpeedMultiplier { get; private set; }
        public int BossHp { get; private set; }
        public int BossMaxHp { get; private set; }
        public int BossPhase { get; private set; }
        public string BossUnitId { get; private set; }
        public string BossDefId { get; private set; }
        public float ElapsedSeconds { get; private set; }
        public bool IsPaused { get; private set; }
        public bool IsOverlayPaused { get; private set; }

        public RunState(string runId = null)
        {
            RunId = string.IsNullOrEmpty(runId) ? Guid.NewGuid().ToString("N") : runId;
            RunStatus = RunStatus.Building;
            WavePhase = WavePhase.Idle;
            SpeedMultiplier = 1f;
        }

        public void SetRunId(string runId)
        {
            if (string.IsNullOrEmpty(runId) || RunId == runId)
                return;

            RunId = runId;
            InvokeChanged();
        }

        public void SetRunStatus(RunStatus status)
        {
            if (RunStatus == status)
                return;

            RunStatus = status;
            InvokeChanged();
        }

        public void SetEnergy(int current, int max)
        {
            current = Mathf.Max(0, current);
            max = Mathf.Max(0, max);
            if (Energy == current && EnergyMax == max)
                return;

            Energy = current;
            EnergyMax = max;
            InvokeChanged();
        }

        public void SetLives(int lives)
        {
            lives = Mathf.Max(0, lives);
            if (Lives == lives)
                return;

            Lives = lives;
            InvokeChanged();
        }

        public void SetWave(int wave, WavePhase phase)
        {
            wave = Mathf.Max(0, wave);
            if (Wave == wave && WavePhase == phase)
                return;

            Wave = wave;
            WavePhase = phase;
            InvokeChanged();
        }

        public void SetCountdown(float seconds)
        {
            seconds = Mathf.Max(0f, seconds);
            if (Approximately(Countdown, seconds))
                return;

            Countdown = seconds;
            InvokeChanged();
        }

        public void SetSpeedMultiplier(float multiplier)
        {
            multiplier = Mathf.Clamp(multiplier, 0.25f, 3f);
            if (Approximately(SpeedMultiplier, multiplier))
                return;

            SpeedMultiplier = multiplier;
            InvokeChanged();
        }

        public void SetBossHp(string unitId, string defId, int hp, int maxHp, int phase)
        {
            hp = Mathf.Max(0, hp);
            maxHp = Mathf.Max(0, maxHp);
            phase = Mathf.Max(0, phase);
            if (BossUnitId == unitId && BossDefId == defId && BossHp == hp && BossMaxHp == maxHp && BossPhase == phase)
                return;

            BossUnitId = unitId;
            BossDefId = defId;
            BossHp = hp;
            BossMaxHp = maxHp;
            BossPhase = phase;
            InvokeChanged();
        }

        public void ClearBoss()
        {
            if (string.IsNullOrEmpty(BossUnitId) && string.IsNullOrEmpty(BossDefId) && BossHp == 0 && BossMaxHp == 0 && BossPhase == 0)
                return;

            BossUnitId = null;
            BossDefId = null;
            BossHp = 0;
            BossMaxHp = 0;
            BossPhase = 0;
            InvokeChanged();
        }

        public void SetElapsedSeconds(float seconds)
        {
            seconds = Mathf.Max(0f, seconds);
            if (Approximately(ElapsedSeconds, seconds))
                return;

            ElapsedSeconds = seconds;
            InvokeChanged();
        }

        public void SetPaused(bool paused)
        {
            if (IsPaused == paused)
                return;

            IsPaused = paused;
            InvokeChanged();
        }

        public void SetOverlayPaused(bool paused)
        {
            if (IsOverlayPaused == paused)
                return;

            IsOverlayPaused = paused;
            InvokeChanged();
        }

        public void InvokeChanged() => OnChanged?.Invoke(this);

        static bool Approximately(float left, float right) => Mathf.Abs(left - right) <= FloatEpsilon;
    }
}
