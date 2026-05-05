namespace GLD.Systems.Units
{
    public sealed class BossPhaseTracker
    {
        public bool IsBoss { get; }
        public float CcResistance { get; }

        public BossPhaseTracker(bool isBoss, float ccResistance)
        {
            IsBoss = isBoss;
            CcResistance = ccResistance;
        }
    }
}
