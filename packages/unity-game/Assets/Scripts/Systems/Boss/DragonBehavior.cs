namespace GLD.Systems.Boss
{
    public sealed class DragonBehavior : IBossBehavior
    {
        bool _triggered66;
        bool _triggered33;

        public string Id => "dragon";

        public void OnSpawn(BossContext context)
        {
            _triggered66 = false;
            _triggered33 = false;
        }

        public void OnTick(BossContext context, float deltaSeconds) {}

        public void OnDamageTaken(BossContext context, float hpRatio)
        {
            if (!_triggered66 && hpRatio <= 0.66f)
            {
                _triggered66 = true;
                for (var i = 0; i < 3; i++)
                    context.SpawnUnit("flame_imp", context.Boss.Position);
            }

            if (!_triggered33 && hpRatio <= 0.33f)
            {
                _triggered33 = true;
                for (var i = 0; i < 6; i++)
                    context.SpawnUnit("flame_imp", context.Boss.Position);
            }
        }

        public bool IsCcImmune() => false;
    }
}
