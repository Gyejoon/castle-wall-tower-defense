namespace GLD.Systems.Boss
{
    public sealed class OrcWarlordBehavior : IBossBehavior
    {
        bool _summoned;

        public string Id => "orc_warlord";

        public void OnSpawn(BossContext context)
        {
            _summoned = false;
        }

        public void OnTick(BossContext context, float deltaSeconds) {}

        public void OnDamageTaken(BossContext context, float hpRatio)
        {
            if (_summoned || hpRatio > 0.5f)
                return;

            _summoned = true;
            for (var i = 0; i < 4; i++)
                context.SpawnUnit("battle_robot", context.Boss.Position);
        }

        public bool IsCcImmune() => false;
    }
}
