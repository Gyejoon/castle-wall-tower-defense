namespace GLD.Systems.Boss
{
    public sealed class CorruptedArchmageBehavior : IBossBehavior
    {
        public string Id => "corrupted_archmage";

        public void OnSpawn(BossContext context)
        {
            if (context.Boss.IsClone)
                return;

            context.SpawnUnit("corrupted_archmage", context.Boss.Position, isClone: true);
        }

        public void OnTick(BossContext context, float deltaSeconds) {}
        public void OnDamageTaken(BossContext context, float hpRatio) {}
        public bool IsCcImmune() => true;
    }
}
