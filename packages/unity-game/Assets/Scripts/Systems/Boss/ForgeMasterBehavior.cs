namespace GLD.Systems.Boss
{
    public sealed class ForgeMasterBehavior : IBossBehavior
    {
        const float SealIntervalSeconds = 10f;
        const float SealDurationSeconds = 5f;

        float _lastSealSeconds;

        public string Id => "forge_master";

        public void OnSpawn(BossContext context)
        {
            _lastSealSeconds = context.SceneTimeSeconds;
        }

        public void OnTick(BossContext context, float deltaSeconds)
        {
            if (context.SceneTimeSeconds - _lastSealSeconds < SealIntervalSeconds)
                return;

            _lastSealSeconds = context.SceneTimeSeconds;
            context.DisableRandomTower(SealDurationSeconds);
        }

        public void OnDamageTaken(BossContext context, float hpRatio) {}

        public bool IsCcImmune() => false;
    }
}
