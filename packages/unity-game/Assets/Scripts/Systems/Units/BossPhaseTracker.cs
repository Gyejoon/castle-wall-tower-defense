namespace GLD.Systems.Units
{
    public readonly struct BossPhaseTransition
    {
        public readonly int Phase;
        public readonly float InvulnerabilitySeconds;

        public BossPhaseTransition(int phase, float invulnerabilitySeconds)
        {
            Phase = phase;
            InvulnerabilitySeconds = invulnerabilitySeconds;
        }
    }

    public sealed class BossPhaseTracker
    {
        public bool IsBoss { get; }
        public float CcResistance { get; }
        public int Phase { get; private set; } = 1;
        public bool IsInvulnerable => _invulnerabilityRemainingSeconds > 0f;

        readonly float _phase2Threshold;
        readonly float _phase3Threshold;
        readonly float _invulnerabilitySeconds;
        readonly float _phase2SpeedMultiplier;
        readonly float _phase3SpeedMultiplier;
        float _invulnerabilityRemainingSeconds;

        public BossPhaseTracker(
            bool isBoss,
            float ccResistance,
            float phase2Threshold = 0.5f,
            float phase3Threshold = 0.25f,
            float invulnerabilitySeconds = 0.5f,
            float phase2SpeedMultiplier = 1.15f,
            float phase3SpeedMultiplier = 1.35f)
        {
            IsBoss = isBoss;
            CcResistance = ccResistance;
            _phase2Threshold = phase2Threshold;
            _phase3Threshold = phase3Threshold;
            _invulnerabilitySeconds = invulnerabilitySeconds;
            _phase2SpeedMultiplier = phase2SpeedMultiplier > 0f ? phase2SpeedMultiplier : 1.15f;
            _phase3SpeedMultiplier = phase3SpeedMultiplier > 0f ? phase3SpeedMultiplier : 1.35f;
        }

        public float SpeedMultiplier
        {
            get
            {
                if (!IsBoss) return 1f;
                if (Phase == 3) return _phase3SpeedMultiplier;
                if (Phase == 2) return _phase2SpeedMultiplier;
                return 1f;
            }
        }

        public void Tick(float deltaSeconds)
        {
            if (_invulnerabilityRemainingSeconds > 0f)
                _invulnerabilityRemainingSeconds = System.Math.Max(0f, _invulnerabilityRemainingSeconds - deltaSeconds);
        }

        public BossPhaseTransition? OnDamage(float hp, float maxHp)
        {
            if (!IsBoss || hp <= 0f || maxHp <= 0f)
                return null;

            if (Phase == 1 && hp <= maxHp * _phase2Threshold)
                return EnterPhase(2);

            if (Phase == 2 && hp <= maxHp * _phase3Threshold)
                return EnterPhase(3);

            return null;
        }

        BossPhaseTransition EnterPhase(int phase)
        {
            Phase = phase;
            _invulnerabilityRemainingSeconds = _invulnerabilitySeconds;
            return new BossPhaseTransition(phase, _invulnerabilitySeconds);
        }
    }
}
