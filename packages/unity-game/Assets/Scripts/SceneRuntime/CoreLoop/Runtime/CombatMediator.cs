using System;
using GLD.Core;
using GLD.Systems.DamageNumbers;
using GLD.Systems.Act;
using GLD.Systems.Towers;
using GLD.Systems.Units;

namespace GLD.SceneRuntime.CoreLoop.Runtime
{
    public sealed class CombatMediator : IDisposable
    {
        readonly UnitSystem _units;
        readonly TowerSystem _towers;
        readonly GameStateManager _state;
        readonly WallSystem _wall;
        readonly DamageNumberSystem _damageNumbers;

        public CombatMediator(UnitSystem units, TowerSystem towers, GameStateManager state, DamageNumberSystem damageNumbers, WallSystem wall = null)
        {
            _units = units ?? throw new ArgumentNullException(nameof(units));
            _towers = towers ?? throw new ArgumentNullException(nameof(towers));
            _state = state ?? throw new ArgumentNullException(nameof(state));
            _damageNumbers = damageNumbers;
            _wall = wall;

            _units.UnitEscaped += HandleUnitEscaped;
            _towers.TowerAttacked += HandleTowerAttacked;
            GameEvents.OnWallProjectileImpacted += HandleWallProjectileImpacted;
        }

        public void Dispose()
        {
            _units.UnitEscaped -= HandleUnitEscaped;
            _towers.TowerAttacked -= HandleTowerAttacked;
            GameEvents.OnWallProjectileImpacted -= HandleWallProjectileImpacted;
        }

        void HandleUnitEscaped(UnitInstance _)
        {
            if (_wall != null)
            {
                _wall.TakeDamage(1);
                if (_wall.IsDestroyed)
                    _state.EndGame(false);
                return;
            }

            _state.ApplyExitDamage();
        }

        void HandleTowerAttacked(TowerInstance tower, float appliedDamage)
        {
            if (tower == null || appliedDamage <= 0f)
                return;

            _damageNumbers?.Show(tower.LastDamageWorldPosition, appliedDamage);
        }

        void HandleWallProjectileImpacted(WallProjectileImpactEvent impactEvent)
        {
            if (impactEvent.Damage <= 0f)
                return;

            _damageNumbers?.Show(new UnityEngine.Vector2(impactEvent.TargetX, impactEvent.TargetY), impactEvent.Damage);
        }
    }
}
