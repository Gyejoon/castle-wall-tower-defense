using GLD.Systems.Units;
using GLD.Systems.Towers;
using UnityEngine;

namespace GLD.Systems.Boss
{
    public readonly struct BossContext
    {
        public readonly UnitInstance Boss;
        public readonly float SceneTimeSeconds;
        public readonly UnitSystem Units;
        public readonly TowerSystem Towers;

        public BossContext(UnitInstance boss, float sceneTimeSeconds, UnitSystem units, TowerSystem towers)
        {
            Boss = boss;
            SceneTimeSeconds = sceneTimeSeconds;
            Units = units;
            Towers = towers;
        }

        public void SpawnUnit(string unitId, Vector2 position, bool isClone = false)
        {
            Units?.SpawnById(unitId, isClone);
        }

        public void DisableRandomTower(float durationSeconds)
        {
            Towers?.DisableRandomTower(SceneTimeSeconds + durationSeconds);
        }
    }

    public interface IBossBehavior
    {
        string Id { get; }
        void OnSpawn(BossContext context);
        void OnTick(BossContext context, float deltaSeconds);
        void OnDamageTaken(BossContext context, float hpRatio);
        bool IsCcImmune();
    }
}
