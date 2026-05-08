using GLD.Systems.Units;

namespace GLD.SceneRuntime.CoreLoop.Runtime
{
    public readonly struct BossContext
    {
        public readonly string UnitId;
        public readonly float HpRatio;
        public readonly float CcResistance;

        public BossContext(string unitId, float hpRatio, float ccResistance)
        {
            UnitId = unitId;
            HpRatio = hpRatio;
            CcResistance = ccResistance;
        }
    }

    public sealed class BossContextBuilder
    {
        public BossContext Build(UnitInstance unit)
        {
            if (unit == null || !unit.Boss.IsBoss)
                return new BossContext(string.Empty, 0f, 0f);

            var hpRatio = unit.MaxHp > 0f ? unit.Hp / unit.MaxHp : 0f;
            return new BossContext(unit.Def.id, hpRatio, unit.Boss.CcResistance);
        }
    }
}
