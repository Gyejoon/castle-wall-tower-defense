using System;
using GLD.Systems.DamageNumbers;
using GLD.Systems.Towers;
using GLD.Systems.Units;

namespace GLD.SceneRuntime.CoreLoop.Runtime
{
    public sealed class CombatMediator : IDisposable
    {
        readonly UnitSystem _units;
        readonly TowerSystem _towers;
        readonly GameStateManager _state;
        readonly DamageNumberSystem _damageNumbers;

        public CombatMediator(UnitSystem units, TowerSystem towers, GameStateManager state, DamageNumberSystem damageNumbers)
        {
            _units = units ?? throw new ArgumentNullException(nameof(units));
            _towers = towers ?? throw new ArgumentNullException(nameof(towers));
            _state = state ?? throw new ArgumentNullException(nameof(state));
            _damageNumbers = damageNumbers;

            _units.UnitEscaped += HandleUnitEscaped;
            _towers.TowerAttacked += HandleTowerAttacked;
        }

        public void Dispose()
        {
            _units.UnitEscaped -= HandleUnitEscaped;
            _towers.TowerAttacked -= HandleTowerAttacked;
        }

        void HandleUnitEscaped(UnitInstance _)
        {
            _state.ApplyExitDamage();
        }

        void HandleTowerAttacked(TowerInstance tower, float appliedDamage)
        {
            if (tower == null || appliedDamage <= 0f)
                return;

            _damageNumbers?.Show(tower.LastDamageWorldPosition, appliedDamage);
        }
    }
}
