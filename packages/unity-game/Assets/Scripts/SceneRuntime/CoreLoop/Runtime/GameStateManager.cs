using GLD.Core;
using System;
using System.Reflection;
using UnityEngine;

namespace GLD.SceneRuntime.CoreLoop.Runtime
{
    public sealed class GameStateManager
    {
        const int DefaultPlayerHp = 20;

        float _speedMultiplier = 1f;

        public int PlayerHp { get; private set; } = DefaultPlayerHp;
        public float ElapsedSeconds { get; private set; }
        public bool IsPaused { get; private set; }
        public bool IsGameOver { get; private set; }
        public float SpeedMultiplier => _speedMultiplier;

        public float Tick(float fixedDeltaSeconds)
        {
            if (fixedDeltaSeconds <= 0f || IsPaused || IsGameOver)
                return 0f;

            var scaledDelta = fixedDeltaSeconds * _speedMultiplier;
            ElapsedSeconds += scaledDelta;
            GameEvents.RaiseTimerTick(ElapsedSeconds);
            return scaledDelta;
        }

        public void SetSpeedMultiplier(float value)
        {
            _speedMultiplier = Mathf.Clamp(value, 0.25f, 3f);
            TweenTimeScaleBridge.TrySetTimeScale(_speedMultiplier);
            GameEvents.RaiseSpeedChanged(_speedMultiplier);
        }

        public void SetPaused(bool paused)
        {
            IsPaused = paused;
            Time.timeScale = paused ? 0f : 1f;
            GameEvents.RaisePauseChanged(paused);
        }

        public void ApplyExitDamage(int amount = 1)
        {
            if (IsGameOver || amount <= 0)
                return;

            PlayerHp = Mathf.Max(0, PlayerHp - amount);
            GameEvents.RaisePlayerHpChanged(PlayerHp);
            if (PlayerHp <= 0)
                EndGame(false);
        }

        public void EndGame(bool victory)
        {
            if (IsGameOver)
                return;

            IsGameOver = true;
            GameEvents.RaiseGameOver(victory);
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
