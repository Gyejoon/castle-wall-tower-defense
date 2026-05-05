using System;
using GLD.Core;
using GLD.Data;
using GLD.Systems.Grid;
using GLD.Systems.Units;
using UnityEngine;

namespace GLD.Systems.Towers
{
    public sealed class TowerInstance
    {
        const float SplashRadius = 1.5f;
        const float SlowDurationSeconds = 2f;

        public string InstanceId { get; }
        public TowerDefSO Def { get; }
        public GridCell Cell { get; private set; }
        public Vector2 Position { get; private set; }
        public Vector2 CombatPosition { get; private set; }
        public float CooldownSeconds { get; private set; }
        public float GlobalAtkPct { get; set; }
        public float RuntimeDamageMultiplier { get; set; } = 1f;
        public float RuntimeCritDamageBonus { get; set; }
        public float DisabledUntilSeconds { get; private set; }
        public Vector2 LastDamageWorldPosition { get; private set; }
        public float LastAppliedDamage { get; private set; }

        readonly ElementMatchupSO _elementMatchup;

        public TowerInstance(
            string instanceId,
            TowerDefSO def,
            GridCell cell,
            Vector2 position,
            Vector2 combatPosition,
            ElementMatchupSO elementMatchup = null)
        {
            InstanceId = instanceId;
            Def = def;
            Cell = cell;
            Position = position;
            CombatPosition = combatPosition;
            _elementMatchup = elementMatchup;
        }

        public void MoveTo(GridCell cell, Vector2 position, Vector2 combatPosition)
        {
            Cell = cell;
            Position = position;
            CombatPosition = combatPosition;
        }

        public void DisableUntil(float untilSeconds)
        {
            DisabledUntilSeconds = Mathf.Max(DisabledUntilSeconds, untilSeconds);
        }

        public float Tick(float deltaSeconds, UnitSystem units, float elapsedSeconds = 0f)
        {
            if (deltaSeconds <= 0f || units == null)
                return 0f;
            if (elapsedSeconds < DisabledUntilSeconds)
                return 0f;

            CooldownSeconds -= deltaSeconds;
            if (CooldownSeconds > 0f)
                return 0f;

            var target = FindNearestTarget(units);
            if (target == null)
                return 0f;

            var applied = ApplyPhaserStyleAttack(units, target);
            LastDamageWorldPosition = target.Position;
            LastAppliedDamage = applied;
            if (applied > 0f)
                GameEvents.RaiseUnitDamaged(target.Def.id, applied);
            GameEvents.RaiseTowerAttacked(Def.id, applied);
            CooldownSeconds += 1f / Mathf.Max(0.01f, Def.stats.attackSpeed);
            return applied;
        }

        float ApplyPhaserStyleAttack(UnitSystem units, UnitInstance target)
        {
            var special = Def.stats.special ?? string.Empty;
            if (HasSplash(special))
                return ApplySplashAttack(units, target, armorPierce: string.IsNullOrEmpty(special));

            var applied = ApplyDamage(units, target, splashDamage: false, armorPierce: string.IsNullOrEmpty(special));
            if (IsSlowSpecial(special))
                target.Cc.ApplySlow(ParseSlowFactor(special), SlowDurationSeconds);
            else if (IsStunSpecial(special))
                target.Cc.TryApplyStun(ParseStunDurationSeconds(special), target.Boss.CcResistance);

            return applied;
        }

        float ApplySplashAttack(UnitSystem units, UnitInstance target, bool armorPierce)
        {
            var applied = ApplyDamage(units, target, splashDamage: false, armorPierce: armorPierce);
            foreach (var unit in units.Units)
            {
                if (unit == target || !unit.IsAlive || unit.Escaped)
                    continue;
                if (Vector2.Distance(target.Position, unit.Position) > SplashRadius)
                    continue;

                applied += ApplyDamage(units, unit, splashDamage: true, armorPierce: false);
            }
            return applied;
        }

        float ApplyDamage(UnitSystem units, UnitInstance target, bool splashDamage, bool armorPierce)
        {
            var damage = ResolveDamage(target, splashDamage);
            return units.ApplyDamage(target, damage, armorPierce);
        }

        float ResolveDamage(UnitInstance target, bool splashDamage)
        {
            var runtimeMultiplier = Mathf.Max(0f, RuntimeDamageMultiplier) + Mathf.Max(0f, RuntimeCritDamageBonus);
            if (runtimeMultiplier <= 0f)
                runtimeMultiplier = 1f;

            var elementMultiplier = _elementMatchup != null
                ? _elementMatchup.GetMultiplier(ToElementKey(Def.element), ToElementKey(target.Def.element))
                : 1f;
            var splashMultiplier = splashDamage ? 0.5f : 1f;
            return Mathf.Round(Def.stats.damage * elementMultiplier * splashMultiplier *
                (1f + Mathf.Max(0f, GlobalAtkPct)) * runtimeMultiplier);
        }

        static bool HasSplash(string special)
        {
            return special == "splash" || special.StartsWith("splash_");
        }

        static bool IsSlowSpecial(string special)
        {
            return special.StartsWith("slow_");
        }

        static bool IsStunSpecial(string special)
        {
            return special.StartsWith("stun");
        }

        static float ParseSlowFactor(string special)
        {
            var marker = "slow_";
            var start = special.IndexOf(marker, StringComparison.Ordinal);
            if (start < 0)
                return 0.7f;
            start += marker.Length;
            var end = special.IndexOf('%', start);
            if (end <= start)
                return 0.7f;
            return int.TryParse(special.Substring(start, end - start), out var percent)
                ? 1f - Mathf.Clamp(percent, 0, 100) / 100f
                : 0.7f;
        }

        static float ParseStunDurationSeconds(string special)
        {
            var marker = "stun_";
            var start = special.IndexOf(marker, StringComparison.Ordinal);
            if (start < 0)
                return 1f;
            start += marker.Length;
            var end = special.IndexOf("ms", start, StringComparison.Ordinal);
            if (end <= start)
                return 1f;
            return int.TryParse(special.Substring(start, end - start), out var ms)
                ? Mathf.Max(0f, ms / 1000f)
                : 1f;
        }

        static string ToElementKey(Element element)
        {
            return element.ToString().ToLowerInvariant();
        }

        UnitInstance FindNearestTarget(UnitSystem units)
        {
            UnitInstance best = null;
            var bestDistance = float.MaxValue;

            foreach (var unit in units.Units)
            {
                if (!unit.IsAlive || unit.Escaped) continue;

                var distance = Vector2.Distance(CombatPosition, unit.Position);
                if (distance > Def.stats.range || distance >= bestDistance) continue;
                best = unit;
                bestDistance = distance;
            }

            return best;
        }
    }
}
