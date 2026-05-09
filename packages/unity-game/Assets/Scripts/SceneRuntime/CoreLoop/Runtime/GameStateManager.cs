using GLD.Core;
using GLD.SceneRuntime;
using System;
using System.Reflection;
using UnityEngine;

namespace GLD.SceneRuntime.CoreLoop.Runtime
{
    public sealed class GameStateManager
    {
        const int DefaultPlayerHp = 20;

        readonly RunState _runState;

        public RunState RunState => _runState;
        public int PlayerHp => _runState.Lives;
        public float ElapsedSeconds => _runState.ElapsedSeconds;
        public bool IsPaused => _runState.IsPaused || _runState.IsOverlayPaused;
        public bool IsGameOver => _runState.RunStatus == RunStatus.Victory || _runState.RunStatus == RunStatus.Defeat;
        public float SpeedMultiplier => _runState.SpeedMultiplier;

        public GameStateManager(RunState runState = null)
        {
            _runState = runState ?? new RunState();
            _runState.SetLives(DefaultPlayerHp);
            _runState.SetRunStatus(RunStatus.Building);
        }

        public float Tick(float fixedDeltaSeconds)
        {
            if (fixedDeltaSeconds <= 0f || IsPaused || IsGameOver)
                return 0f;

            var scaledDelta = fixedDeltaSeconds * _runState.SpeedMultiplier;
            _runState.SetElapsedSeconds(_runState.ElapsedSeconds + scaledDelta);
            GameEvents.RaiseTimerTick(_runState.ElapsedSeconds);
            return scaledDelta;
        }

        public void SetSpeedMultiplier(float value)
        {
            _runState.SetSpeedMultiplier(value);
            TweenTimeScaleBridge.TrySetTimeScale(_runState.SpeedMultiplier);
            GameEvents.RaiseSpeedChanged(_runState.SpeedMultiplier);
        }

        public void SetPaused(bool paused)
        {
            _runState.SetPaused(paused);
            Time.timeScale = paused ? 0f : 1f;
            GameEvents.RaisePauseChanged(paused);
        }

        public void SetOverlayPaused(bool paused)
        {
            _runState.SetOverlayPaused(paused);
        }

        public void ApplyExitDamage(int amount = 1)
        {
            if (IsGameOver || amount <= 0)
                return;

            _runState.SetLives(Mathf.Max(0, _runState.Lives - amount));
            GameEvents.RaisePlayerHpChanged(_runState.Lives);
            if (_runState.Lives <= 0)
                EndGame(false);
        }

        public void EndGame(bool victory)
        {
            if (IsGameOver)
                return;

            SetGameOverStatus(victory);
            GameEvents.RaiseGameOver(victory);
        }

        public void SetGameOverStatus(bool victory)
        {
            _runState.SetRunStatus(victory ? RunStatus.Victory : RunStatus.Defeat);
        }

        static class TweenTimeScaleBridge
        {
            static Type _dotweenType;
            static PropertyInfo _timeScaleProperty;
            static FieldInfo _timeScaleField;
            static bool _resolved;

            public static void TrySetTimeScale(float value)
            {
                if (!Resolve())
                    return;

                if (_timeScaleProperty != null)
                    _timeScaleProperty.SetValue(null, value);
                else
                    _timeScaleField.SetValue(null, value);
            }

            static bool Resolve()
            {
                if (_resolved)
                    return _timeScaleProperty != null || _timeScaleField != null;

                _resolved = true;
                _dotweenType = ResolveDotweenType();
                _timeScaleProperty = _dotweenType?.GetProperty("timeScale", BindingFlags.Public | BindingFlags.Static);
                _timeScaleField = _dotweenType?.GetField("timeScale", BindingFlags.Public | BindingFlags.Static);
                if (_timeScaleProperty != null && !_timeScaleProperty.CanWrite)
                    _timeScaleProperty = null;
                return _timeScaleProperty != null || _timeScaleField != null;
            }

            static Type ResolveDotweenType()
            {
                var type = Type.GetType("DG.Tweening.DOTween, DOTween");
                if (type != null)
                    return type;

                foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
                {
                    type = assembly.GetType("DG.Tweening.DOTween");
                    if (type != null)
                        return type;
                }

                return null;
            }
        }
    }
}
