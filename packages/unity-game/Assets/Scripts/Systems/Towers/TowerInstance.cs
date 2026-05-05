using GLD.Data;
using GLD.Systems.Grid;
using GLD.Systems.Units;
using UnityEngine;

namespace GLD.Systems.Towers
{
    public sealed class TowerInstance
    {
        public string InstanceId { get; }
        public TowerDefSO Def { get; }
        public GridCell Cell { get; private set; }
        public Vector2 Position { get; private set; }
        public float CooldownSeconds { get; private set; }
        public float GlobalAtkPct { get; set; }

        public TowerInstance(string instanceId, TowerDefSO def, GridCell cell, Vector2 position)
        {
            InstanceId = instanceId;
            Def = def;
            Cell = cell;
            Position = position;
        }

        public void MoveTo(GridCell cell, Vector2 position)
        {
            Cell = cell;
            Position = position;
        }

        public float Tick(float deltaSeconds, UnitSystem units)
        {
            if (deltaSeconds <= 0f || units == null)
                return 0f;

            CooldownSeconds -= deltaSeconds;
            if (CooldownSeconds > 0f)
                return 0f;

            var target = FindNearestTarget(units);
            if (target == null)
                return 0f;

            var damage = Def.stats.damage * (1f + Mathf.Max(0f, GlobalAtkPct));
            var applied = units.ApplyDamage(target, damage);
            CooldownSeconds += 1f / Mathf.Max(0.01f, Def.stats.attackSpeed);
            return applied;
        }

        UnitInstance FindNearestTarget(UnitSystem units)
        {
            UnitInstance best = null;
            var bestDistance = float.MaxValue;

            foreach (var unit in units.Units)
            {
                if (!unit.IsAlive || unit.Escaped) continue;

                var distance = Vector2.Distance(Position, unit.Position);
                if (distance > Def.stats.range || distance >= bestDistance) continue;
                best = unit;
                bestDistance = distance;
            }

            return best;
        }
    }
}
