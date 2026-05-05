using GLD.Data;
using UnityEngine;

namespace GLD.Systems.Units
{
    public sealed class UnitInstance
    {
        public string InstanceId { get; }
        public UnitDefSO Def { get; }
        public float Hp { get; private set; }
        public float MaxHp { get; }
        public float Armor { get; }
        public float BaseSpeed { get; }
        public bool IsAlive { get; private set; } = true;
        public bool Escaped { get; private set; }
        public PathFollower PathFollower { get; }
        public CCStateManager Cc { get; }
        public BossPhaseTracker Boss { get; }
        public Vector2 Position => PathFollower.Position;

        public UnitInstance(string instanceId, UnitDefSO def, PathFollower pathFollower, CCStateManager cc, float hpMultiplier = 1f)
        {
            InstanceId = instanceId;
            Def = def;
            MaxHp = Mathf.Max(1f, def.stats.hp * Mathf.Max(0.01f, hpMultiplier));
            Hp = MaxHp;
            Armor = def.stats.armor;
            BaseSpeed = Mathf.Max(0f, def.stats.speed);
            PathFollower = pathFollower;
            Cc = cc;
            Boss = new BossPhaseTracker(!string.IsNullOrEmpty(def.bossBehaviorId), def.bossCcResist);
        }

        public void Tick(float deltaSeconds)
        {
            if (!IsAlive || Escaped) return;
            Cc.Tick(deltaSeconds);
            PathFollower.Tick(deltaSeconds, Cc.ResolveSpeed(BaseSpeed));
            if (PathFollower.ReachedExit)
                Escaped = true;
        }

        public float ApplyDamage(float rawDamage)
        {
            if (!IsAlive || Escaped || rawDamage <= 0f) return 0f;

            var applied = Mathf.Min(Hp, Mathf.Max(1f, rawDamage - Armor));
            Hp -= applied;
            if (Hp <= 0f)
                IsAlive = false;
            return applied;
        }
    }
}
