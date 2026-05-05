using UnityEngine;

namespace GLD.Systems.Units
{
    public sealed class CCStateManager
    {
        readonly float _minMoveSpeed;
        readonly float _stunImmunityWindowSec;
        float _slowMultiplier = 1f;
        float _slowRemainingSec;
        float _stunRemainingSec;
        float _stunImmunityRemainingSec;

        public bool IsStunned => _stunRemainingSec > 0f;

        public CCStateManager(float minMoveSpeed = 0.15f, float stunImmunityWindowSec = 2f)
        {
            _minMoveSpeed = Mathf.Max(0f, minMoveSpeed);
            _stunImmunityWindowSec = Mathf.Max(0f, stunImmunityWindowSec);
        }

        public void Tick(float deltaSeconds)
        {
            if (deltaSeconds <= 0f) return;

            if (_slowRemainingSec > 0f)
            {
                _slowRemainingSec = Mathf.Max(0f, _slowRemainingSec - deltaSeconds);
                if (_slowRemainingSec <= 0f)
                    _slowMultiplier = 1f;
            }

            if (_stunRemainingSec > 0f)
            {
                _stunRemainingSec = Mathf.Max(0f, _stunRemainingSec - deltaSeconds);
                if (_stunRemainingSec <= 0f)
                    _stunImmunityRemainingSec = _stunImmunityWindowSec;
            }
            else if (_stunImmunityRemainingSec > 0f)
            {
                _stunImmunityRemainingSec = Mathf.Max(0f, _stunImmunityRemainingSec - deltaSeconds);
            }
        }

        public void ApplySlow(float multiplier, float durationSeconds)
        {
            if (durationSeconds <= 0f) return;
            _slowMultiplier = Mathf.Min(_slowMultiplier, Mathf.Clamp(multiplier, 0f, 1f));
            _slowRemainingSec = Mathf.Max(_slowRemainingSec, durationSeconds);
        }

        public bool TryApplyStun(float durationSeconds, float ccResistance = 0f)
        {
            if (durationSeconds <= 0f || _stunImmunityRemainingSec > 0f)
                return false;
            if (ccResistance >= 1f)
                return false;

            _stunRemainingSec = Mathf.Max(_stunRemainingSec, durationSeconds * (1f - Mathf.Clamp01(ccResistance)));
            return _stunRemainingSec > 0f;
        }

        public float ResolveSpeed(float baseSpeed)
        {
            if (IsStunned) return 0f;
            return Mathf.Max(_minMoveSpeed, baseSpeed * _slowMultiplier);
        }
    }
}
